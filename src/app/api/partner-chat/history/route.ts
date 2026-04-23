import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'Missing partnerId' }, { status: 400 });
  }

  const data = await db
    .selectFrom('partner_chat_messages')
    .select(['id', 'role', 'content', 'created_at'])
    .where('user_id', '=', user.id)
    .where('partner_id', '=', partnerId)
    .orderBy('created_at', 'asc')
    .execute();

  return NextResponse.json(data || []);
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'Missing partnerId' }, { status: 400 });
  }

  await db
    .deleteFrom('partner_chat_messages')
    .where('user_id', '=', user.id)
    .where('partner_id', '=', partnerId)
    .execute();

  return NextResponse.json({ success: true });
}
