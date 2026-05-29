type DeleteResult = {
  ok: true;
  deletedUserId: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function supabaseFetch(path: string, init: RequestInit, serviceRoleKey: string, supabaseUrl: string) {
  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...init.headers,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") || "";
  const userJwt = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Account deletion is not configured" }, 503);
  }
  if (!userJwt) {
    return jsonResponse({ error: "Missing authenticated user token" }, 401);
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${userJwt}`,
    },
  });

  if (!userResponse.ok) {
    return jsonResponse({ error: "Invalid or expired user token" }, 401);
  }

  const user = await userResponse.json();
  const userId = String(user?.id || "");
  if (!userId) return jsonResponse({ error: "Authenticated user id is missing" }, 400);

  const deleteAuthResponse = await supabaseFetch(
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
    serviceRoleKey,
    supabaseUrl,
  );

  if (!deleteAuthResponse.ok) {
    const detail = await readJson(deleteAuthResponse);
    console.error("Auth user deletion failed", deleteAuthResponse.status, detail);
    return jsonResponse({ error: "Account deletion failed", detail }, 502);
  }

  const encodedUserId = encodeURIComponent(userId);
  const cleanupTargets = [
    `/rest/v1/runner_workspaces?user_id=eq.${encodedUserId}`,
    `/rest/v1/profiles?id=eq.${encodedUserId}`,
  ];

  for (const target of cleanupTargets) {
    const cleanupResponse = await supabaseFetch(
      target,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
      serviceRoleKey,
      supabaseUrl,
    );
    if (!cleanupResponse.ok) {
      const detail = await readJson(cleanupResponse);
      console.warn("Post-delete cleanup failed", target, cleanupResponse.status, detail);
    }
  }

  return jsonResponse({ ok: true, deletedUserId: userId } satisfies DeleteResult);
});
