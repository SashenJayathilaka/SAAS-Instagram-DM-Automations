import {
  getAllAutomation,
  getAutomationInfo,
} from "@/actions/automation";
import { getProfilePostsPaginated } from "@/actions/automation/media";
import { onUserInfo } from "@/actions/user";
import { getCurrentWebhookHealth } from "@/actions/integration";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export const useQueryAutomation = () => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["user-automation", userId],
    queryFn: getAllAutomation,
    enabled: Boolean(userId),
  });
};

export const useQueryAutomations = (id: string, enabled = true) => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["automation-info", userId, id],
    queryFn: () => getAutomationInfo(id),
    enabled: enabled && Boolean(userId) && Boolean(id),
  });
};

export const useQueryUser = () => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const result = await onUserInfo();
      // Failed profile reads are not proof that Instagram was disconnected.
      // Throw so retries run and a previously loaded profile is preserved.
      if (result.status !== 200 || !result.data) throw new Error("Unable to load your account. Please try again.");
      return result;
    },
    staleTime: 30_000,
    enabled: Boolean(userId),
  });
};

export const useQueryAutomationPosts = (enabled = true) => {
  const { userId } = useAuth();
  const fetchPosts = async () => await getProfilePostsPaginated();

  return useQuery({
    queryKey: ["instagram-media", userId, "paginated-all"],
    queryFn: fetchPosts,
    enabled: enabled && Boolean(userId),
  });
};

export const useQueryWebhookHealth = (enabled = true) => {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["webhook-health", userId],
    queryFn: getCurrentWebhookHealth,
    enabled: enabled && Boolean(userId),
  });
};
