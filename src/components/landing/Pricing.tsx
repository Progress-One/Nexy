"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Pricing() {
  const locale = getLocale();

  const plans = [
    {
      name: t('landing_pricing_free', locale),
      price: t('landing_pricing_free_price', locale),
      description: t('landing_pricing_free_desc', locale),
      features: [
        t('landing_pricing_free_f1', locale),
        t('landing_pricing_free_f2', locale),
        t('landing_pricing_free_f3', locale),
      ],
      cta: t('landing_pricing_free_cta', locale),
      href: "/signup",
      popular: false,
    },
    {
      name: t('landing_pricing_premium', locale),
      priceMonth: t('landing_pricing_premium_price_month', locale),
      priceYear: t('landing_pricing_premium_price_year', locale),
      description: t('landing_pricing_premium_desc', locale),
      features: [
        t('landing_pricing_premium_f1', locale),
        t('landing_pricing_premium_f2', locale),
        t('landing_pricing_premium_f3', locale),
        t('landing_pricing_premium_f4', locale),
      ],
      cta: t('landing_pricing_premium_cta', locale),
      href: "/signup?plan=premium",
      popular: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
            {t('landing_pricing_title', locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? "border-[#E8747C] bg-[#E8747C]/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-[#E8747C] text-white rounded-full">
                    {t('landing_pricing_premium_badge', locale)}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg text-white mb-2">
                  {plan.name}
                </h3>
                {plan.popular ? (
                  <>
                    <div className="font-serif text-4xl font-bold text-white">
                      {plan.priceMonth}
                    </div>
                    <p className="text-sm text-white/50 mt-1">
                      {t('landing_pricing_or', locale)} {plan.priceYear}
                    </p>
                  </>
                ) : (
                  <div className="font-serif text-4xl font-bold text-white">
                    {plan.price}
                  </div>
                )}
                <p className="text-sm text-white/50 mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-[#E8747C] flex-shrink-0" />
                    <span className="text-white">{feature}</span>
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
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
