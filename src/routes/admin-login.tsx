import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Sign-in — Mandi ERP" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const SUPER_ADMIN_EMAIL = "dmchaturvedi@gmail.com";
    try {
      if (email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
        toast.error("Access denied. This portal is restricted.");
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify super_admin role
      const userId = data.user?.id;
      if (!userId) throw new Error("No user session.");
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error("This account is not a Super Admin.");
        return;
      }
      toast.success("Welcome, Super Admin.");
      navigate({ to: "/super-admin" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Super Admin Sign-in</h1>
          <p className="text-xs text-muted-foreground">Restricted access. Authorized personnel only.</p>
        </div>

        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </label>

        <label className="mt-4 block">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </label>

        <button
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:underline">← User sign-in</Link>
        </div>
      </form>
    </div>
  );
}
