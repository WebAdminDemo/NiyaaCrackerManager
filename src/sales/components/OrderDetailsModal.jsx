import { useEffect, useState } from 'react';
import { Modal, Table, Badge, Row, Col, Form, Button } from 'react-bootstrap';
import dayjs from 'dayjs';

const OrderDetailsModal = ({ show, onHide, order, onStatusChange }) => {
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(order?.status || 'pending');
  }, [order]);

  if (!order) return null;

  const items = order.items || [];
  const steps = ['pending', 'processing', 'packaging', 'shipped', 'delivered'];
  const currentIndex = steps.indexOf(status);

  const handleStatusChange = (e) => setStatus(e.target.value);

  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      await onStatusChange(order.id, status);
      onHide();
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="skeuomorphic-modal">
      <Modal.Header closeButton className="border-0">
        <Modal.Title>Order Details – {order.ref || order.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-3">
          <Col md={6}>
            <strong>Customer:</strong> {order.customerName || 'N/A'}<br />
            <strong>Phone:</strong> {order.customerPhone || 'N/A'}<br />
            <strong>Channel:</strong>{' '}
            <Badge bg={order.channel === 'whatsapp' ? 'success' : 'primary'}>
              {order.channel || 'N/A'}
            </Badge>
          </Col>
          <Col md={6}>
            <strong>Date:</strong> {dayjs(order.orderDate || order.createdAt).format('DD MMM YYYY, h:mm A')}<br />
            <strong>Total Amount:</strong> ₹{(order.totalAmount || 0).toLocaleString()}<br />
            <strong>Total Items:</strong> {order.totalItems || 0}
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Order Status</Form.Label>
              <Form.Select value={status} onChange={handleStatusChange} className="rounded-pill">
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="packaging">Packaging</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end">
            <Button variant="primary" onClick={handleSaveStatus} disabled={saving} className="w-100">
              {saving ? 'Saving...' : 'Update Status'}
            </Button>
          </Col>
        </Row>

        <h6 className="fw-bold">Order Items</h6>
        <Table bordered size="sm" className="mb-3">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{item.category || 'N/A'}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price}</td>
                <td>₹{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <h6 className="fw-bold">Order Timeline</h6>
        <div className="d-flex flex-wrap gap-3">
          {steps.map((step, i) => {
            const isDone = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={step} className="text-center">
                <div
                  className={`rounded-circle p-2 ${isDone ? 'bg-success' : 'bg-secondary'} text-white`}
                  style={{ width: '40px', height: '40px', lineHeight: '1.5' }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <small className={`d-block ${isCurrent ? 'fw-bold text-primary' : ''}`}>
                  {step.charAt(0).toUpperCase() + step.slice(1)}
                </small>
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderDetailsModal;