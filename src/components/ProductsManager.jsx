import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Row, Col, Form, Button, InputGroup, Badge, Card, Modal } from 'react-bootstrap';
import Select from 'react-select';
import ProductModal from './ProductModal';
import AlertModal from './AlertModal';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  replaceAllProducts,
} from './products/productsApi';
import { formatINR } from '../utils/utils';
import { reactSelectStyles, portalSelectProps } from '../utils/selectStyles';
import ExportImport from './ExportImport';
import { exportProductsToExcel, parseProductsExcel } from './products/productExcel';

const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#f0edf5"/>
      <text x="200" y="150" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="24" fill="#6C5CE7">No Image</text>
    </svg>
  `);
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'no_stock', label: 'Out of Stock' },
];

function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => ({
    ...p,
    rowid: p.rowid || p.id,
    name: p.name ?? '',
    category: p.category ?? '',
    amount: p.amount ?? 0,
    price: p.price ?? 0,
    image: p.image ?? '',
    contents: p.contents ?? '',
    discount_percent: Number(p.discountPercent ?? p.discount_percent) || 0,
    status: p.status === 'no_stock' ? 'no_stock' : 'in_stock',
  }));
}

function buildImportPayload(product) {
  return {
    ...product,
    discountPercent: Number(product.discountPercent ?? product.discount_percent ?? 0),
    discount_percent: Number(product.discountPercent ?? product.discount_percent ?? 0),
    amount: Number(product.amount ?? 0),
    price: Number(product.price ?? 0),
    taxRate: Number(product.taxRate ?? 0),
    minOrderQty: Number(product.minOrderQty ?? 1),
    stockQuantity: product.stockQuantity === null || product.stockQuantity === '' ? null : Number(product.stockQuantity),
    maxOrderQty: product.maxOrderQty === null || product.maxOrderQty === '' ? null : Number(product.maxOrderQty),
    tags: Array.isArray(product.tags) ? product.tags : [],
    uiFlags: product.uiFlags || { featured: false, hidden: false },
  };
}


function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export default function ProductManager({
  filterCategory: propFilterCategory = null,
  filterStatus: propFilterStatus = null,
  soldProductNames: propSoldProductNames = [],
  onClearExternalFilters,
  onProductsLoaded,
  showAlert,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [internalCategory, setInternalCategory] = useState(propFilterCategory || '');
  const [internalStatus, setInternalStatus] = useState(propFilterStatus || '');
  const soldProductSet = useMemo(
    () => new Set((Array.isArray(propSoldProductNames) ? propSoldProductNames : []).map(normalizeText)),
    [propSoldProductNames],
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [alert, setAlert] = useState({
    show: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'OK',
    onConfirm: null,
    showCancel: false,
    cancelText: 'Cancel',
    onCancel: null,
  });

  const deleteProcessingRef = useRef(false);

  // Sync external filters
  useEffect(() => {
    setInternalCategory(propFilterCategory || '');
  }, [propFilterCategory]);

  useEffect(() => {
    setInternalStatus(propFilterStatus || '');
  }, [propFilterStatus]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProducts();
      const normalized = normalizeProducts(response.data);
      setProducts(normalized);
      const uniqueCategories = [...new Set(normalized.map((p) => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      setError(null);
      if (onProductsLoaded) onProductsLoaded(normalized);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.response?.data?.message || 'Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [onProductsLoaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Alert helper using parent's showAlert if provided, otherwise local
  const showLocalAlert = useCallback((title, message, variant = 'info', confirmText = 'OK') => {
    if (showAlert) {
      showAlert(title, message, variant, confirmText);
    } else {
      setAlert({
        show: true,
        title,
        message,
        variant,
        confirmText,
        showCancel: false,
        onConfirm: () => setAlert((prev) => ({ ...prev, show: false })),
      });
    }
  }, [showAlert]);

  // CRUD handlers
  const handleAdd = useCallback(
    async (payload) => {
      setIsSaving(true);
      try {
        const response = await createProduct(payload);
        const newProduct = response.data;
        setProducts((prev) => [...prev, newProduct]);
        setCategories((prev) => [...new Set([...prev, newProduct.category].filter(Boolean))]);
        showLocalAlert('Success', 'Product added successfully', 'success');
      } catch (err) {
        console.error('Add error:', err);
        const msg = err.response?.data?.message || 'Failed to add product.';
        showLocalAlert('Error', msg, 'danger');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [showLocalAlert]
  );

  const handleUpdate = useCallback(
    async (payload) => {
      const { rowid, ...updates } = payload;
      if (!rowid) return;
      setIsSaving(true);
      try {
        const response = await updateProduct(rowid, updates);
        const updatedProduct = response.data;
        setProducts((prev) => prev.map((p) => (p.rowid === rowid ? updatedProduct : p)));
        setCategories((prev) => [...new Set(prev.concat(updatedProduct.category).filter(Boolean))]);
        showLocalAlert('Success', 'Product updated successfully', 'success');
      } catch (err) {
        console.error('Update error:', err);
        const msg = err.response?.data?.message || 'Failed to update product.';
        showLocalAlert('Error', msg, 'danger');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [showLocalAlert]
  );

  const handleDelete = useCallback(
    (rowid) => {
      if (deleteProcessingRef.current) return;
      deleteProcessingRef.current = true;

      setAlert({
        show: true,
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this product?',
        variant: 'danger',
        confirmText: 'Delete',
        showCancel: true,
        cancelText: 'Cancel',
        onConfirm: async () => {
          setAlert((prev) => ({ ...prev, show: false }));
          setDeleting(true);
          try {
            await deleteProduct(rowid);
            setProducts((prev) => prev.filter((p) => p.rowid !== rowid));
            const remaining = products.filter((p) => p.rowid !== rowid);
            setCategories([...new Set(remaining.map((p) => p.category).filter(Boolean))]);
            showLocalAlert('Success', 'Product deleted successfully', 'success');
          } catch (err) {
            console.error('Delete error:', err);
            const msg = err.response?.data?.message || 'Failed to delete product.';
            showLocalAlert('Error', msg, 'danger');
          } finally {
            setDeleting(false);
            deleteProcessingRef.current = false;
          }
        },
        onCancel: () => {
          setAlert((prev) => ({ ...prev, show: false }));
          deleteProcessingRef.current = false;
        },
      });
    },
    [products, showLocalAlert]
  );

  const handleToggleStatus = useCallback(
    async (rowid) => {
      const product = products.find((p) => p.rowid === rowid);
      if (!product) return;
      const newStatus = product.status === 'in_stock' ? 'no_stock' : 'in_stock';
      setIsSaving(true);
      try {
        const response = await updateProductStatus(rowid, newStatus);
        const updatedProduct = response.data;
        setProducts((prev) => prev.map((p) => (p.rowid === rowid ? updatedProduct : p)));
        showLocalAlert('Success', 'Status updated', 'success');
      } catch (err) {
        console.error('Status toggle error:', err);
        const msg = err.response?.data?.message || 'Failed to update status.';
        showLocalAlert('Error', msg, 'danger');
      } finally {
        setIsSaving(false);
      }
    },
    [products, showLocalAlert]
  );

  // Modal open/close
  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setShowProductModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setShowProductModal(false);
    setEditingProduct(null);
  }, []);

  // Filtering
  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return products.filter((p) => {
      const matchesSearch =
        !query ||
        normalizeText(p.name).includes(query) ||
        normalizeText(p.category).includes(query);
      const matchesCategory = !internalCategory || p.category === internalCategory;
      const matchesStatus = !internalStatus || p.status === internalStatus;
      const matchesSoldProducts =
        soldProductSet.size === 0 || soldProductSet.has(normalizeText(p.name));
      return matchesSearch && matchesCategory && matchesStatus && matchesSoldProducts;
    });
  }, [products, search, internalCategory, internalStatus, soldProductSet]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c, value: c })),
    [categories]
  );
  const selectedCategory =
    categoryOptions.find((opt) => opt.value === internalCategory) || null;
  const selectedStatus =
    STATUS_FILTER_OPTIONS.find((opt) => opt.value === internalStatus) ||
    STATUS_FILTER_OPTIONS[0];

  // Back to top
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Excel export/import
  const handleExportExcel = useCallback(() => {
    try {
      exportProductsToExcel(products);
      showLocalAlert('Export complete', `${products.length} product(s) exported to Excel.`, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showLocalAlert('Export failed', err.message || 'Unable to export products to Excel.', 'danger');
    }
  }, [products, showLocalAlert]);

  const performImport = useCallback(async (importedProducts) => {
    if (!Array.isArray(importedProducts) || importedProducts.length === 0) return;

    setIsSaving(true);
    try {
      const payload = importedProducts.map(buildImportPayload);
      const response = await replaceAllProducts(payload);
      const imported = Array.isArray(response.data) ? response.data : [];

      const normalized = normalizeProducts(imported);
      setProducts(normalized);
      setCategories([...new Set(normalized.map((p) => p.category).filter(Boolean))]);
      if (onProductsLoaded) onProductsLoaded(normalized);

      showLocalAlert(
        'Import complete',
        `The product catalog was replaced successfully with ${normalized.length} product(s). Old products were removed atomically.`,
        'success',
      );
    } catch (err) {
      console.error('Excel import error:', err);
      showLocalAlert(
        'Import failed',
        err.response?.data?.message || err.message || 'Unable to import products. The existing catalog was not changed.',
        'danger',
      );
    } finally {
      setIsSaving(false);
    }
  }, [onProductsLoaded, showLocalAlert]);

  const handleImportExcel = useCallback(async (file) => {
    try {
      const importedProducts = await parseProductsExcel(file);
      setAlert({
        show: true,
        title: 'Replace Products?',
        message: `This Excel file contains ${importedProducts.length} product(s). Products not present in the Excel file will be deleted from the database. Existing products with the same rowid will be updated. Do you want to continue?`,
        variant: 'warning',
        confirmText: 'Import & Replace',
        showCancel: true,
        cancelText: 'Cancel',
        onConfirm: async () => {
          setAlert((prev) => ({ ...prev, show: false }));
          await performImport(importedProducts);
        },
        onCancel: () => setAlert((prev) => ({ ...prev, show: false })),
      });
    } catch (err) {
      console.error('Excel parse error:', err);
      showLocalAlert('Invalid Excel file', err.message || 'Please use the exported Products Excel format.', 'danger');
    }
  }, [performImport, showLocalAlert]);

  // Render
  if (loading && products.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-box fs-4 text-lavender" aria-hidden="true"></i>
          <span className="pt-3">
            <h4 className="mb-0 fw-semibold">Products</h4>
          </span>
          <span className="badge bg-secondary ms-2">{filtered.length} total</span>
          {isSaving && <span className="badge bg-primary ms-2">Saving...</span>}
          {(internalCategory || internalStatus || soldProductSet.size > 0) && (
            <Badge bg="warning" className="ms-2">
              <i className="bi bi-funnel me-1"></i> {soldProductSet.size > 0 ? 'Sold products' : 'Filtered'}
            </Badge>
          )}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {/*<ExportImport onExport={handleExportExcel} onImport={handleImportExcel} /> */}
          <Button variant="primary" size="sm" onClick={openAddModal} disabled={isSaving}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i> Add Product
          </Button>
        </div>
      </div>

      <Row className="g-2 mb-4 align-items-center">
        <Col xs={12} md={4} lg={3}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col xs={12} md={4} lg={4}>
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={(selected) => setInternalCategory(selected?.value || '')}
            placeholder="All Categories"
            isClearable
            {...portalSelectProps}
            styles={reactSelectStyles}
          />
        </Col>
        <Col xs={12} md={4} lg={3}>
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={selectedStatus}
            onChange={(selected) => setInternalStatus(selected?.value || '')}
            placeholder="All Status"
            isClearable
            {...portalSelectProps}
            styles={reactSelectStyles}
          />
        </Col>
        {(internalCategory || internalStatus || soldProductSet.size > 0) && (
          <Col xs={12} md="auto">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setInternalCategory('');
                setInternalStatus('');
                onClearExternalFilters?.();
              }}
            >
              <i className="bi bi-x-circle me-1"></i> Clear Filters
            </Button>
          </Col>
        )}
      </Row>

      <div className="product-grid-wrapper">
        <div className="product-grid-container">
          <div className="product-grid">
            {filtered.length > 0 ? (
              <Row className="g-3">
                {filtered.map((product) => {
                  const displayPrice =
                    Number(product.amount) > 0
                      ? Number(product.amount)
                      : Number(product.price) || 0;
                  return (
                    <Col
                      xs={11}
                      sm={6}
                      md={4}
                      lg={6}
                      key={product.rowid}
                      className="mx-auto"
                    >
                      <Card className="h-60 product-card shadow-sm border-0 overflow-hidden">
                        <div className="d-flex flex-row">
                          <div
                            className="position-relative flex-shrink-0"
                            style={{
                              width: '140px',
                              minHeight: '200px',
                              background: '#f0edf5',
                            }}
                          >
                            <Card.Img
                              variant="top"
                              src={product.image || FALLBACK_IMAGE}
                              alt={product.name || 'Product'}
                              style={{
                                height: '100%',
                                width: '100%',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                              }}
                              onClick={() => {
                                setSelectedImage(product.image || FALLBACK_IMAGE);
                                setShowImageModal(true);
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = FALLBACK_IMAGE;
                              }}
                              loading="eager"
                            />
                            {product.discount_percent > 0 && (
                              <Badge
                                className="discount-badge"
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {product.discount_percent}% OFF
                              </Badge>
                            )}
                          </div>
                          <Card.Body className="d-flex flex-column flex-grow-1 p-2">
                            <Card.Title
                              className="fs-6 fw-bold text-truncate"
                              title={product.name}
                            >
                              {product.name || 'Untitled'}
                            </Card.Title>
                            <span className="category-badge small">
                              {product.category || 'Others'}
                            </span>
                            <span className="d-flex small gap-2 content-text fw-bold">
                              {product.status === 'in_stock' &&
                                product.contents &&
                                (String(product.contents)
                                  .toLowerCase()
                                  .includes('pcs')
                                  ? product.contents
                                  : `${product.contents} Pcs`)}
                              <span className="text-decoration-line-through fw-bold text-muted">
                                {product.price ? `₹${formatINR(product.price)}` : ''}
                              </span>
                            </span>
                            <div className="mt-auto pt-2">
                              <div className="d-flex justify-content-between align-items-center gap-2">
                                <strong className="fs-5">₹{formatINR(displayPrice)}</strong>
                                <Badge
                                  bg={product.status === 'in_stock' ? 'success' : 'danger'}
                                  pill
                                >
                                  {product.status === 'in_stock' ? 'In Stock' : 'No Stock'}
                                </Badge>
                              </div>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                              <Button
                                variant="primary"
                                size="sm"
                                className="flex-fill"
                                onClick={() => openEditModal(product)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil-square" aria-hidden="true"></i>
                              </Button>
                              <Button
                                variant={product.status === 'in_stock' ? 'success' : 'danger'}
                                size="sm"
                                className="flex-fill stock-toggle"
                                onClick={() => handleToggleStatus(product.rowid)}
                                title="Toggle stock"
                              >
                                <i
                                  className={`bi ${product.status === 'in_stock' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}
                                  aria-hidden="true"
                                ></i>
                                <span className="ms-1 small d-none d-sm-inline">
                                  {product.status === 'in_stock' ? 'In' : 'Out'}
                                </span>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="flex-fill"
                                onClick={() => handleDelete(product.rowid)}
                                disabled={deleting}
                                title="Delete"
                              >
                                <i className="bi bi-trash" aria-hidden="true"></i>
                              </Button>
                            </div>
                          </Card.Body>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 mb-3" aria-hidden="true"></i>
                <p className="mb-3">No products found</p>
                <Button variant="primary" onClick={openAddModal}>
                  Add First Product
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        centered
        className="image-modal"
        keyboard={true}
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Product Image</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex justify-content-center align-items-center p-3">
          <img
            src={selectedImage}
            alt="Product preview"
            style={{
              width: '50%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </Modal.Body>
      </Modal>

      {showBackToTop && (
        <Button
          variant="warning"
          className="back-to-top-3d"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <i className="bi bi-arrow-up"></i>
        </Button>
      )}

      <ProductModal
        show={showProductModal}
        onHide={closeProductModal}
        onSave={editingProduct ? handleUpdate : handleAdd}
        product={editingProduct}
        categories={categories}
        isSaving={isSaving}
      />

      <AlertModal
        show={alert.show}
        onHide={() => setAlert((prev) => ({ ...prev, show: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        confirmText={alert.confirmText}
        onConfirm={alert.onConfirm}
        showCancel={alert.showCancel}
        cancelText={alert.cancelText}
        onCancel={alert.onCancel}
      />
    </>
  );
}