import {
  AutomationDuoToneBlue,
  ContactsDuoToneBlue,
  HomeDuoToneBlue,
  RocketDuoToneBlue,
  SettingsDuoToneWhite,
} from "@/icons";

export const PAGE_BREAD_CRUMBS: string[] = [
  "contacts",
  "inbox",
  "automation",
  "account",
  "integrations",
  "billing",
  "referrals",
  "settings",
];

type Props = {
  [page in string]: React.ReactNode;
};

export const PAGE_ICONS: Props = {
  AUTOMATION: <AutomationDuoToneBlue />,
  CONTACTS: <ContactsDuoToneBlue />,
  INTEGRATIONS: <RocketDuoToneBlue />,
  ACCOUNT: <RocketDuoToneBlue />,
  BILLING: <RocketDuoToneBlue />,
  REFERRALS: <RocketDuoToneBlue />,
  SETTINGS: <SettingsDuoToneWhite />,
  HOME: <HomeDuoToneBlue />,
};

export const PLANS = [
  {
    name: "Free Plan",
    description: "Perfect for getting started",
    price: "$0",
    features: [
      "Boost engagement with target responses",
      "Automate comment replies to enhance audience interaction",
      "Turn followers into customers with targeted messaging",
    ],
    cta: "Get Started",
  },
  {
    name: "Creator Plan",
    description: "For creators running active comment automation funnels",
    price: "$29",
    features: [
      "All features from Free Plan",
      "AI-powered response generation",
      "Advanced analytics and insights",
      "Priority customer support",
      "Unlimited automations and replies",
    ],
    cta: "Upgrade Now",
  },
  {
    name: "Agency Plan",
    description: "For teams managing multiple creator accounts",
    price: "$79",
    features: [
      "Everything in Creator",
      "Up to 10 Instagram accounts",
      "Team access",
      "Dedicated onboarding",
    ],
    cta: "Upgrade Now",
  },
];
