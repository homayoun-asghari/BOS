"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/pricing/pricing-card";
import { useUser } from "@/hooks/useUser";

type BillingCycle = "monthly" | "annually";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function UpgradePage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  // User data could be used for checking current plan
  useUser();

  const features = {
    projects: "Projects",
    storage: "Storage",
    users: "Team members",
    support: "Priority support",
    api: "API Access",
    analytics: "Advanced analytics",
    sso: "Single Sign-On (SSO)",
    onboarding: "Dedicated onboarding",
  };

  const plans = [
    {
      title: "Free",
      price: billingCycle === "monthly" ? "$0" : "$0",
      description: "Perfect for individuals getting started",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      features: [
        { text: `${features.projects}: 1`, included: true },
        { text: `${features.storage}: 1GB`, included: true },
        { text: `${features.users}: 1`, included: true },
        { text: features.support, included: false },
        { text: features.api, included: false },
        { text: features.analytics, included: false },
        { text: features.sso, included: false },
        { text: features.onboarding, included: false },
      ],
    },
    {
      title: "Plus",
      price: billingCycle === "monthly" ? "$29" : "$290",
      description: "For growing teams and businesses",
      buttonText: "Upgrade to Plus",
      buttonVariant: "default" as const,
      isPopular: true,
      features: [
        { text: `${features.projects}: 10`, included: true },
        { text: `${features.storage}: 50GB`, included: true },
        { text: `${features.users}: 5`, included: true },
        { text: features.support, included: true },
        { text: features.api, included: true },
        { text: features.analytics, included: false },
        { text: features.sso, included: false },
        { text: features.onboarding, included: false },
      ],
    },
    {
      title: "Pro",
      price: billingCycle === "monthly" ? "$99" : "$990",
      description: "For organizations with advanced needs",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      features: [
        { text: `${features.projects}: Unlimited`, included: true },
        { text: `${features.storage}: 500GB`, included: true },
        { text: `${features.users}: 50`, included: true },
        { text: features.support, included: true },
        { text: features.api, included: true },
        { text: features.analytics, included: true },
        { text: features.sso, included: true },
        { text: features.onboarding, included: true },
      ],
    },
  ];

  const handleUpgrade = (plan: string) => {
    // Handle upgrade logic here
    console.log(`Upgrading to ${plan} plan`);
  };

  return (
    <div className="container py-12 md:py-16 lg:py-20">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
          Choose the perfect plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select the plan that fits your needs and start building with confidence.
        </p>

        <div className="mt-8 inline-flex items-center bg-muted p-1 rounded-full">
          <Button
            variant={billingCycle === "monthly" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "rounded-full px-4",
              billingCycle !== "monthly" ? "hover:bg-transparent" : ""
            )}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === "annually" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "rounded-full px-4",
              billingCycle !== "annually" ? "hover:bg-transparent" : ""
            )}
            onClick={() => setBillingCycle("annually")}
          >
            Annually <span className="ml-1 text-primary-foreground/80">(Save 20%)</span>
          </Button>
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
      >
        {plans.map((plan) => (
          <motion.div key={plan.title} variants={item}>
            <PricingCard
              title={plan.title}
              price={billingCycle === "annually" ? plan.price.replace(/\d+/, (n) => (parseInt(n) * 10).toString()) : plan.price}
              description={plan.description}
              features={plan.features}
              isPopular={plan.isPopular}
              buttonText={plan.buttonText}
              buttonVariant={plan.buttonVariant}
              onButtonClick={() => handleUpgrade(plan.title)}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-16 text-center">
        <div className="inline-flex items-center px-6 py-3 bg-secondary/50 rounded-full">
          <Zap className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm font-medium">
            Get 2 months free when you pay annually
          </span>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
