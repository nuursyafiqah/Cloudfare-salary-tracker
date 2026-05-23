import { Link } from "react-router-dom";
import { Wallet, CreditCard, TrendingDown, PiggyBank, Calendar, Activity } from "lucide-react";
import { parseDateOnly } from "@/utils/cycleFilters";

function Card({ icon: Icon, label, value, color, sub, to }) {
  const cardClassName = `bg-card rounded-2xl p-4 border border-border shadow-sm ${
    to
      ? "block cursor-pointer transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40"
      : ""
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cardClassName} aria-label={`Open ${label} page`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

export default function SummaryCards({ cycle, fixedTotal, expenseTotal }) {
  const salary = cycle?.salary_amount || 0;
  const totalSpent = fixedTotal + expenseTotal;
  const remaining = salary - totalSpent;
  const startDate = cycle?.start_date ? parseDateOnly(cycle.start_date) : null;
  const endDate = cycle?.end_date ? parseDateOnly(cycle.end_date) : new Date();
  const daysSince = startDate && endDate ? Math.max(1, Math.floor((endDate - startDate) / 86400000) + 1) : 0;
  const avgPerDay = daysSince > 0 ? (expenseTotal / daysSince) : 0;

  const fmt = (n) => `⃁ ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card icon={Wallet} label="Salary" value={fmt(salary)} color="bg-emerald-500" />
      <Card
        icon={Activity}
        label="Remaining"
        value={fmt(remaining)}
        color={remaining >= 0 ? "bg-teal-500" : "bg-red-600"}
        sub={remaining < 0 ? "Over budget!" : ""}
      />
      <Card icon={CreditCard} label="Daily Expenses" value={fmt(expenseTotal)} color="bg-blue-500" to="/expenses" />
      <Card icon={PiggyBank} label="Fixed Spending" value={fmt(fixedTotal)} color="bg-amber-500" to="/fixed" />
      <Card icon={TrendingDown} label="Total Spent" value={fmt(totalSpent)} color="bg-rose-500" />
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