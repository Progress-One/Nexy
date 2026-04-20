import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sceneId, imagePrompt } = await req.json();

    console.log('[ResetPrompt] Request:', {
      sceneId,
      imagePrompt_start: imagePrompt?.substring(0, 80),
      imagePrompt_length: imagePrompt?.length,
    });

    if (!sceneId || !imagePrompt) {
      return NextResponse.json(
        { error: 'Missing sceneId or imagePrompt' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('scenes')
      .update({
        generation_prompt: imagePrompt,
        qa_status: null,
        qa_attempts: null,
        qa_last_assessment: null,
      })
      .eq('id', sceneId)
      .select('id, slug, generation_prompt, image_prompt');

    if (error) {
      console.error('[ResetPrompt] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    console.log('[ResetPrompt] Updated scene:', {
      slug: data[0].slug,
      generation_prompt_start: data[0].generation_prompt?.substring(0, 80),
      image_prompt_start: data[0].image_prompt?.substring(0, 80),
      prompts_match: data[0].generation_prompt === data[0].image_prompt,
    });

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('[ResetPrompt] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
