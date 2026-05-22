import { Wallet, CreditCard, TrendingDown, PiggyBank, Calendar, Activity } from "lucide-react";

function Card({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SummaryCards({ cycle, fixedTotal, expenseTotal }) {
  const salary = cycle?.salary_amount || 0;
  const totalSpent = fixedTotal + expenseTotal;
  const remaining = salary - totalSpent;
  const startDate = cycle?.start_date ? new Date(cycle.start_date) : null;
  const daysSince = startDate ? Math.max(1, Math.floor((new Date() - startDate) / 86400000)) : 0;
  const avgPerDay = daysSince > 0 ? (expenseTotal / daysSince) : 0;

  const fmt = (n) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card icon={Wallet} label="Salary" value={fmt(salary)} color="bg-emerald-500" />
      <Card icon={PiggyBank} label="Fixed Spending" value={fmt(fixedTotal)} color="bg-amber-500" />
      <Card icon={CreditCard} label="Daily Expenses" value={fmt(expenseTotal)} color="bg-blue-500" />
      <Card icon={TrendingDown} label="Total Spent" value={fmt(totalSpent)} color="bg-rose-500" />
      <Card
        icon={Activity}
        label="Remaining"
        value={fmt(remaining)}
        color={remaining >= 0 ? "bg-teal-500" : "bg-red-600"}
        sub={remaining < 0 ? "Over budget!" : ""}
      />
      <Card
        icon={Calendar}
        label="Days / Avg"
        value={`${daysSince} days`}
        color="bg-violet-500"
        sub={`~${fmt(avgPerDay)}/day`}
      />
    </div>
  );
}