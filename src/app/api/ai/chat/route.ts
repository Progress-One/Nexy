import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'kysely';
import { getCurrentUser } from '@/lib/auth';
import { generateChatResponse } from '@/lib/ai';
import type { UserContext } from '@/lib/types';

const FREE_MESSAGES_PER_DAY = 5;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check subscription
    const subscription = await db
      .selectFrom('subscriptions')
      .select('plan')
      .where('user_id', '=', user.id)
      .executeTakeFirst();

    const isPremium = subscription?.plan && subscription.plan !== 'free';

    // Check rate limit for free users
    if (!isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const countRow = await db
        .selectFrom('ai_messages')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('user_id', '=', user.id)
        .where('role', '=', 'user')
        .where('created_at', '>=', today)
        .executeTakeFirstOrThrow();

      if ((countRow.count || 0) >= FREE_MESSAGES_PER_DAY) {
        return NextResponse.json(
          {
            error: 'rate_limited',
            message: `Вы использовали ${FREE_MESSAGES_PER_DAY} бесплатных сообщений сегодня. Получите Premium для безлимитного общения.`,
          },
          { status: 429 }
        );
      }
    }

    // Get user context
    const profile = await db
      .selectFrom('profiles')
      .select(['gender', 'interested_in'])
      .where('id', '=', user.id)
      .executeTakeFirst();

    const prefProfile = await db
      .selectFrom('preference_profiles')
      .select('preferences')
      .where('user_id', '=', user.id)
      .executeTakeFirst();

    // Get recent messages for context
    const recentMessages = await db
      .selectFrom('ai_messages')
      .select(['role', 'content'])
      .where('user_id', '=', user.id)
      .orderBy('created_at', 'desc')
      .limit(10)
      .execute();

    const userContext: UserContext = {
      gender: (profile?.gender as UserContext['gender']) || 'undisclosed',
      interestedIn: (profile?.interested_in as UserContext['interestedIn']) || 'both',
      knownPreferences: (prefProfile?.preferences as UserContext['knownPreferences']) || {},
      recentResponses: [],
    };

    // Save user message
    await db.insertInto('ai_messages').values({
      user_id: user.id,
      role: 'user',
      content: message,
    }).execute();

    // Build conversation history
    const history = (recentMessages || [])
      .reverse()
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
      }));

    history.push({ role: 'user', content: message });

    // Generate response
    const response = await generateChatResponse(history, userContext);

    // Save assistant message
    await db.insertInto('ai_messages').values({
      user_id: user.id,
      role: 'assistant',
      content: response,
    }).execute();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
