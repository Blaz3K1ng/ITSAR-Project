let token = "";

function baseUrl() {
  return document.getElementById("apiBase").value.trim().replace(/\/$/, "");
}

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function callApi(path, options = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data.detail || JSON.stringify(data));
  }
  return data;
}

function write(id, data) {
  document.getElementById(id).textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

document.getElementById("loginBtn").onclick = async () => {
  try {
    const payload = {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
    };
    const result = await callApi("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    token = result.access_token;
    write("authStatus", `Logged in as role: ${result.role}`);
  } catch (error) {
    write("authStatus", error.message);
  }
};

document.getElementById("loadInventoryBtn").onclick = async () => {
  try {
    const result = await callApi("/api/v1/inventory/items", {
      headers: authHeaders(),
    });
    write("inventoryOut", result);
  } catch (error) {
    write("inventoryOut", error.message);
  }
};

document.getElementById("loadCustomersBtn").onclick = async () => {
  try {
    const result = await callApi("/api/v1/crm/customers", {
      headers: authHeaders(),
    });
    write("customersOut", result);
  } catch (error) {
    write("customersOut", error.message);
  }
};

document.getElementById("createOrderBtn").onclick = async () => {
  try {
    const payload = {
      customer_id: Number(document.getElementById("orderCustomerId").value),
      item_id: Number(document.getElementById("orderItemId").value),
      quantity: Number(document.getElementById("orderQty").value),
      unit_price: Number(document.getElementById("orderPrice").value),
    };
    const result = await callApi("/api/v1/sales/orders", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    write("orderOut", result);
  } catch (error) {
    write("orderOut", error.message);
  }
};

document.getElementById("createPoBtn").onclick = async () => {
  try {
    const payload = {
      supplier_id: Number(document.getElementById("poSupplierId").value),
      item_id: Number(document.getElementById("poItemId").value),
      quantity: Number(document.getElementById("poQty").value),
    };
    const result = await callApi("/api/v1/purchasing/purchase-orders", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    write("poOut", result);
  } catch (error) {
    write("poOut", error.message);
  }
};

document.getElementById("receivePoBtn").onclick = async () => {
  try {
    const result = await callApi("/api/v1/purchasing/purchase-orders/1/receive", {
      method: "POST",
      headers: authHeaders(),
    });
    write("poOut", result);
  } catch (error) {
    write("poOut", error.message);
  }
};
