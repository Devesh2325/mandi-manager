import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
      Loading Mandi ERP…
    </div>
  ),
});
