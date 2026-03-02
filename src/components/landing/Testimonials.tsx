"use client";

import { Quote } from "lucide-react";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Testimonials() {
  const locale = getLocale();

  const testimonials = [
    {
      quote: t('landing_testimonials_1', locale),
      author: t('landing_testimonials_1_author', locale),
    },
    {
      quote: t('landing_testimonials_2', locale),
      author: t('landing_testimonials_2_author', locale),
    },
    {
      quote: t('landing_testimonials_3', locale),
      author: t('landing_testimonials_3_author', locale),
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landing_testimonials_title', locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative p-6 rounded-2xl bg-background border border-border/50"
            >
              <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
              <blockquote className="text-foreground mb-4 relative z-10">
                &quot;{testimonial.quote}&quot;
              </blockquote>
              <cite className="text-sm text-muted-foreground not-italic">
                — {testimonial.author}
              </cite>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
