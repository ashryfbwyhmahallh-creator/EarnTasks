import { describe, it, expect } from "vitest";
import {
  dollarsToCents, centsToPoints, pointsToCents, formatCents, formatPointsAsDollars, applyPercentage,
} from "@/lib/money";
import { parsePayoutToCents, isReversalEvent, isConfirmedEvent } from "@/lib/services/cpalead";

describe("money", () => {
  it("converts dollars to cents exactly", () => {
    expect(dollarsToCents("1")).toBe(100);
    expect(dollarsToCents("1.00")).toBe(100);
    expect(dollarsToCents("0.10")).toBe(10);
    expect(dollarsToCents("0.07")).toBe(7);
    expect(dollarsToCents(2)).toBe(200);
    expect(dollarsToCents("$5.00")).toBe(500);
  });
  it("rejects invalid dollar inputs", () => {
    expect(() => dollarsToCents("1.234")).toThrow();
    expect(() => dollarsToCents("abc")).toThrow();
  });
  it("keeps points and cents 1:1", () => {
    expect(pointsToCents(100)).toBe(100);
    expect(centsToPoints(100)).toBe(100);
  });
  it("formats cents and points", () => {
    expect(formatCents(70)).toBe("$0.70");
    expect(formatCents(500)).toBe("$5.00");
    expect(formatPointsAsDollars(100)).toBe("$1.00");
  });
  it("applies percentage with integer math", () => {
    expect(applyPercentage(100, 70)).toBe(70);
    expect(applyPercentage(50, 20)).toBe(10);
    expect(applyPercentage(33, 70)).toBe(23);
  });
});

describe("cpalead parsing", () => {
  it("parses payout strings to cents", () => {
    expect(parsePayoutToCents("1.00")).toBe(100);
    expect(parsePayoutToCents("0.50")).toBe(50);
    expect(parsePayoutToCents("0.07")).toBe(7);
    expect(parsePayoutToCents("1.5")).toBe(150);
  });
  it("detects reversals and confirmations", () => {
    expect(isReversalEvent("reversal")).toBe(true);
    expect(isReversalEvent("chargeback")).toBe(true);
    expect(isReversalEvent(null)).toBe(false);
    expect(isConfirmedEvent(null)).toBe(true);
    expect(isConfirmedEvent("reversal")).toBe(false);
    expect(isConfirmedEvent("pending")).toBe(false);
  });
});