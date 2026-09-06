// // SQL Server access is intentionally routed through the Spring Boot API.
// import { DEFAULT_ENQUIRIES } from "./constants";

// // ------------------------------------------------------------------
// // ID generation – primary key is 'rowid'
// // ------------------------------------------------------------------
// export async function fetchDashboardData() {
//   const response = await fetch(
//     `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/dashboard`,
//   );
//   if (!response.ok)
//     throw new Error(`Dashboard API request failed (${response.status})`);
//   const data = await response.json();
//   return {
//     products: Array.isArray(data.products) ? data.products : [],
//     enquiries: data.enquiries || { ...DEFAULT_ENQUIRIES },
//     source: "api",
//     error: null,
//   };
// }

// // Save product changes through the API.
// export async function saveDashboardData({ products = [] } = {}) {
//   return putProducts(products);
// }

// // Replace the product set through the API.
// export async function replaceDashboardData({ products = [] } = {}) {
//   return putProducts(products);
// }

// async function putProducts(products) {
//   const response = await fetch(
//     `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/dashboard`,
//     {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         products: Array.isArray(products) ? products : [],
//       }),
//     },
//   );
//   if (!response.ok)
//     throw new Error(`Dashboard API save failed (${response.status})`);
//   const data = await response.json();
//   return { success: true, source: "api", products: data.products || [] };
// }
