import React, { useRef, useCallback } from 'react';
import { Dropdown } from 'react-bootstrap';

export default function ExportImport({ onExport, onImport }) {
  const fileInputRef = useRef(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file && typeof onImport === 'function') {
      onImport(file);
    }
    event.target.value = '';
  }, [onImport]);

  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-secondary" size="sm" id="product-excel-dropdown">
        <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden="true" />
        Excel
      </Dropdown.Toggle>
      <Dropdown.Menu align="end">
        <Dropdown.Item onClick={onExport}>
          <i className="bi bi-file-earmark-excel me-2" aria-hidden="true" />
          Export Excel
        </Dropdown.Item>
        <Dropdown.Item onClick={handleImportClick}>
          <i className="bi bi-upload me-2" aria-hidden="true" />
          Import Excel
        </Dropdown.Item>
      </Dropdown.Menu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={handleFileChange}
      />
    </Dropdown>
  );
}
