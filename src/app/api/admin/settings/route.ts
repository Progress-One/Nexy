import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Json } from '@/lib/db/schema';

const SETTINGS_KEY = 'generation_settings';

// GET - load settings
export async function GET() {
  try {
    const row = await db
      .selectFrom('admin_settings')
      .select('value')
      .where('key', '=', SETTINGS_KEY)
      .executeTakeFirst();

    return NextResponse.json({ settings: row?.value || null });
  } catch (error) {
    console.error('[AdminSettings] Load error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST - save settings
export async function POST(req: Request) {
  const { settings } = await req.json();

  try {
    await db
      .insertInto('admin_settings')
      .values({
        key: SETTINGS_KEY,
        value: settings as Json,
        updated_at: new Date(),
      })
      .onConflict(oc => oc.column('key').doUpdateSet({
        value: settings as Json,
        updated_at: new Date(),
      }))
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminSettings] Save error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
