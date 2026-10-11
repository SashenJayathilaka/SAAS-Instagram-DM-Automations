import { describe, expect, it } from "vitest";
import { ensureCommentUsername, normalizeCopyList, readCommentReplies, selectMessageVariation } from "./automation-copy";
import { normalizeCampaignPayload } from "./campaign-save";

describe("automation copy compatibility and delivery", () => {
  it("reads legacy replies but respects an explicitly cleared list", () => {
    expect(readCommentReplies({ commentReply:"Old",commentReply2:"Other" })).toEqual(["Old","Other"]);
    expect(readCommentReplies({ commentReplies:[],commentReply:"Old" })).toEqual([]);
    expect(normalizeCopyList([" A ","A",null,4,"B"])).toEqual(["A","B"]);
  });
  it("preserves more than three replies and DM variations through normalization", () => {
    const saved = normalizeCampaignPayload({ post:{postid:"post"}, listener:{prompt:"Hello",commentReplies:["1","2","3","4"],messageVariations:["Hey","Hi"],publicReplyLimit:200} });
    expect(saved.listener.commentReplies).toEqual(["1","2","3","4"]);
    expect(saved.listener.commentReply3).toBe("3");
    expect(saved.listener.messageVariations).toEqual(["Hey","Hi"]);
    expect(saved.listener.publicReplyLimit).toBe(200);
  });
  it("clears public replies when disabled and disallows unsupported limits", () => {
    const saved = normalizeCampaignPayload({ publicReplyEnabled:false,listener:{commentReplies:["stale"],publicReplyLimit:-2} });
    expect(saved.listener.commentReplies).toEqual([]);
    expect(saved.listener.commentReply).toBeUndefined();
    expect(saved.listener.publicReplyLimit).toBe(0);
  });
  it("keeps the same variation per journey and uses every configured choice", () => {
    const choices = new Set(Array.from({length:100},(_,i)=>selectMessageVariation("Original",["Second","Third"],`comment-${i}`)));
    expect(choices).toEqual(new Set(["Original","Second","Third"]));
    expect(selectMessageVariation("Original",["Second","Third"],"same")).toBe(selectMessageVariation("Original",["Second","Third"],"same"));
    expect(selectMessageVariation("Original",null,"same")).toBe("Original");
  });
  it("includes exactly one real username and handles missing names safely", () => {
    expect(ensureCommentUsername("Thanks Username 😊","@creator.one")).toBe("Thanks @creator.one 😊");
    expect(ensureCommentUsername("Thanks @creator.","creator")).toBe("Thanks @creator.");
    expect(ensureCommentUsername("Thanks {{USERNAME}}!","creator")).toBe("Thanks @creator!");
    expect(ensureCommentUsername("Thanks!","creator")).toBe("@creator Thanks!");
    expect(ensureCommentUsername("Thanks @{{username}}!","creator")).toBe("Thanks @creator!");
    expect(ensureCommentUsername("Hi {{username}}!",null)).not.toContain("username");
    expect(ensureCommentUsername("x".repeat(250),"creator")).toHaveLength(220);
    expect(ensureCommentUsername("Thanks @creator.other!","creator").startsWith("@creator ")).toBe(true);
  });
});
