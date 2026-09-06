import api from '../../../api/api';

export const getProducts = () => api.get('/products');

export const createProduct = (product) => api.post('/products', product);

export const updateProduct = (rowid, product) =>
  api.put(`/products/${rowid}`, product);

export const deleteProduct = (rowid) =>
  api.delete(`/products/${rowid}`);

export const updateProductStatus = (rowid, status) =>
  api.patch(`/products/${rowid}/status`, { status });