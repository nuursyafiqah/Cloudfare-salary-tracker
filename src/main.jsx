import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";

function showStartupError(error) {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:16px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#0f172a;text-align:center;">
      <div style="max-width:360px;border:1px solid #e2e8f0;background:white;border-radius:20px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.08);">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">App cannot load</div>
        <div style="font-size:14px;color:#64748b;line-height:1.45;word-break:break-word;">${error?.message || "Please refresh and try again."}</div>
        <button onclick="window.location.reload()" style="margin-top:16px;border:0;border-radius:14px;background:#15803d;color:white;padding:12px 18px;font-weight:700;">Refresh</button>
      </div>
    </div>
  `;
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection", event.reason);
});

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <App />
  );
} catch (error) {
  console.error("Failed to start app", error);
  showStartupError(error);
}
