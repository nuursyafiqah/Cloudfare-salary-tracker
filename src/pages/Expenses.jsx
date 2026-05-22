import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { filterExpensesForCycle, formatDisplayDate, isDateInSalaryCycle } from "@/utils/cycleFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  CalendarDays,
  ChartColumnBig,
  ChevronRight,
  Pencil,
  PieChart,
  Plus,
  ReceiptText,
  Trash2,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import ExpenseForm from "../components/ExpenseForm";

const CHART_COLORS = ["#fb7185", "#60a5fa", "#fbbf24", "#4ade80", "#a78bfa", "#22c55e", "#f97316", "#38bdf8"];

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function fmtDate(value, withYear = false) {
  const date = parseLocalDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function fmtCurrency(value = 0) {
  return `⃁ ${Number(value || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDaysBetween(start, end) {
  if (!start || !end) return 0;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / oneDay) + 1);
}

function getExpenseIcon(category = "") {
  const text = category.toLowerCase();
  if (text.includes("hunger") || text.includes("makan") || text.includes("food") || text.includes("naim")) return ReceiptText;
  if (text.includes("shopping") || text.includes("wife") || text.includes("kids") || text.includes("anak")) return WalletCards;
  return ReceiptText;
}

function StatCard({ icon: Icon, label, value, helper, tone = "rose" }) {
  const toneClasses = {
    rose: "from-rose-50 to-pink-50 text-rose-600 ring-rose-100",
    blue: "from-blue-50 to-sky-50 text-blue-600 ring-blue-100",
    green: "from-emerald-50 to-teal-50 text-emerald-600 ring-emerald-100",
    amber: "from-amber-50 to-orange-50 text-amber-600 ring-amber-100",
  };

  return (
    <div className="rounded-[1.4rem] bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 break-words text-[1.05rem] font-extrabold leading-tight text-slate-950">{value}</p>
          {helper && <p className="mt-0.5 text-[10px] font-medium text-slate-400">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);
  const visibleData = data.slice(-7);

  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ChartColumnBig className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-950">Expenses by Date</h3>
            <p className="text-[10px] font-medium text-slate-400">Latest spending days</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-500">⃁</span>
      </div>

      {visibleData.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-2xl bg-slate-50 text-xs font-medium text-slate-400">
          No expense data yet.
        </div>
      ) : (
        <>
          <div className="flex h-48 items-end gap-2 border-b border-slate-200 px-1 pb-2">
            {visibleData.map((item, index) => {
              const barHeight = Math.max(18, (item.amount / maxAmount) * 145);
              return (
                <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-extrabold text-slate-800">{item.amount.toFixed(2)}</span>
                  <div
                    className="w-full max-w-11 rounded-t-xl shadow-sm"
                    style={{
                      height: `${barHeight}px`,
                      background: `linear-gradient(180deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${CHART_COLORS[index % CHART_COLORS.length]}cc)`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 px-1">
            {visibleData.map((item) => (
              <p key={item.date} className="min-w-0 flex-1 text-center text-[10px] font-semibold text-slate-500">
                {fmtDate(item.date)}
              </p>
            ))}
          </div>
          {data.length > visibleData.length && (
            <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
              Showing latest {visibleData.length} of {data.length} spending days.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function DonutChart({ data, total }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto h-48 w-48">
      <svg className="h-full w-full" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        {data.map((item, index) => {
          const slice = total > 0 ? (item.amount / total) * circumference : 0;
          const strokeDashoffset = -offset;
          offset += slice;
          return (
            <circle
              key={item.name}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="16"
              strokeDasharray={`${slice} ${circumference - slice}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-semibold text-slate-400">Total</span>
        <span className="mt-1 text-lg font-extrabold text-slate-950">{fmtCurrency(total)}</span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ data, total, compact = false }) {
  const visibleData = compact ? data.slice(0, 5) : data;

  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-950">Expenses by Category</h3>
            <p className="text-[10px] font-medium text-slate-400">Where the money went</p>
          </div>
        </div>
      </div>

      {visibleData.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-2xl bg-slate-50 text-xs font-medium text-slate-400">
          No category data yet.
        </div>
      ) : (
        <>
          {!compact && <DonutChart data={visibleData} total={total} />}
          <div className={compact ? "space-y-2" : "mt-2 space-y-2"}>
            {visibleData.map((item) => {
              const percent = total > 0 ? (item.amount / total) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] font-medium text-slate-400">{item.count} item{item.count > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-950">{fmtCurrency(item.amount)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{percent.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
          {compact && data.length > visibleData.length && (
            <p className="mt-3 text-center text-[10px] font-medium text-slate-400">
              Showing top {visibleData.length} of {data.length} categories.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ExpenseRow({ expense, onEdit, onDelete, showActions = true }) {
  const Icon = getExpenseIcon(expense.category);

  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-950">{expense.description || expense.category}</p>
        <p className="truncate text-[11px] font-medium text-slate-500">
          {fmtDate(expense.date, true)} · {expense.category}{expense.payment_method ? ` · ${expense.payment_method}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-sm font-extrabold text-rose-600">-{fmtCurrency(expense.amount)}</p>
      {showActions ? (
        <div className="flex shrink-0 gap-1">
          <button type="button" className="rounded-xl p-2 hover:bg-slate-100" onClick={() => onEdit(expense)} aria-label="Edit expense">
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
          </button>
          <button type="button" className="rounded-xl p-2 hover:bg-rose-50" onClick={() => onDelete(expense.id)} aria-label="Delete expense">
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
          </button>
        </div>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  );
}

export default function Expenses() {
  const [cycle, setCycle] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeView, setActiveView] = useState("overview");

  const params = new URLSearchParams(window.location.search);
  const selectedCycleId = params.get("cycleId");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (params.get("add") === "1" && cycle) {
      setSheetOpen(true);
      window.history.replaceState({}, "", selectedCycleId ? `/expenses?cycleId=${selectedCycleId}` : "/expenses");
    }
  }, [cycle, selectedCycleId]);

  const load = async () => {
    setLoading(true);
    let selectedCycle = null;

    if (selectedCycleId) {
      selectedCycle = await base44.entities.SalaryCycle.get(selectedCycleId);
    } else {
      const cycles = await base44.entities.SalaryCycle.filter({ status: "active" }, "-start_date", 1);
      selectedCycle = cycles[0] || null;
    }

    if (selectedCycle) {
      setCycle(selectedCycle);
      const e = await base44.entities.Expense.filter({ salary_cycle_id: selectedCycle.id }, "-date");
      setExpenses(filterExpensesForCycle(e, selectedCycle));
    } else {
      setCycle(null);
      setExpenses([]);
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
    if (!isDateInSalaryCycle(data.date, cycle)) {
      const start = cycle?.start_date || "the cycle start date";
      const end = cycle?.end_date || "the next salary cycle";
      alert(`Expense date must be within the selected salary cycle (${start} to ${end}).`);
      return;
    }

    setSaving(true);
    if (editing) {
      await base44.entities.Expense.update(editing.id, data);
    } else {
      await base44.entities.Expense.create({ ...data, salary_cycle_id: cycle.id });
    }
    setSheetOpen(false);
    setEditing(null);
    setSaving(false);
    await load();
  };

  const handleDelete = async () => {
    await base44.entities.Expense.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  const handleEdit = (expense) => {
    setEditing(expense);
    setSheetOpen(true);
  };

  const overview = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const sortedAsc = [...expenses].sort((a, b) => (parseLocalDate(a.date) || 0) - (parseLocalDate(b.date) || 0));
    const firstDate = sortedAsc[0]?.date;
    const lastDate = sortedAsc[sortedAsc.length - 1]?.date;
    const rangeDays = getDaysBetween(parseLocalDate(firstDate), parseLocalDate(lastDate));
    const averagePerDay = rangeDays > 0 ? total / rangeDays : 0;

    const byDateMap = new Map();
    expenses.forEach((item) => {
      const key = item.date || "No date";
      byDateMap.set(key, (byDateMap.get(key) || 0) + Number(item.amount || 0));
    });
    const byDate = Array.from(byDateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (parseLocalDate(a.date) || 0) - (parseLocalDate(b.date) || 0));

    const byCategoryMap = new Map();
    expenses.forEach((item) => {
      const key = item.category || "Uncategorized";
      const current = byCategoryMap.get(key) || { name: key, amount: 0, count: 0 };
      current.amount += Number(item.amount || 0);
      current.count += 1;
      byCategoryMap.set(key, current);
    });
    const byCategory = Array.from(byCategoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => ({ ...item, color: CHART_COLORS[index % CHART_COLORS.length] }));

    return {
      total,
      firstDate,
      lastDate,
      rangeDays,
      averagePerDay,
      byDate,
      byCategory,
      recent: [...expenses].sort((a, b) => (parseLocalDate(b.date) || 0) - (parseLocalDate(a.date) || 0)).slice(0, 5),
    };
  }, [expenses]);

  const openAddSheet = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <MobileLayout>
      <div className="-mx-4 -mt-4 min-h-[calc(100vh-5rem)] bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 pb-6 pt-4 text-slate-950">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Daily Expenses</h1>
              <p className="text-xs font-medium text-slate-500">
                {cycle ? `${formatDisplayDate(cycle.start_date)} — ${formatDisplayDate(cycle.end_date)}` : "Overview for salary cycle"}
              </p>
              {cycle && cycle.status !== "active" && (
                <Badge variant="secondary" className="mt-2 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 hover:bg-amber-100">
                  Editing Closed Cycle
                </Badge>
              )}
            </div>
            {cycle && (
              <Button className="h-11 rounded-2xl bg-emerald-500 px-4 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600" onClick={openAddSheet}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            )}
          </div>

          {!cycle && !loading && (
            <p className="rounded-[1.5rem] bg-white p-5 text-center text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              No salary cycle selected. Create one first from the Dashboard or open one from Salary Cycles.
            </p>
          )}

          {cycle && cycle.status !== "active" && (
            <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
              You are editing a closed/previous salary cycle. New expenses will be saved only inside this selected cycle.
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : expenses.length === 0 && cycle ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <ReceiptText className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-slate-950">No expenses yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-xs font-medium text-slate-500">Tap Add to record your spending and the overview chart will appear here.</p>
              <Button className="mt-5 h-11 rounded-2xl bg-emerald-500 px-6 font-bold text-white hover:bg-emerald-600" onClick={openAddSheet}>
                <Plus className="mr-1 h-4 w-4" /> Add Expense
              </Button>
            </div>
          ) : cycle ? (
            <>
              <div className="grid grid-cols-3 rounded-[1.2rem] bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
                {["overview", "transactions", "categories"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    className={`rounded-2xl px-2 py-2 text-xs font-extrabold capitalize transition-all ${
                      activeView === view ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveView(view)}
                  >
                    {view}
                  </button>
                ))}
              </div>

              {activeView === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] bg-gradient-to-r from-rose-50 via-pink-50 to-white p-4 shadow-sm ring-1 ring-rose-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <TrendingDown className="h-7 w-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-500">Total Expenses</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{fmtCurrency(overview.total)}</h2>
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700">
                        {expenses.length} item{expenses.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={ReceiptText} label="Total Transactions" value={expenses.length} tone="blue" />
                    <StatCard icon={WalletCards} label="Average per Day" value={fmtCurrency(overview.averagePerDay)} tone="amber" />
                    <StatCard
                      icon={CalendarDays}
                      label="Date Range"
                      value={overview.firstDate ? `${fmtDate(overview.firstDate)} – ${fmtDate(overview.lastDate)}` : "—"}
                      helper={overview.rangeDays ? `${overview.rangeDays} day${overview.rangeDays > 1 ? "s" : ""}` : ""}
                      tone="green"
                    />
                    <StatCard icon={PieChart} label="Categories" value={overview.byCategory.length} helper="Spending groups" tone="rose" />
                  </div>

                  <MiniBarChart data={overview.byDate} />
                  <CategoryBreakdown data={overview.byCategory} total={overview.total} compact />

                  <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-950">Recent Transactions</h3>
                      <button type="button" className="text-xs font-extrabold text-emerald-600" onClick={() => setActiveView("transactions")}>View all</button>
                    </div>
                    <div className="space-y-2">
                      {overview.recent.map((expense) => (
                        <ExpenseRow key={expense.id} expense={expense} onEdit={handleEdit} onDelete={setDeleteId} showActions={false} />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                    <p className="text-sm font-extrabold text-slate-800">Total ({expenses.length} item{expenses.length > 1 ? "s" : ""})</p>
                    <p className="text-2xl font-black text-rose-600">{fmtCurrency(overview.total)}</p>
                  </div>
                </div>
              )}

              {activeView === "transactions" && (
                <div className="space-y-3">
                  <div className="rounded-[1.25rem] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
                    <p className="text-sm font-extrabold text-slate-950">All Daily Expenses</p>
                    <p className="text-xs font-medium text-slate-500">Edit or delete any transaction here.</p>
                  </div>
                  {expenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} onEdit={handleEdit} onDelete={setDeleteId} />
                  ))}
                </div>
              )}

              {activeView === "categories" && (
                <CategoryBreakdown data={overview.byCategory} total={overview.total} />
              )}
            </>
          ) : null}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditing(null); }}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader><SheetTitle>{editing ? "Edit Expense" : "Add Expense"}</SheetTitle></SheetHeader>
          <div className="mt-4 pb-6">
            <ExpenseForm onSubmit={handleSubmit} initial={editing} loading={saving} cycle={cycle} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
