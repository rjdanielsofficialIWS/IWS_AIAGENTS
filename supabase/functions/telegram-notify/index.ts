const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadData {
  companyName: string;
  websiteUrl?: string;
  industryServices: string;
  assistantId: string;
  slug: string;
  chatbotUrl?: string;
  // ✅ Contact info fields
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Missing Telegram configuration");
      return new Response(
        JSON.stringify({ error: "Telegram not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = (await req.json().catch(() => null)) as LeadData | null;

    if (!body || !body.companyName || !body.assistantId) {
      return new Response(JSON.stringify({ error: "Invalid lead data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const websiteDisplay = body.websiteUrl || "Not provided";
    const chatbotUrl = body.chatbotUrl
      ? `\n🔗 Demo Page: ${body.chatbotUrl}`
      : "";

    // ✅ Contact info lines — only shown if provided
    const contactLines = [
      body.contactName  ? `👤 Name: ${body.contactName}`   : null,
      body.contactEmail ? `📧 Email: ${body.contactEmail}` : null,
      body.contactPhone ? `📞 Phone: ${body.contactPhone}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const contactSection = contactLines ? `\n\n--- Contact Info ---\n${contactLines}` : "";

    const message = `🎉 NEW LEAD RECEIVED

🏢 Company: ${body.companyName}
🌐 Website: ${websiteDisplay}
💼 Industry: ${body.industryServices}
🤖 Assistant ID: ${body.assistantId}
📄 Demo Slug: ${body.slug}${chatbotUrl}${contactSection}
⏰ Submitted: ${new Date().toLocaleString()}`;

    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Telegram API error:", result);
      return new Response(
        JSON.stringify({
          error: "Failed to send Telegram notification",
          details: result,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, messageId: result.result.message_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Telegram notify error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});