import { SignIn } from "@clerk/nextjs";
import React from "react";

type Props = {};

function Page({}: Props) {
  return <SignIn forceRedirectUrl="/dashboard" />;
}

export default Page;
