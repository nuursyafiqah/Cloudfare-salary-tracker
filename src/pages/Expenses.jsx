import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import MobileLayout from "../components/MobileLayout";
import ExpenseForm from "../components/ExpenseForm";

export default function Expenses() {
  const [cycle, setCycle] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = new URLSearchParams(window.location.search);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (params.get("add") === "1" && cycle) {
      setSheetOpen(true);
      window.history.replaceState({}, "", "/expenses");
    }
  }, [cycle]);

  const load = async () => {
    const cycles = await base44.entities.SalaryCycle.filter({ status: "active" }, "-created_date", 1);
    if (cycles.length > 0) {
      setCycle(cycles[0]);
      const e = await base44.entities.Expense.filter({ salary_cycle_id: cycles[0].id }, "-date");
      setExpenses(e);
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
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

  const fmt = (d) => new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short" });

  return (
    <MobileLayout>
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Daily Expenses</h1>
          {cycle && (
            <Button size="sm" className="rounded-xl gap-1" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>

        {!cycle && !loading && (
          <p className="text-sm text-muted-foreground text-center py-12">No active salary cycle. Create one first from the Dashboard.</p>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : expenses.length === 0 && cycle ? (
          <p className="text-sm text-muted-foreground text-center py-12">No expenses yet. Tap "Add" to record your spending.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.description || e.category}</p>
                  <p className="text-xs text-muted-foreground">{fmt(e.date)} · {e.category}{e.payment_method ? ` · ${e.payment_method}` : ""}</p>
                </div>
                <p className="text-sm font-semibold text-rose-600 shrink-0">-RM {e.amount?.toFixed(2)}</p>
                <div className="flex gap-1 shrink-0">
                  <button className="p-2 rounded-lg hover:bg-muted" onClick={() => { setEditing(e); setSheetOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-muted" onClick={() => setDeleteId(e.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Edit Expense" : "Add Expense"}</SheetTitle></SheetHeader>
          <div className="mt-4 pb-6">
            <ExpenseForm onSubmit={handleSubmit} initial={editing} loading={saving} />
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