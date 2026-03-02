"use client";

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

function Step1Illustration() {
  return (
    <svg
      viewBox="0 0 240 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="step1-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8747C" />
          <stop offset="100%" stopColor="#6B4E71" />
        </linearGradient>
      </defs>

      {/* Card shape */}
      <rect
        x="40"
        y="30"
        width="160"
        height="210"
        rx="16"
        fill="none"
        stroke="url(#step1-grad)"
        strokeWidth="2"
        opacity="0.6"
      />
      <rect
        x="40"
        y="30"
        width="160"
        height="210"
        rx="16"
        fill="#E8747C"
        opacity="0.05"
      />

      {/* Inner card content area */}
      <rect
        x="56"
        y="50"
        width="128"
        height="80"
        rx="8"
        fill="#6B4E71"
        opacity="0.08"
      />

      {/* Heart on the card */}
      <path
        d="M105 75 C105 67, 113 63, 120 70 C127 63, 135 67, 135 75 C135 87, 120 96, 120 96 C120 96, 105 87, 105 75Z"
        fill="url(#step1-grad)"
        opacity="0.4"
      />

      {/* Horizontal lines representing text */}
      <rect x="66" y="148" width="108" height="4" rx="2" fill="#E8747C" opacity="0.2" />
      <rect x="76" y="162" width="88" height="4" rx="2" fill="#6B4E71" opacity="0.15" />

      {/* Swipe gesture - thumb */}
      <path
        d="M180 180 C195 175, 205 185, 200 200 L195 218 C192 226, 186 230, 178 230 L168 230 C160 230, 155 225, 155 218 L155 200 C155 192, 162 188, 170 188 L175 188"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Swipe arrow */}
      <path
        d="M195 195 L215 185"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M210 180 L215 185 L208 188"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />

      {/* Decorative dots */}
      <circle cx="50" cy="270" r="3" fill="#E8747C" opacity="0.2" />
      <circle cx="120" cy="275" r="2" fill="#6B4E71" opacity="0.25" />
      <circle cx="190" cy="268" r="3" fill="#E8747C" opacity="0.15" />
    </svg>
  );
}

function Step2Illustration() {
  return (
    <svg
      viewBox="0 0 240 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="step2-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8747C" />
          <stop offset="100%" stopColor="#6B4E71" />
        </linearGradient>
      </defs>

      {/* Phone outline */}
      <rect
        x="65"
        y="20"
        width="110"
        height="230"
        rx="20"
        fill="none"
        stroke="url(#step2-grad)"
        strokeWidth="2"
        opacity="0.6"
      />
      <rect
        x="65"
        y="20"
        width="110"
        height="230"
        rx="20"
        fill="#6B4E71"
        opacity="0.04"
      />

      {/* Notch */}
      <rect x="100" y="30" width="40" height="6" rx="3" fill="#6B4E71" opacity="0.15" />

      {/* Screen content: share icon */}
      <circle
        cx="120"
        cy="110"
        r="28"
        fill="none"
        stroke="url(#step2-grad)"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Link / chain icon inside circle */}
      <path
        d="M110 115 C108 115, 105 113, 105 110 C105 107, 108 105, 110 105 L118 105"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M130 105 C132 105, 135 107, 135 110 C135 113, 132 115, 130 115 L122 115"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Arrow going up from phone */}
      <path
        d="M120 90 L120 70"
        fill="none"
        stroke="url(#step2-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M115 75 L120 70 L125 75"
        fill="none"
        stroke="url(#step2-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />

      {/* Text placeholder lines */}
      <rect x="90" y="150" width="60" height="4" rx="2" fill="#E8747C" opacity="0.2" />
      <rect x="95" y="162" width="50" height="3" rx="1.5" fill="#6B4E71" opacity="0.15" />

      {/* CTA button shape */}
      <rect
        x="85"
        y="185"
        width="70"
        height="28"
        rx="14"
        fill="url(#step2-grad)"
        opacity="0.2"
      />
      <rect
        x="85"
        y="185"
        width="70"
        height="28"
        rx="14"
        fill="none"
        stroke="url(#step2-grad)"
        strokeWidth="1.5"
        opacity="0.4"
      />

      {/* Home indicator */}
      <rect x="105" y="238" width="30" height="4" rx="2" fill="#6B4E71" opacity="0.15" />

      {/* Decorative dots */}
      <circle cx="45" cy="130" r="3" fill="#E8747C" opacity="0.2" />
      <circle cx="195" cy="100" r="2" fill="#6B4E71" opacity="0.25" />
      <circle cx="50" cy="200" r="2" fill="#6B4E71" opacity="0.15" />
    </svg>
  );
}

