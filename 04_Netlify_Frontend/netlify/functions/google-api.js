const https = require('https');

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

  const gasUrl = String(process.env.GAS_URL || '').trim();

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
    const queryString = buildQueryString(event);
    const targetUrl = queryString ? gasUrl + '?' + queryString : gasUrl;
    const method = event.httpMethod || 'GET';
    const body = method === 'POST' ? (event.body || '{}') : null;
    const upstream = await requestWithRedirects(targetUrl, method, body, 10);

    return {
      statusCode: upstream.statusCode || 200,
      headers: CORS_HEADERS,
      body: upstream.body || ''
    };
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: err && err.message ? err.message : String(err),
      name: err && err.name ? err.name : '',
      hint: 'Netlify Function failed while calling Apps Script.',
      gasUrl: gasUrl
    });
  }
};

function buildQueryString(event) {
  if (event && event.rawQuery) {
    return String(event.rawQuery);
  }

  const params = event && event.queryStringParameters ? event.queryStringParameters : {};
  const parts = [];

  Object.keys(params).forEach(function(key) {
    const value = params[key];

    if (value !== undefined && value !== null) {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });

  return parts.join('&');
}

function requestWithRedirects(targetUrl, method, body, redirectsLeft) {
  return new Promise(function(resolve, reject) {
    let parsed;

    try {
      parsed = new URL(targetUrl);
    } catch (err) {
      reject(new Error('Invalid target URL: ' + targetUrl));
      return;
    }

    const headers = {};

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      headers['Content-Length'] = Buffer.byteLength(body || '{}');
    }

    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: headers
    };

    const req = https.request(options, function(res) {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;

      if (
        location &&
        (statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308)
      ) {
        if (redirectsLeft <= 0) {
          reject(new Error('Too many redirects from Apps Script'));
          return;
        }

        const nextUrl = new URL(location, targetUrl).toString();

        requestWithRedirects(nextUrl, method, body, redirectsLeft - 1)
          .then(resolve)
          .catch(reject);

        return;
      }

      let responseBody = '';

      res.setEncoding('utf8');

      res.on('data', function(chunk) {
        responseBody += chunk;
      });

      res.on('end', function() {
        resolve({
          statusCode: statusCode,
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

    if (method === 'POST') {
      req.write(body || '{}');
    }

    req.end();
  });
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode: statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(obj, null, 2)
  };
}
