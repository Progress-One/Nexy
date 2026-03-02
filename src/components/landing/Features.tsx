"use client";

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

const mosaicVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, delay: 0.4, ease: "easeOut" as const } },
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

// Mosaic tile configurations for variety
const mosaicTiles = [
  { colSpan: "col-span-2", rowSpan: "row-span-2", bg: "bg-primary/10", rounded: "rounded-2xl" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-secondary/15", rounded: "rounded-xl" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-primary/20", rounded: "rounded-lg" },
  { colSpan: "col-span-1", rowSpan: "row-span-2", bg: "bg-secondary/10", rounded: "rounded-2xl" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-primary/5", rounded: "rounded-xl" },
  { colSpan: "col-span-2", rowSpan: "row-span-1", bg: "bg-secondary/8", rounded: "rounded-lg" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-primary/15", rounded: "rounded-2xl" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-secondary/20", rounded: "rounded-xl" },
  { colSpan: "col-span-1", rowSpan: "row-span-1", bg: "bg-primary/8", rounded: "rounded-lg" },
  { colSpan: "col-span-2", rowSpan: "row-span-1", bg: "bg-primary/12", rounded: "rounded-2xl" },
];

// Gradient overlays for select tiles
const gradientTileIndices = new Set([0, 3, 9]);

export function Features() {
  const locale = getLocale();

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={titleVariants}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("landing_features_title", locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex gap-4 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              variants={itemVariants}
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {t(feature.titleKey, locale)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t(feature.descKey, locale)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Variety Mosaic */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={mosaicVariants}
        >
          <div className="grid grid-cols-5 auto-rows-[48px] md:auto-rows-[56px] gap-2.5 md:gap-3">
            {mosaicTiles.map((tile, i) => (
              <div
                key={i}
                className={`${tile.colSpan} ${tile.rowSpan} ${tile.rounded} transition-colors ${
                  gradientTileIndices.has(i)
                    ? "bg-gradient-to-br from-primary/10 to-secondary/15"
                    : tile.bg
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
