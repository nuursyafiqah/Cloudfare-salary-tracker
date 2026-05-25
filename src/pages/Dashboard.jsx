import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cloudflare } from "@/api/cloudflareClient";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, Info, CalendarDays } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import SummaryCards from "../components/SummaryCards";
import { filterExpensesForCycle, formatDisplayDate, parseDateOnly } from "@/utils/cycleFilters";

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [fixed, setFixed] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const cycles = await cloudflare.entities.SalaryCycle.filter({ status: "active" }, "-start_date", 1);
        if (cycles.length > 0) {
          const c = cycles[0];
          setCycle(c);
          const [f, e] = await Promise.all([
            cloudflare.entities.FixedSpending.filter({ salary_cycle_id: c.id }),
            cloudflare.entities.Expense.filter({ salary_cycle_id: c.id }),
          ]);
          setFixed(f);
          setExpenses(filterExpensesForCycle(e, c));
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
        setError(err?.message || "Dashboard failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fixedTotal = fixed.reduce((s, i) => s + (i.amount || 0), 0);
  const expenseTotal = expenses.reduce((s, i) => s + (i.amount || 0), 0);
  const fmt = formatDisplayDate;
  const recentExpenses = [...expenses].sort((a, b) => (parseDateOnly(b.date) || 0) - (parseDateOnly(a.date) || 0)).slice(0, 5);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex h-60 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="space-y-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            !
          </div>
          <div>
            <h1 className="text-lg font-semibold">Dashboard cannot load</h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          </div>
          <Button className="h-11 rounded-xl" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="-mx-4 -mb-6 -mt-4 min-h-[calc(100dvh-74px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,_#eef2ff_0%,_#f8fafc_43%,_#ffffff_100%)] px-4 pb-8 pt-5">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-900">Salary Cycle</h1>
              <p className="mt-0.5 text-[13px] font-normal tracking-wide text-slate-500">Spending Tracker</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/cycles")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-white/75 text-violet-600 shadow-[0_8px_24px_rgba(124,58,237,0.10)] backdrop-blur transition active:scale-95"
              aria-label="Open salary cycles"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>

          {!cycle ? (
            <div className="rounded-[1.35rem] border border-white/80 bg-white/85 p-5 text-center shadow-[0_14px_36px_rgba(15,23,42,0.07)] backdrop-blur">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-[0_10px_24px_rgba(99,102,241,0.22)]">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div className="mt-4">
                <h2 className="text-base font-semibold text-slate-900">No Active Cycle</h2>
                <p className="mx-auto mt-1 max-w-xs text-[13px] leading-5 text-slate-500">
                  Start by creating your first salary cycle. This tracker follows your salary date, not calendar month.
                </p>
              </div>
              <Button
                className="mt-4 h-11 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-7 text-sm font-medium text-white shadow-[0_12px_24px_rgba(99,102,241,0.22)] hover:from-violet-600 hover:to-indigo-500"
                onClick={() => navigate("/cycles?new=1")}
              >
                Start New Salary Cycle
              </Button>
            </div>
          ) : (
            <>
              {/* Cycle info */}
              <div className="flex items-start gap-2.5 rounded-[1.2rem] border border-indigo-100 bg-white/70 p-3 shadow-[0_10px_26px_rgba(59,130,246,0.07)] backdrop-blur">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Info className="h-4 w-4" />
                </div>
                <p className="text-[12px] leading-5 text-slate-600">
                  Current cycle started <strong className="font-medium text-indigo-600">{fmt(cycle.start_date)}</strong>.
                  {cycle.end_date ? ` Ends ${fmt(cycle.end_date)}.` : " End date not set — cycle stays active until next salary."}
                </p>
              </div>

              <SummaryCards cycle={cycle} fixedTotal={fixedTotal} expenseTotal={expenseTotal} />

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-violet-200 bg-white/75 text-[13px] font-medium text-indigo-600 shadow-sm backdrop-blur hover:bg-violet-50 hover:text-indigo-700"
                  onClick={() => navigate("/expenses?add=1")}
                >
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-violet-200 bg-white/75 text-[13px] font-medium text-indigo-600 shadow-sm backdrop-blur hover:bg-violet-50 hover:text-indigo-700"
                  onClick={() => navigate("/fixed?add=1")}
                >
                  <Plus className="h-4 w-4" /> Fixed Spending
                </Button>
              </div>
              <Button
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-[13px] font-medium text-white shadow-[0_14px_28px_rgba(99,102,241,0.22)] hover:from-violet-600 hover:to-indigo-500 active:scale-[0.99]"
                onClick={() => navigate("/cycles?new=1")}
              >
                <ArrowRightLeft className="h-4 w-4" /> Create Next Salary Cycle
              </Button>

              {/* Recent expenses */}
              {recentExpenses.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-900">Recent Expenses</h3>
                    <Link to="/expenses" className="text-xs font-medium text-indigo-600">View all</Link>
                  </div>
                  <div className="space-y-2">
                    {recentExpenses.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">{e.description || e.category}</p>
                          <p className="text-xs text-slate-500">{fmt(e.date)} · {e.category}</p>
                        </div>
                        <p className="text-[13px] font-medium text-rose-600">-⃁ {e.amount?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
