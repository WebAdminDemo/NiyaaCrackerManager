import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import dayjs from "dayjs";
import { useTheme } from "../../context/ThemeContext";
import {
  CalendarDays,
  Check,
  Clock3,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock3 },
  processing: { label: "Processing", icon: Package },
  packaging: { label: "Packaging", icon: ShoppingBag },
  shipped: { label: "Shipped", icon: Truck },
  delivered: { label: "Delivered", icon: Check },
  cancelled: { label: "Cancelled", icon: XCircle },
};

const FLOW = ["pending", "processing", "packaging", "shipped", "delivered"];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const getUnits = (items) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const OrderDetailsModal = ({ show, onHide, order, onStatusChange }) => {
  const { darkMode } = useTheme();
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStatus(order?.status?.toLowerCase() || "pending");
    setSaveError("");
    setSaved(false);
  }, [order]);

  const items = useMemo(() => order?.items || [], [order]);
  const currentStatus = status || "pending";
  const currentIndex = FLOW.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const units = Number(order?.totalQuantity ?? getUnits(items));

  if (!order) return null;

  const handleSaveStatus = async () => {
    if (!onStatusChange || !order.id || saving) return;

    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      await onStatusChange(order.id, currentStatus);
      setSaved(true);
    } catch (error) {
      setSaveError(error?.message || "Unable to update order status.");
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (saving) return;
    setSaveError("");
    setSaved(false);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={close}
      centered
      size="xl"
      scrollable
      className="sales-order-modal" data-sales-theme={darkMode ? "dark" : "light"}
    >
      <Modal.Header closeButton className="sales-order-modal__header">
        <div className="sales-order-modal__title-wrap">
          <div className="sales-order-modal__eyebrow">ORDER DETAILS</div>
          <Modal.Title>{order.ref || order.id}</Modal.Title>
          <div className="sales-order-modal__subtitle">
            {order.orderDate || order.createdAt
              ? dayjs(order.orderDate || order.createdAt).format(
                  "DD MMM YYYY, h:mm A",
                )
              : "Date not available"}
          </div>
        </div>
        <Badge
          className={`sales-status-badge sales-status-badge--${currentStatus}`}
        >
          {STATUS_CONFIG[currentStatus]?.label || currentStatus}
        </Badge>
      </Modal.Header>

      <Modal.Body className="sales-order-modal__body">
        <div className="sales-order-summary">
          <div className="sales-order-summary__main">
            <div className="sales-order-customer">
              <div className="sales-order-avatar">
                {(order.customerName || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <span>Customer</span>
                <strong>{order.customerName || "Walk-in customer"}</strong>
              </div>
            </div>

            <div className="sales-order-contact">
              <Phone size={14} />
              <span>{order.customerPhone || "No phone number"}</span>
            </div>
          </div>

          <div className="sales-order-summary__stats">
            <div>
              <span>Total amount</span>
              <strong>{money(order.totalAmount)}</strong>
            </div>
            <div>
              <span>Units</span>
              <strong>{units.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span>Channel</span>
              <strong>{order.channel || "Direct"}</strong>
            </div>
          </div>
        </div>

        <section className="sales-order-section">
          <div className="sales-order-section__heading">
            <div>
              <span>FULFILMENT</span>
              <h6>Order status</h6>
            </div>
            {saved && (
              <div className="sales-save-message">
                <Check size={14} />
                Status updated
              </div>
            )}
          </div>

          <div className="sales-status-control">
            <Form.Select
              value={currentStatus}
              onChange={(event) => {
                setStatus(event.target.value);
                setSaved(false);
                setSaveError("");
              }}
              disabled={saving}
            >
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option value={value} key={value}>
                  {config.label}
                </option>
              ))}
            </Form.Select>
            <Button
              className="sales-primary-action"
              onClick={handleSaveStatus}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save status"}
            </Button>
          </div>

          {saveError && (
            <div className="sales-status-error">
              <XCircle size={14} />
              {saveError}
            </div>
          )}
        </section>

        <section className="sales-order-section">
          <div className="sales-order-section__heading">
            <div>
              <span>ITEMS</span>
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
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const quantity = Number(item.quantity || 0);
                    const price = Number(item.price || 0);
                    const total = Number(item.total ?? quantity * price);
                    const name = item.name || item.productName || item.title || "Item";

                    return (
                      <tr key={`${name}-${index}`}>
                        <td>
                          <div className="sales-order-product">
                            <span className="sales-order-product__icon">
                              <Package size={15} />
                            </span>
                            <strong>{name}</strong>
                          </div>
                        </td>
                        <td>{item.category || "Uncategorised"}</td>
                        <td className="text-center">{quantity}</td>
                        <td className="text-end">{money(price)}</td>
                        <td className="text-end sales-order-item-total">
                          {money(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <div className="sales-order-items-empty">
                <Package size={22} />
                <span>No items available for this order.</span>
              </div>
            )}
          </div>
        </section>

        <section className="sales-order-section">
          <div className="sales-order-section__heading">
            <div>
              <span>ORDER FLOW</span>
              <h6>Fulfilment progress</h6>
            </div>
          </div>

          {isCancelled ? (
            <div className="sales-cancelled-state">
              <div className="sales-cancelled-icon">
                <XCircle size={19} />
              </div>
              <div>
                <strong>Order cancelled</strong>
                <span>The order is no longer in the active fulfilment flow.</span>
              </div>
            </div>
          ) : (
            <div className="sales-order-timeline">
              {FLOW.map((step, index) => {
                const config = STATUS_CONFIG[step];
                const Icon = config.icon;
                const done = index <= currentIndex;
                const current = index === currentIndex;

                return (
                  <div
                    className={`sales-order-timeline__item ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}
                    key={step}
                  >
                    <div className="sales-order-timeline__node">
                      {done ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>
                    <strong>{config.label}</strong>
                    {current && <span>Current</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="sales-order-meta-grid">
          <div>
            <CalendarDays size={14} />
            <span>Placed</span>
            <strong>
              {order.orderDate || order.createdAt
                ? dayjs(order.orderDate || order.createdAt).format("DD MMM YYYY")
                : "—"}
            </strong>
          </div>
          <div>
            <UserRound size={14} />
            <span>Customer</span>
            <strong>{order.customerName || "Walk-in customer"}</strong>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="sales-order-modal__footer">
        <Button variant="outline-secondary" onClick={close} disabled={saving}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderDetailsModal;
