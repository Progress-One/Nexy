import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * List partnerships the current user is a member of.
 *
 * Query params:
 *   status (optional, default 'active') — comma-separated list, or 'any'
 *   include_pending_self_invites (default 'false') — when 'true' also includes
 *     pending rows where the current user is the inviter (used by invite page)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const statusParam = params.get('status') ?? 'active';
  const includeSelfInvites = params.get('include_pending_self_invites') === 'true';

  let query = db
    .selectFrom('partnerships')
    .selectAll()
    .where((eb) =>
      eb.or([eb('user_id', '=', user.id), eb('partner_id', '=', user.id)])
    );

  if (statusParam !== 'any' && statusParam.length > 0) {
    const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      query = query.where('status', '=', statuses[0]);
    } else if (statuses.length > 1) {
      query = query.where('status', 'in', statuses);
    }
  }

  query = query.orderBy('created_at', 'desc');
  const rows = await query.execute();

  if (includeSelfInvites && (statusParam === 'pending' || statusParam === 'any')) {
    // Already covered by user_id filter above for self-created invites;
    // no further work needed.
  }

  // Transform: ensure caller can tell which side is "the other person".
  const partnerships = rows.map((p) => {
    const otherId = p.user_id === user.id ? p.partner_id : p.user_id;
    return { ...p, partner_id: otherId };
  });

  return NextResponse.json({ partnerships });
}
