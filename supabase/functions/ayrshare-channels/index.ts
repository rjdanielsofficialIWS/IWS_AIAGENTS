import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY") ?? "";
const ZERNIO_API_URL = "https://zernio.com/api/v1";
const CORS_ORIGINS = [
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
  "https://iws-aiagents.vercel.app",
];

type Channel = {
  id: string;
  name: string;
  identifier: string;
  profile: string;
  accountId?: string;
  picture?: string;
  displayName?: string;
  disabled?: boolean;
  isActive?: boolean;
};

function normalizePlatformId(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  return normalized === "twitter" ? "x" : normalized;
}

function extractString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractAccountId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractAccountId(record.accountId ?? record._id ?? record.id);
  }
  return "";
}

function readNestedString(source: Record<string, unknown>, path: string[]): string {
  let cursor: unknown = source;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return "";
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return extractString(cursor);
}

function getPicture(account: Record<string, unknown>): string {
  const direct = extractString(account.profilePicture) || extractString(account.picture) || extractString(account.avatar);
  if (direct) return direct;

  const metadata = account.metadata && typeof account.metadata === "object"
    ? account.metadata as Record<string, unknown>
    : {};
  const profileData = metadata.profileData && typeof metadata.profileData === "object"
    ? metadata.profileData as Record<string, unknown>
    : {};
  const metadataPicture = extractString(profileData.profilePicture) || extractString(profileData.picture);
  if (metadataPicture) return metadataPicture;

  const availablePages = Array.isArray(metadata.availablePages) ? metadata.availablePages : [];
  const firstPage = availablePages[0] && typeof availablePages[0] === "object"
    ? availablePages[0] as Record<string, unknown>
    : {};
  return readNestedString(firstPage, ["picture", "data", "url"]);
}

