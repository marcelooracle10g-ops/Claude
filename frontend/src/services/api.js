const API_BASE = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  // Auth
  login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  getMe() {
    return this.get('/auth/me');
  }

  // Products
  getProducts(params) {
    return this.get('/products', params);
  }

  getPriceTables() {
    return this.get('/products/price-tables');
  }

  getPriceTableProducts(tableId, page) {
    return this.get(`/products/price-tables/${tableId}/products`, { page });
  }

  // Customers
  getCustomers(params) {
    return this.get('/customers', params);
  }

  searchBlingCustomers(params) {
    return this.get('/customers/bling/search', params);
  }

  createCustomer(data) {
    return this.post('/customers', data);
  }

  importCustomerFromBling(blingId) {
    return this.post('/customers/import-from-bling', { bling_id: blingId });
  }

  syncCustomerToBling(id) {
    return this.post(`/customers/${id}/sync-to-bling`);
  }

  // Orders
  getOrders(params) {
    return this.get('/orders', params);
  }

  getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  createOrder(data) {
    return this.post('/orders', data);
  }

  sendOrderToBling(id) {
    return this.post(`/orders/${id}/send-to-bling`);
  }

  updateOrderStatus(id, status) {
    return this.patch(`/orders/${id}/status`, { status });
  }

  // Commissions
  getCommissions(params) {
    return this.get('/commissions', params);
  }

  getCommissionSummary(params) {
    return this.get('/commissions/summary', params);
  }

  scheduleCommission(id, paymentDate) {
    return this.patch(`/commissions/${id}/schedule`, { payment_date: paymentDate });
  }

  batchScheduleCommissions(ids, paymentDate) {
    return this.post('/commissions/batch-schedule', { commission_ids: ids, payment_date: paymentDate });
  }

  markCommissionPaid(id) {
    return this.patch(`/commissions/${id}/pay`);
  }

  batchPayCommissions(ids) {
    return this.post('/commissions/batch-pay', { commission_ids: ids });
  }

  // Admin
  getDashboard(params) {
    return this.get('/admin/dashboard', params);
  }

  getRepresentatives() {
    return this.get('/admin/representatives');
  }

  createRepresentative(data) {
    return this.post('/admin/representatives', data);
  }

  updateRepresentative(id, data) {
    return this.put(`/admin/representatives/${id}`, data);
  }

  getBrands() {
    return this.get('/admin/brands');
  }
}

const api = new ApiService();
export default api;
