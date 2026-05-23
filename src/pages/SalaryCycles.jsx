import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { filterExpensesForCycle, formatDisplayDate, getPreviousDate, toDateOnly } from "@/utils/cycleFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Info, Trash2, ChevronRight, Pencil } from "lucide-react";
import MobileLayout from "../components/MobileLayout";

export default function SalaryCycles() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editSalaryTarget, setEditSalaryTarget] = useState(null);
  const [editSalaryAmount, setEditSalaryAmount] = useState("");
  const [updatingSalary, setUpdatingSalary] = useState(false);
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

  const normalizeCycleBoundaries = async (rawCycles = []) => {
    const sortedAsc = [...rawCycles]
      .filter((cycle) => cycle.start_date)
      .sort((a, b) => toDateOnly(a.start_date).localeCompare(toDateOnly(b.start_date)));

    const updatesById = new Map();

    sortedAsc.forEach((cycle, index) => {
      const nextCycle = sortedAsc[index + 1];
      const expectedStatus = nextCycle ? "closed" : "active";
      const expectedEndDate = nextCycle ? getPreviousDate(nextCycle.start_date) : "";
      const currentEndDate = toDateOnly(cycle.end_date);
      const update = {};

      if (cycle.status !== expectedStatus) update.status = expectedStatus;
      if (currentEndDate !== expectedEndDate) update.end_date = expectedEndDate;

      if (Object.keys(update).length > 0) {
        updatesById.set(cycle.id, update);
      }
    });

    if (updatesById.size > 0) {
      await Promise.all(
        Array.from(updatesById.entries()).map(([id, update]) => base44.entities.SalaryCycle.update(id, update))
      );
    }

    return rawCycles
      .map((cycle) => ({ ...cycle, ...(updatesById.get(cycle.id) || {}) }))
      .sort((a, b) => toDateOnly(b.start_date).localeCompare(toDateOnly(a.start_date)));
  };

  const load = async () => {
    setLoading(true);
    const rawCycles = await base44.entities.SalaryCycle.list("-start_date", 50);
    const c = await normalizeCycleBoundaries(rawCycles);
    setCycles(c);

    // Load totals for each cycle
    const t = {};
    await Promise.all(c.map(async (cy) => {
      const [fixed, expenses] = await Promise.all([
        base44.entities.FixedSpending.filter({ salary_cycle_id: cy.id }),
        base44.entities.Expense.filter({ salary_cycle_id: cy.id }),
      ]);
      const cycleExpenses = filterExpensesForCycle(expenses, cy);
      t[cy.id] = {
        fixedTotal: fixed.reduce((s, i) => s + (i.amount || 0), 0),
        expenseTotal: cycleExpenses.reduce((s, i) => s + (i.amount || 0), 0),
      };
    }));
    setTotals(t);
    setLoading(false);
  };

  const handleCreate = async () => {
    const newStartDate = toDateOnly(form.start_date);
    const salaryAmount = parseFloat(form.salary_amount);

    if (cycles.some((cycle) => toDateOnly(cycle.start_date) === newStartDate)) {
      alert("A salary cycle with this start date already exists. Open that cycle to edit it.");
      return;
    }

    setSaving(true);
    try {
      const sortedAsc = [...cycles]
        .filter((cycle) => cycle.start_date)
        .sort((a, b) => toDateOnly(a.start_date).localeCompare(toDateOnly(b.start_date)));
      const previousCycle = [...sortedAsc].reverse().find((cycle) => toDateOnly(cycle.start_date) < newStartDate);
      const nextCycle = sortedAsc.find((cycle) => toDateOnly(cycle.start_date) > newStartDate);
      const isLatestCycle = !nextCycle;
      const newEndDate = nextCycle ? getPreviousDate(nextCycle.start_date) : "";

      // If this is a backfilled/previous cycle, do not make it active.
      // Only the latest salary cycle should be active.
      const newCycle = await base44.entities.SalaryCycle.create({
        start_date: newStartDate,
        end_date: newEndDate,
        salary_amount: salaryAmount,
        status: isLatestCycle ? "active" : "closed",
      });

      // Close or resize the cycle immediately before the new start date.
      // Example: existing active 27 Apr, new salary 20 May => 27 Apr ends 19 May.
      if (previousCycle) {
        await base44.entities.SalaryCycle.update(previousCycle.id, {
          status: "closed",
          end_date: getPreviousDate(newStartDate),
        });
      }

      // Safety: if a new latest cycle was created, close any older active cycles.
      if (isLatestCycle) {
        const olderActiveCycles = cycles.filter((cycle) => cycle.status === "active" && cycle.id !== newCycle.id);
        await Promise.all(
          olderActiveCycles.map((cycle) => base44.entities.SalaryCycle.update(cycle.id, { status: "closed" }))
        );
      }

      // Copy repeated fixed spending only when creating the next/latest cycle.
      if (isLatestCycle && previousCycle) {
        const prevFixed = await base44.entities.FixedSpending.filter({ salary_cycle_id: previousCycle.id });
        const repeated = prevFixed.filter((f) => f.repeat_every_cycle);
        if (repeated.length > 0) {
          await base44.entities.FixedSpending.bulkCreate(
            repeated.map((f) => ({
              salary_cycle_id: newCycle.id,
              name: f.name,
              amount: f.amount,
              category: f.category,
              repeat_every_cycle: true,
              is_paid: false,
              note: f.note,
            }))
          );
        }
      }

      setSheetOpen(false);
      setForm({ start_date: new Date().toISOString().split("T")[0], salary_amount: "" });
      await load();
    } finally {
      setSaving(false);
    }
  };


  const openEditSalary = (cycle) => {
    setEditSalaryTarget(cycle);
    setEditSalaryAmount(cycle.salary_amount?.toString() || "");
  };

  const handleUpdateSalary = async () => {
    if (!editSalaryTarget) return;

    const nextSalaryAmount = parseFloat(editSalaryAmount);
    if (!Number.isFinite(nextSalaryAmount) || nextSalaryAmount < 0) {
      alert("Please enter a valid salary amount.");
      return;
    }

    setUpdatingSalary(true);
    try {
      await base44.entities.SalaryCycle.update(editSalaryTarget.id, {
        salary_amount: nextSalaryAmount,
      });
      setEditSalaryTarget(null);
      setEditSalaryAmount("");
      await load();
    } finally {
      setUpdatingSalary(false);
    }
  };

  const handleDeleteCycle = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const [fixedItems, expenseItems] = await Promise.all([
        base44.entities.FixedSpending.filter({ salary_cycle_id: deleteTarget.id }),
        base44.entities.Expense.filter({ salary_cycle_id: deleteTarget.id }),
      ]);

      await Promise.all([
        ...fixedItems.map((item) => base44.entities.FixedSpending.delete(item.id)),
        ...expenseItems.map((item) => base44.entities.Expense.delete(item.id)),
      ]);

      await base44.entities.SalaryCycle.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  const fmt = formatDisplayDate;
  const fmtCurrency = (n) => `⃁ ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
            This tracker follows your salary date, not calendar month. Tap any cycle to open and edit its expenses. Only the latest cycle stays Active.
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
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  className="w-full text-left bg-card rounded-xl p-4 border border-border space-y-2 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/cycle/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/cycle/${c.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium block">{fmt(c.start_date)} — {fmt(c.end_date)}</span>
                      <div className="mt-1">
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {c.status === "active" ? "Active" : "Closed"}
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="p-2 -mr-1 -mt-1 rounded-lg hover:bg-destructive/10 shrink-0"
                      aria-label="Delete salary cycle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(c);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">Salary: {fmtCurrency(c.salary_amount || 0)}</span>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                        aria-label="Edit salary amount"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSalary(c);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="shrink-0">Spent: {fmtCurrency(totalSpent)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${remaining >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${c.salary_amount > 0 ? Math.min(100, (totalSpent / c.salary_amount) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-medium ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      Remaining: {fmtCurrency(remaining)}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                      Open Cycle <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
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
                Your spending cycle starts from your salary received date. If you create an older/backfill cycle, it will stay Closed and can still be edited. Only the latest cycle will be Active.
              </p>
            </div>
            <div>
              <Label>Salary Received Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} className="mt-1 h-12 text-base" />
            </div>
            <div>
              <Label>Salary Received Amount (⃁)</Label>
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

      <Sheet
        open={!!editSalaryTarget}
        onOpenChange={(open) => {
          if (!open && !updatingSalary) {
            setEditSalaryTarget(null);
            setEditSalaryAmount("");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Edit Salary Amount</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4 pb-6">
            {editSalaryTarget && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{fmt(editSalaryTarget.start_date)} — {fmt(editSalaryTarget.end_date)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Update the salary amount for this cycle only. Remaining balance will recalculate automatically.
                </p>
              </div>
            )}
            <div>
              <Label>Salary Received Amount (⃁)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editSalaryAmount}
                onChange={(e) => setEditSalaryAmount(e.target.value)}
                className="mt-1 h-12 text-base"
              />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={!editSalaryAmount || updatingSalary}
              onClick={handleUpdateSalary}
            >
              {updatingSalary ? "Saving..." : "Save Salary Amount"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the selected salary cycle together with its fixed spending and daily expenses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{fmt(deleteTarget.start_date)} — {fmt(deleteTarget.end_date)}</p>
              <p className="text-xs text-muted-foreground mt-1">Salary: {fmtCurrency(deleteTarget.salary_amount)}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCycle();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Cycle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}