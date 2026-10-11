import { FeatureCardProps } from "@/types/types";

type Props = {};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col flex-1 shrink basis-0 min-w-[240px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        loading="lazy"
        src={icon}
        alt=""
        className="object-contain w-12 aspect-square"
      />
      <div className="mt-6 text-3xl font-bold leading-10">{title}</div>
      <div className="mt-6 text-base leading-6">{description}</div>
    </div>
  );
}

export default FeatureCard;
