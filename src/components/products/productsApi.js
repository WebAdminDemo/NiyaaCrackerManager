import api from '../../../api/api';

export const getProducts = () => api.get('/products');

export const createProduct = (product) => api.post('/products', product);

export const updateProduct = (rowid, product) =>
  api.put(`/products/${encodeURIComponent(rowid)}`, product);

export const deleteProduct = (rowid) =>
  api.delete(`/products/${encodeURIComponent(rowid)}`);

export const updateProductStatus = (rowid, status) =>
  api.patch(`/products/${encodeURIComponent(rowid)}/status`, { status });


export const replaceAllProducts = (products) =>
  api.post('/products/import', products);
