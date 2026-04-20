import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sceneId = formData.get('sceneId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sceneId) {
      return NextResponse.json({ error: 'No sceneId provided' }, { status: 400 });
    }

    // Convert File to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Determine content type
    const contentType = file.type || 'image/webp';
    const extension = contentType.split('/')[1] || 'webp';
    // Use unique filename with timestamp to avoid overwriting
    const fileName = `${sceneId}_${Date.now()}.${extension}`;

    console.log('[UploadImage] Uploading:', {
      sceneId,
      fileName,
      contentType,
      size: buffer.byteLength,
    });

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('scenes')
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '0',
        upsert: false, // Don't overwrite - each upload is unique
      });

    if (uploadError) {
      console.error('[UploadImage] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('scenes')
      .getPublicUrl(fileName);

    const imageUrl = publicUrl;

    // Get current scene data
    const { data: scene, error: selectError } = await supabase
      .from('scenes')
      .select('image_variants, generation_prompt')
      .eq('id', sceneId)
      .single();

    if (selectError) {
      console.error('[UploadImage] Select error:', selectError);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    // Add to image_variants (check for duplicates without query params)
    const currentVariants: ImageVariant[] = scene?.image_variants || [];
    const getBaseUrl = (url: string) => url.split('?')[0];
    const baseImageUrl = getBaseUrl(imageUrl);

    // Skip if already exists
    if (currentVariants.some(v => getBaseUrl(v.url) === baseImageUrl)) {
      return NextResponse.json({
        success: true,
        imageUrl,
        variants: currentVariants,
        message: 'Image already in gallery',
      });
    }

    const newVariant: ImageVariant = {
      url: imageUrl,
      prompt: scene?.generation_prompt || 'Uploaded manually',
      created_at: new Date().toISOString(),
      qa_status: null,
    };
    const updatedVariants = [...currentVariants, newVariant];

    // Update scene: set as main image AND add to variants
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        image_url: imageUrl,
        image_variants: updatedVariants,
      })
      .eq('id', sceneId);

    if (updateError) {
      console.error('[UploadImage] DB update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[UploadImage] Success:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      variants: updatedVariants,
    });
  } catch (error) {
    console.error('[UploadImage] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