function Step3Illustration() {
  return (
    <svg
      viewBox="0 0 240 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="step3-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8747C" />
          <stop offset="100%" stopColor="#6B4E71" />
        </linearGradient>
      </defs>

      {/* Left heart */}
      <path
        d="M85 130 C85 110, 105 100, 120 118 L120 120"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M155 130 C155 110, 135 100, 120 118 L120 120"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M85 130 C85 155, 120 180, 120 180"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M155 130 C155 155, 120 180, 120 180"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Heart fill */}
      <path
        d="M120 118 C105 100, 85 110, 85 130 C85 155, 120 180, 120 180 C120 180, 155 155, 155 130 C155 110, 135 100, 120 118Z"
        fill="url(#step3-grad)"
        opacity="0.12"
      />

      {/* Second heart (slightly offset, overlapping) */}
      <path
        d="M125 112 C110 94, 90 104, 90 124 C90 149, 125 174, 125 174 C125 174, 160 149, 160 124 C160 104, 140 94, 125 112Z"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
        strokeDasharray="4 4"
      />

      {/* Checkmark circle */}
      <circle
        cx="152"
        cy="115"
        r="18"
        fill="#E8747C"
        opacity="0.15"
      />
      <circle
        cx="152"
        cy="115"
        r="18"
        fill="none"
        stroke="url(#step3-grad)"
        strokeWidth="2"
        opacity="0.6"
      />
      {/* Checkmark */}
      <path
        d="M143 115 L149 121 L162 108"
        fill="none"
        stroke="#E8747C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* Sparkles */}
      {/* Top-left sparkle */}
      <path
        d="M75 85 L75 75 M70 80 L80 80"
        fill="none"
        stroke="#E8747C"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Top-right sparkle */}
      <path
        d="M180 90 L180 80 M175 85 L185 85"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Bottom-left sparkle */}
      <path
        d="M70 190 L70 182 M66 186 L74 186"
        fill="none"
        stroke="#6B4E71"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Right sparkle */}
      <path
        d="M185 155 L185 147 M181 151 L189 151"
        fill="none"
        stroke="#E8747C"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Small celebration dots */}
      <circle cx="95" cy="70" r="2.5" fill="#E8747C" opacity="0.3" />
      <circle cx="165" cy="75" r="2" fill="#6B4E71" opacity="0.35" />
      <circle cx="60" cy="150" r="2" fill="#E8747C" opacity="0.2" />
      <circle cx="190" cy="140" r="2.5" fill="#6B4E71" opacity="0.25" />
      <circle cx="110" cy="200" r="2" fill="#E8747C" opacity="0.2" />
      <circle cx="145" cy="195" r="1.5" fill="#6B4E71" opacity="0.2" />

      {/* Small star shapes */}
      <path
        d="M55 110 L57 105 L59 110 L64 112 L59 114 L57 119 L55 114 L50 112Z"
        fill="#E8747C"
        opacity="0.25"
      />
      <path
        d="M195 170 L197 165 L199 170 L204 172 L199 174 L197 179 L195 174 L190 172Z"
        fill="#6B4E71"
        opacity="0.25"
      />
    </svg>
  );
}

const stepIllustrations = [Step1Illustration, Step2Illustration, Step3Illustration];

const stepKeys = [
  { title: "landing_how_step1_title", desc: "landing_how_step1_desc" },
  { title: "landing_how_step2_title", desc: "landing_how_step2_desc" },
  { title: "landing_how_step3_title", desc: "landing_how_step3_desc" },
] as const;

export function HowItWorks() {
  const locale = getLocale();

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={titleVariants}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("landing_how_title", locale)}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8 lg:gap-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
        >
          {stepKeys.map((step, index) => {
            const Illustration = stepIllustrations[index];
            return (
              <motion.div key={index} className="text-center" variants={itemVariants}>
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg mb-6">
                  {index + 1}
                </div>

                {/* Illustration */}
                <div className="aspect-[4/5] mb-6 rounded-2xl flex items-center justify-center p-4">
                  <Illustration />
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {t(step.title, locale)}
                </h3>
                <p className="text-muted-foreground">
                  {t(step.desc, locale)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
