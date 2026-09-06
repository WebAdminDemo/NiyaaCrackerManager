import React, { useMemo, useState } from "react";
import { Button, Form, Modal, Table } from "react-bootstrap";
import {
  Search,
  Users,
  Package,
  ArrowRight,
  X,
  Phone,
} from "lucide-react";
import dayjs from "dayjs";
import { useTheme } from "../../context/ThemeContext";

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const customerKey = (order) => {
  const phone = normalizeText(order.customer?.phone || order.customerPhone);
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;

  if (normalizedPhone) return `phone:${normalizedPhone}`;

  const name = normalizeText(order.customer?.name || order.customerName);
  return `name:${name || "walk-in customer"}`;
};

const customerName = (order) =>
  order.customer?.name || order.customerName || "Walk-in customer";

const customerPhone = (order) =>
  order.customer?.phone || order.customerPhone || "—";

const getOrderUnits = (order) =>
  Number(
    order.totalQuantity ??
      (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
  );

const buildCustomers = (orders) => {
  const map = new Map();

  // Combine orders that belong to the same customer.
  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const key = customerKey(order);
    const current = map.get(key) || {
      key,
      name: customerName(order),
      phone: customerPhone(order),
      orders: 0,
      units: 0,
      revenue: 0,
      lastOrder: null,
    };

    const orderDate = order.orderDate || order.createdAt;
    current.orders += 1;
    current.units += getOrderUnits(order);
    current.revenue += Number(order.totalAmount || 0);

    if (
      orderDate &&
      (!current.lastOrder ||
        dayjs(orderDate).valueOf() > dayjs(current.lastOrder).valueOf())
    ) {
      current.lastOrder = orderDate;
    }

    map.set(key, current);
  });

  return [...map.values()].sort(
    (a, b) => b.revenue - a.revenue || b.orders - a.orders,
  );
};

const buildSoldProducts = (orders) => {
  const map = new Map();

  // Combine products sold across all selected orders.
  (Array.isArray(orders) ? orders : []).forEach((order) => {
    (order.items || []).forEach((item) => {
      const name = item.name || item.productName || item.title || "Item";
      const category = item.category || "Uncategorised";
      const identity = normalizeText(
        item.rowid || item.productId || item.sku || name,
      );
      const key = `${identity}|${normalizeText(category)}`;
      const current = map.get(key) || {
        key,
        name,
        category,
        quantity: 0,
        revenue: 0,
      };

      const quantity = Number(item.quantity || 0);
      const total = Number(
        item.total ?? quantity * Number(item.price || 0),
      );

      current.quantity += quantity;
      current.revenue += total;
      map.set(key, current);
    });
  });

  return [...map.values()].sort(
    (a, b) => b.quantity - a.quantity || b.revenue - a.revenue,
  );
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const KpiDetailsModal = ({
  type,
  show,
  onHide,
  orders,
  onViewSoldProducts,
}) => {
  const { darkMode } = useTheme();
  const [search, setSearch] = useState("");

  const customers = useMemo(() => buildCustomers(orders), [orders]);
  const soldProducts = useMemo(() => buildSoldProducts(orders), [orders]);
  const isCustomers = type === "customers";

  const data = useMemo(() => {
    const query = normalizeText(search);

    if (!query) return isCustomers ? customers : soldProducts;

    if (isCustomers) {
      return customers.filter(
        (customer) =>
          normalizeText(customer.name).includes(query) ||
          normalizeText(customer.phone).includes(query),
      );
    }

    return soldProducts.filter(
      (product) =>
        normalizeText(product.name).includes(query) ||
        normalizeText(product.category).includes(query),
    );
  }, [customers, soldProducts, isCustomers, search]);

  const close = () => {
    setSearch("");
    onHide();
  };

  const title = isCustomers ? "Customer purchase history" : "Products sold";
  const count = isCustomers ? customers.length : soldProducts.length;

  return (
    <Modal
      show={show}
      onHide={close}
      centered
      size="xl"
      scrollable
      className="sales-details-modal" data-sales-theme={darkMode ? "dark" : "light"}
    >
      <Modal.Header closeButton>
        <div>
          <div className="sales-details-modal__eyebrow">
            {isCustomers ? "CUSTOMERS" : "SOLD PRODUCTS"}
          </div>
          <Modal.Title>{title}</Modal.Title>
          <p>
            {isCustomers
              ? `${count} unique customers in the selected period`
              : `${count} products purchased in the selected period`}
          </p>
        </div>
      </Modal.Header>

      <Modal.Body className="sales-details-modal__body">
        <div className="sales-details-toolbar">
          <div className="sales-details-search">
            <Search size={16} aria-hidden="true" />
            <Form.Control
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isCustomers
                  ? "Search by customer name or phone"
                  : "Search by product or category"
              }
            />
            {search && (
              <button
                type="button"
                className="sales-details-search__clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="sales-details-summary">
            {data.length} shown
          </div>
        </div>

        <div className="sales-details-table-wrap">
          {data.length ? (
            isCustomers ? (
              <Table className="sales-details-table" hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Units</th>
                    <th>Last order</th>
                    <th className="text-end">Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((customer, index) => (
                    <tr key={customer.key}>
                      <td><span className="sales-rank">{index + 1}</span></td>
                      <td>
                        <div className="sales-person-cell">
                          <span className="sales-avatar">
                            {(customer.name || "C").charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <strong>{customer.name}</strong>
                            <small>
                              {customer.orders} {customer.orders === 1 ? "order" : "orders"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sales-detail-inline">
                          <Phone size={12} /> {customer.phone}
                        </span>
                      </td>
                      <td>{customer.orders}</td>
                      <td>{customer.units.toLocaleString("en-IN")}</td>
                      <td>
                        {customer.lastOrder
                          ? dayjs(customer.lastOrder).format("DD MMM YYYY")
                          : "—"}
                      </td>
                      <td className="text-end sales-money">
                        {money(customer.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Table className="sales-details-table" hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Units sold</th>
                    <th className="text-end">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((product, index) => (
                    <tr key={product.key}>
                      <td><span className="sales-rank">{index + 1}</span></td>
                      <td>
                        <div className="sales-product-cell">
                          <span className="sales-product-icon">
                            <Package size={16} />
                          </span>
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td><span className="sales-category-text">{product.category}</span></td>
                      <td><strong>{product.quantity.toLocaleString("en-IN")}</strong></td>
                      <td className="text-end sales-money">{money(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : (
            <div className="sales-details-empty">
              {isCustomers ? <Users size={25} /> : <Package size={25} />}
              <strong>No {isCustomers ? "customers" : "sold products"} found</strong>
              <span>Try another search.</span>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="sales-details-modal__footer">
        {type === "soldProducts" && soldProducts.length > 0 && (
          <Button
            className="sales-primary-action"
            onClick={() => {
              onViewSoldProducts?.(soldProducts);
              close();
            }}
          >
            View in Products
            <ArrowRight size={15} />
          </Button>
        )}
        <Button variant="outline-secondary" onClick={close}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export { buildCustomers, buildSoldProducts };
export default KpiDetailsModal;
