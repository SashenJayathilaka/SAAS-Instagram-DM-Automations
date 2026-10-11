"use server";
import { onCurrentUser } from "@/actions/user";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { fetchActiveInstagramStories, type StoryFetchResult } from "@/lib/instagram-stories";

export async function getActiveInstagramStories(expectedIntegrationId:string): Promise<StoryFetchResult> {
  try {
    const user = await onCurrentUser();
    const integrationId = await currentInstagramAccountId(user.id);
    if (!integrationId || integrationId !== expectedIntegrationId) return {ok:false,stories:[],complete:false,error:"Your Instagram account changed. Reload this page before selecting a story.",reconnectRequired:false};
    const integration = await client.integrations.findFirst({where:{id:integrationId,User:{clerkId:user.id},status:"CONNECTED",reconnectRequired:false,planLocked:false},select:{token:true,instagramId:true,igAccountSource:true,oauthResolutionDiagnostics:true}});
    if (!integration) return {ok:false,stories:[],complete:false,error:"Connect or reconnect Instagram to load stories.",reconnectRequired:true};
    return await fetchActiveInstagramStories(integration);
  } catch {
    return {ok:false,stories:[],complete:false,error:"Could not load stories. Refresh to try again.",reconnectRequired:false};
  }
}
