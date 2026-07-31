import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  slugify,
  domainFromUrl,
  formatCompact,
  formatPosition,
  pctChange,
  absChange,
  formatMinutes,
} from "../utils";

test("slugify produces URL-safe slugs", () => {
  assert.equal(slugify("Acme Roofing Co"), "acme-roofing-co");
  assert.equal(slugify("  Hello, World!  "), "hello-world");
  assert.equal(slugify("Lumen Fitness"), "lumen-fitness");
  assert.equal(slugify("a/b\\c"), "abc");
});

test("slugify handles edge cases", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("---"), "");
  assert.equal(slugify("München"), "mnchen");
});

test("domainFromUrl extracts hostname", () => {
  assert.equal(domainFromUrl("https://www.example.com/path"), "example.com");
  assert.equal(domainFromUrl("http://blog.example.co.uk/x"), "blog.example.co.uk");
  assert.equal(domainFromUrl("example.com"), "example.com");
  assert.equal(domainFromUrl("not a url"), "not a url");
});

test("formatCompact formats large numbers", () => {
  assert.equal(formatCompact(999), "999");
  assert.equal(formatCompact(1000), "1.0K");
  assert.equal(formatCompact(15000), "15.0K");
  assert.equal(formatCompact(2_300_000), "2.3M");
  assert.equal(formatCompact(null), "—");
});

test("formatPosition treats 101 as not in top 100", () => {
  assert.equal(formatPosition(1), "#1");
  assert.equal(formatPosition(100), "#100");
  assert.equal(formatPosition(101), "Not in top 100");
  assert.equal(formatPosition(150), "Not in top 100");
  assert.equal(formatPosition(null), "—");
});

test("pctChange handles zero baseline safely", () => {
  assert.equal(pctChange(100, 150), 50);
  assert.equal(pctChange(100, 50), -50);
  assert.equal(pctChange(0, 0), 0);
  assert.equal(pctChange(0, 100), null); // undefined direction
  assert.equal(pctChange(null, 100), null);
});

test("absChange computes differences", () => {
  assert.equal(absChange(100, 150), 50);
  assert.equal(absChange(150, 100), -50);
  assert.equal(absChange(null, 100), null);
});

test("formatMinutes renders human-readable time", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(90), "1h 30m");
  assert.equal(formatMinutes(125), "2h 5m");
  assert.equal(formatMinutes(null), "—");
});
