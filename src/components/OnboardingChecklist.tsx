import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import { Check, Circle, X, Sparkles } from "lucide-react";

const STORAGE_KEY = "mandi.onboarding.dismissed";

export function OnboardingChecklist() {
  const { companyId, yearId, ready } = useScope();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const parties = useLiveQuery(
    async () => (ready ? await db.parties.where({ companyId, yearId }).count() : 0),
    [companyId, yearId, ready],
  ) ?? 0;
  const items = useLiveQuery(
    async () => (ready ? await db.items.where({ companyId, yearId }).count() : 0),
    [companyId, yearId, ready],
  ) ?? 0;
  const expenses = useLiveQuery(
    async () => (ready ? await db.expenseMasters?.where({ companyId, yearId }).count() ?? 0 : 0),
    [companyId, yearId, ready],
  ) ?? 0;
  const challans = useLiveQuery(
    async () => (ready ? await db.challans.where({ companyId, yearId }).count() : 0),
    [companyId, yearId, ready],
  ) ?? 0;
  const teeps = useLiveQuery(
    async () => (ready ? await db.teeps.where({ companyId, yearId }).count() : 0),
    [companyId, yearId, ready],
  ) ?? 0;

  const steps = [
    { done: parties > 0, label: "Add your first Party (Farmer / Buyer)", hint: "किसान / खरीदार जोड़ें", to: "/app/masters/parties" },
    { done: items > 0, label: "Add an Item & Quality", hint: "आइटम जोड़ें", to: "/app/masters/items" },
    { done: expenses > 0, label: "Configure Expenses & Packing", hint: "खर्च और पैकिंग सेट करें", to: "/app/masters/expenses" },
    { done: challans > 0, label: "Create your first Challan", hint: "पहला चालान बनाएं", to: "/app/entry/challan" },
    { done: teeps > 0, label: "Generate your first Teep (Sale)", hint: "टीप बनाएं", to: "/app/teep" },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;

  if (dismissed || allDone) return null;

  return (
    <div className="pebble relative overflow-hidden p-6">
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setDismissed(true);
        }}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Dismiss"
        aria-label="Dismiss onboarding checklist"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-primary/30 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Get started in 5 steps</h2>
            <p className="text-xs text-muted-foreground">
              पहले इन 5 चीज़ों को सेट करें — फिर आप तेज़ी से काम कर पाएंगे।
            </p>
          </div>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold tabular">
          {completed} / {total}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-brand-light transition-all"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={i}>
            <Link
              to={s.to}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                s.done ? "bg-emerald-500/10" : "hover:bg-muted"
              }`}
            >
              {s.done ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <div className={`font-medium leading-tight ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {s.label}
                </div>
                <div className="text-[11px] text-muted-foreground">{s.hint}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
