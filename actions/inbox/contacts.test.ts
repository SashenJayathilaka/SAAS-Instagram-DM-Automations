import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ user: { findUnique: vi.fn() }, conversation: { findMany: vi.fn() }, lead: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("@/actions/user", () => ({ onCurrentUser: async () => ({ id: "clerk-owner" }) }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: async () => "account-b" }));
vi.mock("@/lib/instagram-dm", () => ({ sendInstagramDirectResponse: vi.fn() }));
import { getInstagramContacts } from "./index";
beforeEach(() => {
  vi.resetAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "owner", integrations: [] });
  db.lead.findMany.mockResolvedValue([]);
  db.conversation.findMany.mockResolvedValue([]);
});
it("shows conversation details for the exact contact even when its old lead is outside the recent lead list", async () => {
  db.conversation.findMany.mockResolvedValue([
    { id: "c1", recipientIgId: "r1", recipientUsername: "first", email: "first@example.com", phone: "+14155550123", lastMessageAt: new Date() },
    { id: "c2", recipientIgId: "r2", recipientUsername: "second", lastMessageAt: new Date() },
  ]);
  const result = await getInstagramContacts();
  expect(result.data.find(c => c.recipientIgId === "r1")).toMatchObject({ email: "first@example.com", phone: "+14155550123" });
  expect(result.data.find(c => c.recipientIgId === "r2")?.email).toBeUndefined();
  expect(db.conversation.findMany.mock.calls[0][0].where).toEqual({ userId: "owner", integrationId: "account-b" });
  expect(db.lead.findMany.mock.calls[0][0].where.automation).toEqual({ userId: "owner", integrationId: "account-b" });
});
it("retains a known username when an inbox lookup did not return one", async () => {
  db.lead.findMany.mockResolvedValue([{ id: "l1", igUserId: "r1", igUsername: "real.name", email: "lead@example.com", createdAt: new Date() }]);
  db.conversation.findMany.mockResolvedValue([{ id: "c1", recipientIgId: "r1", recipientUsername: null, email: "new@example.com", lastMessageAt: new Date() }]);
  const result = await getInstagramContacts();
  expect(result.data).toHaveLength(1);
  expect(result.data[0]).toMatchObject({ recipientUsername: "real.name", email: "new@example.com" });
});

import { exportInstagramContacts } from './index';
it('rejects CSV exports server-side for Free accounts before reading contact data',async()=>{
 const result=await exportInstagramContacts();expect(result.status).toBe(403);expect(db.lead.findMany).not.toHaveBeenCalled();
});
it.each(['PRO','BUSINESS'])('exports all filtered contacts for %s in the active account',async plan=>{
 db.user.findUnique.mockResolvedValue({id:'owner',subscription:{plan},integrations:[]});
 db.conversation.findMany.mockResolvedValue([{id:'c',recipientIgId:'r',recipientUsername:'known',email:'known@example.com',phone:null,createdAt:new Date('2026-10-01'),lastInboundAt:new Date('2026-10-05')}]);
 const result=await exportInstagramContacts({email:'has'});expect(result.status).toBe(200);expect(result.csv).toContain('known@example.com');
 expect(db.conversation.findMany.mock.calls[0][0].where).toEqual({userId:'owner',integrationId:'account-b'});expect(db.conversation.findMany.mock.calls[0][0]).not.toHaveProperty('take');expect(db.lead.findMany.mock.calls[0][0]).not.toHaveProperty('take');
});
