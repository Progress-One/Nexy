"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/http-client/client";
import { t, getLocale } from "@/lib/locale";

type User = { id: string; email?: string | null };

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = getLocale();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0C0A0F]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0C0A0F]/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold text-[#E8747C]">Nexy</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#how-it-works" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
            {t('landing_header_how', locale)}
          </Link>
          <Link href="#features" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
            {t('landing_header_features', locale)}
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
            {t('landing_header_pricing', locale)}
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-9" />
          ) : user ? (
            <Button asChild>
              <Link href="/discover">{t('landing_header_open', locale)}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">{t('landing_header_login', locale)}</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">{t('landing_header_start', locale)}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0C0A0F]">
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-white/50 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('landing_header_how', locale)}
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-white/50 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('landing_header_features', locale)}
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-white/50 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('landing_header_pricing', locale)}
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              {loading ? (
                <div className="h-10" />
              ) : user ? (
                <Button asChild className="w-full">
                  <Link href="/discover">{t('landing_header_open', locale)}</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full border-white/20 text-white hover:bg-white/10">
                    <Link href="/login">{t('landing_header_login', locale)}</Link>
                  </Button>
                  <Button asChild className="w-full bg-gradient-to-r from-[#E8747C] to-[#6B4E71] hover:brightness-110 border-0 text-white">
                    <Link href="/signup">{t('landing_header_start', locale)}</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
