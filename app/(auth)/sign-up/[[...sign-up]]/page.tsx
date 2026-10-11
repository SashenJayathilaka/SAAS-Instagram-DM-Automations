import { SignUp } from "@clerk/nextjs";
import React from "react";

type Props = {};

function Page({}: Props) {
  return <SignUp forceRedirectUrl="/onboarding" />;
}

export default Page;
