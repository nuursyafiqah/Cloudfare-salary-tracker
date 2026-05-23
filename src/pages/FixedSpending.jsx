import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/utils/cycleFilters";
import MobileLayout from "../components/MobileLayout";
import FixedSpendingForm from "../components/FixedSpendingForm";

export default function FixedSpending() {
  const [cycle, setCycle] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const selectedCycleId = params.get("cycleId");

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (params.get("add") === "1" && cycle) {
      setSheetOpen(true);
      window.history.replaceState({}, "", selectedCycleId ? `/fixed?cycleId=${selectedCycleId}` : "/fixed");
    }
  }, [cycle, selectedCycleId]);

  const load = async () => {
    setLoading(true);
    let selectedCycle = null;

    if (selectedCycleId) {
      selectedCycle = await base44.entities.SalaryCycle.get(selectedCycleId);
    } else {
      const cycles = await base44.entities.SalaryCycle.filter({ status: "active" }, "-created_date", 1);
      selectedCycle = cycles[0] || null;
    }

    if (selectedCycle) {
      setCycle(selectedCycle);
      const f = await base44.entities.FixedSpending.filter({ salary_cycle_id: selectedCycle.id });
      setItems(f);
    } else {
      setCycle(null);
      setItems([]);
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    if (editing) {
      await base44.entities.FixedSpending.update(editing.id, data);
    } else {
      await base44.entities.FixedSpending.create({ ...data, salary_cycle_id: cycle.id });
    }
    setSheetOpen(false);
    setEditing(null);
    setSaving(false);
    await load();
  };

  const handleDelete = async () => {
    await base44.entities.FixedSpending.delete(deleteId);
    setDeleteId(null);
    await load();
  };

  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <MobileLayout>
      <div className="space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Fixed Spending</h1>
            {cycle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDisplayDate(cycle.start_date)} — {formatDisplayDate(cycle.end_date)}
              </p>
            )}
          </div>
          {cycle && (
            <Button size="sm" className="rounded-xl gap-1" onClick={() => { setEditing(null); setSheetOpen(true); }}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>

        {cycle && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-800">Total Fixed: ⃁ {total.toFixed(2)}</p>
              {cycle.status !== "active" && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Closed</Badge>}
            </div>
            <p className="text-xs text-amber-600 mt-0.5">These are your commitments for this selected salary cycle.</p>
          </div>
        )}

        {!cycle && !loading && (
          <p className="text-sm text-muted-foreground text-center py-12">No salary cycle selected. Create one first from the Dashboard or open one from Salary Cycles.</p>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 && cycle ? (
          <p className="text-sm text-muted-foreground text-center py-8">No fixed spending yet. Tap "Add" to record commitments like rent, loans, etc.</p>
        ) : (
          <div className="space-y-1.5">
            {items.map((i) => (
              <div key={i.id} className="bg-card rounded-xl px-3 py-2 border border-border flex items-center gap-2 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <p className="text-sm font-medium truncate">{i.name}</p>
                    {i.repeat_every_cycle && <Repeat className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground mt-0.5">{i.category}{i.note ? ` · ${i.note}` : ""}</p>
                </div>
                <p className="text-sm font-semibold text-amber-600 shrink-0 ml-1">⃁ {i.amount?.toFixed(2)}</p>
                <div className="flex gap-0.5 shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => { setEditing(i); setSheetOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-muted" onClick={() => setDeleteId(i.id)}>
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
          <SheetHeader><SheetTitle>{editing ? "Edit Fixed Spending" : "Add Fixed Spending"}</SheetTitle></SheetHeader>
          <div className="mt-4 pb-6">
            <FixedSpendingForm onSubmit={handleSubmit} initial={editing} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
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