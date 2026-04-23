export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(isFinite(n) ? n : 0);

export const fmtNum = (n: number, d = 2) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(isFinite(n) ? n : 0);

export const fmtQty = (n: number) => fmtNum(n, 2);

export const todayISO = () => new Date().toISOString().slice(0, 10);
