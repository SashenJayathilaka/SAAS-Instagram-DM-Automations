import AuthLocaleShell from "@/components/i18n/auth-locale-shell";
import React from "react";
import type { Metadata } from "next";

// Auth forms are utility pages, not search landing pages. Let crawlers read
// this directive so previously indexed sign-up URLs can leave the index.
export const metadata: Metadata = {
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  alternates: { canonical: null, languages: {} },
};

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
};

function Layout({ children }: Props) {
  return <AuthLocaleShell>{children}</AuthLocaleShell>;
}

export default Layout;
