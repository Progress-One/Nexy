import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Idempotency check — Stripe may retry delivery; we only process each event once.
  const { data: existing } = await supabase
    .from('processed_webhooks')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await supabase
            .from('subscriptions')
            .update({
              stripe_subscription_id: session.subscription as string,
              plan,
              status: 'active',
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : 'past_due',
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq('user_id', sub.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              plan: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq('user_id', sub.user_id);
        }
        break;
      }
    }

    // Record successful processing so retries become no-ops.
    await supabase
      .from('processed_webhooks')
      .insert({ event_id: event.id, source: 'stripe' });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
