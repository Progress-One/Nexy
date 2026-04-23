'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/http-client/client';
import { generateInviteCode } from '@/lib/matching';
import { trackEvent, EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link as LinkIcon, Mail, Loader2, Clock, Share2 } from 'lucide-react';

const INVITE_EXPIRY_DAYS = 7;

export default function InvitePage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [canShare, setCanShare] = useState(false);
  const supabase = createClient();

  // Check Web Share API support
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  useEffect(() => {
    async function getOrCreateInvite() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Track page view
        trackEvent(supabase, user.id, EVENTS.INVITE_PAGE_VIEW);

        // Check for existing valid pending invite (not expired)
        const { data: existing } = await supabase
          .from('partnerships')
          .select('invite_code, expires_at')
          .eq('inviter_id', user.id)
          .eq('status', 'pending')
          .is('partner_id', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (existing?.invite_code) {
          setInviteCode(existing.invite_code);
          setExpiresAt(existing.expires_at ? new Date(existing.expires_at) : null);
        } else {
          // Create new invite with expiry
          const code = generateInviteCode();
          const expires = new Date();
          expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);

          const { error } = await supabase.from('partnerships').insert({
            user_id: user.id,
            inviter_id: user.id,
            invite_code: code,
            status: 'pending',
            expires_at: expires.toISOString(),
          });

          if (!error) {
            setInviteCode(code);
            setExpiresAt(expires);
          }
        }
      } catch (error) {
        console.error('Error getting invite:', error);
      } finally {
        setLoading(false);
      }
    }

    getOrCreateInvite();
  }, [supabase]);

  const copyToClipboard = async () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/partners/join/${inviteCode}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    // Track
    const { data: { user } } = await supabase.auth.getUser();
    if (user) trackEvent(supabase, user.id, EVENTS.INVITE_CODE_COPIED);
  };

  const nativeShare = async () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/partners/join/${inviteCode}`;

    try {
      await navigator.share({
        title: 'Nexy — приглашение',
        text: 'Присоединяйся ко мне на Nexy!',
        url,
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) trackEvent(supabase, user.id, EVENTS.INVITE_CODE_COPIED, { method: 'native_share' });
    } catch {
      // User cancelled share — ignore
    }
  };

  const sendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !inviteCode) return;

    setSendingEmail(true);
    setEmailError(null);

    try {
      const response = await fetch('/api/invite/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode, locale: 'ru' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailSent(true);
      setEmail('');
      // Track
      const { data: { user } } = await supabase.auth.getUser();
      if (user) trackEvent(supabase, user.id, EVENTS.INVITE_EMAIL_SENT);
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Ошибка отправки');
    } finally {
      setSendingEmail(false);
    }
  };

  const inviteUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/partners/join/${inviteCode}`
    : '';

  const formatExpiryDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Пригласить партнёра</CardTitle>
          <CardDescription>
            Отправьте ссылку или email партнёру, чтобы начать сравнивать предпочтения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="h-10 bg-muted animate-pulse rounded-md" />
          ) : (
            <>
              {/* Expiry notice */}
              {expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <Clock className="w-4 h-4" />
                  <span>Действительно до {formatExpiryDate(expiresAt)}</span>
                </div>
              )}

              {/* Invite code */}
              <div className="space-y-2">
                <Label>Код приглашения</Label>
                <div className="flex gap-2">
                  <Input value={inviteCode || ''} readOnly className="font-mono text-lg tracking-wider" />
                </div>
              </div>

              {/* Full URL */}
              <div className="space-y-2">
                <Label>Ссылка</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="text-sm" />
                  <Button onClick={copyToClipboard} variant="outline" size="icon">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Share / Copy buttons */}
              {canShare ? (
                <Button onClick={nativeShare} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Поделиться ссылкой
                </Button>
              ) : (
                <Button onClick={copyToClipboard} className="w-full">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {copied ? 'Скопировано!' : 'Скопировать ссылку'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email invite card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5" />
            Отправить по email
          </CardTitle>
          <CardDescription>Мы отправим красивое приглашение на указанный адрес</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendEmailInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partnerEmail">Email партнёра</Label>
              <Input
                id="partnerEmail"
                type="email"
                placeholder="partner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendingEmail || emailSent}
                required
              />
            </div>

            {emailError && <p className="text-sm text-red-500">{emailError}</p>}

            {emailSent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 p-3 rounded-md">
                  <Check className="w-4 h-4" />
                  <span>Приглашение отправлено!</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setEmailSent(false)}>
                  Отправить ещё одно
                </Button>
              </div>
            ) : (
              <Button type="submit" variant="outline" className="w-full" disabled={sendingEmail || !inviteCode}>
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Отправить приглашение
                  </>
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
