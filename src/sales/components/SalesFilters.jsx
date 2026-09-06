// src/sales/components/SalesFilters.jsx
import React, { useMemo } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import dayjs from "dayjs";

/* ── react-select styles (solid dropdown, no transparency) ── */
const COLORS = {
  text: "#1C1B29",
  muted: "#6B6A7A",
  border: "#E0E0E8",
  borderFocus: "#6C5CE7",
  bg: "#FFFFFF",
  bgHover: "#F6F5FD",
  primary: "#6C5CE7",
  primarySoft: "#F0EEFC",
};

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    height: 40,
    borderRadius: 10,
    borderColor: state.isFocused ? COLORS.borderFocus : COLORS.border,
    boxShadow: state.isFocused ? `0 0 0 2px ${COLORS.primarySoft}` : "none",
    backgroundColor: COLORS.bg,
    "&:hover": {
      borderColor: state.isFocused ? COLORS.borderFocus : "#C8C8D0",
    },
    cursor: "pointer",
    fontSize: 13,
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 10px",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: COLORS.text,
  }),
  singleValue: (base) => ({
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
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: COLORS.muted,
    padding: "0 8px",
    transition: "transform 0.15s ease",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
    "&:hover": { color: COLORS.text },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: COLORS.muted,
    padding: "0 4px",
    "&:hover": { color: COLORS.text },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    boxShadow: "0 10px 28px rgba(28, 27, 41, 0.14)",
    overflow: "hidden",
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
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? COLORS.primary
      : state.isFocused
        ? COLORS.bgHover
        : COLORS.bg,
    color: state.isSelected ? "#FFFFFF" : COLORS.text,
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 13,
    cursor: "pointer",
    "&:active": {
      backgroundColor: state.isSelected ? COLORS.primary : COLORS.primarySoft,
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: COLORS.muted,
    fontSize: 13,
  }),
};

const portalSelectProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
};

/* ── options ── */
const PERIOD_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "week", label: "This week" },
  { value: "today", label: "Today" },
  { value: "lastMonth", label: "Last month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom month" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "packaging", label: "Packaging" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const SalesFilters = ({
  period,
  customYear,
  customMonth,
  filters,
  categories = [],
  channels = [],
  onPeriodChange,
  onCustomDateChange,
  onFilterChange,
}) => {
  const years = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const y = dayjs().year() - i;
        return { value: y, label: String(y) };
      }),
    [],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: dayjs().month(i).format("MMMM"),
      })),
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c, label: c })),
    ],
    [categories],
  );

  const channelOptions = useMemo(
    () => [
      { value: "", label: "All channels" },
      ...channels.map((c) => ({ value: c, label: c })),
    ],
    [channels],
  );

  const selectedPeriod =
    PERIOD_OPTIONS.find((o) => o.value === period) || PERIOD_OPTIONS[0];
  const selectedStatus =
    STATUS_OPTIONS.find((o) => o.value === (filters.status || "")) ||
    STATUS_OPTIONS[0];
  const selectedCategory =
    categoryOptions.find((o) => o.value === (filters.category || "")) ||
    categoryOptions[0];
  const selectedChannel =
    channelOptions.find((o) => o.value === (filters.channel || "")) ||
    channelOptions[0];
  const selectedMonth =
    months.find((o) => o.value === customMonth) || months[0];
  const selectedYear =
    years.find((o) => o.value === customYear) || years[0];

  const selectCommon = {
    ...portalSelectProps,
    styles: reactSelectStyles,
    classNamePrefix: "sd-select",
    isSearchable: false,
  };

  return (
    <section className="sales-filter-bar" aria-label="Sales report filters">
      {/* Search */}
      <div className="sales-search">
        <i className="bi bi-search" aria-hidden="true" />
        <Form.Control
          value={filters.search || ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
          placeholder="Search order, customer or phone"
          aria-label="Search sales orders"
        />
      </div>

      {/* Period */}
      <div className="sales-filter-select">
        <Select
          options={PERIOD_OPTIONS}
          value={selectedPeriod}
          onChange={(opt) => onPeriodChange(opt?.value || "month")}
          placeholder="Period"
          isClearable={false}
          aria-label="Report period"
          {...selectCommon}
        />
      </div>

      {/* Custom month + year */}
      {period === "custom" && (
        <>
          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              options={months}
              value={selectedMonth}
              onChange={(opt) =>
                onCustomDateChange(
                  customYear,
                  opt?.value || dayjs().month() + 1,
                )
              }
              placeholder="Month"
              isClearable={false}
              aria-label="Custom month"
              {...selectCommon}
            />
          </div>
          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              options={years}
              value={selectedYear}
              onChange={(opt) =>
                onCustomDateChange(opt?.value || dayjs().year(), customMonth)
              }
              placeholder="Year"
              isClearable={false}
              aria-label="Custom year"
              {...selectCommon}
            />
          </div>
        </>
      )}

      {/* Status */}
      <div className="sales-filter-select">
        <Select
          options={STATUS_OPTIONS}
          value={selectedStatus}
          onChange={(opt) => onFilterChange("status", opt?.value || "")}
          placeholder="All statuses"
          isClearable
          aria-label="Order status"
          {...selectCommon}
        />
      </div>

      {/* Category */}
      <div className="sales-filter-select">
        <Select
          options={categoryOptions}
          value={selectedCategory}
          onChange={(opt) => onFilterChange("category", opt?.value || "")}
          placeholder="All categories"
          isClearable
          aria-label="Product category"
          {...selectCommon}
        />
      </div>

      {/* Channel */}
      <div className="sales-filter-select">
        <Select
          options={channelOptions}
          value={selectedChannel}
          onChange={(opt) => onFilterChange("channel", opt?.value || "")}
          placeholder="All channels"
          isClearable
          aria-label="Sales channel"
          {...selectCommon}
        />
      </div>
    </section>
  );
};

export default SalesFilters;