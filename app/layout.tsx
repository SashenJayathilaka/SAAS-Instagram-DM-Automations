import ReactQueryProvider from "@/providers/react-query-provider";
import ReduxProvider from "@/providers/redux-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import ConsentAwareAnalytics from "@/components/global/consent-aware-analytics";
import { I18nProvider } from "@/providers/i18n-provider";
import { getServerLocale } from "@/lib/i18n/server";
import { LOCALE_DETAILS, localeAlternates } from "@/lib/i18n/config";
import { SITE_METADATA } from "@/lib/i18n/metadata";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
// Public ownership token for the connected AP3K Search Console property.
// Retain an existing environment-provided owner token as well.
const googleVerification = [
  process.env.GOOGLE_SITE_VERIFICATION,
  "gdWdZfN6mkEHA3ltp66WweIosnwXEwCg-ZkH3qSkqCQ",
].filter((value): value is string => Boolean(value));

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  const site = SITE_METADATA[locale];

  return {
    metadataBase: new URL("https://ap3k.com"),
    title: { default: site.title, template: "%s" },
    description: site.description,
    applicationName: "AP3K",
    alternates: {
      canonical: locale === "en" ? "/" : `/${locale}`,
      languages: localeAlternates(),
    },
    verification: { google: googleVerification },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: site.title,
      description: site.description,
      url: locale === "en" ? "https://ap3k.com" : `https://ap3k.com/${locale}`,
      siteName: "AP3K",
      type: "website",
      locale: LOCALE_DETAILS[locale].openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: site.title,
      description: site.description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = getServerLocale();
  const localeDetails = LOCALE_DETAILS[locale];

  return (
    <html
      lang={localeDetails.htmlLang}
      dir={localeDetails.direction}
      suppressHydrationWarning
    >
      <body className={jakarta.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <I18nProvider locale={locale}>
            <ReduxProvider>
              <ReactQueryProvider>{children}</ReactQueryProvider>
            </ReduxProvider>
            <Toaster />
            <ConsentAwareAnalytics />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
