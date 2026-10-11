import { describe,it,expect } from "vitest";
import { backtrackMediaIds,backtrackMatches,eligibleCommentTimestamp,encodeBacktrackCursor,decodeBacktrackCursor,deliveryCandidates, BACKTRACK_WINDOW_MS } from "./automation-backtrack";
const now=Date.now();
const a={source:"COMMENT",matchingMode:"CONTAINS" as const,triggerMode:"SPECIFIC_KEYWORD",keywords:[{word:"LINK"}],posts:[{postid:"123"},{postid:"ANY"}],listener:{flowTriggers:null}};
describe("backtracking eligibility",()=>{
 it("rejects missing, malformed, future and expired timestamps",()=>{for(const stamp of [null,123,"not-a-date",new Date(now+1).toISOString(),new Date(now-BACKTRACK_WINDOW_MS).toISOString()])expect(eligibleCommentTimestamp(stamp,now)).toBe(false);expect(eligibleCommentTimestamp(new Date(now-1000).toISOString(),now)).toBe(true);});
 it("only selects concrete media and normal keyword rules",()=>{expect(backtrackMediaIds(a)).toEqual(["123"]);expect(backtrackMatches(a,"send link please","123")).toBe(true);expect(backtrackMatches({...a,matchingMode:"EXACT"},"send link please","123")).toBe(false);expect(backtrackMatches({...a,triggerMode:"ANY_COMMENT"},"hello","123")).toBe(true);});
 it("keeps flow keyword and media scopes together",()=>{const flow={...a,listener:{flowTriggers:[{id:"t",source:"COMMENT",keyword:"guide",anyMessage:false,post:{postid:"456",media:"",mediaType:"IMAGE"},postScope:"specific"}]}};expect(backtrackMediaIds(flow)).toEqual(["456"]);expect(backtrackMatches(flow,"guide","456")).toBe(true);expect(backtrackMatches(flow,"guide","123")).toBe(false);expect(backtrackMatches(flow,"link","456")).toBe(false);});
 it("filters resumed automation before selecting first keyword match",()=>{expect(deliveryCandidates([{id:"first"},{id:"target"}],"target")).toEqual([{id:"target"}]);expect(deliveryCandidates([{id:"first"}],"deleted")).toEqual([]);});
});
describe("signed pagination",()=>{
 const state={automationId:"a",integrationId:"i",mediaIds:["123"],index:0,after:"cursor",expires:Date.now()+60000};
 it("round trips a scoped cursor without trusting paging URLs",()=>{expect(decodeBacktrackCursor(encodeBacktrackCursor(state,"secret"),"secret","a","i")).toEqual(state);});
 it("rejects tampering, other accounts, other campaigns and expired sessions",()=>{const token=encodeBacktrackCursor(state,"secret");for(const args of [[token,"wrong","a","i"],[token,"secret","b","i"],[token,"secret","a","j"],[token+"x","secret","a","i"],[encodeBacktrackCursor({...state,expires:1},"secret"),"secret","a","i"]])expect(()=>decodeBacktrackCursor(...args as [string,string,string,string])).toThrow();});
});
