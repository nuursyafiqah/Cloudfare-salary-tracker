import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Plus, Info } from "lucide-react";
import MobileLayout from "../components/MobileLayout";

export default function SalaryCycles() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ start_date: new Date().toISOString().split("T")[0], salary_amount: "" });
  const [totals, setTotals] = useState({});

  const params = new URLSearchParams(window.location.search);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (params.get("new") === "1") {
      setSheetOpen(true);
      window.history.replaceState({}, "", "/cycles");
    }
  }, []);

  const load = async () => {
    const c = await base44.entities.SalaryCycle.list("-start_date", 50);
    setCycles(c);

    // Load totals for each cycle
    const t = {};
    await Promise.all(c.map(async (cy) => {
      const [fixed, expenses] = await Promise.all([
        base44.entities.FixedSpending.filter({ salary_cycle_id: cy.id }),
        base44.entities.Expense.filter({ salary_cycle_id: cy.id }),
      ]);
      t[cy.id] = {
        fixedTotal: fixed.reduce((s, i) => s + (i.amount || 0), 0),
        expenseTotal: expenses.reduce((s, i) => s + (i.amount || 0), 0),
      };
    }));
    setTotals(t);
    setLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    const newStartDate = form.start_date;
    const salaryAmount = parseFloat(form.salary_amount);

    // Close previous active cycle
    const activeCycles = cycles.filter((c) => c.status === "active");
    for (const ac of activeCycles) {
      const endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() - 1);
      await base44.entities.SalaryCycle.update(ac.id, {
        status: "closed",
        end_date: endDate.toISOString().split("T")[0],
      });
    }

    // Create new cycle
    const newCycle = await base44.entities.SalaryCycle.create({
      start_date: newStartDate,
      salary_amount: salaryAmount,
      status: "active",
    });

    // Copy repeated fixed spending from previous active cycle
    if (activeCycles.length > 0) {
      const prevFixed = await base44.entities.FixedSpending.filter({ salary_cycle_id: activeCycles[0].id });
      const repeated = prevFixed.filter((f) => f.repeat_every_cycle);
      if (repeated.length > 0) {
        await base44.entities.FixedSpending.bulkCreate(
          repeated.map((f) => ({
            salary_cycle_id: newCycle.id,
            name: f.name,
            amount: f.amount,
            category: f.category,
            repeat_every_cycle: true,
            note: f.note,
          }))
        );
      }
    }

    setSheetOpen(false);
    setForm({ start_date: new Date().toISOString().split("T")[0], salary_amount: "" });
    setSaving(false);
    await load();
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtRM = (n) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <MobileLayout>
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Salary Cycles</h1>
          <Button size="sm" className="rounded-xl gap-1" onClick={() => setSheetOpen(true)}>
            <Plus className="w-4 h-4" /> New Cycle
          </Button>
        </div>

        <div className="bg-primary/5 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            This tracker follows your salary date, not calendar month. Each cycle starts when you receive salary.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No salary cycles yet. Tap "New Cycle" to start.</p>
        ) : (
          <div className="space-y-3">
            {cycles.map((c) => {
              const t = totals[c.id] || { fixedTotal: 0, expenseTotal: 0 };
              const totalSpent = t.fixedTotal + t.expenseTotal;
              const remaining = c.salary_amount - totalSpent;
              return (
                <button
                  key={c.id}
                  className="w-full text-left bg-card rounded-xl p-4 border border-border space-y-2"
                  onClick={() => navigate(`/cycle/${c.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{fmt(c.start_date)} — {fmt(c.end_date)}</span>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {c.status === "active" ? "Active" : "Closed"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Salary: {fmtRM(c.salary_amount)}</span>
                    <span>Spent: {fmtRM(totalSpent)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${remaining >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, (totalSpent / c.salary_amount) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Remaining: {fmtRM(remaining)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>New Salary Cycle</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4 pb-6">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-700">
                Your spending cycle starts from your salary received date. If you do not know the next salary date yet, leave the end date empty. This cycle will stay active until you create the next salary cycle.
              </p>
            </div>
            <div>
              <Label>Salary Received Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="mt-1 h-12 text-base" />
            </div>
            <div>
              <Label>Salary Received Amount (RM)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.salary_amount} onChange={(e) => setForm((p) => ({ ...p, salary_amount: e.target.value }))} className="mt-1 h-12 text-base" />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={!form.start_date || !form.salary_amount || saving}
              onClick={handleCreate}
            >
              {saving ? "Creating..." : "Start Salary Cycle"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}