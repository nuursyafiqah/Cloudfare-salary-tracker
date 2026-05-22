import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const categories = ["Rent", "Loan", "School Fee", "Internet", "Insurance", "Car Payment", "Utilities", "Subscription", "Other"];

export default function FixedSpendingForm({ onSubmit, initial, loading }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    amount: initial?.amount || "",
    category: initial?.category || "",
    repeat_every_cycle: initial?.repeat_every_cycle ?? true,
    note: initial?.note || "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input placeholder="e.g. House Rent" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1 h-12 text-base" />
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
        <Label>Note (optional)</Label>
        <Textarea placeholder="Any details..." value={form.note} onChange={(e) => set("note", e.target.value)} className="mt-1 text-base" />
      </div>
      <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
        <div>
          <p className="text-sm font-medium">Repeat every cycle</p>
          <p className="text-xs text-muted-foreground">Auto-copy to next salary cycle</p>
        </div>
        <Switch checked={form.repeat_every_cycle} onCheckedChange={(v) => set("repeat_every_cycle", v)} />
      </div>
      <Button
        className="w-full h-12 text-base font-semibold rounded-xl"
        disabled={!form.name || !form.amount || !form.category || loading}
        onClick={() => onSubmit({ ...form, amount: parseFloat(form.amount) })}
      >
        {loading ? "Saving..." : initial ? "Update" : "Add Fixed Spending"}
      </Button>
    </div>
  );
}