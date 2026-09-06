import { useCallback, useEffect, useState } from 'react';
import { salesApi } from '../salesApi';

export const useSalesAnalytics = (filters) => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOrders, nextAnalytics, nextTopCustomers] = await Promise.all([
        salesApi.getOrders(filters),
        salesApi.getAnalytics(filters),
        salesApi.getTopCustomers(),
      ]);
      setOrders(nextOrders);
      setAnalytics(nextAnalytics);
      setTopCustomers(nextTopCustomers);
      setError(null);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load sales data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(async (orderId, status) => {
    const updated = await salesApi.updateStatus(orderId, status);
    setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
    await refresh();
    return updated;
  }, [refresh]);

  return { orders, analytics, loading, error, refresh, updateStatus, topCustomers };
};