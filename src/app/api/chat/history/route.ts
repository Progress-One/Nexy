import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_LIMIT = 50;

/**
 * Recent AI-chat history for the current user. Newest 50 entries by default,
 * returned in chronological order so the UI can append new messages naturally.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await db
    .selectFrom('ai_messages')
    .select(['id', 'role', 'content'])
    .where('user_id', '=', user.id)
    .orderBy('created_at', 'asc')
    .limit(DEFAULT_LIMIT)
    .execute();

  return NextResponse.json({
    messages: rows
      .filter((m) => m.id && m.role && m.content)
      .map((m) => ({ id: m.id, role: m.role, content: m.content })),
  });
}
