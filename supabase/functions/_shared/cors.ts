const ALLOWED_ORIGINS = [
  'https://infinitewealthsolutionsai.com',
  'https://www.infinitewealthsolutionsai.com',
];

export function getCorsHeaders(origin: string | null | undefined) {
  const o = origin ?? '';
  const allowed = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };
}

// Static fallback — kept for backward compat (uses primary domain)
export const corsHeaders = getCorsHeaders(null);
