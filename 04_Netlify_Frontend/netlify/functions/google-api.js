// Netlify Function proxy for Google Apps Script API
// File: netlify/functions/google-api.js
// Required environment variable: GAS_URL = your deployed Apps Script Web App URL

exports.handler = async function(event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const gasUrl = process.env.GAS_URL;
  if (!gasUrl) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok:false, error:'Missing GAS_URL environment variable' }) };
  }

  try {
    const query = event.rawQuery ? ('?' + event.rawQuery) : '';
    const targetUrl = gasUrl + query;
    const options = { method: event.httpMethod };
    if (event.httpMethod === 'POST') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = event.body || '{}';
    }
    const res = await fetch(targetUrl, options);
    const text = await res.text();
    return { statusCode: res.status, headers: corsHeaders, body: text };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok:false, error:String(err) }) };
  }
};
