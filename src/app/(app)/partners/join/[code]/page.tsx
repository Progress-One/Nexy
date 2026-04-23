'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/http-client/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'joining' | 'success'>('loading');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function validateInvite() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Redirect to login with return URL
          router.push(`/login?next=/partners/join/${code}`);
          return;
        }

        // Check if invite exists and is valid
        const { data: invite, error: inviteError } = await supabase
          .from('partnerships')
          .select('*')
          .eq('invite_code', code)
          .eq('status', 'pending')
          .single();

        if (inviteError || !invite) {
          setStatus('invalid');
          setError('Приглашение не найдено или уже использовано');
          return;
        }

        // Check if user is trying to join their own invite
        if (invite.inviter_id === user.id) {
          setStatus('invalid');
          setError('Нельзя принять своё собственное приглашение');
          return;
        }

        // Check if already partners
        const { data: existing } = await supabase
          .from('partnerships')
          .select('id')
          .or(`and(user_id.eq.${user.id},partner_id.eq.${invite.inviter_id}),and(user_id.eq.${invite.inviter_id},partner_id.eq.${user.id})`)
          .single();

        if (existing) {
          setStatus('invalid');
          setError('Вы уже партнёры');
          return;
        }

        setStatus('valid');
      } catch {
        setStatus('invalid');
        setError('Произошла ошибка');
      }
    }

    validateInvite();
  }, [code, supabase, router]);

  const handleJoin = async () => {
    setStatus('joining');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the invite
      const { data: invite } = await supabase
        .from('partnerships')
        .select('*')
        .eq('invite_code', code)
        .eq('status', 'pending')
        .single();

      if (!invite) {
        setError('Приглашение не найдено');
        setStatus('invalid');
        return;
      }

      // Update the partnership
      const { error: updateError } = await supabase
        .from('partnerships')
        .update({
          partner_id: user.id,
          status: 'active',
        })
        .eq('id', invite.id);

      if (updateError) {
        setError('Не удалось принять приглашение');
        setStatus('invalid');
        return;
      }

      // Create reverse partnership record
      await supabase.from('partnerships').insert({
        user_id: user.id,
        partner_id: invite.inviter_id,
        inviter_id: invite.inviter_id,
        status: 'active',
      });

      setStatus('success');
      setTimeout(() => {
        router.push('/partners');
      }, 1500);
    } catch {
      setError('Произошла ошибка');
      setStatus('invalid');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="text-center">
          {status === 'valid' && (
            <>
              <UserCheck className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle>Приглашение</CardTitle>
              <CardDescription>
                Вас приглашают стать партнёром в Intimate Discovery
              </CardDescription>
            </>
          )}

          {status === 'invalid' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-2" />
              <CardTitle>Ошибка</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}

          {status === 'joining' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-2" />
              <CardTitle>Подключение...</CardTitle>
            </>
          )}

          {status === 'success' && (
            <>
              <UserCheck className="w-12 h-12 mx-auto text-green-500 mb-2" />
              <CardTitle>Успешно!</CardTitle>
              <CardDescription>
                Вы теперь партнёры. Перенаправление...
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {status === 'valid' && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                После принятия приглашения вы сможете видеть совпадения
                в ваших предпочтениях. Ваши данные останутся приватными —
                показываются только общие интересы.
              </p>
              <Button onClick={handleJoin} className="w-full">
                Принять приглашение
              </Button>
            </div>
          )}

          {status === 'invalid' && (
            <Button
              onClick={() => router.push('/partners')}
              variant="outline"
              className="w-full"
            >
              Вернуться к партнёрам
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
