import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started and explore",
    features: [
      "50 scenarios",
      "Basic matching",
      "Invite 1 partner",
    ],
    cta: "Start Free",
    href: "/signup",
    popular: false,
  },
  {
    name: "Premium",
    price: "$6.99",
    period: "/month",
    yearlyPrice: "$39.99/year",
    description: "Full experience",
    features: [
      "Full library (500+ scenarios)",
      "AI personalization",
      "Date night suggestions",
      "New content weekly",
    ],
    cta: "Try Free",
    href: "/signup?plan=premium",
    popular: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Start free, upgrade when you&apos;re ready
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-serif text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
                {plan.yearlyPrice && (
                  <p className="text-sm text-muted-foreground mt-1">
                    or {plan.yearlyPrice}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
