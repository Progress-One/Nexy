'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Gender = 'male' | 'female';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleGenderSelect = async (gender: Gender) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Пользователь не авторизован');
        return;
      }

      const interested_in = gender === 'male' ? 'female' : 'male';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          gender,
          interested_in,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push('/discover');
    } catch {
      setError('Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const genderOptions = [
    { value: 'male' as Gender, label: 'Мужчина', emoji: '👨' },
    { value: 'female' as Gender, label: 'Женщина', emoji: '👩' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Intimate Discovery</CardTitle>
          <CardDescription>Расскажите немного о себе</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-center text-muted-foreground mb-4">Я:</p>
            {genderOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-3"
                onClick={() => handleGenderSelect(option.value)}
                disabled={loading}
              >
                <span className="text-2xl">{option.emoji}</span>
                {option.label}
              </Button>
            ))}
          </motion.div>

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
