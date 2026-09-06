import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function AlertModal({
  show,
  onHide,
  title = 'Notice',
  message = '',
  variant = 'info', // 'info', 'success', 'danger', 'warning'
  confirmText = 'OK',
  onConfirm,
  cancelText = 'Cancel',
  onCancel,
  showCancel = false,
}) {
  const variantColors = {
    info: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };

  const iconMap = {
    info: 'bi-info-circle',
    success: 'bi-check-circle',
    danger: 'bi-exclamation-triangle',
    warning: 'bi-exclamation-triangle',
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton={!onConfirm} className="border-0 pb-0">
        <Modal.Title className={`d-flex align-items-center gap-2 ${variantColors[variant]}`}>
          <i className={`bi ${iconMap[variant]} fs-4`} aria-hidden="true"></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-3">
        <p className="mb-0 fs-6">{message}</p>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        {showCancel && (
          <Button variant="secondary" onClick={onCancel || onHide}>
            {cancelText}
          </Button>
        )}
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm || onHide}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}