import api from '../../api/api';

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
};

const normalizeOrder = (order) => ({
  ...order,
  customer: {
    name: order.customerName || 'Walk‑in customer',
    phone: order.customerPhone || '—',
  },
  customerName: order.customerName || 'Walk‑in customer',
  customerPhone: order.customerPhone || '—',
  orderDate: order.orderDate || order.createdAt,
  createdAt: order.createdAt || order.orderDate,
  totalAmount: Number(order.totalAmount || 0),
  totalItems: Number(order.totalItems || 0),
  totalQuantity: Number(order.totalQuantity || 0),
  items: (order.items || []).map((item) => ({
    ...item,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1),
    total: Number(item.total || 0),
    category: item.category || 'Uncategorised',
  })),
});

export const salesApi = {
  async getOrders(filters = {}, signal) {
    const response = await api.get(`/sales/orders${buildQuery(filters)}`, { signal });
    return Array.isArray(response.data) ? response.data.map(normalizeOrder) : [];
  },

  async getAnalytics(filters = {}, signal) {
    const response = await api.get(`/sales/analytics${buildQuery(filters)}`, { signal });
    const data = response.data;
    return {
      totalRevenue: Number(data.totalRevenue || 0),
      totalOrders: Number(data.totalOrders || 0),
      totalQuantity: Number(data.totalQuantity || 0),
      totalCustomers: Number(data.totalCustomers || 0),
      statusCounts: data.statusCounts || {},
      categoryRevenue: Object.entries(data.categoryRevenue || {}),
      channelDistribution: data.channelDistribution || {},
      topProducts: data.topProducts || [],
      topCustomers: data.topCustomers || [],
      dailyRevenue: data.dailyRevenue || [],
    };
  },

  async updateStatus(orderId, status) {
    const response = await api.patch(`/sales/orders/${encodeURIComponent(orderId)}/status`, { status });
    return normalizeOrder(response.data);
  },

  async getTopCustomers() {
    const response = await api.get('/sales/top-customers');
    return Array.isArray(response.data) ? response.data : [];
  },
};