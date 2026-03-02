"use client";

import Image from "next/image";
import { Brain, Flame, EyeOff, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

const features = [
  {
    icon: Brain,
    titleKey: "landing_features_ai_title",
    descKey: "landing_features_ai_desc",
  },
  {
    icon: Flame,
    titleKey: "landing_features_library_title",
    descKey: "landing_features_library_desc",
  },
  {
    icon: EyeOff,
    titleKey: "landing_features_privacy_title",
    descKey: "landing_features_privacy_desc",
  },
  {
    icon: Moon,
    titleKey: "landing_features_date_title",
    descKey: "landing_features_date_desc",
  },
] as const;

export function Features() {
  const locale = getLocale();

  return (
    <section id="features" className="relative py-20 md:py-32 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/landing/features-bg.webp"
          alt=""
          fill
          className="object-cover opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0C0A0F]/80" />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={titleVariants}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
            {t("landing_features_title", locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#E8747C]/30 transition-colors"
              variants={itemVariants}
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-[#E8747C]/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-[#E8747C]" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  {t(feature.titleKey, locale)}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {t(feature.descKey, locale)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
