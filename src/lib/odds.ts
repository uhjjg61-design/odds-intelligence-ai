/** Pure probability helpers. Decimal odds only. */
export const impliedProbability = (decimalOdds: number) => (decimalOdds > 1 ? 1 / decimalOdds : 1);

/** Expected value per 1 unit staked, given a model probability. Estimate only. */
export const expectedValue = (modelProb: number, decimalOdds: number) => modelProb * decimalOdds - 1;

export const brierScore = (preds: { p: number; outcome: 0 | 1 }[]) =>
  preds.length ? preds.reduce((s, x) => s + (x.p - x.outcome) ** 2, 0) / preds.length : NaN;

export const logLoss = (preds: { p: number; outcome: 0 | 1 }[]) => {
  if (!preds.length) return NaN;
  const eps = 1e-15;
  return -preds.reduce((s, { p, outcome }) => {
    const q = Math.min(1 - eps, Math.max(eps, p));
    return s + (outcome ? Math.log(q) : Math.log(1 - q));
  }, 0) / preds.length;
};

/** Minimum sample size below which signals are flagged as statistically weak. */
export const MIN_RELIABLE_SAMPLE = 200;

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;