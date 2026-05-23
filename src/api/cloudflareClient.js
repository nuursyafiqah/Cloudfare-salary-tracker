// Cloudflare API client
// Calls the Cloudflare Worker API, which stores data in D1.

const ENTITY_ROUTES = {
  SalaryCycle: "/api/salary-cycles",
  Expense: "/api/expenses",
  FixedSpending: "/api/fixed-spending",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

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
