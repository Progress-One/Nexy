import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await db
            .updateTable('subscriptions')
            .set({
              stripe_subscription_id: session.subscription as string,
              plan,
              status: 'active',
            })
            .where('user_id', '=', userId)
            .execute();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const sub = await db
          .selectFrom('subscriptions')
          .select('user_id')
          .where('stripe_customer_id', '=', customerId)
          .executeTakeFirst();

        if (sub?.user_id) {
          // Stripe types don't officially declare current_period_end on Subscription itself
          // but it exists at runtime (invoice-based subscription objects sometimes differ).
          const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;
          await db
            .updateTable('subscriptions')
            .set({
              status: subscription.status === 'active' ? 'active' : 'past_due',
              current_period_end: new Date(periodEnd * 1000),
            })
            .where('user_id', '=', sub.user_id)
            .execute();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const sub = await db
          .selectFrom('subscriptions')
          .select('user_id')
          .where('stripe_customer_id', '=', customerId)
          .executeTakeFirst();

        if (sub?.user_id) {
          await db
            .updateTable('subscriptions')
            .set({
              plan: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .where('user_id', '=', sub.user_id)
            .execute();
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
