import {
  BadgeCheck,
  BookOpen,
  CalendarRange,
  CreditCard,
  Heart,
  MoveVertical,
  PiggyBank,
  Receipt,
  Sparkles,
} from "lucide-react";
import MobileLayout from "../components/MobileLayout";

const tutorialSteps = [
  {
    icon: CalendarRange,
    title: "1. Start Salary Cycle",
    text: "Open Cycles tab, add your salary date and salary amount. This becomes the active cycle for your current spending.",
  },
  {
    icon: PiggyBank,
    title: "2. Add Fixed Spending",
    text: "Open Fixed tab and add commitments such as loan, house, school, saving, or family expenses.",
  },
  {
    icon: BadgeCheck,
    title: "3. Mark Paid Items",
    text: "Tick the paid checkbox after payment is completed. Paid item will turn green and show the Paid badge.",
  },
  {
    icon: MoveVertical,
    title: "4. Arrange Fixed Cards",
    text: "Tap Arrange, then use the up and down buttons to move cards. Tap Done when finished.",
  },
  {
    icon: Receipt,
    title: "5. Add Daily Expenses",
    text: "Open Expenses tab to record daily spending. This helps calculate your total spend and remaining balance.",
  },
  {
    icon: CreditCard,
    title: "6. Check Dashboard",
    text: "Open Dashboard to view salary remaining, daily expenses, fixed spending, total spend, and days progress.",
  },
];

export default function SettingsPage() {
  return (
    <MobileLayout>
      <div className="space-y-5 pb-4 mobile-no-select">
        <div className="rounded-[28px] border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                Guide
              </p>
              <h1 className="text-xl font-bold tracking-tight">Settings &amp; Help</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Simple tutorial to use the Salary Tracker app.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Tutorial
            </h2>
          </div>

          <div className="space-y-2.5">
            {tutorialSteps.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-tight">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-rose-200/60 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-rose-500 shadow-sm">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                Credit
              </p>
              <h3 className="text-base font-bold text-slate-900">Created by Nazif Jaafar</h3>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
