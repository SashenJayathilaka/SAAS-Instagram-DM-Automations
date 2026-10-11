import { getAiWorkspace } from "@/actions/ai-workspace";
import Ap3kAiConsole from "@/components/ai/ap3k-ai-console";

export default async function Ap3kAiPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const data = await getAiWorkspace();
  return <Ap3kAiConsole integrationId={data.integrationId} slug={params.slug} initial={data.profile} plan={data.plan} initialPlaygroundMessages={data.playgroundMessages} lastConfiguredAt={data.lastConfiguredAt} />;
}
