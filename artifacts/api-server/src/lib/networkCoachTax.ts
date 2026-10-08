/** Match store billing: tax components round to whole rupees, once per order. */
export function networkCoachTax(subtotalInr: number, rates: { cgstPercent?: number; sgstPercent?: number }) {
  const cgstPercent = rates.cgstPercent ?? 0;
  const sgstPercent = rates.sgstPercent ?? 0;
  const cgstInr = Math.round(subtotalInr * cgstPercent / 100);
  const sgstInr = Math.round(subtotalInr * sgstPercent / 100);
  return { subtotalInr, cgstPercent, sgstPercent, cgstInr, sgstInr, amountInr: subtotalInr + cgstInr + sgstInr };
}
