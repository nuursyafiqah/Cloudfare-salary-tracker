import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import FixedSpending from "./pages/FixedSpending";
import SalaryCycles from "./pages/SalaryCycles";
import CycleDetail from "./pages/CycleDetail";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Public app pages: anyone with the link can open and edit without login. */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/fixed" element={<FixedSpending />} />
          <Route path="/cycles" element={<SalaryCycles />} />
          <Route path="/cycle/:cycleId" element={<CycleDetail />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Login pages are intentionally disabled for this public-link version. */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<Navigate to="/" replace />} />

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
