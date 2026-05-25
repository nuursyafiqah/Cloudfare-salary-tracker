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
      <div className="relative mx-auto flex h-[100dvh] max-w-lg flex-col overflow-hidden bg-background">
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="px-4 pb-6 pt-4">
            {children}
          </div>
        </main>

        <nav
          className="mobile-bottom-nav mobile-no-select z-50 shrink-0 border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
            WebkitUserSelect: "none",
            userSelect: "none",
            touchAction: "manipulation",
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="flex justify-around px-2 py-2">
            {tabs.map(({ path, icon: Icon, label }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => goToTab(path)}
                  className={`mobile-tab-button flex min-w-[58px] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
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
    </div>
  );
}
