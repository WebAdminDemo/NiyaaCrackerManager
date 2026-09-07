import api from '../../../api/api';

export const getProducts = () => api.get('/products');

export const createProduct = (product) => api.post('/products', product);

export const updateProduct = (rowid, product) =>
  api.put(`/products/${encodeURIComponent(rowid)}`, product);

export const deleteProduct = (rowid) =>
  api.delete(`/products/${encodeURIComponent(rowid)}`);

export const updateProductStatus = (rowid, status) =>
  api.patch(`/products/${encodeURIComponent(rowid)}/status`, { status });

// Excel import/replacement uses the existing POST /products endpoint.
// A normal product is still sent as an object; Excel sends an array.
export const replaceAllProducts = (products) =>
  api.post('/products', products, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });
