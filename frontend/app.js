const state = {
  token: null,
  user: null,
};

const logOutput = document.getElementById("log-output");
const sessionSummary = document.getElementById("session-summary");
const inventoryList = document.getElementById("inventory-list");
const customerList = document.getElementById("customer-list");
const purchaseList = document.getElementById("purchase-list");
const salesList = document.getElementById("sales-list");
const inventorySelect = document.getElementById("inventory-select");
const customerSelect = document.getElementById("customer-select");
const supplierSelect = document.getElementById("supplier-select");

function log(message, payload) {
  const timestamp = new Date().toLocaleTimeString();
  const details = payload ? `\n${JSON.stringify(payload, null, 2)}` : "";
  logOutput.textContent = `[${timestamp}] ${message}${details}\n\n${logOutput.textContent}`;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: "Bearer " + state.token } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed for ${path}`);
  }

  return payload;
}

function updateSessionSummary() {
  if (!state.user) {
    sessionSummary.textContent = "Not logged in.";
    return;
  }

  sessionSummary.textContent = `Logged in as ${state.user.fullName} (${state.user.role}).`;
}

function renderList(element, items, formatter) {
  element.innerHTML = "";

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    element.appendChild(li);
  }
}

function populateSelect(select, items, formatter) {
  select.innerHTML = "";

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = formatter(item);
    select.appendChild(option);
  }
}

async function refreshData() {
  if (!state.token) {
    log("Login first to load dashboard data.");
    return;
  }

  const [inventory, customers, purchases, sales, suppliers] = await Promise.all([
    apiRequest("/api/v1/inventory/items"),
    apiRequest("/api/v1/crm/customers"),
    apiRequest("/api/v1/purchasing/purchase-orders"),
    apiRequest("/api/v1/sales/orders"),
    apiRequest("/api/v1/purchasing/suppliers"),
  ]);

  renderList(inventoryList, inventory.items, (item) => `${item.name}: ${item.quantity} units left`);
  renderList(customerList, customers.customers, (customer) => `${customer.name}: ${customer.loyaltyPoints} points`);
  renderList(purchaseList, purchases.purchaseOrders, (po) => `${po.id}: ${po.itemName} (${po.status})`);
  renderList(salesList, sales.orders, (order) => `${order.id}: $${order.total} (${order.status})`);

  populateSelect(inventorySelect, inventory.items, (item) => `${item.name} (${item.quantity} in stock)`);
  populateSelect(customerSelect, customers.customers, (customer) => `${customer.name} (${customer.segment})`);
  populateSelect(supplierSelect, suppliers.suppliers, (supplier) => supplier.name);

  log("Dashboard refreshed.", {
    inventoryItems: inventory.items.length,
    customers: customers.customers.length,
    purchaseOrders: purchases.purchaseOrders.length,
    salesOrders: sales.orders.length,
  });
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    state.token = payload.token;
    state.user = payload.user;
    updateSessionSummary();
    log("Login successful.", payload.user);
    await refreshData();
  } catch (error) {
    log(error.message);
  }
});

document.getElementById("customer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await apiRequest("/api/v1/crm/customers", {
      method: "POST",
      body: JSON.stringify({
        id: formData.get("id"),
        name: formData.get("name"),
        email: formData.get("email"),
      }),
    });

    log("Customer created.", payload.customer);
    await refreshData();
  } catch (error) {
    log(error.message);
  }
});

document.getElementById("purchase-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await apiRequest("/api/v1/purchasing/purchase-orders", {
      method: "POST",
      body: JSON.stringify({
        id: formData.get("id"),
        supplierId: formData.get("supplierId"),
        itemName: formData.get("itemName"),
        quantity: Number(formData.get("quantity")),
      }),
    });

    log("Purchase order created.", payload.purchaseOrder);
    await refreshData();
  } catch (error) {
    log(error.message);
  }
});

document.getElementById("order-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await apiRequest("/api/v1/sales/orders", {
      method: "POST",
      body: JSON.stringify({
        id: formData.get("id"),
        customerId: formData.get("customerId"),
        lineItems: [
          {
            itemId: formData.get("itemId"),
            quantity: Number(formData.get("quantity")),
          },
        ],
        paymentMethod: formData.get("paymentMethod"),
      }),
    });

    log("Sales order created.", payload);
    await refreshData();
  } catch (error) {
    log(error.message);
  }
});

document.getElementById("refresh-button").addEventListener("click", () => {
  refreshData().catch((error) => log(error.message));
});

updateSessionSummary();
