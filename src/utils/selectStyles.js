// Shared react-select styling used across Product Manager, Product Modal,
// Sales filters and Sales Order editing. The dimensions and dropdown shape
// intentionally match the Sales filter controls.

const COLORS = {
  text: 'var(--text-1, #1C1B29)',
  muted: 'var(--text-3, #6B6A7A)',
  border: 'var(--border, #E0E0E8)',
  borderFocus: 'var(--brand, #6C5CE7)',
  bg: 'var(--bg-input, #FFFFFF)',
  bgHover: 'var(--bg-muted, #F6F5FD)',
  primary: 'var(--brand, #6C5CE7)',
  primarySoft: 'rgba(var(--brand-rgb, 108, 92, 231), 0.12)',
};

export const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    height: 40,
    borderRadius: 10,
    borderColor: state.isFocused ? COLORS.borderFocus : COLORS.border,
    boxShadow: state.isFocused ? `0 0 0 2px ${COLORS.primarySoft}` : 'none',
    backgroundColor: COLORS.bg,
    '&:hover': {
      borderColor: state.isFocused ? COLORS.borderFocus : 'var(--border-strong, #C8C8D0)',
    },
    cursor: 'pointer',
    fontSize: 13,
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 10px',
    minWidth: 0,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: COLORS.text,
    fontSize: 13,
  }),
  singleValue: (base) => ({
    ...base,
    color: COLORS.text,
    fontSize: 13,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: COLORS.bgHover,
    borderRadius: 7,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: COLORS.text,
    fontSize: 13,
  }),
  placeholder: (base) => ({
    ...base,
    color: COLORS.muted,
    fontSize: 13,
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: COLORS.muted,
    padding: '0 8px',
    transition: 'transform 0.15s ease',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none',
    '&:hover': { color: COLORS.text },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: COLORS.muted,
    padding: '0 4px',
    '&:hover': { color: COLORS.text },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 10px 28px rgba(28, 27, 41, 0.14)',
    overflow: 'hidden',
    zIndex: 50,
    marginTop: 6,
  }),
  menuList: (base) => ({
    ...base,
    backgroundColor: COLORS.bg,
    padding: 6,
    maxHeight: 260,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? COLORS.primary
      : state.isFocused
        ? COLORS.bgHover
        : COLORS.bg,
    color: state.isSelected ? '#FFFFFF' : COLORS.text,
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    cursor: 'pointer',
    '&:active': {
      backgroundColor: state.isSelected ? COLORS.primary : COLORS.primarySoft,
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: COLORS.muted,
    fontSize: 13,
  }),
};

export function buildSelectStyles(hasError = false) {
  return {
    ...reactSelectStyles,
    control: (base, state) => ({
      ...reactSelectStyles.control(base, state),
      borderColor: hasError
        ? 'var(--danger, #dc3545)'
        : state.isFocused
          ? COLORS.borderFocus
          : COLORS.border,
      boxShadow: hasError
        ? '0 0 0 2px rgba(220, 53, 69, 0.10)'
        : reactSelectStyles.control(base, state).boxShadow,
    }),
  };
}

export const portalSelectProps = {
  menuPortalTarget:
    typeof document !== 'undefined' ? document.body : null,
  menuPosition: 'fixed',
  classNamePrefix: 'sd-select',
};
