'use strict';

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000];

class GuardianFlowSDK {
  constructor({ baseUrl = '', apiKey = '', tenantId = '' } = {}) {
    this._baseUrl = baseUrl.replace(/\/$/, '');
    this._apiKey = apiKey;
    this._tenantId = tenantId;
    this._token = null;
  }

  async _request(method, path, body) {
    const url = `${this._baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
    else if (this._apiKey) headers['X-API-Key'] = this._apiKey;

    for (let attempt = 0; attempt <= DEFAULT_RETRY_DELAYS.length; attempt++) {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 429 && attempt < DEFAULT_RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, DEFAULT_RETRY_DELAYS[attempt]));
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GuardianFlowSDK: ${method} ${path} → ${res.status}: ${text}`);
      }
      return res.json();
    }
  }

  // Auth
  async authenticate(email, password) {
    const data = await this._request('POST', '/api/auth/login', { email, password });
    if (data.token) this._token = data.token;
    return data;
  }

  // Work Orders
  async listWorkOrders(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this._request('GET', `/api/work-orders${qs ? '?' + qs : ''}`);
  }
  async getWorkOrder(id) { return this._request('GET', `/api/work-orders/${id}`); }
  async createWorkOrder(data) { return this._request('POST', '/api/work-orders', data); }
  async updateWorkOrderStatus(id, status) { return this._request('PUT', `/api/work-orders/${id}/status`, { status }); }

  // Technicians
  async listTechnicians(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this._request('GET', `/api/technicians${qs ? '?' + qs : ''}`);
  }

  // Assets
  async listAssets(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this._request('GET', `/api/assets${qs ? '?' + qs : ''}`);
  }
  async getAsset(id) { return this._request('GET', `/api/assets/${id}`); }
  async getAssetRUL(id) { return this._request('GET', `/api/assets/${id}/rul`); }

  // IoT
  async registerDevice(data) { return this._request('POST', '/api/iot/devices/register', data); }
  async getDevices() { return this._request('GET', '/api/iot/devices'); }
  async ingestReading(deviceId, metric, value) { return this._request('POST', '/api/iot/readings', { deviceId, metric, value }); }

  // Analytics
  async nlpQuery(question) { return this._request('POST', '/api/analytics/nlp-query', { question }); }

  // Invoices
  async listInvoices(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return this._request('GET', `/api/invoices${qs ? '?' + qs : ''}`);
  }
  async createInvoice(data) { return this._request('POST', '/api/invoices', data); }
}

module.exports = { GuardianFlowSDK };
