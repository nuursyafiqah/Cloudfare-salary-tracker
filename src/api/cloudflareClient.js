// Cloudflare API client
// Calls the Cloudflare Pages Functions / Worker API, which stores data in D1.

const ENTITY_ROUTES = {
  SalaryCycle: "/api/salary-cycles",
  Expense: "/api/expenses",
  FixedSpending: "/api/fixed-spending",
};

const DASHBOARD_ROUTE = "/api/dashboard";
const API_TIMEOUT_MS = 15000;
const GET_RETRY_DELAY_MS = 700;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function isRetryableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("took too long") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
  );
}

async function apiRequestOnce(path, options = {}) {
  const { timeoutMs = API_TIMEOUT_MS, ...fetchOptions } = options;
  const timer = typeof window !== "undefined" ? window : globalThis;
  const controller = new AbortController();
  const timeoutId = timer.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(path, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Cloudflare API took too long to respond. Please retry in a moment.");
    }
    throw err;
  } finally {
    timer.clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText || "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function apiRequest(path, options = {}) {
  const { maxAttempts: requestedMaxAttempts, ...requestOptions } = options;
  const method = String(requestOptions.method || "GET").toUpperCase();
  const maxAttempts = requestedMaxAttempts ?? (method === "GET" ? 2 : 1);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await apiRequestOnce(path, requestOptions);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableError(error)) break;
      await sleep(GET_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

function withQuery(route, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  });

  const query = search.toString();
  return query ? `${route}?${query}` : route;
}

function makeEntity(entityName) {
  const route = ENTITY_ROUTES[entityName];

  return {
    async list(sort, limit) {
      return apiRequest(withQuery(route, { sort, limit }));
    },

    async filter(filter = {}, sort, limit) {
      return apiRequest(withQuery(route, { filter, sort, limit }));
    },

    async get(id) {
      return apiRequest(`${route}/${encodeURIComponent(id)}`);
    },

    async create(data) {
      return apiRequest(route, {
        method: "POST",
        body: JSON.stringify(data || {}),
      });
    },

    async update(id, data) {
      return apiRequest(`${route}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data || {}),
      });
    },

    async delete(id) {
      return apiRequest(`${route}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    async bulkCreate(items = []) {
      return apiRequest(`${route}/bulk`, {
        method: "POST",
        body: JSON.stringify(items),
      });
    },

    async bulkUpdate(items = []) {
      return apiRequest(`${route}/bulk`, {
        method: "PATCH",
        body: JSON.stringify(items),
      });
    },
  };
}

const publicUser = {
  id: "public-cloudflare-user",
  email: "public@cloudflare.local",
  role: "public",
};

export const cloudflare = {
  entities: {
    SalaryCycle: makeEntity("SalaryCycle"),
    Expense: makeEntity("Expense"),
    FixedSpending: makeEntity("FixedSpending"),
  },
  dashboard: {
    async get() {
      return apiRequest(DASHBOARD_ROUTE, { timeoutMs: 12000, maxAttempts: 1 });
    },
  },
  auth: {
    async me() {
      return publicUser;
    },
    async loginViaEmailPassword() {
      return publicUser;
    },
    loginWithProvider() {
      window.location.href = "/";
    },
    async register() {
      return { user: publicUser };
    },
    async verifyOtp() {
      return { user: publicUser, access_token: "public" };
    },
    setToken() {},
    async resendOtp() {
      return { success: true };
    },
    async resetPasswordRequest() {
      return { success: true };
    },
    async resetPassword() {
      return { success: true };
    },
    logout() {},
  },
};
