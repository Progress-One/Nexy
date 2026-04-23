'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/http-client/client';
import { PricingCards } from '@/components/premium/PricingCards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, Check } from 'lucide-react';

export default function PremiumPage() {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('subscriptions')
          .select('plan, status, current_period_end')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSubscription({
            plan: data.plan,
            status: data.status,
            currentPeriodEnd: data.current_period_end,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [supabase]);

  const handleSelectPlan = async (plan: 'monthly' | 'yearly') => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = subscription?.plan && subscription.plan !== 'free';

  return (
    <div className="p-4 space-y-6">
      {isPremium ? (
        <Card className="border-primary">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Вы Premium!</CardTitle>
            <CardDescription>
              У вас есть доступ ко всем функциям
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-2">
              <Badge variant="default" className="capitalize">
                {subscription.plan === 'monthly' ? 'Месячная' : 'Годовая'}
              </Badge>
              <Badge variant="secondary">
                {subscription.status === 'active' ? 'Активна' : subscription.status}
              </Badge>
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-sm text-center text-muted-foreground">
                Следующее списание:{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')}
              </p>
            )}

            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="w-full"
            >
              Управление подпиской
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Ваши преимущества:</h3>
              <ul className="space-y-2">
                {[
                  'Неограниченные партнёры',
                  'Система предложений',
                  'Безлимитный AI',
                  'Детальная аналитика',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-center">
            <Crown className="w-12 h-12 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Получите Premium</h1>
            <p className="text-muted-foreground">
              Разблокируйте все возможности Intimate Discovery
            </p>
          </div>

          <PricingCards
            onSelectPlan={handleSelectPlan}
            loading={checkoutLoading}
          />
        </>
      )}
    </div>
  );
}
