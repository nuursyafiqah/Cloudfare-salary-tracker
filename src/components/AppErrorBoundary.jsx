import React from "react";
import { Button } from "@/components/ui/button";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "The app could not load properly.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh bg-background px-4 py-10 text-center text-foreground">
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
            !
          </div>
          <h1 className="text-lg font-semibold">App cannot load</h1>
          <p className="mt-2 text-sm text-muted-foreground break-words">{this.state.message}</p>
          <Button className="mt-4 h-11 rounded-xl" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>
    );
  }
}
