const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS salary_cycles (
    id TEXT PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT DEFAULT '',
    salary_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    note TEXT DEFAULT '',
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_salary_cycles_status ON salary_cycles(status)`,
  `CREATE INDEX IF NOT EXISTS idx_salary_cycles_start_date ON salary_cycles(start_date)`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    salary_cycle_id TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    payment_method TEXT DEFAULT '',
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    FOREIGN KEY (salary_cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_cycle ON expenses(salary_cycle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
  `CREATE TABLE IF NOT EXISTS fixed_spending (
    id TEXT PRIMARY KEY,
    salary_cycle_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    repeat_every_cycle INTEGER NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    FOREIGN KEY (salary_cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fixed_spending_cycle ON fixed_spending(salary_cycle_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fixed_spending_paid ON fixed_spending(is_paid)`,
];

let schemaReadyPromise = null;

async function ensureSchema(env) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await env.DB.prepare(statement).run();
      }
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }

  return schemaReadyPromise;
}

const ENTITY_CONFIG = {
  "salary-cycles": {
    table: "salary_cycles",
    fields: ["start_date", "end_date", "salary_amount", "status", "note"],
    defaults: {
      end_date: "",
      salary_amount: 0,
      status: "active",
      note: "",
    },
    booleans: [],
  },
  expenses: {
    table: "expenses",
    fields: ["salary_cycle_id", "date", "amount", "category", "description", "payment_method"],
    defaults: {
      description: "",
      payment_method: "",
      amount: 0,
    },
    booleans: [],
  },
  "fixed-spending": {
    table: "fixed_spending",
    fields: ["salary_cycle_id", "name", "amount", "category", "repeat_every_cycle", "is_paid", "note"],
    defaults: {
      amount: 0,
      repeat_every_cycle: false,
      is_paid: false,
      note: "",
    },
    booleans: ["repeat_every_cycle", "is_paid"],
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function error(message, status = 400) {
  return json({ error: message }, status);
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeBooleanFields(row, config) {
  if (!row) return row;
  const next = { ...row };
  config.booleans.forEach((field) => {
    next[field] = !!next[field];
  });
  return next;
}

function sanitizeRecord(data, config, { includeDefaults = false } = {}) {
  const record = {};
  const source = data || {};

  config.fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      if (config.booleans.includes(field)) {
        record[field] = source[field] ? 1 : 0;
      } else if (field === "amount" || field === "salary_amount") {
        const number = Number(source[field]);
        record[field] = Number.isFinite(number) ? number : 0;
      } else {
        record[field] = source[field] ?? "";
      }
    } else if (includeDefaults && Object.prototype.hasOwnProperty.call(config.defaults, field)) {
      const defaultValue = config.defaults[field];
      record[field] = config.booleans.includes(field) ? (defaultValue ? 1 : 0) : defaultValue;
    }
  });

  return record;
}

function parsePath(pathname) {
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return {
    entityKey: parts[0],
    idOrAction: parts[1],
    extra: parts.slice(2),
  };
}

function buildWhere(url, config) {
  const rawFilter = url.searchParams.get("filter");
  if (!rawFilter) return { clause: "", values: [] };

  let filter;
  try {
    filter = JSON.parse(rawFilter);
  } catch {
    return { clause: "", values: [] };
  }

  const clauses = [];
  const values = [];
  Object.entries(filter || {}).forEach(([field, value]) => {
    if (!["id", "created_date", "updated_date", ...config.fields].includes(field)) return;
    clauses.push(`${field} = ?`);
    values.push(config.booleans.includes(field) ? (value ? 1 : 0) : value);
  });

  return clauses.length ? { clause: `WHERE ${clauses.join(" AND ")}`, values } : { clause: "", values: [] };
}

function buildOrder(url, config) {
  const rawSort = url.searchParams.get("sort") || "-created_date";
  const direction = rawSort.startsWith("-") ? "DESC" : "ASC";
  const field = rawSort.replace(/^-/, "");
  const allowed = new Set(["id", "created_date", "updated_date", ...config.fields]);
  return allowed.has(field) ? `ORDER BY ${field} ${direction}` : "ORDER BY created_date DESC";
}

function buildLimit(url) {
  const rawLimit = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) return "";
  return `LIMIT ${Math.min(Math.floor(rawLimit), 500)}`;
}

async function getById(db, config, id) {
  const row = await db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).bind(id).first();
  return normalizeBooleanFields(row, config);
}

async function listRecords(request, env, config) {
  const url = new URL(request.url);
  const where = buildWhere(url, config);
  const order = buildOrder(url, config);
  const limit = buildLimit(url);
  const sql = `SELECT * FROM ${config.table} ${where.clause} ${order} ${limit}`.trim();
  const result = await env.DB.prepare(sql).bind(...where.values).all();
  return json((result.results || []).map((row) => normalizeBooleanFields(row, config)));
}

async function createRecord(request, env, config) {
  const body = await readJson(request);
  const created = nowIso();
  const record = sanitizeRecord(body, config, { includeDefaults: true });
  const id = crypto.randomUUID();
  const payload = {
    id,
    ...record,
    created_date: created,
    updated_date: created,
  };

  const fields = Object.keys(payload);
  const placeholders = fields.map(() => "?").join(", ");
  const sql = `INSERT INTO ${config.table} (${fields.join(", ")}) VALUES (${placeholders})`;
  await env.DB.prepare(sql).bind(...fields.map((field) => payload[field])).run();

  return json(await getById(env.DB, config, id), 201);
}

async function bulkCreateRecords(request, env, config) {
  const body = await readJson(request);
  if (!Array.isArray(body)) return error("Bulk create expects an array", 400);
  if (body.length === 0) return json([]);

  const createdRows = [];
  const statements = body.map((item) => {
    const created = nowIso();
    const id = crypto.randomUUID();
    const record = sanitizeRecord(item, config, { includeDefaults: true });
    const payload = {
      id,
      ...record,
      created_date: created,
      updated_date: created,
    };
    createdRows.push(payload);

    const fields = Object.keys(payload);
    const placeholders = fields.map(() => "?").join(", ");
    const sql = `INSERT INTO ${config.table} (${fields.join(", ")}) VALUES (${placeholders})`;
    return env.DB.prepare(sql).bind(...fields.map((field) => payload[field]));
  });

  await env.DB.batch(statements);
  return json(createdRows.map((row) => normalizeBooleanFields(row, config)), 201);
}

async function updateRecord(request, env, config, id) {
  const body = await readJson(request);
  const record = sanitizeRecord(body, config);
  const fields = Object.keys(record);

  if (fields.length === 0) {
    const existing = await getById(env.DB, config, id);
    return existing ? json(existing) : error("Record not found", 404);
  }

  record.updated_date = nowIso();
  const updateFields = Object.keys(record);
  const setClause = updateFields.map((field) => `${field} = ?`).join(", ");
  await env.DB.prepare(`UPDATE ${config.table} SET ${setClause} WHERE id = ?`)
    .bind(...updateFields.map((field) => record[field]), id)
    .run();

  const updated = await getById(env.DB, config, id);
  return updated ? json(updated) : error("Record not found", 404);
}

async function deleteRecord(env, config, id) {
  await env.DB.prepare(`DELETE FROM ${config.table} WHERE id = ?`).bind(id).run();
  return json({ success: true, id });
}

async function handleApi(request, env) {
  if (!env.DB) {
    return error("D1 binding DB is missing. Create a D1 database and bind it as DB.", 500);
  }

  await ensureSchema(env);

  const url = new URL(request.url);
  if (url.pathname === "/api/health" || url.pathname === "/api" || url.pathname === "/api/") {
    return json({ ok: true, service: "salary-cycle-tracker", runtime: "pages-functions" });
  }

  const { entityKey, idOrAction, extra } = parsePath(url.pathname);
  const config = ENTITY_CONFIG[entityKey];

  if (!config || extra.length > 0) {
    return error("API route not found", 404);
  }

  if (request.method === "GET" && !idOrAction) return listRecords(request, env, config);
  if (request.method === "GET" && idOrAction) {
    const row = await getById(env.DB, config, idOrAction);
    return row ? json(row) : error("Record not found", 404);
  }
  if (request.method === "POST" && idOrAction === "bulk") return bulkCreateRecords(request, env, config);
  if (request.method === "POST" && !idOrAction) return createRecord(request, env, config);
  if (request.method === "PATCH" && idOrAction) return updateRecord(request, env, config, idOrAction);
  if (request.method === "DELETE" && idOrAction) return deleteRecord(env, config, idOrAction);

  return error("Method not allowed", 405);
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    return await handleApi(request, env);
  } catch (err) {
    console.error(err);
    return error(err?.message || "Server error", 500);
  }
}
