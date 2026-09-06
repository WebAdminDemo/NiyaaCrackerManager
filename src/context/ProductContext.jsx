import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, categories: [], outOfStock: 0 });
  const [loading, setLoading] = useState(true);

  // Compute statistics from a product array
  const computeStats = useCallback((productList) => {
    const total = productList.length;
    const categories = [...new Set(productList.map((p) => p.category).filter(Boolean))];
    const outOfStock = productList.filter((p) => p.status === 'no_stock').length;
    return { total, categories, outOfStock };
  }, []);

  // Fetch products from the backend
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
      setStats(computeStats(data));
    } catch (error) {
      console.error('Error loading products:', error);
      // Optionally set an error state here
    } finally {
      setLoading(false);
    }
  }, [computeStats]);

  // Update products from an external source (e.g., after CRUD operations)
  const updateProducts = useCallback((productList) => {
    setProducts(productList);
    setStats(computeStats(productList));
  }, [computeStats]);

  // Refresh products (re-fetch from API)
  const refreshProducts = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const value = {
    products,
    stats,
    loading,
    refreshProducts,
    updateProducts,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};