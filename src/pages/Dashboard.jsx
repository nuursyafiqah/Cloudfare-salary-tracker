import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft, Info } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import SummaryCards from "../components/SummaryCards";

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [fixed, setFixed] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cycles = await base44.entities.SalaryCycle.filter({ status: "active" }, "-created_date", 1);
      if (cycles.length > 0) {
        const c = cycles[0];
        setCycle(c);
        const [f, e] = await Promise.all([
          base44.entities.FixedSpending.filter({ salary_cycle_id: c.id }),
          base44.entities.Expense.filter({ salary_cycle_id: c.id }),
        ]);
        setFixed(f);
        setExpenses(e);
      }
      setLoading(false);
    })();
  }, []);

  const fixedTotal = fixed.reduce((s, i) => s + (i.amount || 0), 0);
  const expenseTotal = expenses.reduce((s, i) => s + (i.amount || 0), 0);
  const fmt = (d) => new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-60">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-5 pb-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Cycle</h1>
          <p className="text-sm text-muted-foreground">Spending Tracker</p>
        </div>

        {!cycle ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <ArrowRightLeft className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No Active Cycle</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Start by creating your first salary cycle. This tracker follows your salary date, not calendar month.
              </p>
            </div>
            <Button className="h-12 px-8 text-base rounded-xl" onClick={() => navigate("/cycles?new=1")}>
              Start New Salary Cycle
            </Button>
          </div>
        ) : (
          <>
            {/* Cycle info */}
            <div className="bg-primary/5 rounded-2xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Current cycle started <strong>{fmt(cycle.start_date)}</strong>.
                {cycle.end_date ? ` Ends ${fmt(cycle.end_date)}.` : " End date not set — cycle stays active until next salary."}
              </p>
            </div>

            <SummaryCards cycle={cycle} fixedTotal={fixedTotal} expenseTotal={expenseTotal} />

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12 rounded-xl text-sm font-medium gap-2" onClick={() => navigate("/expenses?add=1")}>
                <Plus className="w-4 h-4" /> Add Expense
              </Button>
              <Button variant="outline" className="h-12 rounded-xl text-sm font-medium gap-2" onClick={() => navigate("/fixed?add=1")}>
                <Plus className="w-4 h-4" /> Fixed Spending
              </Button>
            </div>
            <Button variant="secondary" className="w-full h-12 rounded-xl text-sm font-medium gap-2" onClick={() => navigate("/cycles?new=1")}>
              <ArrowRightLeft className="w-4 h-4" /> Create Next Salary Cycle
            </Button>

            {/* Recent expenses */}
            {recentExpenses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Recent Expenses</h3>
                  <Link to="/expenses" className="text-xs text-primary font-medium">View all</Link>
                </div>
                <div className="space-y-2">
                  {recentExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
                      <div>
                        <p className="text-sm font-medium">{e.description || e.category}</p>
                        <p className="text-xs text-muted-foreground">{fmt(e.date)} · {e.category}</p>
                      </div>
                      <p className="text-sm font-semibold text-rose-600">-RM {e.amount?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}