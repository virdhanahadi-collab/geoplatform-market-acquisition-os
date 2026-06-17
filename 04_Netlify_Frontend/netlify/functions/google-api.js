const https = require('https');
const { URL } = require('url');

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

const gasUrl = (process.env.GAS_URL || '').trim();

if (!gasUrl) {
return jsonResponse(500, {
ok: false,
error: 'Missing GAS_URL environment variable'
});
}

if (!gasUrl.startsWith('https://script.google.com/macros/s/')) {
return jsonResponse(500, {
ok: false,
error: 'Invalid GAS_URL format',
hint: 'GAS_URL must start with https://script.google.com/macros/s/ and end with /exec',
receivedPrefix: gasUrl.slice(0, 60)
});
}

try {
const query = event.rawQuery ? `?${event.rawQuery}` : '';
const targetUrl = `${gasUrl}${query}`;

```
const upstream = await requestWithRedirects(targetUrl, {
  method: event.httpMethod,
  body: event.httpMethod === 'POST' ? (event.body || '{}') : null,
  headers: event.httpMethod === 'POST'
    ? { 'Content-Type': 'application/json' }
    : {}
}, 5);

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
hint: 'Netlify Function reached GAS_URL but failed to fetch Apps Script. Check URL, deployment access, and redirect handling.',
gasUrlPrefix: gasUrl.slice(0, 80)
});
}
};

function jsonResponse(statusCode, obj) {
return {
statusCode,
headers: CORS_HEADERS,
body: JSON.stringify(obj, null, 2)
};
}

function requestWithRedirects(url, options, redirectsLeft) {
return new Promise((resolve, reject) => {
const parsed = new URL(url);

```
const requestOptions = {
  protocol: parsed.protocol,
  hostname: parsed.hostname,
  path: `${parsed.pathname}${parsed.search}`,
  method: options.method || 'GET',
  headers: options.headers || {}
};

const req = https.request(requestOptions, (res) => {
  const statusCode = res.statusCode || 0;
  const location = res.headers.location;

  if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
    if (redirectsLeft <= 0) {
      reject(new Error('Too many redirects from Apps Script.'));
      return;
    }

    const nextUrl = new URL(location, url).toString();
    resolve(requestWithRedirects(nextUrl, options, redirectsLeft - 1));
    return;
  }

  let body = '';

  res.setEncoding('utf8');

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    resolve({
      statusCode,
      headers: res.headers,
      body
    });
  });
});

req.on('error', (err) => {
  reject(err);
});

req.setTimeout(30000, () => {
  req.destroy(new Error('Request timeout while calling Apps Script.'));
});

if (options.body) {
  req.write(options.body);
}

req.end();
```

});
}
