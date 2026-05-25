import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Building2, Mail, Lock, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          toast.error("Workspace name is required.");
          setBusy(false);
          return;
        }
        const redirect = typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
        const { data, error } = await supabase.auth.signUp({
          email, password,
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
        if (data.session) {
          toast.success("Workspace created. Welcome!");
          navigate({ to: "/app" });
        } else {
          toast.success("Account created. Check your email to verify, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        if (email.trim().toLowerCase() === "dmchaturvedi@gmail.com") {
          navigate({ to: "/super-admin" });
        } else {
          navigate({ to: "/app" });
        }
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
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground text-xl font-bold">म</div>
          <div>
            <div className="text-lg font-semibold">Mandi ERP — SaaS</div>
            <div className="text-xs uppercase tracking-widest opacity-70">Multi-tenant Cloud</div>
          </div>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">One account. Your own mandi workspace.</h2>
          <p className="mt-3 max-w-md text-sm opacity-80">Sign up creates your workspace automatically. Invite operators and accountants from Settings later.</p>
          <ul className="mt-6 space-y-2 text-sm opacity-80">
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Multi-workspace, role-based access</li>
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> APMC commission, dalali, ledger automation</li>
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cloud sync — work from any device</li>
          </ul>
        </div>
        <div className="text-[11px] opacity-50">© Mandi ERP — APMC commission-agent workflow</div>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="flex gap-1 rounded-md bg-muted p-1 text-xs font-medium">
            <button type="button" onClick={() => setMode("signin")}
              className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-background shadow-sm" : "opacity-60"}`}>Sign in</button>
            <button type="button" onClick={() => setMode("signup")}
              className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-background shadow-sm" : "opacity-60"}`}>Create workspace</button>
          </div>

          <h1 className="mt-6 text-2xl font-semibold">{mode === "signin" ? "Welcome back" : "Start your mandi"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your cloud workspace." : "We'll create a workspace for your company."}
          </p>

          {mode === "signup" && (
            <>
              <Field label="Your name" icon={<UserIcon className="h-3.5 w-3.5" />}>
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Field>
              <Field label="Workspace / Company name" icon={<Building2 className="h-3.5 w-3.5" />}>
                <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="e.g. Shree Krishna Mandi" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GSTIN (optional)"><input className={inputCls} value={gst} onChange={(e) => setGst(e.target.value.toUpperCase())} /></Field>
                <Field label="APMC License (optional)"><input className={inputCls} value={license} onChange={(e) => setLicense(e.target.value)} /></Field>
              </div>
            </>
          )}

          <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
          </Field>
          <Field label="Password" icon={<Lock className="h-3.5 w-3.5" />}>
            <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" />
          </Field>

          <button disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create workspace"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>


          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">← Back to home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring";

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
