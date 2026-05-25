CREATE TABLE IF NOT EXISTS salary_cycles (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT DEFAULT '',
  salary_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  note TEXT DEFAULT '',
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_salary_cycles_status ON salary_cycles(status);
CREATE INDEX IF NOT EXISTS idx_salary_cycles_start_date ON salary_cycles(start_date);

CREATE TABLE IF NOT EXISTS expenses (
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
);

CREATE INDEX IF NOT EXISTS idx_expenses_cycle ON expenses(salary_cycle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

CREATE TABLE IF NOT EXISTS fixed_spending (
  id TEXT PRIMARY KEY,
  salary_cycle_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  repeat_every_cycle INTEGER NOT NULL DEFAULT 0,
  is_paid INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  FOREIGN KEY (salary_cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fixed_spending_cycle ON fixed_spending(salary_cycle_id);
CREATE INDEX IF NOT EXISTS idx_fixed_spending_paid ON fixed_spending(is_paid);
CREATE INDEX IF NOT EXISTS idx_fixed_spending_sort_order ON fixed_spending(sort_order);
