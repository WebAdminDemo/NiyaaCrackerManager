import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, categories: [], outOfStock: 0 });
  const [loading, setLoading] = useState(true);

  
  const computeStats = useCallback((productList) => {
    const total = productList.length;
    const categories = [...new Set(productList.map((p) => p.category).filter(Boolean))];
    const outOfStock = productList.filter((p) => p.status === 'no_stock').length;
    return { total, categories, outOfStock };
  }, []);

  
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
      
    } finally {
      setLoading(false);
    }
  }, [computeStats]);

  
  const updateProducts = useCallback((productList) => {
    setProducts(productList);
    setStats(computeStats(productList));
  }, [computeStats]);

  
  const refreshProducts = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  
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