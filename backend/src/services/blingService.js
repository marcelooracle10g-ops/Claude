const axios = require('axios');
const { getDb } = require('../config/database');

const BLING_API_URL = process.env.BLING_API_URL || 'https://www.bling.com.br/Api/v3';

class BlingService {
  constructor() {
    this.client = axios.create({
      baseURL: BLING_API_URL,
      timeout: 30000,
    });

    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await this.refreshAccessToken();
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.getAccessToken()}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            throw new Error('Falha na autenticação com o Bling. Reconfigure as credenciais.');
          }
        }
        throw error;
      }
    );
  }

  getAccessToken() {
    const db = getDb();
    const row = db.prepare('SELECT access_token FROM bling_tokens WHERE id = 1').get();
    if (row) return row.access_token;
    return process.env.BLING_ACCESS_TOKEN || null;
  }

  async refreshAccessToken() {
    const db = getDb();
    const row = db.prepare('SELECT refresh_token FROM bling_tokens WHERE id = 1').get();
    const refreshToken = row?.refresh_token || process.env.BLING_REFRESH_TOKEN;

    if (!refreshToken) {
      throw new Error('Refresh token não disponível');
    }

    const clientId = process.env.BLING_CLIENT_ID;
    const clientSecret = process.env.BLING_CLIENT_SECRET;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post('https://www.bling.com.br/Api/v3/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO bling_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(access_token, refresh_token, expiresAt);

    return access_token;
  }

  // === PRODUTOS ===
  async getProducts(page = 1, limit = 100, search = '') {
    try {
      const params = { pagina: page, limite: limit };
      if (search) {
        params.nome = search;
      }
      const response = await this.client.get('/produtos', { params });
      return response.data?.data || [];
    } catch (error) {
      console.error('Erro ao buscar produtos no Bling:', error.message);
      throw new Error('Erro ao buscar produtos do Bling');
    }
  }

  async getProductById(id) {
    try {
      const response = await this.client.get(`/produtos/${id}`);
      return response.data?.data;
    } catch (error) {
      console.error('Erro ao buscar produto:', error.message);
      throw new Error('Erro ao buscar produto do Bling');
    }
  }

  // === TABELAS DE PREÇO ===
  async getPriceTables() {
    try {
      const response = await this.client.get('/produtos/tabelasdeprecos');
      return response.data?.data || [];
    } catch (error) {
      console.error('Erro ao buscar tabelas de preço:', error.message);
      throw new Error('Erro ao buscar tabelas de preço do Bling');
    }
  }

  async getPriceTableProducts(priceTableId, page = 1) {
    try {
      const response = await this.client.get(`/produtos/tabelasdeprecos/${priceTableId}/produtos`, {
        params: { pagina: page, limite: 100 },
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Erro ao buscar produtos da tabela de preço:', error.message);
      throw new Error('Erro ao buscar preços da tabela');
    }
  }

  // === CLIENTES ===
  async getCustomers(page = 1, search = '') {
    try {
      const params = { pagina: page, limite: 100 };
      if (search) {
        params.nome = search;
      }
      const response = await this.client.get('/contatos', { params });
      return response.data?.data || [];
    } catch (error) {
      console.error('Erro ao buscar clientes no Bling:', error.message);
      throw new Error('Erro ao buscar clientes do Bling');
    }
  }

  async getCustomerById(id) {
    try {
      const response = await this.client.get(`/contatos/${id}`);
      return response.data?.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error.message);
      throw new Error('Erro ao buscar cliente do Bling');
    }
  }

  async createCustomerInBling(customerData) {
    try {
      const payload = {
        nome: customerData.name,
        fantasia: customerData.trade_name || '',
        tipoPessoa: customerData.cnpj_cpf?.length > 14 ? 'J' : 'F',
        numeroDocumento: customerData.cnpj_cpf || '',
        email: customerData.email || '',
        telefone: customerData.phone || '',
        endereco: {
          endereco: customerData.address || '',
          cidade: customerData.city || '',
          uf: customerData.state || '',
          cep: customerData.zip_code || '',
          bairro: customerData.neighborhood || '',
        },
      };

      const response = await this.client.post('/contatos', payload);
      return response.data?.data;
    } catch (error) {
      console.error('Erro ao criar cliente no Bling:', error.message);
      throw new Error('Erro ao criar cliente no Bling');
    }
  }

  // === PEDIDOS ===
  async createOrder(orderData) {
    try {
      const payload = {
        data: new Date().toISOString().split('T')[0],
        contato: {
          id: parseInt(orderData.bling_customer_id),
        },
        itens: orderData.items.map((item) => ({
          produto: { id: parseInt(item.bling_product_id) },
          quantidade: item.quantity,
          valor: item.unit_price,
          desconto: item.discount || 0,
        })),
        observacoes: orderData.notes || '',
        observacoesInternas: `Pedido via App - Rep: ${orderData.representative_name}`,
      };

      if (orderData.price_table_id) {
        payload.tabelaPreco = { id: parseInt(orderData.price_table_id) };
      }

      const response = await this.client.post('/pedidos/vendas', payload);
      return response.data?.data;
    } catch (error) {
      console.error('Erro ao criar pedido no Bling:', error.message);
      const msg = error.response?.data?.error?.message || 'Erro ao criar pedido no Bling';
      throw new Error(msg);
    }
  }

  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/pedidos/vendas/${orderId}`);
      return response.data?.data;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error.message);
      throw new Error('Erro ao buscar pedido do Bling');
    }
  }
}

module.exports = new BlingService();
