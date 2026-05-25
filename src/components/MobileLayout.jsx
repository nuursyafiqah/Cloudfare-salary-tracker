import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Receipt, PiggyBank, CalendarRange, Settings } from "lucide-react";

const tabs = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/expenses", icon: Receipt, label: "Expenses" },
  { path: "/fixed", icon: PiggyBank, label: "Fixed" },
  { path: "/cycles", icon: CalendarRange, label: "Cycles" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileLayout({ children }) {
  const location = useLocation();

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-background"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-lg px-4 pb-6 pt-4">
          {children}
        </div>
      </main>

      <nav className="relative z-40 shrink-0 border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div
          className="mx-auto flex max-w-lg justify-around px-2 pt-2"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex min-w-[58px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
