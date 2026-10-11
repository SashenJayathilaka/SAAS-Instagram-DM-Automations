import { InstagramDuoToneBlue } from "@/icons";

type Props = {
  title: string;
  icon: React.ReactNode;
  description: string;
  strategy: "INSTAGRAM" | "CRM";
};

export const INTEGRATION_CARDS: Props[] = [
  {
    title: "Connect your Instagram",
    description:
      "Connect your Instagram Business or Creator account to automate comment-triggered public replies.",
    icon: <InstagramDuoToneBlue />,
    strategy: "INSTAGRAM",
  },
];
