import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import { buildSelectStyles, portalSelectProps } from '../utils/selectStyles';

const EMPTY_FORM = {
  rowid: '',
  name: '',
  category: '',
  amount: '',
  price: '',
  image: '',
  contents: '',
  discount_percent: '',
  status: 'in_stock',
};

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'no_stock', label: 'No Stock' },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const TARGET_IMAGE_SIZE = 200 * 1024;
const MAX_IMAGE_DIMENSION = 1200;

function buildFormFromProduct(product) {
  if (!product || typeof product !== 'object') return { ...EMPTY_FORM };
  return {
    rowid: product.rowid || product.id || '',
    name: product.name ?? '',
    category: product.category ?? '',
    amount: product.amount ?? '',
    price: product.price ?? '',
    image: product.image ?? '',
    contents: product.contents ?? '',
    discount_percent: product.discountPercent ?? product.discount_percent ?? '',
    status: product.status === 'no_stock' ? 'no_stock' : 'in_stock',
  };
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sanitizeQuantity(value) {
  return String(value).replace(/[^a-zA-Z0-9 ]/g, '');
}

function compressImage(file, maxWidth = MAX_IMAGE_DIMENSION, maxHeight = MAX_IMAGE_DIMENSION, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        const getSizeInKB = (dataUrl) => {
          const base64 = dataUrl.split(',')[1];
          return (base64.length * 3) / 4 / 1024;
        };

        let sizeInKB = getSizeInKB(compressedDataUrl);
        while (sizeInKB > TARGET_IMAGE_SIZE && currentQuality > 0.1) {
          currentQuality -= 0.05;
          compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          sizeInKB = getSizeInKB(compressedDataUrl);
        }

        if (sizeInKB > TARGET_IMAGE_SIZE) {
          const scaleFactor = Math.sqrt(TARGET_IMAGE_SIZE / sizeInKB);
          const newWidth = Math.round(width * scaleFactor);
          const newHeight = Math.round(height * scaleFactor);
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          sizeInKB = getSizeInKB(compressedDataUrl);
        }

        resolve({
          dataUrl: compressedDataUrl,
          originalSize: file.size / 1024,
          compressedSize: sizeInKB,
          width: canvas.width,
          height: canvas.height,
          quality: currentQuality,
        });
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

const ProductModal = memo(function ProductModal({
  show,
  onHide,
  onSave,
  product,
  categories = [],
  isSaving = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const fileInputRef = useRef(null);

  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const showAlertModal = useCallback((message) => {
    setAlertMessage(message);
    setShowAlert(true);
  }, []);

  useEffect(() => {
    const nextForm = buildFormFromProduct(product);
    setForm(nextForm);
    setImagePreview(nextForm.image || '');
    setErrors({});
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [product, show]);

  const recalcAmount = useCallback((price, discount) => {
    const p = Number(price);
    const d = Number(discount);

    if (!Number.isFinite(p) || p < 0) return '';
    if (!Number.isFinite(d) || d < 0 || d > 100) return '';

    return (p * (1 - d / 100)).toFixed(2);
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.isArray(categories) ? [...new Set(categories.filter(Boolean))] : [];
    return unique.map((cat) => ({ label: cat, value: cat }));
  }, [categories]);

  const selectedCategory = useMemo(() => {
    if (!form.category) return null;
    const found = categoryOptions.find((opt) => opt.value === form.category);
    if (found) return found;
    return { label: form.category, value: form.category };
  }, [categoryOptions, form.category]);

  const selectedStatus = STATUS_OPTIONS.find((opt) => opt.value === form.status) || STATUS_OPTIONS[0];

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      if (name === 'contents') {
        const sanitized = sanitizeQuantity(value);
        setForm((prev) => ({ ...prev, [name]: sanitized }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
        return;
      }

      setForm((prev) => {
        const updated = { ...prev, [name]: value };
        if (name === 'price' || name === 'discount_percent') {
          const newAmount = recalcAmount(
            name === 'price' ? value : prev.price,
            name === 'discount_percent' ? value : prev.discount_percent
          );
          updated.amount = newAmount;
        }
        return updated;
      });
      setErrors((prev) => ({ ...prev, [name]: '' }));
    },
    [recalcAmount]
  );

  const handleCategoryChange = useCallback((selected) => {
    setForm((prev) => ({ ...prev, category: selected?.value || '' }));
    setErrors((prev) => ({ ...prev, category: '' }));
  }, []);

  const handleCategoryCreate = useCallback((inputValue) => {
    setForm((prev) => ({ ...prev, category: inputValue }));
    setErrors((prev) => ({ ...prev, category: '' }));
  }, []);

  const handleStatusChange = useCallback((selected) => {
    const newStatus = selected?.value || 'in_stock';
    setForm((prev) => ({
      ...prev,
      status: newStatus,
      contents: newStatus === 'no_stock' ? '' : prev.contents,
    }));
  }, []);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showAlertModal('Please select an image file.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        showAlertModal(`Image must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`);
        e.target.value = '';
        return;
      }

      setIsCompressing(true);
      try {
        const result = await compressImage(file);
        setImagePreview(result.dataUrl);
        setForm((prev) => ({ ...prev, image: result.dataUrl }));
        setCompressionInfo({
          originalSize: result.originalSize.toFixed(1),
          compressedSize: result.compressedSize.toFixed(1),
          dimensions: `${result.width}×${result.height}`,
          quality: Math.round(result.quality * 100),
        });
      } catch (err) {
        console.error('Image compression failed:', err);
        showAlertModal('Failed to process image. Please try again.');
      } finally {
        setIsCompressing(false);
        e.target.value = '';
      }
    },
    [showAlertModal]
  );

  const handleChooseImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImagePreview('');
    setForm((prev) => ({ ...prev, image: '' }));
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required.';
    if (!form.category.trim()) newErrors.category = 'Category is required.';
    const price = toNumber(form.price);
    if (price < 0) newErrors.price = 'Original price must be a positive number.';
    const discount = toNumber(form.discount_percent);
    if (discount < 0 || discount > 100) newErrors.discount = 'Discount must be between 0 and 100.';
    if (form.status === 'in_stock' && (!form.contents || form.contents.trim() === '')) {
      newErrors.contents = 'Quantity is required when product is in stock.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isSaving || isCompressing) return;
      if (!validateForm()) return;

      const finalAmount = form.amount || form.price;
      const payload = {
        ...(form.rowid ? { rowid: form.rowid } : {}),
        name: form.name.trim(),
        category: form.category.trim(),
        amount: toNumber(finalAmount),
        price: toNumber(form.price),
        // Backend API field is discountPercent. Keep discount_percent as a
        // compatibility field for older code, but never use it as the source of truth.
        discountPercent: Math.max(0, Math.min(100, toNumber(form.discount_percent))),
        discount_percent: Math.max(0, Math.min(100, toNumber(form.discount_percent))),
        discountAmount: form.amount ? toNumber(form.price) - toNumber(form.amount) : null,
        contents: form.status === 'no_stock' ? '' : form.contents.trim(),
        image: form.image || '',
        status: form.status === 'no_stock' ? 'no_stock' : 'in_stock',
        last_updated: new Date().toISOString(),
      };

      try {
        await onSave(payload);
      } catch (err) {
        console.error('Save error:', err);
        showAlertModal('Failed to save product. Please try again.');
      }
    },
    [form, onSave, isSaving, isCompressing, validateForm, showAlertModal]
  );

  return (
    <>
      <Modal
        show={show}
        onHide={isSaving ? undefined : onHide}
        size="lg"
        centered
        scrollable
        contentClassName="rounded-4 shadow-lg"
        className="product-modal"
      >
        <Modal.Header closeButton={!isSaving} className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-box text-lavender" aria-hidden="true"></i>
            {product ? 'Edit Product' : 'Add New Product'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          className="pt-2"
          style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #e8e0f5 100%)' }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-12 col-md-7">
                <div className="mb-3">
                  <label htmlFor="productName" className="form-label fw-semibold">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="productName"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={isSaving}
                    className={`form-control form-control-lg rounded-3 shadow-sm ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="Product name"
                  />
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="productCategory" className="form-label fw-semibold">
                    Category <span className="text-danger">*</span>
                  </label>
                  <CreatableSelect
                    inputId="productCategory"
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    onCreateOption={handleCategoryCreate}
                    placeholder="Select or create category"
                    isDisabled={isSaving}
                    isClearable
                    {...portalSelectProps}
                    styles={buildSelectStyles(!!errors.category)}
                  />
                  {errors.category && <div className="text-danger small mt-1">{errors.category}</div>}
                </div>

                <div className="row g-2">
                  <div className="col-6">
                    <label htmlFor="productPrice" className="form-label fw-semibold">
                      Original Price (₹)
                    </label>
                    <input
                      id="productPrice"
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      disabled={isSaving}
                      className={`form-control form-control-lg rounded-3 shadow-sm ${errors.price ? 'is-invalid' : ''}`}
                      placeholder="e.g. 100"
                    />
                    {errors.price && <div className="invalid-feedback d-block">{errors.price}</div>}
                  </div>
                  <div className="col-6">
                    <label htmlFor="productDiscount" className="form-label fw-semibold">
                      Discount %
                    </label>
                    <input
                      id="productDiscount"
                      type="number"
                      name="discount_percent"
                      value={form.discount_percent}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      disabled={isSaving}
                      className={`form-control form-control-lg rounded-3 shadow-sm ${errors.discount ? 'is-invalid' : ''}`}
                      placeholder="e.g. 20"
                    />
                    {errors.discount && <div className="invalid-feedback d-block">{errors.discount}</div>}
                  </div>
                  <div className="col-12">
                    <label htmlFor="productAmount" className="form-label fw-semibold">
                      Final Price (₹) <small className="text-muted">(after discount)</small>
                    </label>
                    <input
                      id="productAmount"
                      type="text"
                      name="amount"
                      value={form.amount}
                      readOnly
                      className="form-control form-control-lg shadow-sm bg-light"
                      placeholder="Auto-calculated"
                      style={{ cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="mb-3 mt-3">
                  <label htmlFor="productQuantity" className="form-label fw-semibold">
                    Quantity <span className="text-danger">*</span>
                  </label>
                  <input
                    id="productQuantity"
                    type="text"
                    name="contents"
                    value={form.contents}
                    onChange={handleChange}
                    disabled={isSaving || form.status === 'no_stock'}
                    className={`form-control form-control-lg rounded-3 shadow-sm ${errors.contents ? 'is-invalid' : ''}`}
                    placeholder={form.status === 'no_stock' ? 'Quantity disabled (No Stock)' : 'e.g. 50 Pcs, 100 Box, 25 Units'}
                    inputMode="text"
                  />
                  <div className="text-muted small mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Allowed: letters, numbers, and spaces only
                  </div>
                  {form.status === 'no_stock' && (
                    <div className="text-muted small mt-1">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Quantity is disabled when product is out of stock
                    </div>
                  )}
                  {errors.contents && <div className="invalid-feedback d-block">{errors.contents}</div>}
                </div>
              </div>

              <div className="col-12 col-md-5">
                <div className="mb-3">
                  <label htmlFor="productStatus" className="form-label fw-semibold">Status</label>
                  <Select
                    inputId="productStatus"
                    options={STATUS_OPTIONS}
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    isDisabled={isSaving}
                    isSearchable={false}
                    {...portalSelectProps}
                    styles={buildSelectStyles()}
                  />
                </div>

                <div>
                  <label htmlFor="productImage" className="form-label fw-semibold">Product Image</label>
                  <input
                    id="productImage"
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleFileChange}
                    disabled={isSaving || isCompressing}
                    className="d-none"
                  />
                  <Button
                    type="button"
                    variant="outline-primary"
                    className="rounded-3 w-100 py-2"
                    onClick={handleChooseImage}
                    disabled={isSaving || isCompressing}
                  >
                    <i className="bi bi-image me-2"></i>
                    {imagePreview ? 'Change Image' : 'Choose Image'}
                  </Button>

                  {isCompressing && (
                    <div className="mt-2 text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Compressing image...</span>
                      </div>
                      <p className="text-muted small mt-1">
                        <i className="bi bi-arrow-repeat me-1"></i>
                        Optimizing image for web...
                      </p>
                    </div>
                  )}

                  {compressionInfo && !isCompressing && (
                    <div className="mt-2">
                      <div className="alert alert-success py-1 px-2 mb-2" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-check-circle-fill me-1"></i>
                        <strong>Optimized!</strong>
                        <span className="ms-2 d-block d-sm-inline">
                          {compressionInfo.originalSize}KB → {compressionInfo.compressedSize}KB
                        </span>
                        <span className="ms-2 d-block d-sm-inline">
                          ({compressionInfo.dimensions})
                        </span>
                      </div>
                    </div>
                  )}

                  {imagePreview && !isCompressing && (
                    <div className="mt-3 text-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="img-fluid rounded-3 border shadow-sm edit-image"
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                      />
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        className="mt-2 rounded-3"
                        onClick={handleRemoveImage}
                        disabled={isSaving}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
              <Button type="button" variant="secondary" size="lg" onClick={onHide} disabled={isSaving} className="rounded-3 px-4">
                Cancel
              </Button>
              <Button variant="primary" size="lg" type="submit" disabled={isSaving || isCompressing} className="rounded-3 px-4">
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Saving...
                  </>
                ) : isCompressing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Compressing...
                  </>
                ) : product ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal
        show={showAlert}
        onHide={() => setShowAlert(false)}
        centered
        size="sm"
        backdrop="static"
        contentClassName="rounded-4 shadow-lg"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-circle text-warning" aria-hidden="true"></i>
            Notice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="mb-3" style={{ fontSize: '1.05rem' }}>{alertMessage}</p>
          <div className="d-flex justify-content-end">
            <Button variant="primary" onClick={() => setShowAlert(false)} className="rounded-3 px-4">
              OK
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
});

export default ProductModal;