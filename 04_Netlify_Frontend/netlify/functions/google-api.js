const https = require('https');
const Url = require('url').URL;

const CORS_HEADERS = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'Content-Type',
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Content-Type': 'application/json; charset=utf-8'
};

exports.handler = async function(event) {
if (event.httpMethod === 'OPTIONS') {
return {
statusCode: 204,
headers: CORS_HEADERS,
body: ''
};
}

var gasUrl = String(process.env.GAS_URL || '').trim();

if (!gasUrl) {
return jsonResponse(500, {
ok: false,
error: 'Missing GAS_URL environment variable'
});
}

if (gasUrl.indexOf('https://script.google.com/macros/s/') !== 0) {
return jsonResponse(500, {
ok: false,
error: 'Invalid GAS_URL format',
hint: 'GAS_URL must start with https://script.google.com/macros/s/ and end with /exec',
received: gasUrl
});
}

try {
var query = getQueryString(event);
var targetUrl = gasUrl;

```
if (query) {
  targetUrl = gasUrl + '?' + query;
}

var method = event.httpMethod || 'GET';
var body = null;
var headers = {};

if (method === 'POST') {
  body = event.body || '{}';
  headers['Content-Type'] = 'application/json; charset=utf-8';
  headers['Content-Length'] = Buffer.byteLength(body);
}

var upstream = await requestWithRedirects(targetUrl, method, headers, body, 8);

return {
  statusCode: upstream.statusCode || 200,
  headers: CORS_HEADERS,
  body: upstream.body || ''
};
```

} catch (err) {
return jsonResponse(500, {
ok: false,
error: err && err.message ? err.message : String(err),
hint: 'Netlify Function failed while calling Apps Script. Check GAS_URL, Apps Script access, and redirect handling.',
gasUrl: gasUrl
});
}
};

function getQueryString(event) {
if (event && event.rawQuery) {
return String(event.rawQuery);
}

var params = event && event.queryStringParameters ? event.queryStringParameters : {};
var parts = [];

Object.keys(params).forEach(function(key) {
if (params[key] === undefined || params[key] === null) {
return;
}

```
parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key])));
```

});

return parts.join('&');
}

function jsonResponse(statusCode, obj) {
return {
statusCode: statusCode,
headers: CORS_HEADERS,
body: JSON.stringify(obj, null, 2)
};
}

function requestWithRedirects(targetUrl, method, headers, body, redirectsLeft) {
return new Promise(function(resolve, reject) {
var parsed;

```
try {
  parsed = new Url(targetUrl);
} catch (err) {
  reject(new Error('Invalid target URL: ' + targetUrl));
  return;
}

var requestOptions = {
  protocol: parsed.protocol,
  hostname: parsed.hostname,
  path: parsed.pathname + parsed.search,
  method: method || 'GET',
  headers: headers || {}
};

var req = https.request(requestOptions, function(res) {
  var statusCode = res.statusCode || 0;
  var location = res.headers.location;

  if (
    location &&
    (statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308)
  ) {
    if (redirectsLeft <= 0) {
      reject(new Error('Too many redirects from Apps Script'));
      return;
    }

    var nextUrl = new Url(location, targetUrl).toString();

    requestWithRedirects(nextUrl, method, headers, body, redirectsLeft - 1)
      .then(resolve)
      .catch(reject);

    return;
  }

  var responseBody = '';

  res.setEncoding('utf8');

  res.on('data', function(chunk) {
    responseBody += chunk;
  });

  res.on('end', function() {
    resolve({
      statusCode: statusCode,
      headers: res.headers,
      body: responseBody
    });
  });
});

req.on('error', function(err) {
  reject(err);
});

req.setTimeout(30000, function() {
  req.destroy(new Error('Request timeout while calling Apps Script'));
});

if (body) {
  req.write(body);
}

req.end();
```

});
}
