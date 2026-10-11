import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { $transaction: m.transaction, $executeRaw: m.execute } }));
import { reservePolicyScan, finishPolicyScan } from "./automation-policy-quota";
let plan = "FREE"; let used = 0; let status = "ACTIVE";
beforeEach(() => {
  vi.clearAllMocks(); plan = "FREE"; used = 0; status = "ACTIVE";
  let previous: Promise<unknown> = Promise.resolve();
  // Emulate the transaction serialization supplied by the FOR UPDATE user lock.
  m.transaction.mockImplementation(fn => {
    const next = previous.then(() => fn({ $queryRaw: m.query, $executeRaw: m.execute }));
    previous = next.catch(() => undefined); return next;
  });
  m.query.mockImplementation((parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes('FROM "User"')) { expect(sql).toContain("FOR UPDATE OF u"); return [{ plan, status }]; }
    expect(sql).toContain("'PENDING','COMPLETE'"); return [{ used }];
  });
  m.execute.mockImplementation((parts: TemplateStringsArray) => { if (parts.join("").includes("INSERT INTO")) used++; return 1; });
});
describe("durable safety-scan reservations", () => {
  it("allows only three of simultaneous Free requests under the user row lock", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => reservePolicyScan("owner")));
    expect(results.filter(r => r.ok)).toHaveLength(3); expect(used).toBe(3);
  });
  it.each(["PRO", "BUSINESS"])("does not impose a lifetime scan cap on %s", async paid => {
    plan = paid; used = 999;
    expect(await reservePolicyScan("owner")).toMatchObject({ ok: true, used: 1000, limit: null });
  });
  it("uses the persisted subscription and refuses suspended users", async () => {
    status = "SUSPENDED"; await expect(reservePolicyScan("owner")).rejects.toThrow(); expect(m.execute).not.toHaveBeenCalled();
  });
  it("expires crashed reservations and excludes failed attempts from allowance", async () => {
    await reservePolicyScan("owner");
    expect(m.execute.mock.calls[0][0].join("")).toContain("INTERVAL '5 minutes'");
    await finishPolicyScan("scan", false);
    expect(m.execute.mock.calls.at(-1)?.slice(1)).toEqual(["FAILED", "scan"]);
  });
  it("cannot complete a reclaimed or previously completed reservation", async () => {
    m.execute.mockResolvedValue(0); await expect(finishPolicyScan("expired", true)).rejects.toThrow("expired");
  });
});
