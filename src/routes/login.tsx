import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginRedirect,
});

/** Legacy local sign-in is removed. Cloud auth is the only path. */
function LoginRedirect() {
  const nav = useNavigate();
  useEffect(() => { nav({ to: "/auth", replace: true }); }, [nav]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Redirecting to sign-in…</div>
    </div>
  );
}
