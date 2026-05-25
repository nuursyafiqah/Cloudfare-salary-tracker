import { useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const goToTab = (path) => {
    // Using a button + navigate prevents iPhone long-press link preview / selection from
    // getting stuck and blocking the bottom tab after visiting heavy pages like Fixed.
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div
      className="app-mobile-shell fixed inset-0 overflow-hidden bg-background"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
      }}
    >
      <main className="h-full min-h-0 overflow-y-auto overscroll-contain pb-[calc(5.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-4 pt-4">
          {children}
        </div>
      </main>

      <nav
        className="mobile-bottom-nav mobile-no-select fixed inset-x-0 bottom-0 z-[9999] border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
        style={{
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "manipulation",
          pointerEvents: "auto",
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="mx-auto flex max-w-lg justify-around px-2 pt-2"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                type="button"
                onClick={() => goToTab(path)}
                onTouchStart={(event) => event.currentTarget.blur()}
                className={`mobile-tab-button flex min-w-[58px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={`Open ${label}`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
