import AutomationSetupPage, { type AutomationSetupPageProps } from "@/components/automations/automation-setup-page";

type Props = {
  params: Promise<AutomationSetupPageProps["params"]>;
  searchParams: Promise<NonNullable<AutomationSetupPageProps["searchParams"]>>;
};

export default async function WizardPage({ params, searchParams }: Props) {
  const [route, search] = await Promise.all([params, searchParams]);
  return <AutomationSetupPage params={route} searchParams={search} />;
}
