type CoachRequest = {
  message?: string;
  applyIntent?: boolean;
  profile?: Record<string, unknown>;
  checkin?: Record<string, unknown>;
  plan?: unknown[];
  activityLogs?: Record<string, unknown>;
  coachChat?: {
    stage?: string;
    pendingPlan?: unknown;
    messages?: Array<{ role?: string; text?: string }>;
  };
};

type CoachResponse = {
  stage: "idle" | "clarifying" | "proposal";
  reply: string;
  pendingPlan: null | {
    concern: "pain" | "fatigue" | "schedule" | "race" | "general";
    originalMessage?: string;
    checkin?: Record<string, string>;
    profile?: Record<string, string>;
  };
  safety: {
    level: "green" | "yellow" | "red";
    message: string;
  };
  meta: {
    summary: string;
  };
};

type CoachConcern = "pain" | "fatigue" | "schedule" | "race" | "general";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const coachSystemPrompt = `
You are the backend coach for run-nerds, a Korean running coach app.
Return only JSON matching this shape:
{
  "stage": "idle" | "clarifying" | "proposal",
  "reply": "Korean coach message",
  "pendingPlan": null | {
    "concern": "pain" | "fatigue" | "schedule" | "race" | "general",
    "originalMessage": "optional original message",
    "checkin": { "fatigue": "...", "pain": "...", "sleep": "...", "schedule": "...", "confidence": "...", "comment": "...", "temporaryAvailableDays": "...", "temporaryPreferredDays": "...", "temporaryLongRunDay": "..." },
    "profile": { "fatigue": "...", "pain": "...", "availableDays": "...", "preferredDays": "...", "longRunDay": "...", "physicalNotes": "...", "goalNotes": "..." }
  },
  "safety": { "level": "green" | "yellow" | "red", "message": "short safety note" },
  "meta": { "summary": "short explanation" }
}
Never diagnose injuries. For pain or injury signals, recommend lowering training load, rest, and professional evaluation when appropriate.
Do not change the runner's plan directly. Only propose a pendingPlan when the user has provided enough context.
If applyIntent is true, treat the user's message as explicit confirmation to update the app and return stage "proposal" with a pendingPlan.
Use only these canonical patch values:
- checkin.fatigue: "high" | "medium" | "low"
- checkin.pain: "worrying" | "none"
- checkin.sleep: "poor" | "okay"
- checkin.schedule: "chaotic" | "stable"
- checkin.confidence: "low" | "steady" | "high"
- checkin.temporaryAvailableDays: "2" | "3" | "4" | "5" only for this-week constraints
- checkin.temporaryPreferredDays: comma-separated day ids only for this-week constraints
- checkin.temporaryLongRunDay: day id only for this-week constraints
- profile.fatigue: "tired" | "normal" | "fresh"
- profile.pain: "sharp" | "light" | "none"
- profile.availableDays: "2" | "3" | "4" | "5"
- profile.preferredDays: comma-separated day ids such as "tue, thu, fri, sat"
- profile.longRunDay: "sat" | "sun" | another day id only if the user clearly says so
If the user says "this week" or gives a temporary constraint, put frequency/day changes in checkin.temporary* fields, not profile.
Only change profile.availableDays/preferredDays/longRunDay when the user clearly says it is their ongoing routine, such as "every week", "from now on", "default", or "routine".
If the user asks about next week but has not confirmed next week's availability, ask a clarifying question instead of changing profile.
If the user asks to return to the default/original routine, clear checkin.temporaryAvailableDays, checkin.temporaryPreferredDays, and checkin.temporaryLongRunDay.
Put body status, pain, recovery, sleep, and injury notes in profile.physicalNotes.
Put race goals, target times, dates, and training goal notes in profile.goalNotes.
Put coach rationale or internal status such as "waiting for app apply" only in meta.summary, never in profile.
Do not put goal text into profile.physicalNotes.
Keep profile.physicalNotes very short: one Korean phrase, under 30 characters, no full conversation summary.
Do not store temporary conversation text such as today, this week, schedule uncertainty, "I might try a little", or "what should I do today" in profile fields.
Keep temporary conversation details only in checkin.comment or pendingPlan.meta.summary.
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectConcern(message: string): CoachConcern {
  if (/통증|아파|아픔|무릎|발목|종아리|햄스트링|허리|pain/i.test(message)) return "pain";
  if (/피곤|피로|무거|잠|수면|회복|지침|힘들/i.test(message)) return "fatigue";
  if (/일정|바빠|야근|출장|회식|시간|못.*뛰|못뛰|급한/i.test(message)) return "schedule";
  if (/대회|기록|페이스|목표/i.test(message)) return "race";
  return "general";
}

function validateResponse(value: unknown, originalMessage: string): CoachResponse {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const stage = raw.stage === "proposal" || raw.stage === "clarifying" || raw.stage === "idle" ? raw.stage : "clarifying";
  const reply = typeof raw.reply === "string" && raw.reply.trim()
    ? raw.reply.trim()
    : "지금 상태를 조금 더 알려줘. 몸 상태, 가능한 훈련일, 꼭 지키고 싶은 세션을 같이 보면 안전하게 조정할 수 있어.";
  const safetyRaw = raw.safety && typeof raw.safety === "object" ? raw.safety as Record<string, unknown> : {};
  const safetyLevel = safetyRaw.level === "red" || safetyRaw.level === "yellow" || safetyRaw.level === "green" ? safetyRaw.level : "green";
  const pendingRaw = raw.pendingPlan && typeof raw.pendingPlan === "object" ? raw.pendingPlan as Record<string, unknown> : null;

  return {
    stage,
    reply,
    pendingPlan: stage === "proposal" && pendingRaw
      ? {
          concern: detectConcern(String(pendingRaw.concern || originalMessage)),
          originalMessage,
          checkin: typeof pendingRaw.checkin === "object" && pendingRaw.checkin ? pendingRaw.checkin as Record<string, string> : {},
          profile: typeof pendingRaw.profile === "object" && pendingRaw.profile ? pendingRaw.profile as Record<string, string> : {},
        }
      : null,
    safety: {
      level: safetyLevel,
      message: typeof safetyRaw.message === "string" ? safetyRaw.message : "",
    },
    meta: {
      summary: typeof (raw.meta as Record<string, unknown> | undefined)?.summary === "string"
        ? String((raw.meta as Record<string, unknown>).summary)
        : "coach response generated by edge function",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OPENAI_API_KEY is not configured" }, 503);
  }

  const payload = await req.json() as CoachRequest;
  const message = String(payload.message || "").trim();
  if (!message) return jsonResponse({ error: "message is required" }, 400);

  const llmResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-5.2",
      max_output_tokens: 700,
      reasoning: { effort: "minimal" },
      instructions: coachSystemPrompt,
      input: `Return json for this run-nerds coach request:\n${JSON.stringify({
            message,
            applyIntent: Boolean(payload.applyIntent),
          profile: payload.profile || {},
          checkin: payload.checkin || {},
          plan: payload.plan || [],
          activityLogs: payload.activityLogs || {},
          coachChat: payload.coachChat || {},
        })}`,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!llmResponse.ok) {
    const detail = await llmResponse.text();
    console.error("LLM request failed", llmResponse.status, detail);
    return jsonResponse({ error: "LLM request failed", status: llmResponse.status }, 502);
  }

  const data = await llmResponse.json();
  const text = data.output_text || data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text || "").join("");

  try {
    return jsonResponse(validateResponse(JSON.parse(text), message));
  } catch (error) {
    console.error("LLM returned invalid JSON", error, text);
    return jsonResponse({ error: "LLM returned invalid JSON" }, 502);
  }
});
