import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sprout,
  ShieldCheck,
  Zap,
  CloudUpload,
  FileText,
  Users,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mandi Manager — Cloud ERP for APMC Mandis & Aaadhatiyas" },
      {
        name: "description",
        content:
          "Run your mandi business on the cloud. Challans, Teep, Bills, Cashbook, GST & APMC reports — all in one place. Book a free demo.",
      },
      { property: "og:title", content: "Mandi Manager — Cloud ERP for Mandis" },
      {
        property: "og:description",
        content: "Cloud ERP for APMC mandis & commission agents. Free demo available.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <EnquirySection />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="font-bold tracking-tight">Mandi Manager</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-muted-foreground hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </a>
          <a href="#enquiry" className="text-muted-foreground hover:text-foreground">
            Contact
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md px-3 py-1.5 text-sm hover:bg-muted sm:inline-block"
          >
            Sign in
          </Link>
          <a
            href="#enquiry"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Book demo <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" /> Made for APMC mandis & aadhatiyas
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Run your mandi on the cloud — <span className="text-primary">no more notebooks</span>.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Challans, Teep, Bills, Ledger, Cashbook, GST & APMC reports — all auto-synced across
            your team, on mobile and desktop.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#enquiry"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Get a free demo <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              Start free trial
            </Link>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {[
              "Works offline",
              "GST + APMC ready",
              "Multi-user, multi-FY",
              "Hindi + English",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-2 shadow-2xl">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-secondary/30 p-8">
            <div className="space-y-3">
              {[
                { l: "Today's Challans", v: "42", c: "bg-primary/10" },
                { l: "Pending Teep", v: "8", c: "bg-amber-500/10" },
                { l: "Cash in hand", v: "₹ 3,42,000", c: "bg-emerald-500/10" },
              ].map((s) => (
                <div
                  key={s.l}
                  className={`flex items-center justify-between rounded-lg ${s.c} px-4 py-3`}
                >
                  <span className="text-sm font-medium">{s.l}</span>
                  <span className="text-lg font-bold">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: FileText, title: "Challan & Teep", desc: "Quick voice-friendly entry, auto-numbering, print or PDF in one tap." },
    { icon: Users, title: "Party Ledger", desc: "Live ledgers for farmers and traders. Outstandings always up-to-date." },
    { icon: CloudUpload, title: "Cloud Sync", desc: "Your team sees the same data from any device — even on poor networks." },
    { icon: ShieldCheck, title: "GST + APMC", desc: "Tax-ready reports, daily mandi register, commission and hammali tracking." },
  ];
  return (
    <section id="features" className="border-b py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight">Everything your mandi needs</h2>
        <p className="mt-2 text-muted-foreground">
          Built with mandi owners — not generic accounting software.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-xl border bg-card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{it.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, t: "Book a free demo", d: "Tell us about your mandi. Our team calls you within 24 hours." },
    { n: 2, t: "We set up your workspace", d: "Parties, items, opening balances — we migrate from your notebooks." },
    { n: 3, t: "Go live in a day", d: "Train your staff, start invoicing same day. We support you on WhatsApp." },
  ];
  return (
    <section className="border-b bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight">How onboarding works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-b py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
        <p className="mt-2 text-muted-foreground">Start free. Upgrade when you grow.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "Free", p: "₹0", d: "1 user, 1 FY", cta: "Start free" },
            { n: "Pro", p: "₹999/mo", d: "5 users, multi-FY, GST", cta: "Get demo", best: true },
            { n: "Business", p: "₹2499/mo", d: "Unlimited users, API, priority support", cta: "Talk to sales" },
          ].map((p) => (
            <div
              key={p.n}
              className={`rounded-xl border p-6 text-left ${p.best ? "border-primary bg-primary/5 shadow-lg" : "bg-card"}`}
            >
              {p.best && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="mt-3 text-xl font-bold">{p.n}</h3>
              <div className="mt-2 text-3xl font-bold">{p.p}</div>
              <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
              <a
                href="#enquiry"
                className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EnquirySection() {
  return (
    <section id="enquiry" className="border-b py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Book a free demo</h2>
          <p className="mt-2 text-muted-foreground">
            Fill the form and our sales team will call you within 24 hours to set up your mandi
            workspace.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              <span>+91 90000 00000</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" />
              <span>sales@mandimanager.app</span>
            </div>
          </div>
        </div>
        <EnquiryForm />
      </div>
    </section>
  );
}

function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    city: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      company: form.company.trim() || null,
      city: form.city.trim() || null,
      message: form.message.trim() || null,
      source: "landing",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Thanks! Our team will call you shortly.");
  };

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h3 className="mt-4 text-xl font-bold">Enquiry received</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Our sales team will call you within 24 hours on <strong>{form.phone}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-6">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Your name *" value={form.name} onChange={set("name")} required />
        <Field label="Phone *" value={form.phone} onChange={set("phone")} required type="tel" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Email" value={form.email} onChange={set("email")} type="email" />
        <Field label="City" value={form.city} onChange={set("city")} />
      </div>
      <Field label="Mandi / Company name" value={form.company} onChange={set("company")} />
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Tell us about your mandi
        </label>
        <textarea
          value={form.message}
          onChange={set("message")}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="What kind of trading? How many parties?"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Request callback"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        We'll never share your info. By submitting you agree to be contacted by our sales team.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-card py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground md:flex-row">
        <div>© {new Date().getFullYear()} Mandi Manager. All rights reserved.</div>
        <div className="flex gap-4">
          <Link to="/auth">Sign in</Link>
          <Link to="/login">Offline terminal</Link>
        </div>
      </div>
    </footer>
  );
}
