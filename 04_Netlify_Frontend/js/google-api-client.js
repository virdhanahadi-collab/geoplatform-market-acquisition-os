// Google API Client for GeoPlatform OS frontend
const GeoAPI = {
  base: '/.netlify/functions/google-api',
  async get(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${this.base}?${qs}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return await res.json();
  },
  async post(action, payload = {}) {
    const res = await fetch(`${this.base}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return await res.json();
  },
  health() { return this.get('health'); },
  getContacts(limit=500) { return this.get('getContacts', { limit }); },
  getAssets() { return this.get('getDriveFiles'); },
  saveFeedback(payload) { return this.post('saveFeedback', payload); }
};
