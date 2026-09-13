import { useCallback, useEffect, useRef, useState } from "react";
import { salesApi } from "../salesApi";











export const useSalesAnalytics = (filters = {}, options = {}) => {
  const { includeAnalytics = true } = options;

  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setRefreshing(true);
    setError(null);

    try {
      const requests = [salesApi.getOrders(filters)];

      if (includeAnalytics) {
        requests.push(salesApi.getAnalytics(filters));
      }

      const results = await Promise.all(requests);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setOrders(results[0]);

      if (includeAnalytics) {
        setAnalytics(results[1]);
      }
    } catch (requestError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(requestError?.message || "Unable to load sales data.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters, includeAnalytics]);

  useEffect(() => {
    setLoading(true);
    refresh();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refresh]);

  const updateStatus = useCallback(async (orderId, status) => {
    const updated = await salesApi.updateStatus(orderId, status);

    setOrders((current) =>
      current.map((order) => (order.id === orderId ? updated : order)),
    );

    return updated;
  }, []);

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
