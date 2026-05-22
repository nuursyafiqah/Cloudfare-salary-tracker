import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = ["Food", "Groceries", "Transport", "Kids", "Bills", "Shopping", "Emergency", "Healthcare", "Entertainment", "Hungerstation", "Naim", "OCC order Makan", "Wife Req.", "Wife Req. brg Anak", "Other"];
const paymentMethods = ["Cash", "Card", "Online Transfer", "E-Wallet", "Other"];

function getDefaultExpenseDate(cycle) {
  const today = new Date().toISOString().split("T")[0];

  if (!cycle?.start_date) return today;
  if (today < cycle.start_date) return cycle.start_date;
  if (cycle.end_date && today > cycle.end_date) return cycle.end_date;

  return today;
}

export default function ExpenseForm({ onSubmit, initial, loading, cycle }) {
  const [form, setForm] = useState({
    date: initial?.date || getDefaultExpenseDate(cycle),
    amount: initial?.amount || "",
    category: initial?.category || "",
    description: initial?.description || "",
    payment_method: initial?.payment_method || "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const minDate = cycle?.start_date || undefined;
  const maxDate = cycle?.end_date || undefined;

  return (
    <div className="space-y-4">
      <div>
        <Label>Date</Label>
        <Input type="date" value={form.date} min={minDate} max={maxDate} onChange={(e) => set("date", e.target.value)} className="mt-1 h-12 text-base" />
        {cycle?.start_date && (
          <p className="mt-1 text-xs text-muted-foreground">
            This expense will be saved under {cycle.start_date}{cycle.end_date ? ` to ${cycle.end_date}` : " onwards"} salary cycle.
          </p>
        )}
      </div>
      <div>
        <Label>Amount (⃁)</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} className="mt-1 h-12 text-base" />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Textarea placeholder="What was this for?" value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1 text-base" />
      </div>
      <div>
        <Label>Payment Method (optional)</Label>
        <Select value={form.payment_method} onValueChange={(v) => set("payment_method", v)}>
          <SelectTrigger className="mt-1 h-12 text-base"><SelectValue placeholder="Select method" /></SelectTrigger>
          <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button
        className="w-full h-12 text-base font-semibold rounded-xl"
        disabled={!form.date || !form.amount || !form.category || loading}
        onClick={() => onSubmit({ ...form, amount: parseFloat(form.amount) })}
      >
        {loading ? "Saving..." : initial ? "Update Expense" : "Add Expense"}
      </Button>
    </div>
  );
}