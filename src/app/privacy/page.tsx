'use client'

import { t, getLocale } from '@/lib/locale'
import Link from 'next/link'

export default function PrivacyPage() {
  const locale = getLocale()
  const lastUpdated = locale === 'ru' ? '1 марта 2026' : 'March 1, 2026'

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/"
        className="text-sm text-primary hover:underline inline-block mb-8"
      >
        {t('legal_back', locale)}
      </Link>

      <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
        {t('legal_privacy_title', locale)}
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        {t('legal_last_updated', locale, { date: lastUpdated })}
      </p>

      {locale === 'ru' ? <PrivacyContentRu /> : <PrivacyContentEn />}
    </main>
  )
}

function PrivacyContentEn() {
  return (
    <div className="space-y-8 text-foreground/90 leading-relaxed">
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
        <p className="text-muted-foreground">
          Nexy (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the web application at nexy.life.
          This Privacy Policy explains how we collect, use, and protect your personal information
          when you use our service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">2. Data We Collect</h2>
        <p className="text-muted-foreground mb-2">We collect the following types of data:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Email address (for authentication and communication)</li>
          <li>Anonymized preference responses (your swipe answers to scenarios)</li>
          <li>Body map selections (zone and action preferences)</li>
          <li>Language preference</li>
          <li>AI chat messages (processed in real-time, not stored permanently by AI providers)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">3. Our Core Privacy Principle</h2>
        <p className="text-muted-foreground">
          Nexy is built on a strict privacy-first principle: <strong className="text-foreground">unmatched
          preferences are never revealed to your partner</strong>. If you express interest in something
          and your partner does not, that information remains completely private. Only mutual
          matches (where both partners expressed interest) are ever shared between partners.
          This is the fundamental design principle of our service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">4. How We Store Your Data</h2>
        <p className="text-muted-foreground">
          Your data is stored in Supabase (PostgreSQL) with encryption at rest. We use
          Row Level Security (RLS) policies to ensure that users can only access their own data.
          All connections are encrypted via TLS.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Services</h2>
        <p className="text-muted-foreground mb-2">We use the following third-party services:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Supabase</strong> &mdash; database and authentication</li>
          <li><strong className="text-foreground">OpenAI</strong> &mdash; processes AI chat messages; responses are not used for model training per our API agreement</li>
          <li><strong className="text-foreground">Stripe</strong> &mdash; payment processing for premium subscriptions</li>
          <li><strong className="text-foreground">Resend</strong> &mdash; transactional emails (invitations, notifications)</li>
          <li><strong className="text-foreground">Vercel</strong> &mdash; hosting and deployment</li>
        </ul>
        <p className="text-muted-foreground mt-2">
          We do not sell your personal data to any third parties.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
        <p className="text-muted-foreground">
          We use only essential cookies required for authentication session management.
          We do not use tracking cookies, advertising cookies, or any third-party analytics cookies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Deletion</h2>
        <p className="text-muted-foreground">
          You may request deletion of all your personal data at any time by contacting us
          at{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          . Upon receiving your request, we will permanently delete your account and all
          associated data within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">8. Age Requirement</h2>
        <p className="text-muted-foreground">
          Nexy is intended exclusively for adults aged 18 and older. By using our service,
          you confirm that you are at least 18 years of age. We do not knowingly collect
          data from anyone under the age of 18.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
        <p className="text-muted-foreground">
          We may update this Privacy Policy from time to time. We will notify you of any
          significant changes by updating the date at the top of this page.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions about this Privacy Policy, please contact us at{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>
    </div>
  )
}

function PrivacyContentRu() {
  return (
    <div className="space-y-8 text-foreground/90 leading-relaxed">
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">1. Введение</h2>
        <p className="text-muted-foreground">
          Nexy (&laquo;мы&raquo;, &laquo;наш&raquo;, &laquo;нас&raquo;) управляет веб-приложением на nexy.life.
          Настоящая Политика конфиденциальности описывает, как мы собираем, используем и защищаем
          вашу персональную информацию при использовании нашего сервиса.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">2. Данные, которые мы собираем</h2>
        <p className="text-muted-foreground mb-2">Мы собираем следующие типы данных:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Адрес электронной почты (для аутентификации и связи)</li>
          <li>Анонимизированные ответы на сценарии (ваши свайпы)</li>
          <li>Выбор на карте тела (зоны и действия)</li>
          <li>Языковые предпочтения</li>
          <li>Сообщения AI-чата (обрабатываются в реальном времени, не хранятся провайдерами AI)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">3. Наш ключевой принцип приватности</h2>
        <p className="text-muted-foreground">
          Nexy построен на строгом принципе приватности: <strong className="text-foreground">несовпавшие
          предпочтения никогда не раскрываются вашему партнёру</strong>. Если вы проявили интерес
          к чему-то, а ваш партнёр нет, эта информация остаётся полностью конфиденциальной.
          Только взаимные совпадения (где оба партнёра проявили интерес) когда-либо становятся
          доступны партнёрам. Это фундаментальный принцип нашего сервиса.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">4. Как мы храним ваши данные</h2>
        <p className="text-muted-foreground">
          Ваши данные хранятся в Supabase (PostgreSQL) с шифрованием в состоянии покоя.
          Мы используем политики безопасности на уровне строк (RLS), чтобы гарантировать,
          что пользователи могут получить доступ только к своим собственным данным.
          Все соединения зашифрованы через TLS.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">5. Сторонние сервисы</h2>
        <p className="text-muted-foreground mb-2">Мы используем следующие сторонние сервисы:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li><strong className="text-foreground">Supabase</strong> &mdash; база данных и аутентификация</li>
          <li><strong className="text-foreground">OpenAI</strong> &mdash; обработка сообщений AI-чата; ответы не используются для обучения моделей согласно нашему API-соглашению</li>
          <li><strong className="text-foreground">Stripe</strong> &mdash; обработка платежей для премиум-подписок</li>
          <li><strong className="text-foreground">Resend</strong> &mdash; транзакционные email (приглашения, уведомления)</li>
          <li><strong className="text-foreground">Vercel</strong> &mdash; хостинг и деплой</li>
        </ul>
        <p className="text-muted-foreground mt-2">
          Мы не продаём ваши персональные данные третьим лицам.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
        <p className="text-muted-foreground">
          Мы используем только необходимые cookies для управления сессией аутентификации.
          Мы не используем трекинговые cookies, рекламные cookies или cookies сторонней аналитики.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">7. Удаление данных</h2>
        <p className="text-muted-foreground">
          Вы можете запросить удаление всех ваших персональных данных в любое время, связавшись
          с нами по адресу{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          . После получения запроса мы безвозвратно удалим ваш аккаунт и все связанные данные
          в течение 30 дней.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">8. Возрастное ограничение</h2>
        <p className="text-muted-foreground">
          Nexy предназначен исключительно для взрослых в возрасте 18 лет и старше.
          Используя наш сервис, вы подтверждаете, что вам не менее 18 лет.
          Мы не собираем данные лиц младше 18 лет сознательно.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">9. Изменения в политике</h2>
        <p className="text-muted-foreground">
          Мы можем время от времени обновлять эту Политику конфиденциальности.
          Мы уведомим вас о существенных изменениях, обновив дату в верхней части этой страницы.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">10. Свяжитесь с нами</h2>
        <p className="text-muted-foreground">
          Если у вас есть вопросы о Политике конфиденциальности, свяжитесь с нами по адресу{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>
    </div>
  )
}
