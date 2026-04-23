import type { AppliedExpense, ExpenseAccount } from "./db";

/** Compute applied expenses for one sale line based on configured masters. */
export function computeExpenses(
  presets: ExpenseAccount[],
  qty: number,
  gross: number,
  side: "buyer" | "grower",
): AppliedExpense[] {
  return presets
    .filter((e) => e.applyOn === side || e.applyOn === "both")
    .map((e) => {
      let amt = 0;
      if (e.operator === "fix") amt = e.value;
      else if (e.operator === "percent") amt = (gross * e.value) / 100;
      else if (e.operator === "perUnit") amt = qty * e.value;
      return {
        expenseId: e.id,
        name: e.name,
        amount: round2(amt),
        side: e.side,
        applyOn: e.applyOn,
        source: "preset" as const,
      };
    });
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function nextNumber(prefix: string, lastSeq: number) {
  const seq = (lastSeq + 1).toString().padStart(4, "0");
  return `${prefix}-${seq}`;
}
