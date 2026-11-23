import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

let cachedAdmin: SupabaseClient | null | undefined;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdmin !== undefined) return cachedAdmin;
  if (!supabaseUrl || !serviceRoleKey) {
    cachedAdmin = null;
    return null;
  }
  cachedAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedAdmin;
}

export async function verifySupabaseAccessToken(
  accessToken: string
): Promise<{ email: string; fullName: string; authUid: string } | null> {
  const client = getSupabaseAdmin();
  if (!client || !accessToken) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user?.email) return null;
  const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    data.user.email.split('@')[0];
  return {
    email: data.user.email.toLowerCase(),
    fullName,
    authUid: data.user.id,
  };
}

export async function uploadToSupabaseBucket(
  bucket: 'product-images' | 'user-documents',
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ publicUrl: string; provider: 'supabase' } | null> {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { error } = await client.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  if (bucket === 'product-images') {
    const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
    return { publicUrl: data.publicUrl, provider: 'supabase' };
  }

  const { data: signed, error: signErr } = await client.storage.from(bucket).createSignedUrl(objectPath, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) {
    const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
    return { publicUrl: data.publicUrl, provider: 'supabase' };
  }
  return { publicUrl: signed.signedUrl, provider: 'supabase' };
}

export async function syncInventoryLogToSupabase(entry: {
  productId: number;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
}) {
  const client = getSupabaseAdmin();
  if (!client) return;
  try {
    await client.from('inventory_logs').insert({
      product_id: entry.productId,
      previous_quantity: entry.previousQuantity,
      new_quantity: entry.newQuantity,
      delta: entry.delta,
      reason: entry.reason,
    });
  } catch {
    // Non-fatal mirror sync
  }
}

export async function syncOrderToSupabase(orderPayload: {
  orderNumber: string;
  subtotal: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
}) {
  const client = getSupabaseAdmin();
  if (!client) return;
  try {
    await client.from('audit_logs_mirror').insert(orderPayload);
  } catch {
    // Non-fatal mirror sync
  }
}
