import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cloudflare } from "@/api/cloudflareClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, ReceiptText, PiggyBank } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import SummaryCards from "../components/SummaryCards";
import { filterExpensesForCycle, formatDisplayDate } from "@/utils/cycleFilters";
import { getExpenseCategoryTone } from "@/utils/expenseCategoryColors";

export default function CycleDetail() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [fixed, setFixed] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await cloudflare.entities.SalaryCycle.get(cycleId);
      setCycle(c);
      const [f, e] = await Promise.all([
        cloudflare.entities.FixedSpending.filter({ salary_cycle_id: cycleId }),
        cloudflare.entities.Expense.filter({ salary_cycle_id: cycleId }, "-date"),
      ]);
      setFixed(f);
      setExpenses(filterExpensesForCycle(e, c));
      setLoading(false);
    })();
  }, [cycleId]);

  const fixedTotal = fixed.reduce((s, i) => s + (i.amount || 0), 0);
  const expenseTotal = expenses.reduce((s, i) => s + (i.amount || 0), 0);
  const fmt = formatDisplayDate;

  if (loading) {
    return <MobileLayout><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></MobileLayout>;
  }

  return (
    <MobileLayout>
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/cycles")} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{fmt(cycle.start_date)} — {fmt(cycle.end_date)}</h1>
          </div>
          <Badge variant={cycle.status === "active" ? "default" : "secondary"}>{cycle.status}</Badge>
        </div>

        {cycle.status !== "active" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
            This is a closed salary cycle. You can still add, edit or delete expenses for this selected cycle.
          </div>
        )}

        <SummaryCards cycle={cycle} fixedTotal={fixedTotal} expenseTotal={expenseTotal} />

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12 rounded-xl gap-2" onClick={() => navigate(`/expenses?cycleId=${cycle.id}&add=1`)}>
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
          <Button variant="outline" className="h-12 rounded-xl gap-2" onClick={() => navigate(`/expenses?cycleId=${cycle.id}`)}>
            <ReceiptText className="w-4 h-4" /> Expenses
          </Button>
          <Button variant="outline" className="col-span-2 h-12 rounded-xl gap-2" onClick={() => navigate(`/fixed?cycleId=${cycle.id}`)}>
            <PiggyBank className="w-4 h-4" /> Fixed Spending for This Cycle
          </Button>
        </div>

        {/* Fixed spending */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Fixed Spending ({fixed.length})</h3>
          {fixed.length === 0 ? (
            <p className="text-xs text-muted-foreground">No fixed spending.</p>
          ) : (
            <div className="space-y-2">
              {fixed.map((i) => (
                <div key={i.id} className="bg-card rounded-xl p-3 border border-border flex justify-between">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-600">⃁ {i.amount?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Daily Expenses ({expenses.length})</h3>
          {expenses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No expenses.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => {
                const tone = getExpenseCategoryTone(e.category);
                return (
                  <div key={e.id} className={`flex justify-between rounded-xl border border-l-4 ${tone.border} ${tone.rowBg} p-3`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.description || e.category}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fmt(e.date)} · <span className={`font-semibold ${tone.text}`}>{e.category || "Uncategorized"}</span>
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold ${tone.text}`}>-⃁ {Number(e.amount || 0).toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}