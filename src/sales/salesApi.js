
import api from '../../api/api';
import { normalizeBrand, getBrandStatus } from '../utils/common.properties';

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      params.append(key, value);
    }
  });

  return params.toString()
    ? `?${params.toString()}`
    : '';
};

const normalizeOrder = (order = {}) => ({
  ...order,
  customer: {
    name:
      order.partyName ||
      order.customerName ||
      '',
    phone:
      order.partyNumber ||
      order.customerPhone ||
      '',
    address:
      order.partyAddress ||
      order.customerAddress ||
      order.customer?.address ||
      '',
  },
  partyName:
    order.partyName ||
    order.customerName ||
    '',
  partyNumber:
    order.partyNumber ||
    order.customerPhone ||
    '',
  partyAddress:
    order.partyAddress ||
    order.customerAddress ||
    order.customer?.address ||
    '',
  partySector: order.partySector || '',
  partyCountry:
    order.partyCountry ||
    '',
  partyState: order.partyState || '',
  partyDistrict: order.partyDistrict || '',
  partyLocality: order.partyLocality || '',
  partyPincode: order.partyPincode || '',
  customerName:
    order.partyName ||
    order.customerName ||
    '',
  customerPhone:
    order.partyNumber ||
    order.customerPhone ||
    '',
  customerAddress:
    order.partyAddress ||
    order.customerAddress ||
    order.customer?.address ||
    '',
  orderDate:
    order.orderDate ||
    order.createdAt,
  createdAt:
    order.createdAt ||
    order.orderDate,
  totalAmount: Number(
    order.totalAmount || 0,
  ),
  totalItems: Number(
    order.totalItems || 0,
  ),
  totalQuantity: Number(
    order.totalQuantity ??
      (order.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0,
      ),
  ),
  items: (order.items || []).map(
    (item) => ({
      ...item,
      productId:
        item.productId ||
        item.product_id,
      price: Number(item.price || 0),
      quantity: Number(item.quantity ?? 0),
      total: Number(
        item.total ??
          Number(item.price || 0) *
            Number(item.quantity || 0),
      ),
      category:
        item.category ||
        'Uncategorised',
      stockQuantity:
        item.stockQuantity === null ||
        item.stockQuantity === undefined
          ? null
          : Number(item.stockQuantity),
      brand: normalizeBrand(item.brand),
      brandStatus: getBrandStatus(item.brand),
    }),
  ),
});

export const salesApi = {
  async getOrders(filters = {}) {
    const response = await api.get(
      `/sales/orders${buildQuery(filters)}`,
    );

    return Array.isArray(response.data)
      ? response.data.map(normalizeOrder)
      : [];
  },

  async getAnalytics(filters = {}) {
    const response = await api.get(
      `/sales/analytics${buildQuery(filters)}`,
    );

    const data = response.data || {};

    return {
      totalRevenue: Number(
        data.totalRevenue || 0,
      ),
      totalOrders: Number(
        data.totalOrders || 0,
      ),
      totalQuantity: Number(
        data.totalQuantity || 0,
      ),
      totalCustomers: Number(
        data.totalCustomers || 0,
      ),
      statusCounts:
        data.statusCounts || {},
      categoryRevenue: Object.entries(
        data.categoryRevenue || {},
      ),
      channelDistribution:
        data.channelDistribution || {},
      topProducts: Array.isArray(
        data.topProducts,
      )
        ? data.topProducts
        : [],
      topCustomers: Array.isArray(
        data.topCustomers,
      )
        ? data.topCustomers
        : [],
      dailyRevenue: Array.isArray(
        data.dailyRevenue,
      )
        ? data.dailyRevenue
        : [],
    };
  },

  async updateStatus(orderId, status) {
    const response = await api.patch(
      `/sales/orders/${encodeURIComponent(orderId)}/status`,
      { status },
    );

    return normalizeOrder(response.data);
  },

  async updateItems(orderId, items) {
    const response = await api.patch(
      `/sales/orders/${encodeURIComponent(orderId)}/items`,
      { items },
    );

    return normalizeOrder(response.data);
  },

  async updateOrder(
    orderId,
    details,
    items,
  ) {
    const response = await api.put(
      `/sales/orders/${encodeURIComponent(orderId)}`,
      {
        details,
        items,
      },
    );

    return normalizeOrder(response.data);
  },

  async getTopCustomers() {
    const response = await api.get(
      '/sales/top-customers',
    );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },
};
