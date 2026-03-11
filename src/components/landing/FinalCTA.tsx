"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" as const, staggerChildren: 0.15 } },
} as const;

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

function DesireFlameIllustration() {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-48 h-48 mx-auto"
      aria-hidden="true"
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="cta-grad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#6B4E71" />
          <stop offset="50%" stopColor="#E8747C" />
          <stop offset="100%" stopColor="#F5A0A0" />
        </linearGradient>
        <radialGradient id="cta-glow" cx="50%" cy="60%" r="45%">
          <stop offset="0%" stopColor="#E8747C" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6B4E71" stopOpacity="0" />
        </radialGradient>
        <filter id="cta-blur">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Ambient heat */}
      <circle cx="100" cy="110" r="80" fill="url(#cta-glow)" />

      {/* Outer flame silhouette */}
      <path
        d="M100 170 C70 150, 45 125, 50 95 C53 75, 65 60, 75 50 C80 45, 85 48, 82 58 C78 72, 80 80, 90 70 C95 65, 98 55, 100 40 C102 55, 105 65, 110 70 C120 80, 122 72, 118 58 C115 48, 120 45, 125 50 C135 60, 147 75, 150 95 C155 125, 130 150, 100 170Z"
        fill="url(#cta-grad)"
        opacity="0.2"
      />

      {/* Inner flame */}
      <path
        d="M100 160 C80 145, 65 125, 68 105 C70 90, 80 78, 88 72 C92 68, 95 72, 93 78 C90 88, 92 95, 98 85 C100 80, 100 70, 100 60 C100 70, 100 80, 102 85 C108 95, 110 88, 107 78 C105 72, 108 68, 112 72 C120 78, 130 90, 132 105 C135 125, 120 145, 100 160Z"
        fill="#E8747C"
        opacity="0.25"
      />

      {/* Core flame — brightest */}
      <path
        d="M100 148 C88 140, 78 125, 80 112 C82 100, 90 92, 96 88 C98 86, 100 90, 100 95 C100 100, 100 90, 100 82 C100 90, 100 100, 100 95 C100 90, 102 86, 104 88 C110 92, 118 100, 120 112 C122 125, 112 140, 100 148Z"
        fill="#E8747C"
        opacity="0.4"
      />

      {/* Sparks rising */}
      <circle cx="90" cy="45" r="1.5" fill="#E8747C" opacity="0.4" />
      <circle cx="110" cy="38" r="1" fill="#E8747C" opacity="0.3" />
      <circle cx="95" cy="30" r="1" fill="#6B4E71" opacity="0.3" />
      <circle cx="105" cy="25" r="1.5" fill="#E8747C" opacity="0.2" />
      <circle cx="100" cy="18" r="1" fill="#6B4E71" opacity="0.15" />
    </motion.svg>
  );
}

export function FinalCTA() {
  const locale = getLocale();

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-[#0C0A0F] to-[#1A1720]">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionVariants}
        >
          {/* Illustration */}
          <motion.div variants={childVariants}>
            <DesireFlameIllustration />
          </motion.div>

          <motion.h2
            className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
            variants={childVariants}
          >
            {t("landing_cta_title", locale)}
          </motion.h2>
          <motion.p
            className="text-lg text-white/50 mb-8"
            variants={childVariants}
          >
            {t("landing_cta_subtitle", locale)}
          </motion.p>

          <motion.div variants={childVariants}>
            <Button size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-[#E8747C] to-[#6B4E71] hover:brightness-110 border-0 text-white shadow-lg shadow-[#E8747C]/20 transition-all duration-200" asChild>
              <Link href="/signup">{t("landing_cta_button", locale)}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
