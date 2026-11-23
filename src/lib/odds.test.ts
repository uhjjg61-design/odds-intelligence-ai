import { describe, expect, it } from "vitest";
import { brierScore, expectedValue, impliedProbability } from "./odds";

describe("odds math", () => {
  it("implied probability of 2.00 is 50%", () => expect(impliedProbability(2)).toBeCloseTo(0.5));
  it("EV of 55% at 2.00 is +10%", () => expect(expectedValue(0.55, 2)).toBeCloseTo(0.1));
  it("EV is negative when model prob below implied", () => expect(expectedValue(0.4, 2)).toBeLessThan(0));
  it("brier of perfect predictions is 0", () => expect(brierScore([{ p: 1, outcome: 1 }, { p: 0, outcome: 0 }])).toBe(0));
});