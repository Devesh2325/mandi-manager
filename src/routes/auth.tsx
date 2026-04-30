import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup-only
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gst, setGst] = useState("");
  const [license, setLicense] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!companyName.trim()) {
          toast.error("Company name is required for new tenants.");
          setBusy(false);
          return;
        }
        const redirect =
          typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirect,
            data: {
              full_name: fullName,
              company_name: companyName,
              gst_number: gst || null,
              license_number: license || null,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to verify, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: "/super-admin" }).catch(() => navigate({ to: "/app" }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-stretch bg-background">
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground text-xl font-bold">
            म
          </div>
          <div>
            <div className="text-lg font-semibold">Mandi ERP — SaaS</div>
            <div className="text-xs uppercase tracking-widest opacity-70">
              Multi-tenant Cloud
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            One account. Your own mandi workspace.
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-80">
            Sign up creates your tenant automatically. Invite operators and
            accountants from Settings.
          </p>
        </div>
        <div className="text-[11px] opacity-50">
          Already use the local terminal? Visit{" "}
          <a className="underline" href="/login">
            /login
          </a>{" "}
          for the offline workflow.
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="flex gap-1 rounded-md bg-muted p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-background shadow-sm" : "opacity-60"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-background shadow-sm" : "opacity-60"}`}
            >
              Create tenant
            </button>
          </div>

          <h1 className="mt-6 text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Start your mandi"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your cloud workspace."
              : "We’ll create a tenant for your company."}
          </p>

          {mode === "signup" && (
            <>
              <Field label="Your name">
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Company name">
                <input
                  className="input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GSTIN (optional)">
                  <input
                    className="input"
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                  />
                </Field>
                <Field label="APMC License (optional)">
                  <input
                    className="input"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          <Field label="Email">
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </Field>

          <button
            disabled={busy}
            className="mt-6 w-full rounded bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      <style>{`.input{display:block;width:100%;border:1px solid hsl(var(--input));border-radius:6px;background:hsl(var(--background));padding:8px 12px;font-size:14px;outline:none}
.input:focus{border-color:hsl(var(--ring));box-shadow:0 0 0 1px hsl(var(--ring))}`}</style>
    </label>
  );
}
