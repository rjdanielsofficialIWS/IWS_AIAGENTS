// supabase/functions/lead-capture-flow/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const sanitizeKeywordStrict = (k: string) => {
  const s = String(k || '').toLowerCase().trim();
  const parts = s.split(':');
  const tokenRaw = parts[0] || '';
  const weightRaw = parts[1];

  const token = tokenRaw.replace(/[^a-z0-9]/g, '');
  if (!token) return '';

  if (weightRaw !== undefined) {
    const weight = String(weightRaw).replace(/[^0-9]/g, '');
    if (!weight) return token;
    return `${token}:${weight}`;
  }

  return token;
};

const makeSlug = (companyName: string) =>
  String(companyName || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'demo';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const PPLX_API_KEY = Deno.env.get('PPLX_API_KEY')!;
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const companyNameRaw = String(body.companyName || '').trim();
    const websiteUrlRaw = String(body.websiteUrl || '').trim();
    const industryServicesRaw = String(body.industryServices || '').trim();

    // ✅ Contact info fields from the form
    const contactName = String(body.contactName || '').trim();
    const contactEmail = String(body.contactEmail || '').trim();
    const contactPhone = String(body.contactPhone || '').trim();

    if (!companyNameRaw) {
      return new Response(JSON.stringify({ error: 'companyName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!industryServicesRaw) {
      return new Response(JSON.stringify({ error: 'industryServices is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Perplexity step (same idea as your n8n HTTP Request1) ---
    // If no website, we still give Perplexity enough context.
    const websiteLine = websiteUrlRaw ? websiteUrlRaw : 'Not specified';

    const pplxPayload = {
      model: 'sonar-pro',
      web_search_options: { search_type: 'auto', search_context_size: 'medium' },
      messages: [
        {
          role: 'system',
          content:
            "You are a business researcher. Your top priority is to research the specific company website URL provided by the user. Always treat the official company website as the primary source of truth when it is available.\n\nResearch workflow (MUST follow in this order):\n1) If a Company Website URL is provided and reachable, first fetch and analyze that exact URL (same domain) in depth before using any other sources.\n2) Extract as much information as possible directly from the official website (all relevant pages such as home, about, services, pricing, FAQs, contact, locations, terms, and policies if accessible).\n3) Only after processing the official website, use web search to supplement missing details with the company's official profiles (Google Business Profile, social media, major directories, and review platforms).\n4) When information from the company's own website conflicts with other sources, prefer the company website. If conflict cannot be resolved, briefly note the conflict and mark the field as Not specified.\n5) If the Company Website URL is missing, invalid, or unreachable, skip step 1–2 and rely on other public sources.\n\nAssumptions and data quality rules:\n- Assume nothing. If you cannot confirm a detail from the official website or reputable public profiles, write Not specified.\n- Do not infer details from industry norms or similar businesses.\n- Do not fabricate prices, policies, or guarantees.\n\nOutput formatting rules (MUST follow exactly):\n- Output MUST be plain text only (NO Markdown, NO JSON, NO bullets, NO quotation marks).\n- Use exactly the 6 numbered sections and the exact subpoint labels listed below.\n- Keep wording concise and optimized for voice-agent readability.\n- Replace any variation of \"Not specified in available information\" with Not specified.\n\nExact structure and labels (keep these labels exactly as written):\n\n1. General Company Information:\nLegal/business name (if available):\nAddress:\nPhone:\nEmail:\nWebsite:\nOperating hours (include lunch breaks if known):\nLanguages spoken:\nPrimary contact method:\n\n2. What They Offer:\nProducts/services (detailed list, including specialties):\nCommon job/request types:\nWhat they do NOT offer (if stated):\n\n3. Pricing & Payment:\nStarting prices or price ranges:\nService rates/fees (if listed):\nFree estimates/consultations (yes/no):\nDeposits (if mentioned):\nFinancing/payment plans (yes/no):\nAccepted payment methods:\n\n4. Location & Coverage:\nPrimary location(s):\nAreas served:\nRemote/virtual availability (if relevant):\nTravel/service fees (if any):\nAppointment requirements (walk-ins vs booking):\n\n5. FAQs:\nProvide at least 12 brief Q&A pairs that are relevant to this specific business type. Always include questions about: availability/hours, booking process, pricing/estimates, cancellations/refunds, timelines/turnaround, warranties/guarantees, emergencies/after-hours (if applicable), and what information the customer should provide to get an accurate quote. If the website or public profiles do not state an answer, respond with Not specified.\n\n6. Additional Info:\nUnique selling points:\nCertifications/licenses/insurance (if applicable):\nYears in business (if stated):\nTeam size (if stated):\nBrands/tools/platforms used (if relevant):\nGuarantees:\nMemberships/associations:\nReviews highlights (only if consistent across multiple sources):\nCommunity involvement:\n\nRemember: prioritize the official company website URL first, then supplement with other reputable public sources. Use Not specified rather than guessing.",
        },
        {
          role: 'user',
          content:
            `Company Name: ${companyNameRaw}\n` +
            `Company Website URL (if available): ${websiteLine}\n` +
            `Industry and Services (user provided): ${industryServicesRaw}`,
        },
      ],
    };

    const pplxResp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PPLX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pplxPayload),
    });

    const pplxJson = await pplxResp.json().catch(() => null);
    const kbRaw =
      pplxJson?.choices?.[0]?.message?.content ||
      '';

    const knowledgeBase = String(kbRaw || '').trim().slice(0, 12000) || 'Not specified';

    // --- Build the same Vapi assistant requestBody as your JS code node ---
    const systemMessageContent = `
You are Nova, a friendly, human-sounding inbound sales & scheduling specialist for ${companyNameRaw}.

Goal:
- Help the caller fast, build trust, and book the right next step (appointment/estimate).

How you sound:
- Natural, short sentences, contractions ("I'm", "we'll", "that's"), warm and confident.
- Ask ONE question at a time.
- Mirror the caller's tone (urgent → decisive, upset → empathetic).
- Never say you're an AI.

Flow (keep it tight):
1) What do you need help with? (one sentence)
2) What city/address is this for?
3) Best name + phone number
4) Timing: today/tomorrow/this week + morning/afternoon
5) Confirm: service + address + time window + phone

Pricing:
- If KB has it, say it clearly.
- If not, say "Not specified" and offer the fastest way to get an accurate quote (estimate / callback).

Rules:
- Do not invent pricing, policies, certifications, or service area.
- If not in KB, say "Not specified" and ask a quick clarifying question or offer a callback.

Knowledge Base (source of truth):
${knowledgeBase}
`.trim();

    const safeName =
      String(companyNameRaw || 'Assistant')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\-&]/g, '')
        .trim()
        .slice(0, 40) || 'Assistant';

    const baseKeywords = [
      'heating',
      'cooling',
      'air',
      'conditioner',
      'furnace',
      'thermostat',
      'plumbing',
      'leak',
      'renovation',
      'appointment',
      'booking',
      'reschedule',
      'cancel',
      'quote',
      'estimate',
      'emergency',
      'sameday',
      'availability',
      'waterheater',
      'drain',
      'sewer',
      'gasline',
    ];

    const companyKeyword = sanitizeKeywordStrict(`${companyNameRaw}:1`);
    const keywords = Array.from(new Set([companyKeyword, ...baseKeywords.map(sanitizeKeywordStrict)].filter(Boolean))).slice(0, 30);

    const requestBody = {
      name: safeName,
      voice: {
        model: 'eleven_turbo_v2',
        voiceId: '7EzWGsX10sAS4c9m9cPf',
        provider: '11labs',
        stability: 0.5,
        similarityBoost: 0.75,
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemMessageContent }],
      },
      firstMessage: `Thanks for calling ${companyNameRaw} — this is Alex. How can I help you today?`,
      maxDurationSeconds: 60,
      endCallMessage: `Perfect — thanks again for calling ${companyNameRaw}. Take care!`,
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en',
        keywords,
      },
    };

    // --- Create Vapi assistant ---
    const vapiResp = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const vapiJson = await vapiResp.json().catch(() => null);
    if (!vapiResp.ok) {
      return new Response(JSON.stringify({ error: 'Vapi create assistant failed', details: vapiJson }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assistantId = vapiJson?.id;
    if (!assistantId) {
      return new Response(JSON.stringify({ error: 'Vapi response missing assistant id' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Insert row into demo_pages (same as your Supabase node) ---
    const slug = makeSlug(companyNameRaw);

    const { error: insertErr } = await supabase.from('demo_pages').insert({
      slug,
      assistant_id: assistantId,
      system_prompt: systemMessageContent,
      first_message: requestBody.firstMessage,
      company_name: companyNameRaw,
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Failed to insert demo_pages row', details: insertErr }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Send Telegram notification (non-blocking) ---
    (async () => {
      try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const chatbotUrl = `https://infinitewealthsolutionsai.com/demo/${slug}`;

        const telegramPayload = {
          companyName: companyNameRaw,
          websiteUrl: websiteUrlRaw || undefined,
          industryServices: industryServicesRaw,
          // ✅ Contact info now included in Telegram notification
          contactName: contactName || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
          assistantId,
          slug,
          chatbotUrl,
        };

        await fetch(`${SUPABASE_URL}/functions/v1/telegram-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(telegramPayload),
        }).catch((err) => {
          console.error('Telegram notification failed:', err);
        });
      } catch (err) {
        console.error('Telegram notification error:', err);
      }
    })();

    return new Response(JSON.stringify({ assistantId, slug }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});