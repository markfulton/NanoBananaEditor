// Nano Banana Editor: single image endpoint for generate and edit.
// Auth is a real user session (not the anon key). Credits are charged here,
// server-side, before the model runs, and refunded if the model fails.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { GoogleGenAI } from 'npm:@google/genai@2.21.0';
import { createClient } from 'npm:@supabase/supabase-js@2.56.1';
import {
  MODELS,
  currentModelId,
  resolveSize,
  resolveAspectRatio,
  creditsPerImage,
  type ModelId,
  type ImageSize,
  type ThinkingLevel,
} from './models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key',
};

interface InlineImage {
  data: string;
  mimeType: string;
  role?: 'source' | 'reference' | 'mask' | 'mask-preview';
}

interface HistoryTurn {
  role: 'user' | 'model';
  text?: string;
  image?: { data: string; mimeType: string };
}

interface ImageRequest {
  mode: 'generate' | 'edit';
  model: ModelId;
  prompt: string;
  images?: InlineImage[];
  aspectRatio?: string;
  size?: ImageSize;
  thinkingLevel?: ThinkingLevel;
  useSearch?: boolean;
  seed?: number;
  temperature?: number;
  history?: HistoryTurn[];
}

const MAX_HISTORY_TURNS = 6;
const MAX_BODY_BYTES = 40 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function friendlyGeminiError(message: string): { status: number; error: string } {
  const m = message.toLowerCase();
  if (m.includes('429') || m.includes('resource_exhausted') || m.includes('quota')) {
    return { status: 429, error: 'The model is busy right now. Wait a few seconds and try again. You were not charged.' };
  }
  if (m.includes('api key') || m.includes('api_key_invalid') || m.includes('permission_denied')) {
    return { status: 401, error: 'The Gemini API key was rejected. Check the key in Settings.' };
  }
  if (m.includes('safety') || m.includes('blocked') || m.includes('prohibited')) {
    return { status: 422, error: 'The model declined this prompt for safety reasons. Rephrase and try again. You were not charged.' };
  }
  if (m.includes('not supported for this model')) {
    return { status: 400, error: message };
  }
  if (m.includes('deadline') || m.includes('timeout') || m.includes('503') || m.includes('unavailable')) {
    return { status: 503, error: 'Gemini timed out on this request. Try again, or pick a smaller size. You were not charged.' };
  }
  return { status: 502, error: `Gemini error: ${message.slice(0, 240)}` };
}

