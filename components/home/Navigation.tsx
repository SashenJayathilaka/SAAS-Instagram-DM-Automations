import * as React from "react";
import { navigationLinks, dropdownLinks } from "./data/navigationLinks";
import { NavLinkProps } from "@/types/types";

const NavLink: React.FC<NavLinkProps> = ({ text }) => (
  <div className="gap-1 self-stretch my-auto">{text}</div>
);

type Props = {};

function Navigation({}: Props) {
  return (
    <div className="flex flex-col justify-center px-16 w-full h-[72px] max-md:px-5 max-md:max-w-full">
      <div className="flex flex-wrap gap-8 justify-bet items-center w-full max-md:max-w-full">
        <div className="flex flex-1 shrink items-start self-stretch my-auto basis-0 min-w-[240px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/TEMP/d4ecbf8ccc7d2fe5f465be9f68c46f160e11c9bdd2fcf53c5cbbf2523c6d1a3b?placeholderIfAbsent=true&apiKey=43878df868e64cbca1f97201b9573941"
            alt="Company Logo"
            className="object-contain aspect-[2.33] w-[84px]"
          />
        </div>
        <div className="flex flex-wrap gap-8 items-center self-stretch my-auto text-sm text-blue-200 min-w-[240px] max-md:max-w-full">
          {navigationLinks.map((link, index) => (
            <NavLink key={index} text={link} />
          ))}
        </div>
        <div className="flex shrink gap-4 items-center self-stretch my-auto text-base text-white whitespace-nowrap basis-0 min-w-[240px]">
          <button className="gap-2 self-stretch px-5 py-2 my-auto bg-black border border-black border-solid">
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navigation;
