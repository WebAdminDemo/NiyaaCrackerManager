import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { salesApi } from "../salesApi";

const CACHE_TTL = 8000;
const cache = new Map();

const getCacheKey = (filters) => JSON.stringify(filters || {});

const getOrderDate = (order) => {
  const value = order?.orderDate || order?.createdAt;
  const date = dayjs(value);
  return date.isValid() ? date : null;
};

// Keep the date filter active even when the API returns extra rows.
const filterOrders = (orders, filters = {}) => {
  const start = filters.startDate ? dayjs(filters.startDate) : null;
  const end = filters.endDate ? dayjs(filters.endDate) : null;
  const search = String(filters.search || "").trim().toLowerCase();

  return orders.filter((order) => {
    const orderDate = getOrderDate(order);

    if (start?.isValid() && (!orderDate || orderDate.isBefore(start))) {
      return false;
    }

    if (end?.isValid() && (!orderDate || orderDate.isAfter(end))) {
      return false;
    }

    if (filters.status && order.status !== filters.status) {
      return false;
    }

    if (filters.category) {
      const hasCategory = (order.items || []).some(
        (item) => item.category === filters.category,
      );

      if (!hasCategory) return false;
    }

    if (filters.channel && order.channel !== filters.channel) {
      return false;
    }

    if (search) {
      const values = [
        order.id,
        order.ref,
        order.customerName,
        order.customerPhone,
        order.customer?.name,
        order.customer?.phone,
        ...(order.items || []).flatMap((item) => [
          item.name,
          item.productName,
          item.category,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!values.includes(search)) return false;
    }

    return true;
  });
};

const customerKey = (order) => {
  const phone = String(
    order.customerPhone || order.customer?.phone || "",
  ).replace(/\D/g, "");

  if (phone.length >= 10) return phone.slice(-10);

  return String(
    order.customerName || order.customer?.name || "walk-in",
  )
    .trim()
    .toLowerCase();
};

const buildAnalytics = (orders) => {
  const statusCounts = {};
  const categoryRevenue = {};
  const channelDistribution = {};
  const productMap = new Map();
  const customerMap = new Map();
  const dailyMap = new Map();

  let totalRevenue = 0;
  let totalQuantity = 0;

  orders.forEach((order) => {
    const amount = Number(order.totalAmount || 0);
    const quantity = Number(
      order.totalQuantity ||
        (order.items || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        ),
    );

    totalRevenue += amount;
    totalQuantity += quantity;

    const status = order.status || "pending";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const channel = order.channel || "Unknown";
    channelDistribution[channel] =
      (channelDistribution[channel] || 0) + 1;

    (order.items || []).forEach((item) => {
      const name = item.name || item.productName || item.title || "Item";
      const itemQty = Number(item.quantity || 0);
      const itemRevenue = Number(
        item.total || item.price || 0,
      ) * (item.total ? 1 : itemQty);
      const category = item.category || "Uncategorised";

      categoryRevenue[category] =
        (categoryRevenue[category] || 0) + itemRevenue;

      const product = productMap.get(name) || {
        name,
        quantity: 0,
        revenue: 0,
        category,
      };

      product.quantity += itemQty;
      product.revenue += itemRevenue;
      productMap.set(name, product);
    });

    const key = customerKey(order);
    const existing = customerMap.get(key) || {
      name: order.customerName || order.customer?.name || "Walk-in customer",
      phone: order.customerPhone || order.customer?.phone || "—",
      orders: 0,
      units: 0,
      revenue: 0,
      lastOrder: null,
    };

    existing.orders += 1;
    existing.units += quantity;
    existing.revenue += amount;

    const orderDate = getOrderDate(order);
    if (
      orderDate &&
      (!existing.lastOrder || orderDate.isAfter(dayjs(existing.lastOrder)))
    ) {
      existing.lastOrder = orderDate.toISOString();
    }

    customerMap.set(key, existing);

    if (orderDate) {
      const day = orderDate.format("YYYY-MM-DD");
      dailyMap.set(day, (dailyMap.get(day) || 0) + amount);
    }
  });

  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const dailyRevenue = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  return {
    totalRevenue,
    totalOrders: orders.length,
    totalQuantity,
    totalCustomers: customerMap.size,
    statusCounts,
    categoryRevenue: Object.entries(categoryRevenue).sort(
      ([, a], [, b]) => b - a,
    ),
    channelDistribution,
    topProducts,
    topCustomers,
    dailyRevenue,
  };
};

export const useSalesAnalytics = (filters = {}, options = {}) => {
  const { includeAnalytics = true } = options;
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef(null);

  const refresh = useCallback(
    async (force = false) => {
      controllerRef.current?.abort();

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const cacheKey = getCacheKey(filters);
      const cached = cache.get(cacheKey);

      if (!force && cached && Date.now() - cached.time < CACHE_TTL) {
        setOrders(cached.orders);
        if (includeAnalytics) setAnalytics(cached.analytics);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      setRefreshing(true);
      setError(null);

      try {
        const result = await salesApi.getOrders(filters, controller.signal);

        if (requestId !== requestIdRef.current) return;

        const nextOrders = filterOrders(result, filters);
        const nextAnalytics = includeAnalytics
          ? buildAnalytics(nextOrders)
          : null;

        cache.set(cacheKey, {
          time: Date.now(),
          orders: nextOrders,
          analytics: nextAnalytics,
        });

        setOrders(nextOrders);
        if (includeAnalytics) setAnalytics(nextAnalytics);
      } catch (requestError) {
        if (requestId !== requestIdRef.current) return;

        if (
          requestError?.code === "ERR_CANCELED" ||
          requestError?.name === "CanceledError" ||
          requestError?.name === "AbortError"
        ) {
          return;
        }

        setError(requestError?.message || "Unable to load sales data.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filters, includeAnalytics],
  );

  useEffect(() => {
    if (!orders.length && !analytics) {
      setLoading(true);
    }

    refresh(false);

    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [refresh]);

  const updateStatus = useCallback(
    async (orderId, status) => {
      const updated = await salesApi.updateStatus(orderId, status);

      setOrders((current) => {
        const next = current.map((order) =>
          order.id === orderId ? updated : order,
        );

        if (includeAnalytics) {
          setAnalytics(buildAnalytics(next));
        }

        return next;
      });

      return updated;
    },
    [includeAnalytics],
  );

  return {
    orders,
    analytics,
    loading,
    refreshing,
    error,
    refresh,
    updateStatus,
  };
};