function buildEditPrompt(instruction: string, hasMask: boolean, referenceCount: number): string {
  const lines = [
    `Edit the first image according to this instruction: ${instruction}`,
    'Keep everything that the instruction does not mention exactly as it is: same framing, lighting, perspective, colours and subject identity. Make the change look like it was always part of the photograph.',
  ];
  if (hasMask) {
    lines.push(
      'A second copy of the image follows with a translucent purple overlay marking the ONLY region you may change, and after it a black-and-white mask where white marks that same region. Apply the instruction inside the marked region only and leave every pixel outside it untouched, blending the edges seamlessly.'
    );
  }
  if (referenceCount > 0) {
    const plural = referenceCount === 1 ? '' : 's';
    lines.push(
      `${referenceCount} additional reference image${plural} follow. Use them for style, subject or product guidance, not as the canvas.`
    );
  }
  lines.push('Return only the edited image at the same aspect ratio as the original unless told otherwise.');
  return lines.join('\n\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const started = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Identify the user from their session token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in to generate images.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);
  if (!user.email_confirmed_at) return json({ error: 'Confirm your email address before generating.' }, 403);

  // 2. Parse and validate the request.
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'Request too large. Use fewer or smaller images.' }, 413);

  let body: ImageRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return json({ error: 'A prompt is required.' }, 400);
  if (prompt.length > 8000) return json({ error: 'Prompt is too long (8000 characters max).' }, 400);
  const model = currentModelId(body.model);
  if (!model) return json({ error: `Unknown model: ${body.model}` }, 400);
  const spec = MODELS[model];
  const mode = body.mode === 'edit' ? 'edit' : 'generate';
  const size = resolveSize(model, body.size);
  const aspectRatio = resolveAspectRatio(model, body.aspectRatio);
  const useSearch = Boolean(body.useSearch) && spec.supportsSearch;
  const images = Array.isArray(body.images)
    ? body.images.filter((i) => i && typeof i.data === 'string' && i.data.length > 0)
    : [];
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];

  if (mode === 'edit' && !images.some((i) => i.role === 'source' || !i.role)) {
    return json({ error: 'Edit mode needs a source image.' }, 400);
  }
  if (images.length > spec.maxInputImages) {
    return json({ error: `${spec.name} accepts up to ${spec.maxInputImages} input images. You sent ${images.length}.` }, 400);
  }

  // 3. Pick the key. A user-supplied key skips credits entirely.
  const byokKey = (req.headers.get('x-gemini-key') ?? '').trim();
  const houseKey = Deno.env.get('GEMINI_API_KEY');
  const apiKey = byokKey || houseKey;
  if (!apiKey) return json({ error: 'No Gemini API key is configured.' }, 500);
  const byok = Boolean(byokKey);

  const credits = creditsPerImage({ model, size, useSearch });
  const admin = createClient(supabaseUrl, serviceKey);

  // 4. Charge before the call. Refund on any failure below.
  if (!byok) {
    const { data: ok, error: deductError } = await admin.rpc('deduct_user_credits', {
      user_uuid: user.id,
      credits_to_deduct: credits,
    });
    if (deductError) {
      console.error('deduct failed', deductError);
      return json({ error: 'Could not reserve credits. Try again.' }, 500);
    }
    if (!ok) {
      const { data: row } = await admin
        .from('user_credits')
        .select('credits_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      return json({ error: 'insufficient_credits', needed: credits, balance: row?.credits_balance ?? 0 }, 402);
    }
  }

  const refund = async () => {
    if (byok) return;
    const { error } = await admin.rpc('add_user_credits', { user_uuid: user.id, credits_to_add: credits });
    if (error) console.error('refund failed', error);
  };

  // 5. Build the conversation.
  const contents: Array<{ role: 'user' | 'model'; parts: unknown[] }> = [];
  for (const turn of history) {
    const parts: unknown[] = [];
    if (turn.text) parts.push({ text: turn.text });
    if (turn.image?.data) {
      parts.push({ inlineData: { mimeType: turn.image.mimeType || 'image/jpeg', data: turn.image.data } });
    }
    if (parts.length && (turn.role === 'user' || turn.role === 'model')) contents.push({ role: turn.role, parts });
  }

  const finalParts: unknown[] = [];
  if (mode === 'edit') {
    const source = images.find((i) => i.role === 'source' || !i.role)!;
    const maskPreview = images.find((i) => i.role === 'mask-preview');
    const mask = images.find((i) => i.role === 'mask');
    const refs = images.filter((i) => i.role === 'reference');
    finalParts.push({ text: buildEditPrompt(prompt, Boolean(mask), refs.length) });
    finalParts.push({ inlineData: { mimeType: source.mimeType || 'image/png', data: source.data } });
    if (maskPreview) finalParts.push({ inlineData: { mimeType: maskPreview.mimeType || 'image/png', data: maskPreview.data } });
    if (mask) finalParts.push({ inlineData: { mimeType: mask.mimeType || 'image/png', data: mask.data } });
    for (const r of refs) finalParts.push({ inlineData: { mimeType: r.mimeType || 'image/png', data: r.data } });
  } else {
    finalParts.push({ text: prompt });
    for (const r of images) finalParts.push({ inlineData: { mimeType: r.mimeType || 'image/png', data: r.data } });
  }
  contents.push({ role: 'user', parts: finalParts });

  const config: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
    candidateCount: 1,
    imageConfig: {
      imageSize: size,
      ...(aspectRatio ? { aspectRatio } : {}),
    },
  };
  if (typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2) {
    config.temperature = body.temperature;
  }
  if (Number.isInteger(body.seed)) config.seed = body.seed;
  if (spec.thinkingControl && (body.thinkingLevel === 'MINIMAL' || body.thinkingLevel === 'HIGH')) {
    config.thinkingConfig = { thinkingLevel: body.thinkingLevel };
  }
  if (useSearch) config.tools = [{ googleSearch: {} }];

  // 6. Call Gemini.
  const ai = new GoogleGenAI({ apiKey });
  // deno-lint-ignore no-explicit-any
  let response: any;
  try {
    response = await ai.models.generateContent({ model, contents, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('gemini error', message);
    await refund();
    const mapped = friendlyGeminiError(message);
    return json({ error: mapped.error }, mapped.status);
  }

  const candidate = response?.candidates?.[0];
  // deno-lint-ignore no-explicit-any
  const parts: any[] = candidate?.content?.parts ?? [];
  const outImages: { data: string; mimeType: string }[] = [];
  const texts: string[] = [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      outImages.push({ data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/jpeg' });
    } else if (typeof part.text === 'string' && part.text.trim() && !part.thought) {
      texts.push(part.text.trim());
    }
  }

  if (outImages.length === 0) {
    await refund();
    const reason = candidate?.finishReason ?? response?.promptFeedback?.blockReason ?? 'NO_IMAGE';
    const detail = texts.join(' ').slice(0, 300);
    const safety = reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT' || reason === 'IMAGE_SAFETY';
    return json(
      {
        error: safety
          ? 'The model declined this prompt for safety reasons. Rephrase and try again. You were not charged.'
          : `The model returned no image (${reason}). ${detail || 'Try rephrasing.'} You were not charged.`,
        modelText: detail || undefined,
      },
      422
    );
  }

  const usage = response.usageMetadata ?? {};
  const grounding = candidate?.groundingMetadata
    ? {
        queries: candidate.groundingMetadata.webSearchQueries ?? [],
        sources: (candidate.groundingMetadata.groundingChunks ?? [])
          // deno-lint-ignore no-explicit-any
          .map((c: any) => (c?.web ? { title: c.web.title, uri: c.web.uri } : null))
          .filter(Boolean)
          .slice(0, 8),
      }
    : undefined;

  const durationMs = Date.now() - started;

  // 7. Log usage and read the new balance.
  const [{ error: logError }, { data: balanceRow }] = await Promise.all([
    admin.from('usage_log').insert({
      user_id: user.id,
      mode,
      model,
      image_size: size,
      aspect_ratio: aspectRatio ?? null,
      credits: byok ? 0 : credits,
      byok,
      used_search: useSearch,
      prompt_tokens: usage.promptTokenCount ?? null,
      output_tokens: usage.candidatesTokenCount ?? null,
      thought_tokens: usage.thoughtsTokenCount ?? null,
      duration_ms: durationMs,
    }),
    byok
      ? Promise.resolve({ data: null as { credits_balance: number } | null })
      : admin.from('user_credits').select('credits_balance').eq('user_id', user.id).maybeSingle(),
  ]);
  if (logError) console.error('usage_log insert failed', logError);

  return json({
    images: outImages,
    text: texts.join('\n\n') || undefined,
    model,
    size,
    aspectRatio,
    credits: byok ? 0 : credits,
    byok,
    balance: balanceRow?.credits_balance ?? null,
    usage: {
      promptTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
      thoughtTokens: usage.thoughtsTokenCount ?? 0,
    },
    grounding,
    durationMs,
  });
});
