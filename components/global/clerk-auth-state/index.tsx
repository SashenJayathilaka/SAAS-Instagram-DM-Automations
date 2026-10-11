import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import { ClerkLoading, SignedOut, SignInButton } from "@clerk/nextjs";
import Loader from "../loader";
import { User } from "lucide-react";
import { SignedIn, UserButton } from "@clerk/clerk-react";

type Props = {};

function ClerkAuthState({}: Props) {
  return (
    <>
      <ClerkLoading>
        <Loader state>
          <></>
        </Loader>
      </ClerkLoading>
      <SignedOut>
        <SignInButton>
          <Button className="rounded-xl bg-[#252525] text-white hover:bg-[#252525]">
            <User /><UiText>{" Login "}</UiText></Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton>
          <UserButton.UserProfileLink
            label="Dashboard"
            url={`/dashboard`}
            labelIcon={<User size={16} />}
          />
        </UserButton>
      </SignedIn>
    </>
  );
}

export default ClerkAuthState;
