
import React, { useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import Select from "react-select";
import dayjs from "dayjs";
import {
  PRODUCT_BRAND_FILTER_OPTIONS,
} from "../../utils/common.properties.js";

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
  { value: "order_received", label: "Order Received" },
  { value: "pending", label: "Pending" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

const SalesFilters = ({
  period,
  customYear,
  customMonth,
  filters,
  categories = [],
  brandsStatus = [],
  onPeriodChange,
  onCustomDateChange,
  onFilterChange,
}) => {
  const [search, setSearch] = useState(
    filters.search || "",
  );

  useEffect(() => {
    setSearch(filters.search || "");
  }, [filters.search]);

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
        return {
          value: year,
          label: String(year),
        };
      }),
    [],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: dayjs()
          .month(index)
          .format("MMMM"),
      })),
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((value) => ({
        value,
        label: value,
      })),
    ],
    [categories],
  );

  const brandOptions = PRODUCT_BRAND_FILTER_OPTIONS;

  const selected = (options, value) =>
    options.find(
      (option) => option.value === value,
    ) || options[0];

  const selectProps = {
    classNamePrefix: "sd-select",
    isSearchable: false,
    menuPortalTarget:
      typeof document !== "undefined"
        ? document.body
        : undefined,
    menuPosition: "fixed",
  };

  return (
    <section
      className="sales-filter-bar"
      aria-label="Sales report filters"
    >
      <div className="sales-search">
        <i
          className="bi bi-search"
          aria-hidden="true"
        />
        <Form.Control
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search order, party or phone"
          aria-label="Search sales orders"
        />
      </div>

      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={PERIOD_OPTIONS}
          value={selected(
            PERIOD_OPTIONS,
            period,
          )}
          onChange={(option) =>
            onPeriodChange(
              option?.value || "month",
            )
          }
          aria-label="Report period"
        />
      </div>

      {period === "custom" && (
        <>
          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              {...selectProps}
              options={months}
              value={selected(
                months,
                customMonth,
              )}
              onChange={(option) =>
                onCustomDateChange(
                  customYear,
                  option?.value || customMonth,
                )
              }
              aria-label="Custom month"
            />
          </div>

          <div className="sales-filter-select sales-filter-select--sm">
            <Select
              {...selectProps}
              options={years}
              value={selected(
                years,
                customYear,
              )}
              onChange={(option) =>
                onCustomDateChange(
                  option?.value || customYear,
                  customMonth,
                )
              }
              aria-label="Custom year"
            />
          </div>
        </>
      )}

      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={STATUS_OPTIONS}
          value={selected(
            STATUS_OPTIONS,
            filters.status || "",
          )}
          onChange={(option) =>
            onFilterChange(
              "status",
              option?.value || "",
            )
          }
          aria-label="Order status"
        />
      </div>

      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={categoryOptions}
          value={selected(
            categoryOptions,
            filters.category || "",
          )}
          onChange={(option) =>
            onFilterChange(
              "category",
              option?.value || "",
            )
          }
          aria-label="Product category"
        />
      </div>

      <div className="sales-filter-select">
        <Select
          {...selectProps}
          options={brandOptions}
          value={selected(
            brandOptions,
            filters.brand || "",
          )}
          onChange={(option) =>
            onFilterChange(
              "brand",
              option?.value || "",
            )
          }
          aria-label="Product brand"
        />
      </div>
    </section>
  );
};

export default SalesFilters;