function normalizeChannel(value: unknown): Channel | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.disabled === true || record.isActive === false) return null;

  const profile = normalizePlatformId(record.profile ?? record.platform ?? record.identifier ?? record.id);
  if (!profile) return null;

  const accountId = extractAccountId(record.accountId);
  const displayName = extractString(record.displayName);
  const name = extractString(record.name) || displayName || profile;
  const identifier = normalizePlatformId(record.identifier ?? record.profile ?? record.platform ?? profile) || profile;
  const picture = extractString(record.picture);

  return {
    id: profile,
    name,
    identifier,
    profile,
    ...(accountId ? { accountId } : {}),
    ...(picture ? { picture } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

function channelFromZernioAccount(account: Record<string, unknown>): Channel | null {
  if (account.isActive === false) return null;

  const profile = normalizePlatformId(account.platform);
  const accountId = extractAccountId(account);
  if (!profile || !accountId) return null;

  const displayName = extractString(account.displayName);
  const username = extractString(account.username);
  const name = displayName || username || profile;
  const picture = getPicture(account);

  return {
    id: profile,
    name,
    identifier: profile,
    profile,
    accountId,
    ...(picture ? { picture } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

function uniqueChannels(channels: Channel[]): Channel[] {
  const seen = new Set<string>();
  const result: Channel[] = [];
  for (const channel of channels) {
    const key = `${channel.profile}:${channel.accountId || channel.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(channel);
  }
  return result;
}

function filterAssignedChannels(channels: Channel[], assigned: unknown): Channel[] {
  if (!Array.isArray(assigned) || assigned.length === 0) return channels;
  const allowed = new Set(assigned.map((item) => extractString(item)).filter(Boolean));
  if (allowed.size === 0) return channels;
  return channels.filter((channel) =>
    allowed.has(channel.id) ||
    allowed.has(channel.profile) ||
    allowed.has(channel.identifier) ||
    (!!channel.accountId && allowed.has(channel.accountId))
  );
}

async function getUserIdFromAuth(supabase: ReturnType<typeof createClient>, req: Request): Promise<string> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return "";

  try {
    const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload.role === "authenticated" && typeof payload.sub === "string") return payload.sub;
  } catch {
    // Fall back to Supabase auth verification below.
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && user?.id ? user.id : "";
}

async function fetchLiveChannels(profileKey: string): Promise<Channel[]> {
  if (!ZERNIO_API_KEY) throw new Error("ZERNIO_API_KEY is not configured.");
  const response = await fetch(`${ZERNIO_API_URL}/accounts?profileId=${encodeURIComponent(profileKey)}`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch connected accounts (${response.status})`);

  const data = await response.json().catch(() => ({}));
  const accounts = Array.isArray(data?.accounts) ? data.accounts as Array<Record<string, unknown>> : [];
  return uniqueChannels(accounts.map(channelFromZernioAccount).filter((channel): channel is Channel => !!channel));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const respond = (code: number, data: unknown) => new Response(JSON.stringify(data), { status: code, headers: cors });

  if (req.method !== "GET") return respond(405, { error: "Method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const url = new URL(req.url);
  const requestedUserId = (url.searchParams.get("userId") ?? "").trim();
  const force = url.searchParams.get("force") === "true";
  const workspaceId = (url.searchParams.get("workspaceId") ?? "").trim();
  const userId = await getUserIdFromAuth(supabase, req);

  if (!userId) return respond(401, { error: "Not authenticated." });
  if (requestedUserId && requestedUserId !== userId) return respond(403, { error: "Forbidden." });

  // ── Account context ────────────────────────────────────────────────────────
  // Personal and workspace are MUTUALLY EXCLUSIVE. A workspaceId means the
  // workspace is authoritative — its provider profile is the only one that may
  // be read, and there is no path back to the owner's personal profile.
  //
  // This used to be written as "load the personal profile, then override it if
  // the workspace happens to have one". A workspace with a null profile_key
  // (i.e. every workspace before its first account is connected) silently kept
  // the personal key, so a brand-new workspace listed every one of the owner's
  // personal accounts as if they were already connected to it.
  let profileKey = "";
  let cachedChannels: unknown[] = [];
  let updateTable: "ayrshare_profiles" | "workspaces" = "ayrshare_profiles";
  let updateFilterColumn = "supabase_user_id";
  let updateFilterValue = userId;
  let assignedChannelIds: unknown[] = [];

  if (workspaceId) {
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id,owner_user_id,profile_key,cached_channels,assigned_channel_ids")
      .eq("id", workspaceId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (workspaceError) return respond(500, { error: workspaceError.message });
    if (!workspace) return respond(404, { error: "Workspace not found." });

    assignedChannelIds = Array.isArray(workspace.assigned_channel_ids) ? workspace.assigned_channel_ids : [];
    profileKey = extractString(workspace.profile_key);

    // No provider profile yet => nothing is connected to this workspace. Return
    // empty rather than falling back to anything else.
    if (!profileKey) return respond(200, { channels: [] });

    cachedChannels = Array.isArray(workspace.cached_channels) ? workspace.cached_channels : [];
    updateTable = "workspaces";
    updateFilterColumn = "id";
    updateFilterValue = workspaceId;
  } else {
    const { data: globalProfile, error: profileError } = await supabase
      .from("ayrshare_profiles")
      .select("profile_key,cached_channels")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    if (profileError) return respond(500, { error: profileError.message });

    profileKey = extractString(globalProfile?.profile_key);
    cachedChannels = Array.isArray(globalProfile?.cached_channels) ? globalProfile.cached_channels : [];
  }

  if (!profileKey) return respond(200, { channels: [] });

  const cached = cachedChannels
    .map(normalizeChannel)
    .filter((channel): channel is Channel => !!channel);
  let channels = cached;

  try {
    // Zernio is the source of truth for account activity. Always prefer its live
    // account list so stale workspace/global caches cannot expose inactive X
    // accounts that Zernio will reject at publish time.
    channels = await fetchLiveChannels(profileKey);
    if (updateTable === "workspaces") {
      await supabase.from(updateTable).update({ cached_channels: channels }).eq(updateFilterColumn, updateFilterValue).eq("owner_user_id", userId);
    } else {
      await supabase.from(updateTable).update({ cached_channels: channels }).eq(updateFilterColumn, updateFilterValue);
    }
  } catch (error) {
    if (force || cached.length === 0) {
      return respond(502, {
        error: error instanceof Error ? error.message : "Failed to refresh connected accounts.",
      });
    }
  }

  channels = filterAssignedChannels(uniqueChannels(channels), assignedChannelIds);
  return respond(200, { channels });
});
