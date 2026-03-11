"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const textContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
} as const;

const textItemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
} as const;

const imageVariants = {
  hidden: { opacity: 0, scale: 1.05 },
  visible: { opacity: 1, scale: 1, transition: { duration: 1, delay: 0.2, ease: "easeOut" as const } },
} as const;

const badgeContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
} as const;

const badgeItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
} as const;

export function Hero() {
  const locale = getLocale();

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Hero background image — fills entire section */}
      <motion.div
        className="absolute inset-0 z-0"
        initial="hidden"
        animate="visible"
        variants={imageVariants}
      >
        <Image
          src="/images/landing/hero.webp"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0A0F]/90 via-[#0C0A0F]/70 to-[#0C0A0F]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A0F] via-transparent to-[#0C0A0F]/30" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Text Content */}
          <motion.div
            className="text-left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={textContainerVariants}
          >
            <motion.h1
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6"
              variants={textItemVariants}
            >
              {t("landing_hero_title", locale)}
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl text-white/70 mb-8 max-w-xl"
              variants={textItemVariants}
            >
              {t("landing_hero_subtitle", locale)}
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 mb-10"
              variants={textItemVariants}
            >
              <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-[#E8747C] to-[#6B4E71] hover:brightness-110 border-0 text-white shadow-lg shadow-[#E8747C]/20 transition-all duration-200" asChild>
                <Link href="/signup">{t("landing_hero_cta", locale)}</Link>
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              className="flex flex-wrap gap-6 text-sm text-white/50"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={badgeContainerVariants}
            >
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <Lock className="h-4 w-4 text-[#E8747C]" />
                <span>{t("landing_hero_badge_private", locale)}</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <CreditCard className="h-4 w-4 text-[#E8747C]" />
                <span>{t("landing_hero_badge_free", locale)}</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <Flame className="h-4 w-4 text-[#E8747C]" />
                <span>{t("landing_hero_badge_couples", locale)}</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
