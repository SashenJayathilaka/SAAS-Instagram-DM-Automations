"use client";

import { useState } from "react";
import { pricingPlans } from "./data/pricingPlans";

type Props = {};

function PricingPlan({}: Props) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <div className="flex overflow-hidden flex-col items-center px-16 py-28 max-w-full max-md:px-5 max-md:py-24">
      <div className="flex flex-col max-w-full text-center text-black w-[768px]">
        <div className="self-center text-base font-semibold whitespace-nowrap">
          Pricing
        </div>
        <div className="flex flex-col mt-4 w-full max-md:max-w-full">
          <div className="text-5xl font-bold leading-tight max-md:max-w-full max-md:text-4xl">
            Pricing Plans
          </div>
          <div className="mt-6 text-lg max-md:max-w-full">
            Choose the plan that suits your needs.
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-20 max-w-full w-[1024px] max-md:mt-10">
        <div className="flex items-start self-center text-base whitespace-nowrap">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`gap-2 self-stretch px-6 py-3 border border-black border-solid max-md:px-5 ${
              billingPeriod === "monthly" ? "text-white bg-black" : "text-black"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={`gap-2 self-stretch px-6 py-3 border border-black border-solid max-md:px-5 ${
              billingPeriod === "yearly" ? "text-white bg-black" : "text-black"
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="flex flex-wrap gap-8 mt-12 w-full max-md:mt-10 max-md:max-w-full">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className="flex flex-col flex-1 shrink p-8 border border-black border-solid basis-0 min-w-[240px] max-md:px-5 max-md:max-w-full"
            >
              <div className="flex flex-col w-full text-black max-md:max-w-full">
                <div className="text-xl font-bold leading-snug max-md:max-w-full">
                  {plan.name}
                </div>
                <div className="mt-1 text-base max-md:max-w-full">
                  {plan.description}
                </div>
              </div>
              <div className="mt-8 w-full border border-black border-solid min-h-[1px] max-md:max-w-full" />
              <div className="flex flex-col mt-8 w-full max-md:max-w-full">
                <div className="text-6xl font-bold leading-tight text-black max-md:max-w-full max-md:text-4xl">
                  {plan.price}
                </div>
                <div className="flex flex-col mt-8 w-full text-base text-white max-md:max-w-full">
                  <button className="gap-2 self-stretch px-6 py-3 w-full bg-black border border-black border-solid max-md:px-5 max-md:max-w-full">
                    Get Started
                  </button>
                </div>
              </div>
              <div className="mt-8 w-full border border-black border-solid min-h-[1px] max-md:max-w-full" />
              <div className="flex flex-col py-2 mt-8 w-full text-base text-black max-md:max-w-full">
                {plan.features.map((feature, index) => (
                  <div key={index} className={index > 0 ? "mt-4" : ""}>
                    <div className="flex gap-4 items-start w-full max-md:max-w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        loading="lazy"
                        src={feature.icon}
                        alt=""
                        className="object-contain shrink-0 w-6 aspect-square"
                      />
                      <div className="flex-1 shrink basis-0">
                        {feature.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PricingPlan;
