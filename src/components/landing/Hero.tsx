"use client";

import Link from "next/link";
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

const illustrationVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, delay: 0.3, ease: "easeOut" as const } },
} as const;

const badgeContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
} as const;

const badgeItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
} as const;

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 500 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-md mx-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8747C" />
          <stop offset="100%" stopColor="#6B4E71" />
        </linearGradient>
        <linearGradient id="hero-grad-v" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#E8747C" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6B4E71" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#E8747C" stopOpacity="0.12" />
          <stop offset="70%" stopColor="#6B4E71" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#6B4E71" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <circle cx="250" cy="270" r="220" fill="url(#hero-glow)" />

      {/* Two intertwined body curves — sensual abstract forms */}
      {/* Left form — flowing feminine curve */}
      <path
        d="M160 480 C160 420, 140 350, 155 280 C165 235, 185 200, 200 170 C210 150, 220 140, 230 145 C240 150, 245 170, 240 195"
        fill="none"
        stroke="#E8747C"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M160 480 C170 440, 175 390, 180 340 C185 290, 195 250, 215 215"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Right form — flowing masculine curve */}
      <path
        d="M340 480 C340 420, 360 350, 345 280 C335 235, 315 200, 300 170 C290 150, 280 140, 270 145 C260 150, 255 170, 260 195"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M340 480 C330 440, 325 390, 320 340 C315 290, 305 250, 285 215"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Hands reaching toward each other */}
      <path
        d="M230 195 C235 185, 240 178, 248 175"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M270 195 C265 185, 260 178, 252 175"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Fingers almost touching — the tension point */}
      <circle cx="248" cy="174" r="2" fill="#E8747C" opacity="0.9" />
      <circle cx="252" cy="174" r="2" fill="#6B4E71" opacity="0.9" />

      {/* Electric connection spark between fingertips */}
      <path
        d="M248 174 C249 172, 251 172, 252 174"
        fill="none"
        stroke="url(#hero-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="250" cy="173" r="6" fill="url(#hero-grad)" opacity="0.15" filter="url(#hero-blur)" />
      <circle cx="250" cy="173" r="12" fill="url(#hero-grad)" opacity="0.08" filter="url(#hero-blur)" />

      {/* Heat waves rising from connection point */}
      <path d="M247 165 C248 158, 250 155, 252 158" fill="none" stroke="#E8747C" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M244 155 C246 145, 250 140, 254 145" fill="none" stroke="url(#hero-grad)" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
      <path d="M246 135 C248 128, 252 125, 254 128" fill="none" stroke="#6B4E71" strokeWidth="0.8" strokeLinecap="round" opacity="0.15" />

      {/* Flame motif above — desire rising */}
      <path
        d="M250 120 C245 110, 240 95, 245 80 C248 70, 250 65, 250 65 C250 65, 252 70, 255 80 C260 95, 255 110, 250 120Z"
        fill="url(#hero-grad-v)"
        opacity="0.25"
      />
      <path
        d="M250 110 C248 103, 246 95, 248 87 C249 82, 250 80, 250 80 C250 80, 251 82, 252 87 C254 95, 252 103, 250 110Z"
        fill="#E8747C"
        opacity="0.3"
      />

      {/* Scattered embers / passion particles */}
      <circle cx="230" cy="140" r="1.5" fill="#E8747C" opacity="0.5" />
      <circle cx="270" cy="135" r="1" fill="#E8747C" opacity="0.4" />
      <circle cx="240" cy="115" r="1" fill="#6B4E71" opacity="0.4" />
      <circle cx="260" cy="110" r="1.5" fill="#E8747C" opacity="0.3" />
      <circle cx="255" cy="95" r="1" fill="#6B4E71" opacity="0.3" />

      {/* Intertwined flowing lines — passion/connection */}
      <path
        d="M180 380 C200 350, 220 340, 250 345 C280 340, 300 350, 320 380"
        fill="none"
        stroke="url(#hero-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M190 420 C210 395, 230 385, 250 390 C270 385, 290 395, 310 420"
        fill="none"
        stroke="url(#hero-grad)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.15"
      />

      {/* Subtle pulse rings from the connection point */}
      <circle cx="250" cy="173" r="30" fill="none" stroke="url(#hero-grad)" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 5" />
      <circle cx="250" cy="173" r="55" fill="none" stroke="url(#hero-grad)" strokeWidth="0.5" opacity="0.1" strokeDasharray="2 6" />
      <circle cx="250" cy="173" r="85" fill="none" stroke="url(#hero-grad)" strokeWidth="0.5" opacity="0.06" strokeDasharray="2 8" />
    </svg>
  );
}

export function Hero() {
  const locale = getLocale();

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            className="text-center lg:text-left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={textContainerVariants}
          >
            <motion.h1
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
              variants={textItemVariants}
            >
              {t("landing_hero_title", locale)}
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
              variants={textItemVariants}
            >
              {t("landing_hero_subtitle", locale)}
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
              variants={textItemVariants}
            >
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="/signup">{t("landing_hero_cta", locale)}</Link>
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              className="flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-muted-foreground"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={badgeContainerVariants}
            >
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <Lock className="h-4 w-4 text-primary" />
                <span>{t("landing_hero_badge_private", locale)}</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <CreditCard className="h-4 w-4 text-primary" />
                <span>{t("landing_hero_badge_free", locale)}</span>
              </motion.div>
              <motion.div className="flex items-center gap-2" variants={badgeItemVariants}>
                <Flame className="h-4 w-4 text-primary" />
                <span>{t("landing_hero_badge_couples", locale)}</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Illustration */}
          <motion.div
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={illustrationVariants}
          >
            <HeroIllustration />
          </motion.div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
    </section>
  );
}
