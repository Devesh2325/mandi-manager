import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Plans & Pricing — Mandi ERP" },
      {
        name: "description",
        content: "Choose a Mandi ERP plan: Free, Pro, or Business. Multi-tenant SaaS for APMC commission agents.",
      },
    ],
  }),
});

interface Plan {
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: [
      "1 company / tenant",
      "Up to 2 users",
      "Local + cloud sync",
      "Basic reports",
    ],
    cta: "Current plan",
  },
  {
    name: "Pro",
    price: "₹999",
    period: "per month",
    highlight: true,
    features: [
      "Unlimited parties & items",
      "Up to 10 users",
      "All reports & PDF exports",
      "Priority email support",
      "Cloud backups",
    ],
    cta: "Buy Pro",
  },
  {
    name: "Business",
    price: "₹2,499",
    period: "per month",
    features: [
      "Multi-company workspaces",
      "Unlimited users",
      "API access (coming soon)",
      "Dedicated onboarding",
      "Phone support",
    ],
    cta: "Contact sales",
  },
];

function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Plans & Pricing
        </div>
        <h1 className="mt-4 text-3xl font-bold text-foreground">
          Pick a plan that fits your mandi
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start free. Upgrade when you need more users, companies, or support.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border bg-card p-6 shadow-sm transition-all ${
              plan.highlight
                ? "border-primary ring-2 ring-primary/20"
                : "border-border"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                Most popular
              </div>
            )}
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">/ {plan.period}</span>
            </div>

            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={plan.cta === "Current plan"}
              className={`mt-6 w-full rounded-md py-2 text-sm font-semibold transition-colors ${
                plan.highlight
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              onClick={() => {
                if (plan.cta !== "Current plan") {
                  alert(
                    "Payments are not enabled yet. Contact dmchaturvedi@gmail.com to upgrade.",
                  );
                }
              }}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
        Need a custom plan, on-premise install, or migration help?{" "}
        <Link to="/app/settings" className="font-semibold text-primary hover:underline">
          Get in touch from Settings →
        </Link>
      </div>
    </div>
  );
}
