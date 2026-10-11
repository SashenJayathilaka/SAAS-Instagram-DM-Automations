import { getAllAutomation, getAutomationInfo } from "@/actions/automation";
import { onUserInfo } from "@/actions/user";
import { currentUser } from "@clerk/nextjs/server";
import { QueryClient } from "@tanstack/react-query";

export const PrefetchUserProfile = async (client: QueryClient) => {
  const user = await currentUser();
  return await client.prefetchQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: onUserInfo,
    staleTime: 0,
  });
};

export const PrefetchUserAutomation = async (client: QueryClient) => {
  const user = await currentUser();
  return await client.prefetchQuery({
    queryKey: ["user-automation", user?.id],
    queryFn: getAllAutomation,
    staleTime: 0,
  });
};

export const PrefetchUserAutomations = async (
  client: QueryClient,
  automationId: string
) => {
  const user = await currentUser();
  return await client.prefetchQuery({
    queryKey: ["automation-info", user?.id, automationId],
    queryFn: () => getAutomationInfo(automationId),
    staleTime: 0,
  });
};
