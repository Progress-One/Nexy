import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviterId, partnershipId } = await request.json();

    if (!inviterId) {
      return NextResponse.json({ error: 'Inviter ID required' }, { status: 400 });
    }

    // Create notification (notifications table not in generated schema)
    try {
      const pool = getDbPool();
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          inviterId,
          'invite_accepted',
          'Приглашение принято!',
          'Ваш партнёр присоединился к Nexy',
          JSON.stringify({ partnership_id: partnershipId, partner_id: user.id }),
        ]
      );
    } catch (notifyError) {
      console.error('Notification insert error:', notifyError);
      // Don't fail the request - notification is not critical
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notify accepted error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
