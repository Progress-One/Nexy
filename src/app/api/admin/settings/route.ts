import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';

const SETTINGS_KEY = 'generation_settings';

// GET - load settings
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = not found, which is ok
    console.error('[AdminSettings] Load error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data?.value || null });
}

// POST - save settings
export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();
  const { settings } = await req.json();

  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      key: SETTINGS_KEY,
      value: settings,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[AdminSettings] Save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
