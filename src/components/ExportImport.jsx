import React, { useRef, useCallback } from 'react';
import { Dropdown } from 'react-bootstrap';

export default function ExportImport({ onExport, onImport }) {
  const fileInputRef = useRef(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && typeof onImport === 'function') {
      onImport(file);
    }
    e.target.value = '';
  }, [onImport]);

  return (
    <>
      <Dropdown>
        <Dropdown.Toggle variant="outline-secondary" size="sm" id="export-import-dropdown">
          <i className="bi bi-upload-download me-1"></i> Import/Export
        </Dropdown.Toggle>
        <Dropdown.Menu align="end">
          <Dropdown.Item onClick={onExport}>
            <i className="bi bi-download me-2"></i> Export JSON
          </Dropdown.Item>
          <Dropdown.Item onClick={handleImportClick}>
            <i className="bi bi-upload me-2"></i> Import JSON
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}