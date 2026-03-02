"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
} as const;

const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

const steps = [
  {
    num: "01",
    titleKey: "landing_how_step1_title",
    descKey: "landing_how_step1_desc",
    image: "/images/landing/step1-swipe.webp",
  },
  {
    num: "02",
    titleKey: "landing_how_step2_title",
    descKey: "landing_how_step2_desc",
    image: "/images/landing/step2-invite.webp",
  },
  {
    num: "03",
    titleKey: "landing_how_step3_title",
    descKey: "landing_how_step3_desc",
    image: "/images/landing/step3-match.webp",
  },
] as const;

export function HowItWorks() {
  const locale = getLocale();

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-[#1A1720]">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={titleVariants}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
            {t("landing_how_title", locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {steps.map((step) => (
            <motion.div
              key={step.num}
              className="text-center"
              variants={itemVariants}
            >
              {/* Step image */}
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-6 group">
                <Image
                  src={step.image}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0A0F]/80 via-transparent to-transparent" />
                {/* Step number overlay */}
                <div className="absolute top-4 left-4">
                  <span className="text-4xl font-bold text-[#E8747C]/40 font-serif">{step.num}</span>
                </div>
              </div>

              <h3 className="font-serif text-xl font-semibold text-white mb-2">
                {t(step.titleKey, locale)}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {t(step.descKey, locale)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
