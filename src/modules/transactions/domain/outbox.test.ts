import { describe, expect, it } from "vitest";
import {
  type OutboxEntry,
  type OutboxInput,
  type OutboxResult,
  applyResult,
  fromOtherUsers,
  newOutboxEntry,
  outboxCounts,
  outboxInputSchema,
  refusalFrom,
  stopsSending,
  toOutboxInput,
  toSend,
} from "./outbox";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const input: OutboxInput = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: ME,
  fields: {
    kind: "expense",
    amount: "12.50",
    accountId: "44444444-4444-4444-8444-444444444444",
    categoryId: "55555555-5555-4555-8555-555555555555",
    date: "2026-11-13",
    note: "",
    tripId: "",
  },
  releaseGoals: false,
};

function entry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    ...input,
    savedAt: "2026-11-13T10:00:00.000Z",
    status: "waiting",
    ...overrides,
  };
}

describe("outboxInputSchema", () => {
  it("accepts a good input", () => {
    expect(outboxInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects a bad uuid", () => {
    expect(outboxInputSchema.safeParse({ ...input, id: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects a missing field", () => {
    const fields: Partial<OutboxInput["fields"]> = { ...input.fields };
    delete fields.note;
    expect(outboxInputSchema.safeParse({ ...input, fields }).success).toBe(
      false,
    );
  });

  it("rejects an extra key", () => {
    expect(outboxInputSchema.safeParse({ ...input, extra: 1 }).success).toBe(
      false,
    );
    expect(
      outboxInputSchema.safeParse({
        ...input,
        fields: { ...input.fields, extra: "x" },
      }).success,
    ).toBe(false);
  });

  it("rejects a releaseGoals that is not a boolean", () => {
    expect(
      outboxInputSchema.safeParse({ ...input, releaseGoals: "1" }).success,
    ).toBe(false);
  });
});

describe("newOutboxEntry and toOutboxInput", () => {
  it("sets the status and the ISO time", () => {
    const made = newOutboxEntry(input, new Date("2026-11-13T09:30:00Z"));
    expect(made.status).toBe("waiting");
    expect(made.savedAt).toBe("2026-11-13T09:30:00.000Z");
    expect(made.id).toBe(input.id);
  });

  it("drops everything but the input keys", () => {
    const back = toOutboxInput(
      entry({ status: "refused", error: "unknown", field: "amount" }),
    );
    expect(back).toEqual(input);
  });
});

describe("refusalFrom", () => {
  it("picks the first field in form order", () => {
    expect(
      refusalFrom({
        status: "error",
        fieldErrors: { date: "invalid_date", amount: "amount_required" },
      }),
    ).toEqual({ status: "refused", error: "amount_required", field: "amount" });
  });

  it("falls back to the general error, then to unknown", () => {
    expect(refusalFrom({ status: "error", error: "not_found" })).toEqual({
      status: "refused",
      error: "not_found",
    });
    expect(refusalFrom({ status: "error", fieldErrors: {} })).toEqual({
      status: "refused",
      error: "unknown",
    });
  });
});

describe("applyResult", () => {
  const waiting = entry();

  it("removes the entry when it is done or belongs to someone else", () => {
    for (const status of ["saved", "already_saved", "other_user"] as const) {
      expect(applyResult(waiting, { status })).toBeNull();
    }
  });

  it("marks a refusal with its reason and field", () => {
    expect(
      applyResult(waiting, {
        status: "refused",
        error: "amount_invalid",
        field: "amount",
      }),
    ).toEqual({
      ...waiting,
      status: "refused",
      error: "amount_invalid",
      field: "amount",
    });
  });

  it("leaves the field out when the refusal has none", () => {
    const again = applyResult(
      entry({ status: "refused", error: "amount_invalid", field: "amount" }),
      { status: "refused", error: "unknown" },
    );
    expect(again).toEqual({ ...waiting, status: "refused", error: "unknown" });
    expect(again).not.toHaveProperty("field");
  });

  it("keeps the same entry when sending should be tried later", () => {
    expect(applyResult(waiting, { status: "signed_out" })).toBe(waiting);
    expect(applyResult(waiting, { status: "failed" })).toBe(waiting);
  });
});

describe("toSend", () => {
  it("keeps this user's waiting entries, oldest first, ties by id", () => {
    const late = entry({ id: "b", savedAt: "2026-11-13T12:00:00.000Z" });
    const tieB = entry({ id: "b", savedAt: "2026-11-13T09:00:00.000Z" });
    const tieA = entry({ id: "a", savedAt: "2026-11-13T09:00:00.000Z" });
    const refused = entry({ id: "c", status: "refused" });
    const theirs = entry({ id: "d", userId: OTHER });
    const sent = toSend([late, tieB, refused, theirs, tieA], ME);
    expect(sent).toEqual([tieA, tieB, late]);
  });
});

describe("fromOtherUsers and outboxCounts", () => {
  const list = [
    entry({ id: "a" }),
    entry({ id: "b", status: "refused" }),
    entry({ id: "c", userId: OTHER }),
  ];

  it("finds the entries of other users", () => {
    expect(fromOtherUsers(list, ME).map((e) => e.id)).toEqual(["c"]);
  });

  it("counts only this user's entries", () => {
    expect(outboxCounts(list, ME)).toEqual({ waiting: 1, refused: 1 });
    expect(outboxCounts(list, OTHER)).toEqual({ waiting: 1, refused: 0 });
  });
});

describe("stopsSending", () => {
  it("stops only when signed out or failed", () => {
    const results: OutboxResult[] = [
      { status: "saved" },
      { status: "already_saved" },
      { status: "refused", error: "unknown" },
      { status: "signed_out" },
      { status: "other_user" },
      { status: "failed" },
    ];
    expect(results.map(stopsSending)).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
    ]);
  });
});
