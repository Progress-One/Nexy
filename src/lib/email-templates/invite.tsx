import * as React from 'react';

interface InviteEmailProps {
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
  locale: 'ru' | 'en';
}

const texts = {
  ru: {
    greeting: 'Привет!',
    body: 'Кто-то особенный хочет поделиться с тобой своими желаниями в Nexy.',
    cta: 'Принять приглашение',
    code: 'Или используй код:',
    expires: (date: string) => `Приглашение действительно до ${date}`,
    footer: 'Если ты не знаешь отправителя, просто проигнорируй это письмо.',
    privacy: 'Nexy — приватное пространство для пар. Твои данные защищены.',
  },
  en: {
    greeting: 'Hello!',
    body: 'Someone special wants to share their desires with you on Nexy.',
    cta: 'Accept invitation',
    code: 'Or use this code:',
    expires: (date: string) => `Invitation valid until ${date}`,
    footer: "If you don't know the sender, simply ignore this email.",
    privacy: 'Nexy is a private space for couples. Your data is protected.',
  },
};

export function InviteEmail({ inviteCode, inviteUrl, expiresAt, locale }: InviteEmailProps) {
  const t = texts[locale];
  const formattedDate = expiresAt.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
        backgroundColor: '#0a0a0a',
        color: '#fafafa',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <span
          style={{
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ec4899, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Nexy
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          backgroundColor: '#171717',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #262626',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#fafafa',
          }}
        >
          {t.greeting}
        </h1>

        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#a1a1aa',
            marginBottom: '24px',
          }}
        >
          {t.body}
        </p>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <a
            href={inviteUrl}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #ec4899, #f97316)',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            {t.cta}
          </a>
        </div>

        {/* Invite code */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: '#0a0a0a',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>{t.code}</p>
          <code
            style={{
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '4px',
              color: '#ec4899',
            }}
          >
            {inviteCode}
          </code>
        </div>

        {/* Expiry */}
        <p
          style={{
            fontSize: '14px',
            color: '#71717a',
            textAlign: 'center',
          }}
        >
          {t.expires(formattedDate)}
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#52525b', marginBottom: '8px' }}>{t.footer}</p>
        <p style={{ fontSize: '12px', color: '#52525b' }}>{t.privacy}</p>
      </div>
    </div>
  );
}

export function getInviteEmailSubject(locale: 'ru' | 'en'): string {
  return locale === 'ru' ? 'Тебя приглашают в Nexy' : "You're invited to Nexy";
}
