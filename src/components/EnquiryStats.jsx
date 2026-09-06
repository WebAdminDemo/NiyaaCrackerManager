import React, { memo } from 'react';
import { Card } from 'react-bootstrap';

const EnquiryStats = memo(function EnquiryStats({ enquiries = [] }) {
  // The Spring API returns aggregate counts from enquiry_items. Keep array
  // support for existing callers that may still supply individual records.
  const summary = !Array.isArray(enquiries) && enquiries && typeof enquiries === 'object'
    ? enquiries
    : null;
  const safe = Array.isArray(enquiries) ? enquiries : [];
  const totalDay = summary ? Number(summary.day) || 0 : safe.reduce((sum, e) => sum + (Number(e.day) || 0), 0);
  const totalWeek = summary ? Number(summary.week) || 0 : safe.reduce((sum, e) => sum + (Number(e.week) || 0), 0);
  const totalMonth = summary ? Number(summary.month) || 0 : safe.reduce((sum, e) => sum + (Number(e.month) || 0), 0);

  return (
    <Card className="stat-card stat-card-light h-100">
      <Card.Body>
        <div className="text-muted small fw-medium">Enquiries</div>
        <div className="mt-2">
          <div className="d-flex justify-content-between">
            <span>Today</span>
            <strong>{totalDay}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span>This Week</span>
            <strong>{totalWeek}</strong>
          </div>
          <div className="d-flex justify-content-between">
            <span>This Month</span>
            <strong>{totalMonth}</strong>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
});

export default EnquiryStats;
