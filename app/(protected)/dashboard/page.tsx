import { onboardUser } from "@/actions/user";
import { dashboardDestinationPath } from "@/lib/dashboard";
import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<{ next?: string | string[] }>;
};

async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const user = await onboardUser();

  if (user.status === 200 || user.status === 201) {
    const requestedDestination = Array.isArray(searchParams?.next)
      ? searchParams?.next[0]
      : searchParams?.next;
    return redirect(
      dashboardDestinationPath(user.data?.clerkId, requestedDestination)
    );
  }

  return redirect("/sign-in");
}

export default Page;
