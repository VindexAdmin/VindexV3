// Vindex Chain API Client
export class VindexAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL;
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('vindex_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Authentication methods
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getProfile() {
    return this.request('/api/auth/me');
  }

  async createWallet(name?: string) {
    return this.request('/api/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getWallets() {
    return this.request('/api/auth/wallets');
  }

  // Blockchain methods
  async getBlockchainInfo() {
    return this.request('/api/blockchain/info');
  }

  async getBlocks(limit = 10, offset = 0) {
    return this.request(`/api/blocks?limit=${limit}&offset=${offset}`);
  }

  async getBlock(identifier: string | number) {
    return this.request(`/api/blocks/${identifier}`);
  }

  async sendTransaction(transaction: any) {
    return this.request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async getTransactionPool() {
    return this.request('/api/transactions/pending');
  }

  async getBalance(address: string) {
    return this.request(`/api/balance/${address}`);
  }

  async mineBlock() {
    return this.request('/api/mine', { method: 'POST' });
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vindex_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vindex_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export default VindexAPI;
