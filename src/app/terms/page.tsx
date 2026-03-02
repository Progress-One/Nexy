'use client'

import { t, getLocale } from '@/lib/locale'
import Link from 'next/link'

export default function TermsPage() {
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
        {t('legal_terms_title', locale)}
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        {t('legal_last_updated', locale, { date: lastUpdated })}
      </p>

      {locale === 'ru' ? <TermsContentRu /> : <TermsContentEn />}
    </main>
  )
}

function TermsContentEn() {
  return (
    <div className="space-y-8 text-foreground/90 leading-relaxed">
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">1. Service Description</h2>
        <p className="text-muted-foreground">
          Nexy is a web application for couples that enables anonymous matching of intimate
          preferences through swipe-based scenario cards. The service helps partners discover
          mutual interests in a safe, private environment. Only mutual matches are revealed;
          unmatched preferences are never disclosed.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">2. Age Requirement</h2>
        <p className="text-muted-foreground">
          Nexy is intended exclusively for adults aged 18 and older. The service contains
          content of an adult nature. By creating an account and using the service, you confirm
          that you are at least 18 years of age. If we discover that a user is under 18, we will
          immediately terminate their account and delete all associated data.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">3. Account Responsibility</h2>
        <p className="text-muted-foreground">
          You are responsible for maintaining the security of your account credentials and for
          all activity that occurs under your account. You must notify us immediately at{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>{' '}
          if you suspect any unauthorized access. Each account is intended for use by a single
          individual.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">4. Acceptable Use</h2>
        <p className="text-muted-foreground mb-2">When using Nexy, you agree not to:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Harass, threaten, or pressure your partner or any other user</li>
          <li>Share, screenshot, or disclose your partner&apos;s private responses or match results to third parties</li>
          <li>Use automated tools, bots, or scrapers to access the service</li>
          <li>Attempt to circumvent the privacy protections or access other users&apos; data</li>
          <li>Use the service for any illegal purpose</li>
          <li>Create multiple accounts or impersonate another person</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">5. Premium Subscription</h2>
        <p className="text-muted-foreground">
          Nexy offers a premium subscription billed through Stripe. You may cancel your
          subscription at any time via the Customer Portal accessible from your settings page.
          Upon cancellation, you will retain premium access until the end of your current billing
          period. Refunds are handled in accordance with Stripe&apos;s refund policies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">6. Content Ownership</h2>
        <p className="text-muted-foreground">
          Your responses, preferences, and personal data belong to you. AI-generated content
          (such as chat responses, date night suggestions, and personalized recommendations)
          is licensed to you for personal, non-commercial use within the service. You may not
          reproduce, distribute, or sell AI-generated content outside of your personal use.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
        <p className="text-muted-foreground">
          Nexy is a tool for communication and discovery within relationships. We make no
          guarantees regarding relationship outcomes, compatibility, or the accuracy of AI-generated
          suggestions. The service is provided &quot;as is&quot; without warranties of any kind, express
          or implied. We are not liable for any decisions made based on information provided
          by the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
        <p className="text-muted-foreground">
          We reserve the right to suspend or terminate accounts that violate these Terms of
          Service, engage in abusive behavior, or use the service in a manner that harms other
          users or the integrity of the platform. You may delete your account at any time by
          contacting{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to These Terms</h2>
        <p className="text-muted-foreground">
          We may update these Terms of Service from time to time. We will notify you of
          significant changes by updating the date at the top of this page. Continued use of
          the service after changes constitutes acceptance of the updated terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions about these Terms of Service, please contact us at{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>
    </div>
  )
}

function TermsContentRu() {
  return (
    <div className="space-y-8 text-foreground/90 leading-relaxed">
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">1. Описание сервиса</h2>
        <p className="text-muted-foreground">
          Nexy &mdash; это веб-приложение для пар, которое позволяет анонимно сопоставлять
          интимные предпочтения через свайп-карточки со сценариями. Сервис помогает партнёрам
          открывать общие интересы в безопасной, приватной среде. Раскрываются только взаимные
          совпадения; несовпавшие предпочтения никогда не показываются.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">2. Возрастное ограничение</h2>
        <p className="text-muted-foreground">
          Nexy предназначен исключительно для взрослых в возрасте 18 лет и старше. Сервис
          содержит контент для взрослых. Создавая аккаунт и используя сервис, вы подтверждаете,
          что вам не менее 18 лет. Если мы обнаружим, что пользователь младше 18 лет, мы
          немедленно заблокируем аккаунт и удалим все связанные данные.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">3. Ответственность за аккаунт</h2>
        <p className="text-muted-foreground">
          Вы несёте ответственность за безопасность учётных данных и за все действия,
          совершённые под вашим аккаунтом. Вы должны немедленно уведомить нас по адресу{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          , если подозреваете несанкционированный доступ. Каждый аккаунт предназначен для
          использования одним человеком.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">4. Правила использования</h2>
        <p className="text-muted-foreground mb-2">Используя Nexy, вы соглашаетесь не:</p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Преследовать, угрожать или оказывать давление на партнёра или других пользователей</li>
          <li>Делиться, делать скриншоты или раскрывать приватные ответы партнёра или результаты совпадений третьим лицам</li>
          <li>Использовать автоматизированные инструменты, боты или скраперы для доступа к сервису</li>
          <li>Пытаться обойти защиту приватности или получить доступ к данным других пользователей</li>
          <li>Использовать сервис в незаконных целях</li>
          <li>Создавать несколько аккаунтов или выдавать себя за другого человека</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">5. Премиум-подписка</h2>
        <p className="text-muted-foreground">
          Nexy предлагает премиум-подписку с оплатой через Stripe. Вы можете отменить подписку
          в любое время через Портал клиента, доступный на странице настроек. После отмены
          премиум-доступ сохраняется до конца текущего расчётного периода. Возвраты
          осуществляются в соответствии с политикой возвратов Stripe.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">6. Права на контент</h2>
        <p className="text-muted-foreground">
          Ваши ответы, предпочтения и личные данные принадлежат вам. AI-генерированный контент
          (ответы чата, предложения для свиданий, персонализированные рекомендации) лицензирован
          для вашего личного, некоммерческого использования в рамках сервиса. Вы не можете
          воспроизводить, распространять или продавать AI-генерированный контент за пределами
          личного использования.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">7. Ограничение ответственности</h2>
        <p className="text-muted-foreground">
          Nexy &mdash; это инструмент для коммуникации и исследования в отношениях. Мы не
          гарантируем результатов в отношениях, совместимости или точности AI-рекомендаций.
          Сервис предоставляется &laquo;как есть&raquo; без каких-либо гарантий, явных или
          подразумеваемых. Мы не несём ответственности за решения, принятые на основе
          информации, предоставленной сервисом.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">8. Прекращение доступа</h2>
        <p className="text-muted-foreground">
          Мы оставляем за собой право приостановить или заблокировать аккаунты, нарушающие
          настоящие Условия использования, участвующие в злоупотреблениях или использующие
          сервис способом, наносящим вред другим пользователям или целостности платформы.
          Вы можете удалить свой аккаунт в любое время, связавшись с{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">9. Изменения условий</h2>
        <p className="text-muted-foreground">
          Мы можем время от времени обновлять Условия использования. Мы уведомим вас о
          существенных изменениях, обновив дату в верхней части этой страницы. Продолжение
          использования сервиса после внесения изменений означает принятие обновлённых условий.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3">10. Свяжитесь с нами</h2>
        <p className="text-muted-foreground">
          Если у вас есть вопросы об Условиях использования, свяжитесь с нами по адресу{' '}
          <a href="mailto:support@nexy.life" className="text-primary hover:underline">
            support@nexy.life
          </a>
          .
        </p>
      </section>
    </div>
  )
}
