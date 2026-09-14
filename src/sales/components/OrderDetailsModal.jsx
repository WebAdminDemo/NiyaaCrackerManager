import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Col, Form, Modal, Row, Table } from "react-bootstrap";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import dayjs from "dayjs";
import { getProducts } from "../../components/products/productsApi";
import AlertModal from "../../components/AlertModal";
import { useTheme } from "../../context/ThemeContext";
import { exportSingleOrderPdf } from "../utils/exportReports";
import {
  getDistricts,
  getLocalities,
  INDIAN_STATES,
  PARTY_COUNTRY_OPTIONS,
} from "../../utils/properties";
import {
  PRODUCT_BRAND_OPTIONS,
  normalizeBrand,
} from "../../utils/common.properties";
import {
  buildSelectStyles,
  reactSelectStyles,
  portalSelectProps,
} from "../../utils/selectStyles";

const STATUS_OPTIONS = [
  { value: "order_received", label: "Order Received" },
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

const STATUS_CONFIG = {
  order_received: "Order Received",
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  processing: "Processing",
  packaging: "Packaging",
  cancelled: "Cancelled",
};

const FLOW = ["order_received", "pending", "shipped", "delivered"];

const SELECT_PROPS = {
  ...portalSelectProps,
  classNamePrefix: "sd-select",
  styles: reactSelectStyles,
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const text = (value) => (value == null ? "" : String(value).trim());

const productIdOf = (product) => String(product?.rowid || product?.id || "");

const normaliseStatus = (value) => {
  const status = text(value).toLowerCase();
  return STATUS_OPTIONS.some((option) => option.value === status) ? status : "";
};

const dateTimeValue = (value) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm") : "";
};

const DISCOUNT_TYPES = [
  { value: "percent", label: "%", title: "Percentage" },
  { value: "value", label: "Val", title: "Fixed value" },
];

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOriginalPrice = (item, product = null) =>
  numberValue(
    item?.originalPrice ??
      product?.price ??
      product?.originalPrice ??
      item?.price ??
      product?.amount ??
      0,
  );

const getProductDiscount = (item, product = null) => {
  const originalPrice = getOriginalPrice(item, product);
  const directPercent =
    item?.discount_percent ??
    item?.discountPercent ??
    product?.discount_percent ??
    product?.discountPercent;

  if (
    directPercent !== null &&
    directPercent !== undefined &&
    directPercent !== ""
  ) {
    return {
      type: "percent",
      value: Math.max(0, Math.min(100, numberValue(directPercent))),
    };
  }

  const discountAmount =
    item?.discount_amount ??
    item?.discountAmount ??
    product?.discount_amount ??
    product?.discountAmount;

  if (
    discountAmount !== null &&
    discountAmount !== undefined &&
    discountAmount !== ""
  ) {
    return {
      type: "value",
      value: Math.max(0, Math.min(originalPrice, numberValue(discountAmount))),
    };
  }

  const currentPrice =
    item?.price ??
    item?.amount ??
    product?.amount ??
    product?.sellingPrice ??
    originalPrice;

  if (originalPrice > 0 && numberValue(currentPrice) < originalPrice) {
    return {
      type: "percent",
      value: Math.max(
        0,
        Math.min(
          100,
          ((originalPrice - numberValue(currentPrice)) / originalPrice) * 100,
        ),
      ),
    };
  }

  return { type: "percent", value: 0 };
};

const calculateDiscountedPrice = (
  originalPrice,
  discountType,
  discountValue,
) => {
  const original = Math.max(0, numberValue(originalPrice));
  const value = Math.max(0, numberValue(discountValue));

  if (discountType === "value") {
    return Math.max(0, original - Math.min(original, value));
  }

  return Math.max(0, original * (1 - Math.min(100, value) / 100));
};

function ProductPicker({
  open,
  onOpen,
  onClose,
  onCancel,
  products,
  category,
  setCategory,
  selected,
  setSelected,
  disabled,
}) {
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () =>
      [
        ...new Set(
          products.map((product) => text(product.category)).filter(Boolean),
        ),
      ].sort(),
    [products],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((value) => ({ value, label: value })),
    ],
    [categories],
  );

  const selectedMap = useMemo(
    () => new Map(selected.map((item) => [String(item.productId), item])),
    [selected],
  );

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatch = !category || text(product.category) === category;
      const brandText = text(product.brand);
      const searchMatch =
        !needle ||
        [product.name, product.category, brandText].some((value) =>
          text(value).toLowerCase().includes(needle),
        );

      return categoryMatch && searchMatch;
    });
  }, [products, category, search]);

  const toggleProduct = (product) => {
    const productId = productIdOf(product);
    if (!productId) return;

    if (selectedMap.has(productId)) {
      setSelected((current) =>
        current.filter((item) => String(item.productId) !== productId),
      );
      return;
    }

    setSelected((current) => [
      ...current,
      {
        productId,
        quantity: 1,
        product,
      },
    ]);
  };

  const setQuantity = (productId, value) => {
    if (value === "") {
      setSelected((current) =>
        current.map((item) =>
          String(item.productId) === String(productId)
            ? { ...item, quantity: "" }
            : item,
        ),
      );
      return;
    }

    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) return;

    setSelected((current) =>
      current.map((item) =>
        String(item.productId) === String(productId)
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const changeQuantity = (productId, delta) => {
    setSelected((current) =>
      current.map((item) => {
        if (String(item.productId) !== String(productId)) return item;
        return {
          ...item,
          quantity: Math.max(0, Number(item.quantity || 0) + delta),
        };
      }),
    );
  };

  return (
    <div className="sales-product-picker">
      <button
        type="button"
        className={`sales-product-picker__control ${open ? "is-open" : ""}`}
        onClick={onOpen}
        disabled={disabled}
      >
        <span>
          {selected.length
            ? `${selected.length} product${selected.length === 1 ? "" : "s"} selected`
            : "Select products"}
        </span>
        <i className="bi bi-chevron-down" />
      </button>

      {open && (
        <div className="sales-product-picker__menu">
          <div className="sales-product-picker__top">
            <div>
              <strong>Add / Remove Products</strong>
              <span>
                Choose a category, select products and set each quantity.
              </span>
            </div>
            <div className="sales-product-picker__top-actions">
              <Button
                type="button"
                className="sales-primary-action sales-product-picker__ok"
                onClick={onClose}
                disabled={disabled}
              >
                OK
              </Button>
              <button
                type="button"
                className="sales-product-picker__close"
                onClick={onCancel}
                aria-label="Close product selector"
                disabled={disabled}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          </div>

          <div className="sales-product-picker__filters">
            <Select
              {...SELECT_PROPS}
              options={categoryOptions}
              value={
                categoryOptions.find((option) => option.value === category) ||
                categoryOptions[0]
              }
              onChange={(option) => setCategory(option?.value || "")}
              isSearchable={false}
              isDisabled={disabled}
              aria-label="Product category"
            />

            <Form.Control
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product or brand"
              aria-label="Search products"
              disabled={disabled}
            />
          </div>

          <div className="sales-product-picker__list">
            {filteredProducts.length ? (
              filteredProducts.map((product) => {
                const productId = productIdOf(product);
                const selectedItem = selectedMap.get(productId);
                const brands = text(product.brand) ? [text(product.brand)] : [];

                return (
                  <div
                    className={`sales-product-picker__item ${
                      selectedItem ? "is-selected" : ""
                    }`}
                    key={productId}
                  >
                    <button
                      type="button"
                      className="sales-product-picker__check"
                      onClick={() => toggleProduct(product)}
                      disabled={disabled}
                    >
                      <span className="sales-product-picker__checkbox">
                        {selectedItem && <i className="bi bi-check" />}
                      </span>
                      <span className="sales-product-picker__product-copy">
                        <strong>{text(product.name)}</strong>
                        <small>
                          {text(product.category)}
                          {brands.length ? ` · ${brands.join(", ")}` : ""}
                        </small>
                      </span>
                    </button>

                    {selectedItem && (
                      <div className="sales-product-picker__quantity">
                        <button
                          type="button"
                          onClick={() => changeQuantity(productId, -1)}
                          disabled={disabled}
                          aria-label={`Decrease ${text(product.name)} quantity`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={selectedItem.quantity}
                          onChange={(event) =>
                            setQuantity(productId, event.target.value)
                          }
                          disabled={disabled}
                          aria-label={`${text(product.name)} quantity`}
                        />
                        <button
                          type="button"
                          onClick={() => changeQuantity(productId, 1)}
                          disabled={disabled}
                          aria-label={`Increase ${text(product.name)} quantity`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="sales-product-picker__empty">
                No products found.
              </div>
            )}
          </div>

          <div className="sales-product-picker__footer">
            <span>{selected.length} selected</span>
          </div>
        </div>
      )}
    </div>
  );
}

const OrderDetailsModal = ({
  show,
  onHide,
  order,
  onOrderSave,
  initialEditMode = false,
}) => {
  const { darkMode } = useTheme();

  const [editMode, setEditMode] = useState(initialEditMode);
  const [status, setStatus] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyNumber, setPartyNumber] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partySector, setPartySector] = useState("");
  const [partyCountry, setPartyCountry] = useState("India");
  const [partyState, setPartyState] = useState("");
  const [partyDistrict, setPartyDistrict] = useState("");
  const [partyLocality, setPartyLocality] = useState("");
  const [partyPincode, setPartyPincode] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [draftItems, setDraftItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productCategory, setProductCategory] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [alert, setAlert] = useState({
    show: false,
    title: "",
    message: "",
    variant: "danger",
  });
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = useRef({});

  useEffect(() => {
    if (!order) return;

    const orderItems = (order.items || []).map((item) => {
      const discount = getProductDiscount(item);
      const originalPrice = getOriginalPrice(item);

      return {
        ...item,
        productId: item.productId || item.product_id,
        quantity: Number(item.quantity ?? 0),
        brand: normalizeBrand(item.brand),
        brands: Array.isArray(item.brands) ? item.brands.filter(Boolean) : [],
        originalPrice,
        discountType: item.discountType || item.discount_type || discount.type,
        discountValue:
          item.discountValue ??
          item.discount_value ??
          (item.discountType === "value" || item.discount_type === "value"
            ? discount.value
            : discount.value),
        price: calculateDiscountedPrice(
          originalPrice,
          item.discountType || item.discount_type || discount.type,
          item.discountValue ?? item.discount_value ?? discount.value,
        ),
      };
    });

    setEditMode(initialEditMode);
    setStatus(normaliseStatus(order.status));
    setPartyName(text(order.partyName || order.customerName));
    setPartyNumber(text(order.partyNumber || order.customerPhone));
    setPartyAddress(text(order.partyAddress || order.customerAddress));
    setPartySector(text(order.partySector || order.location));
    setPartyCountry(text(order.partyCountry));
    setPartyState(text(order.partyState));
    setPartyDistrict(text(order.partyDistrict));
    setPartyLocality(text(order.partyLocality));
    setPartyPincode(text(order.partyPincode));
    setOrderDate(dateTimeValue(order.orderDate || order.createdAt));
    setDraftItems(orderItems);
    setPickerSelection(
      orderItems.map((item) => ({
        productId: String(item.productId),
        quantity: Number(item.quantity ?? 0),
        product: item,
      })),
    );
    setProductCategory("");
    setPickerOpen(false);
    setFieldErrors({});
    setSaveError("");
    setSaved(false);
  }, [order, initialEditMode, show]);

  useEffect(() => {
    if (!show || !editMode) return;

    let active = true;
    setProductsLoading(true);

    getProducts()
      .then((response) => {
        if (!active) return;

        const loadedProducts = Array.isArray(response.data)
          ? response.data
          : [];
        setProducts(loadedProducts);

        setDraftItems((current) =>
          current.map((item) => {
            const product = loadedProducts.find(
              (candidate) =>
                String(productIdOf(candidate)) ===
                String(item.productId || item.product_id),
            );

            if (!product) return item;

            const originalPrice = getOriginalPrice(item, product);
            const discount = getProductDiscount(item, product);
            const discountType =
              item.discountType || item.discount_type || discount.type;
            const discountValue =
              item.discountValue ?? item.discount_value ?? discount.value;

            return {
              ...item,
              originalPrice,
              contents: item.contents || product.contents || "",
              category: item.category || product.category || "",
              discountType,
              discountValue,
              price: calculateDiscountedPrice(
                originalPrice,
                discountType,
                discountValue,
              ),
            };
          }),
        );
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load products for order edit:", error);
        setAlert({
          show: true,
          title: "Unable to Load Products",
          message:
            error?.response?.data?.message ||
            "Products could not be loaded. Please try again.",
          variant: "danger",
        });
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [show, editMode]);

  const items = draftItems;

  const districts = useMemo(() => getDistricts(partyState), [partyState]);

  const localities = useMemo(
    () => getLocalities(partyDistrict),
    [partyDistrict],
  );

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [items],
  );

  const originalItems = order?.items || [];
  const itemsChanged =
    originalItems.length !== items.length ||
    originalItems.some((item) => {
      const productId = String(item.productId || item.product_id);
      const next = items.find(
        (draft) => String(draft.productId || draft.product_id) === productId,
      );

      return (
        !next ||
        Number(item.quantity || 0) !== Number(next.quantity || 0) ||
        text(item.brand) !== text(next.brand) ||
        Number(item.price || 0) !== Number(next.price || 0) ||
        text(item.discountType || item.discount_type || "percent") !==
          text(next.discountType || next.discount_type || "percent") ||
        Number(item.discountValue ?? item.discount_value ?? 0) !==
          Number(next.discountValue ?? next.discount_value ?? 0)
      );
    });

  const originalStatus = normaliseStatus(order?.status) || "order_received";
  const nextStatus = status || originalStatus;

  const detailsChanged =
    partyName !== text(order?.partyName || order?.customerName) ||
    partyNumber !== text(order?.partyNumber || order?.customerPhone) ||
    partyAddress !== text(order?.partyAddress || order?.customerAddress) ||
    partySector !== text(order?.partySector || order?.location) ||
    partyCountry !== text(order?.partyCountry) ||
    partyState !== text(order?.partyState) ||
    partyDistrict !== text(order?.partyDistrict) ||
    partyLocality !== text(order?.partyLocality) ||
    partyPincode !== text(order?.partyPincode) ||
    nextStatus !== originalStatus ||
    orderDate !== dateTimeValue(order?.orderDate || order?.createdAt);

  const hasChanges = itemsChanged || detailsChanged;

  const validate = () => {
    const errors = {};

    if (!partyName) errors.partyName = "Party Name is required.";
    if (!partyNumber) {
      errors.partyNumber = "Party contact number is required.";
    }
    if (!partySector) {
      errors.partySector = "Location / Sector is required.";
    }
    if (!partyCountry) errors.partyCountry = "Party country is required.";
    if (!partyState) errors.partyState = "Party state is required.";
    if (!partyDistrict) errors.partyDistrict = "Party district is required.";
    if (!partyLocality) {
      errors.partyLocality = "Town / City / Village is required.";
    }
    if (!partyPincode) {
      errors.partyPincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(partyPincode)) {
      errors.partyPincode = "Pincode must contain exactly 6 digits.";
    }
    if (!items.length) errors.products = "At least one product is required.";

    const invalidQuantityIndex = items.findIndex(
      (item) =>
        !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1,
    );

    if (invalidQuantityIndex >= 0) {
      errors[`quantity-${invalidQuantityIndex}`] =
        "Quantity must be 1 or greater.";
    }

    return errors;
  };

  const focusFirstError = (errors) => {
    const key = Object.keys(errors)[0];
    if (!key) return;

    window.requestAnimationFrame(() => {
      const element = fieldRefs.current[key];
      element?.focus?.();
      element?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const clearFieldError = (key) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const cancelPickerSelection = () => {
    setPickerSelection(
      items.map((item) => ({
        productId: String(item.productId || item.product_id),
        quantity: Number(item.quantity ?? 0),
        product: item,
      })),
    );
    setPickerOpen(false);
  };

  const applyPickerSelection = () => {
    const byExisting = new Map(
      items.map((item) => [String(item.productId || item.product_id), item]),
    );

    const nextItems = pickerSelection.map((selection) => {
      const productId = String(selection.productId);
      const existing = byExisting.get(productId);

      if (existing) {
        return {
          ...existing,
          quantity: Number(selection.quantity ?? 0),
        };
      }

      const product = selection.product || {};
      const originalPrice = getOriginalPrice({}, product);
      const discount = getProductDiscount({}, product);
      const price = calculateDiscountedPrice(
        originalPrice,
        discount.type,
        discount.value,
      );

      return {
        id: undefined,
        productId,
        name: product.name || "Product",
        category: product.category || "",
        contents: product.contents || "",
        originalPrice,
        discountType: discount.type,
        discountValue: discount.value,
        discount_percent:
          discount.type === "percent"
            ? discount.value
            : originalPrice > 0
              ? ((originalPrice - price) / originalPrice) * 100
              : 0,
        discount_amount: Math.max(0, originalPrice - price),
        amount: price,
        price,
        quantity: Number(selection.quantity ?? 0),
        total: price * Number(selection.quantity ?? 0),
        brand: normalizeBrand(selection.brand || product.brand),
        stockQuantity:
          product.stockQuantity == null ? null : Number(product.stockQuantity),
      };
    });

    setDraftItems(nextItems);
    setPickerOpen(false);
    clearFieldError("products");
    setSaved(false);
  };

  const getBrandOptions = () => PRODUCT_BRAND_OPTIONS;

  const handleBrandChange = (index, option) => {
    const value = option?.value || "";
    setDraftItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, brand: value } : item,
      ),
    );
    clearFieldError(`brand-${index}`);
    setSaved(false);
  };

  const handleDiscountTypeChange = (index, type) => {
    setDraftItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const originalPrice = getOriginalPrice(item);
        const currentPrice = numberValue(item.price);
        const currentType = item.discountType || "percent";

       
        // switching modes, then recalculate using the selected mode.
        let nextValue = numberValue(item.discountValue);

        if (currentType === "value" && type === "percent") {
          nextValue =
            originalPrice > 0
              ? ((originalPrice - currentPrice) / originalPrice) * 100
              : 0;
        } else if (currentType === "percent" && type === "value") {
          nextValue = Math.max(0, originalPrice - currentPrice);
        }

        const price = calculateDiscountedPrice(originalPrice, type, nextValue);

        return {
          ...item,
          originalPrice,
          discountType: type,
          discountValue: nextValue,
          discount_percent:
            type === "percent"
              ? nextValue
              : originalPrice > 0
                ? ((originalPrice - price) / originalPrice) * 100
                : 0,
          discount_amount: Math.max(0, originalPrice - price),
          amount: price,
          price,
          total: price * Number(item.quantity || 0),
        };
      }),
    );
    setSaved(false);
  };

  const handleDiscountValueChange = (index, value) => {
    if (value === "") {
      setDraftItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, discountValue: "", price: getOriginalPrice(item) }
            : item,
        ),
      );
      setSaved(false);
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return;

    setDraftItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const originalPrice = getOriginalPrice(item);
        const type = item.discountType || "percent";
        const maxValue = type === "percent" ? 100 : originalPrice;
        const nextValue = Math.min(maxValue, numericValue);
        const price = calculateDiscountedPrice(originalPrice, type, nextValue);

        return {
          ...item,
          originalPrice,
          discountType: type,
          discountValue: nextValue,
          discount_percent:
            originalPrice > 0
              ? ((originalPrice - price) / originalPrice) * 100
              : 0,
          discount_amount: Math.max(0, originalPrice - price),
          amount: price,
          price,
          total: price * Number(item.quantity || 0),
        };
      }),
    );
    setSaved(false);
  };

  const handleQuantityChange = (index, value) => {
    if (value === "") {
      setDraftItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, quantity: "" } : item,
        ),
      );
      return;
    }

    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) return;

    setDraftItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity } : item,
      ),
    );
    setPickerSelection((current) =>
      current.map((selection) =>
        String(selection.productId) ===
        String(draftItems[index]?.productId || draftItems[index]?.product_id)
          ? { ...selection, quantity }
          : selection,
      ),
    );
    clearFieldError(`quantity-${index}`);
    setSaved(false);
  };

  const removeItem = (index) => {
    const productId = String(
      items[index]?.productId || items[index]?.product_id || "",
    );

    setDraftItems((current) =>
      current.filter(
        (item) => String(item.productId || item.product_id) !== productId,
      ),
    );
    setPickerSelection((current) =>
      current.filter((item) => String(item.productId) !== productId),
    );
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`quantity-${index}`];
      return next;
    });
    setSaved(false);
  };

  const handleSubmit = async () => {
    if (!order?.id || saving) return;

    if (!hasChanges) {
      setAlert({
        show: true,
        title: "No Changes",
        message: "Make at least one change before submitting the order.",
        variant: "info",
        confirmText: "OK",
        onConfirm: () => setAlert((current) => ({ ...current, show: false })),
      });
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setSaveError("");
      setAlert({
        show: true,
        title: "Validation Error",
        message:
          "Please correct the highlighted fields before submitting the order.",
        variant: "warning",
        confirmText: "OK",
        onConfirm: () => setAlert((current) => ({ ...current, show: false })),
      });
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    setSaveError("");
    setSaved(false);
    setSaving(true);

    try {
      const updated = await onOrderSave(
        order.id,
        {
          partyName: partyName.trim(),
          customerName: partyName.trim(),
          partyNumber: partyNumber.trim(),
          customerPhone: partyNumber.trim(),
          customerAddress: partyAddress.trim() || null,
          partySector: partySector.trim() || null,
          partyCountry: partyCountry || "India",
          partyState: partyState || null,
          partyDistrict: partyDistrict || null,
          partyLocality: partyLocality.trim() || null,
          partyPincode: partyPincode.trim() || null,
          status: nextStatus,
          orderDate: orderDate ? new Date(orderDate).toISOString() : null,
        },
        items.map((item) => ({
          productId: item.productId || item.product_id,
          quantity: Number(item.quantity),
          brand: text(item.brand) || null,
          originalPrice: numberValue(item.originalPrice),
          price: numberValue(item.price),
          amount: numberValue(item.price),
          discountType: item.discountType || "percent",
          discountValue: numberValue(item.discountValue),
          discount_percent: numberValue(item.discount_percent),
          discount_amount: numberValue(item.discount_amount),
        })),
      );

      if (updated) {
        setSaved(false);
        setEditMode(false);
        setAlert({
          show: true,
          title: "Success",
          message: "Order saved successfully.",
          variant: "success",
          confirmText: "OK",
          onConfirm: () => setAlert((current) => ({ ...current, show: false })),
        });
      }
    } catch (error) {
      console.error("Order save failed:", error);
      setSaveError("");
      setAlert({
        show: true,
        title: "Unable to Save Order",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save the order.",
        variant: "danger",
        confirmText: "OK",
        onConfirm: () => setAlert((current) => ({ ...current, show: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const resetEdit = () => {
    if (!order || saving) return;

    const orderItems = (order.items || []).map((item) => {
      const discount = getProductDiscount(item);
      const originalPrice = getOriginalPrice(item);
      const discountType =
        item.discountType || item.discount_type || discount.type;
      const discountValue =
        item.discountValue ?? item.discount_value ?? discount.value;
      const price = calculateDiscountedPrice(
        originalPrice,
        discountType,
        discountValue,
      );

      return {
        ...item,
        productId: item.productId || item.product_id,
        quantity: Number(item.quantity ?? 0),
        brand: normalizeBrand(item.brand),
        brands: Array.isArray(item.brands) ? item.brands : [],
        originalPrice,
        discountType,
        discountValue,
        discount_percent:
          originalPrice > 0
            ? ((originalPrice - price) / originalPrice) * 100
            : 0,
        discount_amount: Math.max(0, originalPrice - price),
        amount: price,
        price,
      };
    });

    setEditMode(false);
    setStatus(normaliseStatus(order.status));
    setPartyName(text(order.partyName || order.customerName));
    setPartyNumber(text(order.partyNumber || order.customerPhone));
    setPartyAddress(text(order.partyAddress || order.customerAddress));
    setPartySector(text(order.partySector || order.location));
    setPartyCountry(text(order.partyCountry));
    setPartyState(text(order.partyState));
    setPartyDistrict(text(order.partyDistrict));
    setPartyLocality(text(order.partyLocality));
    setPartyPincode(text(order.partyPincode));
    setOrderDate(dateTimeValue(order.orderDate || order.createdAt));
    setDraftItems(orderItems);
    setPickerSelection(
      orderItems.map((item) => ({
        productId: String(item.productId),
        quantity: Number(item.quantity ?? 0),
        product: item,
      })),
    );
    setPickerOpen(false);
    setFieldErrors({});
    setSaveError("");
    setSaved(false);
  };

  if (!order) return null;

  const displayStatus =
    STATUS_CONFIG[text(order.status).toLowerCase()] || "Order Received";
  const currentIndex = FLOW.indexOf(
    status || text(order.status).toLowerCase() || "order_received",
  );
  const isCancelled = text(order.status).toLowerCase() === "cancelled";

  const fieldError = (name) => fieldErrors[name] || "";
  const errorClass = (name) => (fieldError(name) ? "is-invalid" : "");

  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === status) || null;

  const stateOptions = INDIAN_STATES.map((value) => ({
    value,
    label: value,
  }));

  const districtOptions = districts.map((value) => ({
    value,
    label: value,
  }));

  const localityOptions = localities.map((value) => ({
    value,
    label: value,
  }));

  return (
    <Modal
      show={show}
      onHide={() => !saving && onHide()}
      centered
      size="xl"
      scrollable
      className="sales-order-modal"
      data-sales-theme={darkMode ? "dark" : "light"}
    >
      <Modal.Header closeButton={!saving} className="sales-order-modal__header">
        <div className="sales-order-modal__title-wrap">
          <div className="sales-order-modal__eyebrow">ORDER</div>
          <Modal.Title>{order.ref || order.id}</Modal.Title>
          <div className="sales-order-modal__subtitle">
            {order.orderDate || order.createdAt
              ? dayjs(order.orderDate || order.createdAt).format(
                  "DD MMM YYYY, h:mm A",
                )
              : ""}
          </div>
        </div>

        <div className="sales-order-header-actions">
          {!editMode && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              <i className="bi bi-pencil-square me-1" />
              Edit Order
            </Button>
          )}
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() =>
              exportSingleOrderPdf({
                ...order,
                partyName,
                partyNumber,
                partyAddress,
                partySector,
                partyCountry,
                partyState,
                partyDistrict,
                partyLocality,
                partyPincode,
                status: nextStatus,
                items,
                totalAmount,
                totalQuantity,
              })
            }
          >
            <i className="bi bi-file-earmark-pdf me-1" />
            PDF
          </Button>
          <Badge
            className={`sales-status-badge sales-status-badge--${text(
              order.status || nextStatus,
            ).toLowerCase()}`}
          >
            {displayStatus}
          </Badge>
        </div>
      </Modal.Header>

      <Modal.Body className="sales-order-modal__body">
        {editMode ? (
          <>
            <section className="sales-order-edit-card">
              <div className="sales-order-edit-card__header">
                <div>
                  <span>EDIT ORDER</span>
                  <h6>Party & delivery information</h6>
                </div>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Party Name *</Form.Label>
                    <Form.Control
                      ref={(element) => {
                        fieldRefs.current.partyName = element;
                      }}
                      value={partyName}
                      onChange={(event) => {
                        setPartyName(event.target.value);
                        clearFieldError("partyName");
                      }}
                      className={errorClass("partyName")}
                    />
                    {fieldError("partyName") && (
                      <div className="sales-field-error">
                        {fieldError("partyName")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Party Contact Number *</Form.Label>
                    <Form.Control
                      ref={(element) => {
                        fieldRefs.current.partyNumber = element;
                      }}
                      value={partyNumber}
                      onChange={(event) => {
                        setPartyNumber(event.target.value);
                        clearFieldError("partyNumber");
                      }}
                      className={errorClass("partyNumber")}
                    />
                    {fieldError("partyNumber") && (
                      <div className="sales-field-error">
                        {fieldError("partyNumber")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Location / Sector *</Form.Label>
                    <Form.Control
                      ref={(element) => {
                        fieldRefs.current.partySector = element;
                      }}
                      value={partySector}
                      onChange={(event) => {
                        setPartySector(event.target.value);
                        clearFieldError("partySector");
                      }}
                      placeholder="Area / sector / location"
                      className={errorClass("partySector")}
                    />
                    {fieldError("partySector") && (
                      <div className="sales-field-error">
                        {fieldError("partySector")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Country *</Form.Label>
                    <Select
                      {...SELECT_PROPS}
                      ref={(element) => {
                        fieldRefs.current.partyCountry = element;
                      }}
                      options={PARTY_COUNTRY_OPTIONS}
                      value={
                        PARTY_COUNTRY_OPTIONS.find(
                          (option) => option.value === partyCountry,
                        ) || null
                      }
                      onChange={(option) => {
                        setPartyCountry(option?.value || "");
                        clearFieldError("partyCountry");
                      }}
                      isSearchable={false}
                      className={errorClass("partyCountry")}
                      styles={buildSelectStyles(!!fieldError("partyCountry"))}
                      aria-label="Party country"
                    />
                    {fieldError("partyCountry") && (
                      <div className="sales-field-error">
                        {fieldError("partyCountry")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>State *</Form.Label>
                    <Select
                      {...SELECT_PROPS}
                      ref={(element) => {
                        fieldRefs.current.partyState = element;
                      }}
                      options={stateOptions}
                      value={
                        stateOptions.find(
                          (option) => option.value === partyState,
                        ) || null
                      }
                      onChange={(option) => {
                        setPartyState(option?.value || "");
                        setPartyDistrict("");
                        setPartyLocality("");
                        clearFieldError("partyState");
                        clearFieldError("partyDistrict");
                        clearFieldError("partyLocality");
                      }}
                      isSearchable
                      placeholder="Select state"
                      className={errorClass("partyState")}
                      styles={buildSelectStyles(!!fieldError("partyState"))}
                      aria-label="Party state"
                    />
                    {fieldError("partyState") && (
                      <div className="sales-field-error">
                        {fieldError("partyState")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>District *</Form.Label>
                    <CreatableSelect
                      {...SELECT_PROPS}
                      ref={(element) => {
                        fieldRefs.current.partyDistrict = element;
                      }}
                      options={districtOptions}
                      value={
                        partyDistrict
                          ? { value: partyDistrict, label: partyDistrict }
                          : null
                      }
                      onChange={(option) => {
                        setPartyDistrict(option?.value || "");
                        setPartyLocality("");
                        clearFieldError("partyDistrict");
                        clearFieldError("partyLocality");
                      }}
                      isDisabled={!partyState}
                      isClearable
                      isSearchable
                      placeholder="Select or type district"
                      className={errorClass("partyDistrict")}
                      styles={buildSelectStyles(!!fieldError("partyDistrict"))}
                      aria-label="Party district"
                    />
                    {fieldError("partyDistrict") && (
                      <div className="sales-field-error">
                        {fieldError("partyDistrict")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Town / City / Village *</Form.Label>
                    <CreatableSelect
                      {...SELECT_PROPS}
                      ref={(element) => {
                        fieldRefs.current.partyLocality = element;
                      }}
                      options={localityOptions}
                      value={
                        partyLocality
                          ? { value: partyLocality, label: partyLocality }
                          : null
                      }
                      onChange={(option) => {
                        setPartyLocality(option?.value || "");
                        clearFieldError("partyLocality");
                      }}
                      isDisabled={!partyDistrict}
                      isClearable
                      isSearchable
                      placeholder="Select or type town / city / village"
                      className={errorClass("partyLocality")}
                      styles={buildSelectStyles(!!fieldError("partyLocality"))}
                      aria-label="Party locality"
                    />
                    {fieldError("partyLocality") && (
                      <div className="sales-field-error">
                        {fieldError("partyLocality")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Pincode *</Form.Label>
                    <Form.Control
                      ref={(element) => {
                        fieldRefs.current.partyPincode = element;
                      }}
                      value={partyPincode}
                      onChange={(event) => {
                        setPartyPincode(
                          event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                        );
                        clearFieldError("partyPincode");
                      }}
                      inputMode="numeric"
                      maxLength={6}
                      className={errorClass("partyPincode")}
                    />
                    {fieldError("partyPincode") && (
                      <div className="sales-field-error">
                        {fieldError("partyPincode")}
                      </div>
                    )}
                  </Form.Group>
                </Col>

                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Party Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={partyAddress}
                      onChange={(event) => setPartyAddress(event.target.value)}
                      placeholder="Door / street / additional address"
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Order Status *</Form.Label>
                    <Select
                      {...SELECT_PROPS}
                      ref={(element) => {
                        fieldRefs.current.status = element;
                      }}
                      options={STATUS_OPTIONS}
                      value={selectedStatus}
                      onChange={(option) => setStatus(option?.value || "")}
                      isSearchable={false}
                      placeholder="Select status"
                      styles={buildSelectStyles(!!fieldError("status"))}
                      aria-label="Order status"
                    />
                    {!status &&
                      originalStatus &&
                      !normaliseStatus(originalStatus) && (
                        <div className="sales-field-note">
                          Existing status:{" "}
                          {STATUS_CONFIG[originalStatus] || originalStatus}
                        </div>
                      )}
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Order Date *</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={orderDate}
                      onChange={(event) => setOrderDate(event.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </section>

            <section className="sales-order-section">
              <div className="sales-order-section__heading">
                <div>
                  <span>PRODUCTS</span>
                  <h6>Add, remove or change quantities</h6>
                </div>
                {/* <span className="sales-order-picker-mode">
                  Brand is optional
                </span> */}
              </div>

              <div className="sales-order-product-picker-row">
                <div className="sales-order-product-picker-wrap">
                  <ProductPicker
                    open={pickerOpen}
                    onOpen={() => setPickerOpen(true)}
                    onClose={applyPickerSelection}
                    onCancel={cancelPickerSelection}
                    products={products}
                    category={productCategory}
                    setCategory={setProductCategory}
                    selected={pickerSelection}
                    setSelected={setPickerSelection}
                    disabled={saving || productsLoading}
                  />
                </div>

                {productsLoading && (
                  <span className="sales-products-loading">
                    Loading products...
                  </span>
                )}

                {fieldError("products") && (
                  <div
                    ref={(element) => {
                      fieldRefs.current.products = element;
                    }}
                    className="sales-field-error"
                    tabIndex="-1"
                  >
                    {fieldError("products")}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="sales-order-summary">
            <div className="sales-order-summary__main">
              <div className="sales-order-customer">
                <div className="sales-order-avatar">
                  {text(order.partyName || order.customerName)
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <span>Party Name</span>
                  <strong>{text(order.partyName || order.customerName)}</strong>
                </div>
              </div>

              {(text(order.partyNumber || order.customerPhone) ||
                text(order.partySector || order.location)) && (
                <div className="sales-order-contact">
                  <i className="bi bi-telephone" />
                  <span>{text(order.partyNumber || order.customerPhone)}</span>
                  {text(order.partySector || order.location) && (
                    <span> · {text(order.partySector || order.location)}</span>
                  )}
                </div>
              )}
            </div>

            <div className="sales-order-summary__stats">
              <div>
                <span>Grand Total Pricing</span>
                <strong>{money(order.totalAmount)}</strong>
              </div>
              <div>
                <span>Total Quantity</span>
                <strong>
                  {Number(order.totalQuantity ?? totalQuantity).toLocaleString(
                    "en-IN",
                  )}
                </strong>
              </div>
              {text(order.partySector || order.location) && (
                <div>
                  <span>Location</span>
                  <strong>{text(order.partySector || order.location)}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <section className="sales-order-section">
          <div className="sales-order-section__heading">
            <div>
              <span>ORDER ITEMS</span>
              <h6>Products in this order</h6>
            </div>
            <Badge className="sales-count-badge">
              {items.length} {items.length === 1 ? "product" : "products"}
            </Badge>
          </div>

          <div className="sales-order-items-wrap">
            {items.length ? (
              <Table className="sales-order-items-table" hover>
                <thead>
                  <tr>
                    <th className="text-center">Brand</th>
                    <th>Product</th>
                    <th className="text-center">Discount</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                    {editMode && <th className="text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const quantity = Number(item.quantity || 0);
                    const originalPrice = getOriginalPrice(item);
                    const discountType =
                      item.discountType || item.discount_type || "percent";
                    const discountValue = numberValue(
                      item.discountValue ?? item.discount_value ?? 0,
                    );
                    const price = calculateDiscountedPrice(
                      originalPrice,
                      discountType,
                      discountValue,
                    );
                    const total = price * quantity;
                    const brandOptions = getBrandOptions();

                    return (
                      <tr
                        key={`${item.productId || item.id || item.name}-${index}`}
                      >
                        <td className="text-center sales-order-brand-cell">
                          {editMode ? (
                            <Select
                              {...SELECT_PROPS}
                              options={brandOptions}
                              value={
                                brandOptions.find(
                                  (option) =>
                                    option.value === normalizeBrand(item.brand),
                                ) || brandOptions[0]
                              }
                              onChange={(option) =>
                                handleBrandChange(index, option)
                              }
                              isSearchable={false}
                              isClearable
                              aria-label={`Brand for ${text(item.name)}`}
                            />
                          ) : (
                            text(item.brand)
                          )}
                        </td>
                        <td>
                          <div className="sales-product-name">
                            <strong>{text(item.name)}</strong>
                            {text(item.contents) && (
                              <strong className="sales-product-contents">
                                ({text(item.contents)})
                              </strong>
                            )}
                          </div>
                        </td>
                        <td className="text-center sales-order-discount-cell">
                          {editMode ? (
                            <div className="sales-discount-control">
                              <div
                                className="sales-discount-toggle"
                                role="group"
                                aria-label={`Discount type for ${text(item.name)}`}
                              >
                                {DISCOUNT_TYPES.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    className={
                                      discountType === option.value
                                        ? "is-active"
                                        : ""
                                    }
                                    onClick={() =>
                                      handleDiscountTypeChange(
                                        index,
                                        option.value,
                                      )
                                    }
                                    title={option.title}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                              <Form.Control
                                type="number"
                                min="0"
                                max={
                                  discountType === "percent"
                                    ? 100
                                    : originalPrice
                                }
                                step="0.01"
                                value={item.discountValue ?? ""}
                                onChange={(event) =>
                                  handleDiscountValueChange(
                                    index,
                                    event.target.value,
                                  )
                                }
                                className="sales-discount-input"
                                aria-label={`Discount for ${text(item.name)}`}
                              />
                            </div>
                          ) : (
                            <span className="sales-discount-readonly">
                              {discountType === "percent"
                                ? `${discountValue.toFixed(2)}%`
                                : money(discountValue)}
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {editMode ? (
                            <div className="sales-inline-quantity">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuantityChange(
                                    index,
                                    Math.max(0, quantity - 1),
                                  )
                                }
                              >
                                −
                              </button>
                              <input
                                ref={(element) => {
                                  fieldRefs.current[`quantity-${index}`] =
                                    element;
                                }}
                                type="number"
                                min="0"
                                step="1"
                                value={draftItems[index]?.quantity ?? quantity}
                                onChange={(event) =>
                                  handleQuantityChange(
                                    index,
                                    event.target.value,
                                  )
                                }
                                className={errorClass(`quantity-${index}`)}
                                aria-label={`Quantity for ${text(item.name)}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuantityChange(index, quantity + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            quantity.toLocaleString("en-IN")
                          )}
                          {fieldError(`quantity-${index}`) && (
                            <div className="sales-field-error">
                              {fieldError(`quantity-${index}`)}
                            </div>
                          )}
                        </td>
                        <td className="text-end">{money(price)}</td>
                        <td className="text-end">{money(total)}</td>
                        {editMode && (
                          <td className="text-center">
                            <Button
                              type="button"
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeItem(index)}
                              title="Remove product"
                              aria-label={`Remove ${text(item.name)}`}
                            >
                              <i className="bi bi-trash" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="sales-order-items-total-row">
                    <td colSpan={4} />
                    <td className="text-end">
                      <strong>Grand Total</strong>
                    </td>
                    <td className="text-end">
                      <strong>{money(totalAmount)}</strong>
                    </td>
                    {editMode && <td />}
                  </tr>
                </tfoot>
              </Table>
            ) : (
              <div className="sales-order-items-empty">
                No products selected.
              </div>
            )}
          </div>
        </section>

        {!editMode && (
          <section className="sales-order-section">
            <div className="sales-order-section__heading">
              <div>
                <span>ORDER SUMMARY</span>
                <h6>Saved party information</h6>
              </div>
            </div>
            <div className="sales-party-summary-grid">
              {text(order.partyName || order.customerName) && (
                <div>
                  <span>Party Name</span>
                  <strong>{text(order.partyName || order.customerName)}</strong>
                </div>
              )}
              {text(order.partyNumber || order.customerPhone) && (
                <div>
                  <span>Party Contact Number</span>
                  <strong>
                    {text(order.partyNumber || order.customerPhone)}
                  </strong>
                </div>
              )}
              {text(order.partySector || order.location) && (
                <div>
                  <span>Location / Sector</span>
                  <strong>{text(order.partySector || order.location)}</strong>
                </div>
              )}
              {text(order.partyCountry) && (
                <div>
                  <span>Country</span>
                  <strong>{text(order.partyCountry)}</strong>
                </div>
              )}
              {text(order.partyState) && (
                <div>
                  <span>State</span>
                  <strong>{text(order.partyState)}</strong>
                </div>
              )}
              {text(order.partyDistrict) && (
                <div>
                  <span>District</span>
                  <strong>{text(order.partyDistrict)}</strong>
                </div>
              )}
              {text(order.partyLocality) && (
                <div>
                  <span>Town / City / Village</span>
                  <strong>{text(order.partyLocality)}</strong>
                </div>
              )}
              {text(order.partyPincode) && (
                <div>
                  <span>Pincode</span>
                  <strong>{text(order.partyPincode)}</strong>
                </div>
              )}
              {text(order.partyAddress || order.customerAddress) && (
                <div className="sales-party-summary-grid__address">
                  <span>Address</span>
                  <strong>
                    {text(order.partyAddress || order.customerAddress)}
                  </strong>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="sales-order-section">
          <div className="sales-order-section__heading">
            <div>
              <span>FULFILMENT</span>
              <h6>Order status</h6>
            </div>
          </div>

          {isCancelled ? (
            <div className="sales-cancelled-state">Order cancelled</div>
          ) : (
            <div className="sales-order-timeline">
              {FLOW.map((step, index) => {
                const timelineIndex = currentIndex >= 0 ? currentIndex : 0;
                const done = index <= timelineIndex;
                const current = index === timelineIndex;

                return (
                  <div
                    className={`sales-order-timeline__item ${
                      done ? "is-done" : ""
                    } ${current ? "is-current" : ""}`}
                    key={step}
                  >
                    <div className="sales-order-timeline__node">
                      {done ? "✓" : index + 1}
                    </div>
                    <strong>{STATUS_CONFIG[step]}</strong>
                    {current && <span>Current</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </Modal.Body>

      <Modal.Footer className="sales-order-modal__footer">
        {editMode ? (
          <>
            <Button
              variant="outline-secondary"
              onClick={resetEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="sales-primary-action"
              onClick={handleSubmit}
              disabled={saving}
            >
              <i className="bi bi-check2-circle me-1" />
              {saving ? "Submitting..." : "Submit"}
            </Button>
          </>
        ) : (
          <Button
            className="sales-secondary-action btn btn-secondary"
            onClick={onHide}
          >
            Close
          </Button>
        )}
      </Modal.Footer>

      <AlertModal
        show={alert.show}
        onHide={() => setAlert((current) => ({ ...current, show: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        confirmText={alert.confirmText || "OK"}
        onConfirm={alert.onConfirm}
      />
    </Modal>
  );
};

export default OrderDetailsModal;
