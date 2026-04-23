'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/http-client/client';
import { trackEvent, EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

type Gender = 'male' | 'female';
type InterestedIn = 'male' | 'female' | 'both';
type OpennessLevel = 'conservative' | 'moderate' | 'adventurous';
type RequestedOrientation = 'gay_male' | 'gay_female' | 'bisexual';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<InterestedIn | null>(null);
  const [openness, setOpenness] = useState<OpennessLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Track onboarding start
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) trackEvent(supabase, user.id, EVENTS.ONBOARDING_START);
    })();
  }, [supabase]);

  const handleGenderSelect = (selected: Gender) => {
    setGender(selected);
    setStep(2);
    // Track step 1 completion
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) trackEvent(supabase, user.id, EVENTS.ONBOARDING_STEP_GENDER, { gender: selected });
    })();
  };

  // Determine which orientation would be requested based on gender and interest
  const getRequestedOrientation = (
    userGender: Gender,
    interested: InterestedIn
  ): RequestedOrientation | null => {
    if (interested === 'both') return 'bisexual';
    if (userGender === 'male' && interested === 'male') return 'gay_male';
    if (userGender === 'female' && interested === 'female') return 'gay_female';
    return null; // Hetero - no wishlist needed
  };

  // Check if an option should be disabled based on user's gender
  const isOptionDisabled = (userGender: Gender | null, interested: InterestedIn): boolean => {
    if (!userGender) return false;
    // Bisexual always disabled for now
    if (interested === 'both') return true;
    // Homo options disabled
    if (userGender === 'male' && interested === 'male') return true;
    if (userGender === 'female' && interested === 'female') return true;
    return false;
  };

  const handleWishlistClick = async (selected: InterestedIn) => {
    if (!gender) return;

    const requestedOrientation = getRequestedOrientation(gender, selected);
    if (!requestedOrientation) return;

    setWishlistLoading(true);

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_orientation: requestedOrientation }),
      });

      if (response.ok) {
        console.log('Wishlist request saved');
      } else {
        const data = await response.json();
        console.error('Wishlist error:', data.error);
      }
    } catch (err) {
      console.error('Wishlist exception:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleInterestedInSelect = async (selected: InterestedIn) => {
    // If option is disabled, add to wishlist instead
    if (isOptionDisabled(gender, selected)) {
      await handleWishlistClick(selected);
      return;
    }

    setInterestedIn(selected);
    setStep(3);
    // Track step 2 completion
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) trackEvent(supabase, user.id, EVENTS.ONBOARDING_STEP_INTERESTED, { interested_in: selected });
    })();
  };

  const handleOpennessSelect = async (selected: OpennessLevel) => {
    setOpenness(selected);
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Пользователь не авторизован');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          gender,
          interested_in: interestedIn,
          openness_level: selected,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      trackEvent(supabase, user.id, EVENTS.ONBOARDING_STEP_OPENNESS, { openness: selected });
      trackEvent(supabase, user.id, EVENTS.ONBOARDING_COMPLETE, { gender, interested_in: interestedIn, openness: selected });

      router.push('/discover');
    } catch {
      setError('Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const genderOptions = [
    { value: 'male' as Gender, label: 'Мужчина', labelEn: 'Male', emoji: '👨' },
    { value: 'female' as Gender, label: 'Женщина', labelEn: 'Female', emoji: '👩' },
  ];

  const interestedOptions = [
    { value: 'male' as InterestedIn, label: 'Мужчины', labelEn: 'Men', emoji: '👨' },
    { value: 'female' as InterestedIn, label: 'Женщины', labelEn: 'Women', emoji: '👩' },
    { value: 'both' as InterestedIn, label: 'Оба', labelEn: 'Both', emoji: '💕' },
  ];

  const opennessOptions = [
    { value: 'conservative' as OpennessLevel, label: 'Консервативный', labelEn: 'Conservative', emoji: '🌸', description: 'Классический секс' },
    { value: 'moderate' as OpennessLevel, label: 'Умеренный', labelEn: 'Moderate', emoji: '🔥', description: 'Готов пробовать новое' },
    { value: 'adventurous' as OpennessLevel, label: 'Авантюрный', labelEn: 'Adventurous', emoji: '🚀', description: 'Люблю эксперименты' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Intimate Discovery</CardTitle>
          <CardDescription>
            {step === 1 && 'Расскажите немного о себе'}
            {step === 2 && 'Кто вас привлекает?'}
            {step === 3 && 'Насколько вы открыты к экспериментам?'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-center text-muted-foreground mb-4">Я:</p>
                {genderOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={gender === option.value ? 'default' : 'outline'}
                    className="w-full h-14 text-lg justify-start gap-3"
                    onClick={() => handleGenderSelect(option.value)}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    {option.label}
                  </Button>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-center text-muted-foreground mb-4">Меня привлекают:</p>
                {interestedOptions.map((option) => {
                  const disabled = isOptionDisabled(gender, option.value);

                  return (
                    <Button
                      key={option.value}
                      variant={interestedIn === option.value ? 'default' : 'outline'}
                      className={`w-full h-14 text-lg justify-between gap-3 ${
                        disabled ? 'opacity-60 border-dashed' : ''
                      }`}
                      onClick={() => handleInterestedInSelect(option.value)}
                      disabled={loading || wishlistLoading}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-2xl">{option.emoji}</span>
                        {option.label}
                      </span>
                      {disabled && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                          <Clock className="w-3 h-3" />
                          Скоро
                        </span>
                      )}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => setStep(1)}
                  disabled={loading || wishlistLoading}
                >
                  Назад
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-center text-muted-foreground mb-4">Мой стиль:</p>
                {opennessOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={openness === option.value ? 'default' : 'outline'}
                    className="w-full h-auto py-3 text-lg justify-start gap-3 flex-col items-start"
                    onClick={() => handleOpennessSelect(option.value)}
                    disabled={loading}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal ml-9">
                      {option.description}
                    </span>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Назад
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="text-center mt-4 text-muted-foreground">
              Сохранение...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
