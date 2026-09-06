// src/sales/components/SalesFilters.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import dayjs from "dayjs";

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
  const [search, setSearch] = useState(filters.search || "");

  useEffect(() => {
    setSearch(filters.search || "");
  }, [filters.search]);

  // Wait briefly before sending a search request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== (filters.search || "")) {
        onFilterChange("search", search);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, filters.search, onFilterChange]);

  const years = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const year = dayjs().year() - index;
        return { value: year, label: String(year) };
      }),
    [],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: dayjs().month(index).format("MMMM"),
      })),
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((value) => ({ value, label: value })),
    ],
    [categories],
  );

  const channelOptions = useMemo(
    () => [
      { value: "", label: "All channels" },
      ...channels.map((value) => ({ value, label: value })),
    ],
    [channels],
  );

  const selected = (options, value) =>
    options.find((option) => option.value === value) || options[0];

  const selectProps = {
    classNamePrefix: "sd-select",
    isSearchable: false,
    menuPortalTarget:
      typeof document !== "undefined" ? document.body : undefined,
    menuPosition: "fixed",
  };

  return (
    <section className="sales-filter-bar" aria-label="Sales report filters">
      {/* Search */}
      <div className="sales-search">
        <i className="bi bi-search" aria-hidden="true" />
        <Form.Control
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order, customer or phone"
          aria-label="Search sales orders"
        />
      </div>

      {/* Period */}
      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={PERIOD_OPTIONS}
          value={selected(PERIOD_OPTIONS, period)}
          onChange={(option) => onPeriodChange(option?.value || "month")}
          aria-label="Report period"
        />
      </div>

      {/* Custom month + year */}
      {period === "custom" && (
        <>
          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              {...selectProps}
              options={months}
              value={selected(months, customMonth)}
              onChange={(option) =>
                onCustomDateChange(customYear, option?.value || customMonth)
              }
              aria-label="Custom month"
            />
          </div>

          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              {...selectProps}
              options={years}
              value={selected(years, customYear)}
              onChange={(option) =>
                onCustomDateChange(option?.value || customYear, customMonth)
              }
              aria-label="Custom year"
            />
          </div>
        </>
      )}

      {/* Status */}
      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={STATUS_OPTIONS}
          value={selected(STATUS_OPTIONS, filters.status || "")}
          onChange={(option) => onFilterChange("status", option?.value || "")}
          aria-label="Order status"
        />
      </div>

      {/* Category */}
      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={categoryOptions}
          value={selected(categoryOptions, filters.category || "")}
          onChange={(option) =>
            onFilterChange("category", option?.value || "")
          }
          aria-label="Product category"
        />
      </div>

      {/* Channel */}
      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={channelOptions}
          value={selected(channelOptions, filters.channel || "")}
          onChange={(option) => onFilterChange("channel", option?.value || "")}
          aria-label="Sales channel"
        />
      </div>
    </section>
  );
};

export default SalesFilters;
