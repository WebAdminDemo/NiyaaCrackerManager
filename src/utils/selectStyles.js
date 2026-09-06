// src/utils/selectStyles.js
//
// Shared react-select styling used by EVERY dropdown in the app
// (category filter, category creatable select, status select, etc).
//
// IMPORTANT: values are CSS custom properties (var(--...)) defined in
// global.css. The browser resolves them against whatever
// [data-bs-theme] is currently set on <html>/<body>, so these styles
// automatically follow light/dark mode with zero JS theme detection.

export const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '48px',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-input)',
    borderColor: state.isFocused ? 'var(--brand)' : 'var(--border)',
    boxShadow: state.isFocused
      ? '0 0 0 0.2rem rgba(var(--brand-rgb), 0.16)'
      : '0 0.125rem 0.25rem rgba(0,0,0,0.05)',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
    ':hover': {
      borderColor: state.isFocused ? 'var(--brand)' : 'var(--border-strong)',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 12px',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-1)',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-muted)',
    borderRadius: '999px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--text-1)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-1)',
    margin: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-3)',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'var(--border)',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: 'var(--text-3)',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none',
    transition: 'transform 160ms ease',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--text-3)',
    ':hover': { color: 'var(--danger)' },
  }),
  // Rendered into document.body via menuPortalTarget, so it always
  // escapes any overflow:hidden / overflow:auto ancestor (e.g. the
  // modal body) and is never visually clipped or mis-sized.
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-card-2)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',

  }),
  menuList: (base) => ({
    ...base,
    padding: '6px',
    maxHeight: '260px',
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '0.95rem',
    backgroundColor: state.isSelected
      ? 'var(--brand)'
      : state.isFocused
      ? 'rgba(var(--brand-rgb), 0.12)'
      : 'transparent',
    color: state.isSelected ? '#fff' : 'var(--text-1)',
    cursor: 'pointer',
    ':active': {
      backgroundColor: 'var(--brand-3)',
      color: '#fff',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--text-3)',
  }),
};

/**
 * Same styles, but with the control border switched to the danger
 * color when a validation error is present. Use this anywhere a
 * select can show a field-level error (e.g. required category).
 */
export function buildSelectStyles(hasError) {
  return {
    ...reactSelectStyles,
    control: (base, state) => ({
      ...reactSelectStyles.control(base, state),
      borderColor: hasError
        ? 'var(--danger)'
        : state.isFocused
        ? 'var(--brand)'
        : 'var(--border)',
      boxShadow: hasError
        ? '0 0 0 0.2rem rgba(225, 112, 85, 0.16)'
        : reactSelectStyles.control(base, state).boxShadow,
    }),
  };
}

// Common props every dropdown should pass, so menus render in a
// portal (fixing clipping inside the modal) and stay above modals.
export const portalSelectProps = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
  menuPosition: 'fixed',
  classNamePrefix: 'react-select',
};