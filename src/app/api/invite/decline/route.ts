import { NextRequest, NextResponse } from 'next/server';
import { db, getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
    }

    // Get invite
    const invite = await db
      .selectFrom('partnerships')
      .selectAll()
      .where('invite_code', '=', inviteCode)
      .where('status', '=', 'pending')
      .executeTakeFirst();

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Cannot decline own invite
    if (invite.inviter_id === user.id) {
      return NextResponse.json({ error: 'Cannot decline own invite' }, { status: 400 });
    }

    if (!invite.id) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 500 });
    }

    // Update status to declined
    try {
      await db
        .updateTable('partnerships')
        .set({
          status: 'declined',
          partner_id: user.id,
        })
        .where('id', '=', invite.id)
        .execute();
    } catch {
      return NextResponse.json({ error: 'Failed to decline' }, { status: 500 });
    }

    // Create notification for inviter (notifications table not in generated schema)
    const pool = getDbPool();
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        invite.inviter_id,
        'invite_declined',
        'Приглашение отклонено',
        'Ваше приглашение было отклонено',
        JSON.stringify({ partnership_id: invite.id }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Decline invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
