import { describe, expect, it } from "vitest";

import { filterDigestItemsBySource, isAllowedOperatorEmail, shouldIncludeDigest } from "./policies";
import { makeDigestDate } from "./testing";

describe("digest visibility rules", () => {
  it("includes all digests when no filters are active", () => {
    expect(
      shouldIncludeDigest({
        digestDate: makeDigestDate()
      })
    ).toBe(true);
  });

  it("filters digests by explicit date", () => {
    expect(
      shouldIncludeDigest({
        digestDate: makeDigestDate(),
        queryDate: makeDigestDate(-1)
      })
    ).toBe(false);
  });

  it("keeps only unseen digests when requested", () => {
    expect(
      shouldIncludeDigest({
        digestDate: makeDigestDate(),
        unseenOnly: true,
        generatedAt: new Date("2026-03-12T08:00:00Z"),
        lastVisitAt: new Date("2026-03-11T08:00:00Z")
      })
    ).toBe(true);
    expect(
      shouldIncludeDigest({
        digestDate: makeDigestDate(),
        unseenOnly: true,
        generatedAt: new Date("2026-03-10T08:00:00Z"),
        lastVisitAt: new Date("2026-03-11T08:00:00Z")
      })
    ).toBe(false);
  });
});

describe("source filtering", () => {
  it("filters digest items by username", () => {
    const items = [
      { post: { source_username: "alice" } },
      { post: { source_username: "bob" } }
    ];
    expect(filterDigestItemsBySource(items, "alice")).toHaveLength(1);
    expect(filterDigestItemsBySource(items, "charlie")).toHaveLength(0);
  });
});

describe("operator allowlist", () => {
  it("allows only the configured operator email", () => {
    expect(isAllowedOperatorEmail("user@example.com", "user@example.com")).toBe(true);
    expect(isAllowedOperatorEmail("other@example.com", "user@example.com")).toBe(false);
    expect(isAllowedOperatorEmail(null, "user@example.com")).toBe(false);
  });
});
