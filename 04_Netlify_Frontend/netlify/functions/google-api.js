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
received: gasUrl
});
}

if (gasUrl.indexOf('/exec') === -1) {
return jsonResponse(500, {
ok: false,
error: 'Invalid GAS_URL endpoint. URL must include /exec',
received: gasUrl
});
}

try {
var queryString = '';

```
if (event.rawQuery) {
  queryString = String(event.rawQuery);
} else if (event.queryStringParameters) {
  var params = [];
  Object.keys(event.queryStringParameters).forEach(function(key) {
    var value = event.queryStringParameters[key];
    if (value !== undefined && value !== null) {
      params.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });
  queryString = params.join('&');
}

var targetUrl = gasUrl;

if (queryString) {
  targetUrl = gasUrl + '?' + queryString;
}

var fetchOptions = {
  method: event.httpMethod || 'GET',
  redirect: 'follow',
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};

if (event.httpMethod === 'POST') {
  fetchOptions.body = event.body || '{}';
}

var response = await fetch(targetUrl, fetchOptions);
var text = await response.text();

return {
  statusCode: response.status || 200,
  headers: CORS_HEADERS,
  body: text
};
```

} catch (err) {
return jsonResponse(500, {
ok: false,
error: err && err.message ? err.message : String(err),
name: err && err.name ? err.name : '',
cause: err && err.cause && err.cause.message ? err.cause.message : '',
hint: 'Netlify Function failed while calling Apps Script. Check GAS_URL and Apps Script Web App access.',
gasUrl: gasUrl
});
}
};

function jsonResponse(statusCode, obj) {
return {
statusCode: statusCode,
headers: CORS_HEADERS,
body: JSON.stringify(obj, null, 2)
};
}
