import { strict as assert } from "node:assert";
import { test } from "node:test";

/**
 * Unit test for the ranking-change formula and distribution bucketing.
 * Mirrors the logic in src/lib/queries/metrics.ts rankingComparison().
 *
 * ranking_change = previous_position - current_position
 *   positive => improvement (moved up the SERP)
 *   negative => decline
 * Position 101 => "Not in top 100".
 */

interface KwSnap { currentPos: number; previousPos: number | null; }
interface Change { change: number | null; improved: boolean; declined: boolean; unchanged: boolean; }

function computeChange(k: KwSnap): Change {
  const change = k.previousPos != null ? k.previousPos - k.currentPos : null;
  return {
    change,
    improved: (change ?? 0) > 0,
    declined: (change ?? 0) < 0,
    unchanged: change === 0,
  };
}

function bucket(pos: number): string {
  if (pos <= 3) return "top3";
  if (pos <= 10) return "top10";
  if (pos <= 20) return "top20";
  if (pos <= 50) return "top50";
  if (pos <= 100) return "top100";
  return "beyond";
}

test("ranking change is positive when position improves (lower number)", () => {
  assert.equal(computeChange({ currentPos: 5, previousPos: 10 }).change, 5);
  assert.equal(computeChange({ currentPos: 5, previousPos: 10 }).improved, true);
});

test("ranking change is negative when position declines", () => {
  assert.equal(computeChange({ currentPos: 15, previousPos: 8 }).change, -7);
  assert.equal(computeChange({ currentPos: 15, previousPos: 8 }).declined, true);
});

test("no change when position is identical", () => {
  assert.equal(computeChange({ currentPos: 10, previousPos: 10 }).change, 0);
  assert.equal(computeChange({ currentPos: 10, previousPos: 10 }).unchanged, true);
});

test("change is null when there is no previous position (new keyword)", () => {
  assert.equal(computeChange({ currentPos: 7, previousPos: null }).change, null);
});

test("buckets place 101 in beyond (not in top 100), never in top100", () => {
  assert.equal(bucket(1), "top3");
  assert.equal(bucket(3), "top3");
  assert.equal(bucket(4), "top10");
  assert.equal(bucket(10), "top10");
  assert.equal(bucket(11), "top20");
  assert.equal(bucket(50), "top50");
  assert.equal(bucket(100), "top100");
  assert.equal(bucket(101), "beyond");
  assert.equal(bucket(999), "beyond");
});

test("a keyword moving from 101 to 5 is a strong improvement (change = 96)", () => {
  assert.equal(computeChange({ currentPos: 5, previousPos: 101 }).change, 96);
  assert.equal(computeChange({ currentPos: 5, previousPos: 101 }).improved, true);
});
