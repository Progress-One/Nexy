"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { t, getLocale } from "@/lib/locale";

export function Footer() {
  const locale = getLocale();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="py-12 md:py-16 border-t border-border/50"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="font-serif text-2xl font-bold text-primary">
                Nexy
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("landing_footer_tagline", locale)}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              {t("landing_footer_product", locale)}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("landing_footer_how", locale)}
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("landing_footer_pricing", locale)}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              {t("landing_footer_legal", locale)}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("landing_footer_privacy", locale)}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("landing_footer_terms", locale)}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@nexy.life"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("landing_footer_contact", locale)}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            {t("landing_footer_copyright", locale, {
              year: new Date().getFullYear().toString(),
            })}
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
