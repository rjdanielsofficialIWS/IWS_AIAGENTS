import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ANTHROPIC_API_KEY=Deno.env.get("ANTHROPIC_API_KEY");
const TAVILY_KEY=Deno.env.get("TAVILY_API_KEY");
const SUPABASE_URL=Deno.env.get("SUPABASE_URL");
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS_ORIGINS=["https://infinitewealthsolutionsai.com","https://www.infinitewealthsolutionsai.com"];
const corsFor=(req:Request)=>{const o=req.headers.get("Origin")??"";return{"Access-Control-Allow-Origin":CORS_ORIGINS.includes(o)?o:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};};
let cors:Record<string,string>={};
const REPURPOSE_PLANS=new Set(["viral","agency"]);
const CAPTION_LIMITS={starter:15,viral:100,agency:-1,free:0};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
function getCurrentDate(){return new Date().toISOString().slice(0,10);}
function buildTone(tone){const raw=(tone||"").trim();const t=raw.toLowerCase();if(t.includes("alex hormozi"))return`Primary voice profile: Alex Hormozi-inspired.\n- Short punchy sentences\n- High conviction\n- ROI-focused\n- Concrete and blunt\n- Zero fluff\n- Make every line feel useful\nUser-specified tone to honor heavily: ${raw}`;if(t.includes("gary vee"))return`Primary voice profile: Gary Vee-inspired.\n- Fast, energetic, direct\n- Conversational and raw\n- Motivational without sounding scripted\n- Punchy rhythm\n- No emojis\nUser-specified tone to honor heavily: ${raw}`;if(t.includes("luxury"))return`Primary voice profile: luxury.\n- Calm confidence\n- Premium restraint\n- Elegant simplicity\n- No hype, no cheap hooks\n- Precise wording\nUser-specified tone to honor heavily: ${raw}`;if(t.includes("casual"))return`Primary voice profile: casual.\n- Normal person talking\n- Warm and conversational\n- Easy to read out loud\n- Relaxed but still sharp\nUser-specified tone to honor heavily: ${raw}`;if(t.includes("professional"))return`Primary voice profile: professional.\n- Clear, credible, polished\n- Authoritative without sounding corporate\n- Smart and concise\nUser-specified tone to honor heavily: ${raw}`;if(t.includes("funny"))return`Primary voice profile: funny.\n- Dry wit\n- Human timing\n- Clever, not cheesy\n- No forced jokes\nUser-specified tone to honor heavily: ${raw}`;return raw?`Treat this tone instruction as a top-priority creative constraint and let it heavily shape vocabulary, rhythm, sentence length, confidence level, and emotional temperature:\n${raw}`:`Natural, high-conviction, highly human, contemporary, and non-robotic.`;}

async function tavilySearch(query: string, maxResults = 4): Promise<string> {
  if (!TAVILY_KEY) return "";
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_KEY, query, search_depth: "basic", max_results: maxResults, include_answer: true }),
    });
    if (!r.ok) return "";
    const d = await r.json();
    const answer = d.answer ? `Summary: ${d.answer}\n\n` : "";
    const results = (d.results ?? []).map((item: any, i: number) =>
      `[${i + 1}] ${item.title}\n${(item.content ?? "").slice(0, 350)}`
    ).join("\n\n");
    return (answer + results).slice(0, 2500).trim();
  } catch { return ""; }
}

const SYS = `You are a direct-response social copywriter with sharp platform instincts and strong editorial judgment. You turn source material into platform-native copy that earns attention, holds attention, and drives response.

Current date: ${getCurrentDate()}
Write with the timing and cultural instincts of someone publishing right now — not a generic timeless AI.

Source material rules:
- Mine the source for the single most specific, surprising, or counterintuitive point available
- That point becomes your hook — do not summarize the source, extract the sharpest signal from it
- Use concrete details from the source (numbers, specific situations, real stakes) over vague abstractions
- If live research context is provided, use it to sharpen specificity and timeliness

Hook mechanics — use a different one for each platform or variation:
- Pattern interrupt: say something that breaks the reader's expected train of thought
- Curiosity gap: make the payoff feel one scroll away without giving it away
- Stakes: make the cost of not knowing this feel real and immediate
- Contrarian claim: challenge a belief the reader already holds
- Transformation frame: specific before/after with real stakes
- Unexpected stat or observation: a number or fact that stops the scroll
- Direct challenge: speak to the reader's exact situation in a way that feels personal

Human writing rules:
- Sound like a real person with taste, a point of view, and a reason to post this
- Use natural contractions and varied sentence rhythm
- Short sentences after long ones hit harder — use this intentionally
- Prefer concrete details over generic claims
- Every line earns its place or gets cut
- Avoid robotic transitions and obvious AI phrasing

Non-negotiable bans:
- No em-dashes
- No emojis
- No markdown fences
- No generic marketing filler
- Never use: game-changer, leverage, synergy, unlock, empower, transformative, elevate, cutting-edge, dive deep, journey, landscape, streamline, it's important to note, in today's fast-paced world

Tone handling:
- The user's tone instruction is a top-priority creative constraint
- Let the requested tone heavily influence diction, pacing, intensity, sentence length, worldview, and attitude
- If the user asks for a specific voice, honor it strongly while keeping the output platform-native

Character limits — hard constraints, no exceptions:
- All non-YouTube posts: exactly 220–280 characters (spaces and punctuation count)
- Count every character before responding
- Under 220 = too short, rewrite until it hits the floor
- Over 280 = too long, cut until it fits the ceiling
- Never sacrifice the character range for any other instruction

Output rules:
- Return ONLY valid JSON
- For YouTube: keys youtube_title (max 100 chars) and youtube (description, 2-3 sentences)`;

const SYS_RP = `You are a direct-response social copywriter with sharp platform instincts and strong editorial judgment. Today is ${getCurrentDate()}.

Your job: generate a full set of posts where every single one stands alone, feels handwritten for its platform, and uses a hook mechanic no other post in the set uses.

Source material rules:
- Extract the sharpest, most specific insight from the source for each post
- One angle per post — no two posts share the same framing, hook type, opening structure, or emotional register
- If live research context is provided, use it to ground hooks in what is actually happening right now

Hook mechanics — embody a different one per post. Never name or label the mechanic, just execute it:
- Pattern interrupt (breaks expected train of thought)
- Curiosity gap (payoff feels one scroll away)
- Stakes/consequences (cost of not knowing this, right now)
- Contrarian claim (challenges a belief the reader holds)
- Transformation frame (before/after with specificity and stakes)
- Unexpected stat or observation (stops the scroll with specificity)
- Direct challenge (speaks to the reader's exact situation)
- Hard truth (says what the audience feels but has not said out loud)
- Micro-lesson (distills something complex to its sharpest, most usable form)
- Social proof frame (positions through credibility, results, or pattern recognition)

Character limits — hard constraints, no exceptions:
- Every post: exactly 220–280 characters (spaces and punctuation included)
- Count characters before finalising each post
- Under 220: too short — expand the hook or add a sharper line
- Over 280: too long — cut ruthlessly until it lands under the ceiling
- Never sacrifice the character range for tone, style, or any other rule

Non-negotiable bans:
- No em-dashes
- No emojis
- No markdown fences
- No generic filler or AI phrasing
- Sound current, sharp, and human`;

const PR={
  tiktok:"TikTok caption: 1-2 lines max. Spoken casual tone. Strong hook in first 5 words. 3-5 relevant hashtags. End with 'follow for part 2' or 'watch till the end' style CTA.",
  instagram:"Instagram caption: FIRST LINE must be a scroll-stopping hook (no more than 10 words, leaves a curiosity gap). Then line break. Then 3-6 short punchy paragraphs or bullet points. Relatable and specific. 3-6 strategic hashtags at end. End with an engagement CTA (comment, save, or share).",
  facebook:"Facebook caption: Open with a relatable scenario or bold statement. 2-4 conversational sentences. Tell a micro-story or share a specific insight. End with a question that sparks comments. 0-2 hashtags max.",
  linkedin:"LinkedIn post: Hard character range 220–280 — count every character, never go under 220 or over 280. Professional but human — not corporate. Hook in the first line. One sharp, specific insight or lesson. End with a thought-provoking question or CTA. 1-2 hashtags.",
  x:"X/Twitter: Hard character range 220–280 — count every character, never go under 220 or over 280. Sharp and punchy. One strong insight or contrarian take. 0-1 hashtags. No thread format. Must stand alone.",
  youtube:"YouTube: youtube_title under 100 chars (curiosity-driven, specific, no clickbait) and youtube description (2-3 sentences, what the video covers, natural keyword inclusion).",
  threads:"Threads: Hard character range 220–280 — count every character, never go under 220 or over 280. Casual, conversational, feels like a text to a friend. No hashtags.",
  bluesky:"Bluesky: Thoughtful and direct. Under 200 chars. Intellectual but approachable tone."
};
async function callClaude(sys,usr,max=3000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),55000);let r:Response;try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:max,system:sys,messages:[{role:"user",content:usr}]}),signal:ctrl.signal});}catch(e:any){clearTimeout(t);if(e?.name==="AbortError")throw new Error("AI generation timed out. Please try again.");throw e;}finally{clearTimeout(t);}if(!r.ok)throw new Error("Claude error: "+await r.text());const d=await r.json();const raw0=(d.content?.[0]?.text||"{}").replace(/```json|```/g,"").replace(/—/g,"-").trim();const s=raw0.indexOf("{");if(s===-1)return"{}";let depth=0,inStr=false,esc=false,end=-1;for(let i=s;i<raw0.length;i++){const c=raw0[i];if(esc){esc=false;continue;}if(c==="\\"&&inStr){esc=true;continue;}if(c==='"'){inStr=!inStr;continue;}if(inStr)continue;if(c==="{")depth++;else if(c==="}"){depth--;if(depth===0){end=i;break;}}}const extracted=end>=0?raw0.slice(s,end+1):raw0.slice(s);const sanitized=extracted.replace(/"(?:[^"\\]|\\.)*"/g,(m)=>m.replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t"));try{JSON.parse(sanitized);return sanitized;}catch{let fix=sanitized.replace(/,\s*$/,"").replace(/:\s*"[^"]*$/,': ""');const closers:string[]=[];let d2=0;for(const ch of fix){if(ch==="{"){d2++;closers.push("}");}else if(ch==="["){d2++;closers.push("]");}else if(ch==="}"||ch==="]"){d2--;closers.pop();}}fix+=closers.reverse().join("");try{JSON.parse(fix);return fix;}catch{return "{}";}}}
function extractJsonArray(raw:string){const cleaned=(raw||"").replace(/```json|```/g,"").replace(/—/g,"-").trim();const s=cleaned.indexOf("[");if(s===-1)return[];let depth=0,inStr=false,esc=false,end=-1;for(let i=s;i<cleaned.length;i++){const c=cleaned[i];if(esc){esc=false;continue;}if(c==="\\"&&inStr){esc=true;continue;}if(c==='"'){inStr=!inStr;continue;}if(inStr)continue;if(c==="[")depth++;else if(c==="]"){depth--;if(depth===0){end=i;break;}}}const extracted=end>=0?cleaned.slice(s,end+1):cleaned.slice(s);const sanitized=extracted.replace(/"(?:[^"\\]|\\.)*"/g,(m)=>m.replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t"));try{const parsed=JSON.parse(sanitized);return Array.isArray(parsed)?parsed:[];}catch{return[];}}
async function callClaudeJson(sys:string,usr:string,inputSchema:any,max=3000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),55000);let r:Response;try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:max,system:sys,messages:[{role:"user",content:usr}],tools:[{name:"output",description:"Output the result",input_schema:inputSchema}],tool_choice:{type:"tool",name:"output"}}),signal:ctrl.signal});}catch(e:any){clearTimeout(t);if(e?.name==="AbortError")throw new Error("AI generation timed out. Please try again.");throw e;}finally{clearTimeout(t);}if(!r.ok)throw new Error("Claude error: "+await r.text());const d=await r.json();const block=d.content?.find((c:any)=>c.type==="tool_use");if(!block?.input)throw new Error("Generation failed. Please try again.");return block.input;}
Deno.serve(async(req)=>{
  cors=corsFor(req);
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const supabase=createClient(SUPABASE_URL,SERVICE_KEY);
    const token=(req.headers.get("Authorization")??"").replace("Bearer ","").trim();
    const{data:{user}}=token?await supabase.auth.getUser(token):{data:{user:null}};
    if(!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id",user.id).maybeSingle();
    const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
    const isTrialing=sub?.status==="trialing"&&!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date();
    const plan=((sub?.status==="active"||isPromo||isTrialing)&&sub?.plan)?sub.plan.toLowerCase():"free";
    const{mode,transcript,description,platforms,tone,thread_count,post_count,topics:topicsBody}=await req.json();
    const source=transcript||description||"";
    const hasTopics=Array.isArray(topicsBody)&&topicsBody.some((t:any)=>String(t).trim().length>0);
    if(!source&&!hasTopics)return new Response(JSON.stringify({error:"Content required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    if((mode==="repurpose_ideas"||mode==="repurpose_posts")&&!REPURPOSE_PLANS.has(plan))return new Response(JSON.stringify({error:"upgrade_required",message:"Content Repurposing is available on Viral and Agency plans.",plan}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
    if(mode==="captions_from_video"||mode==="captions_from_description"){
      const cl=CAPTION_LIMITS[plan]??0;
      if(cl===0)return new Response(JSON.stringify({error:"upgrade_required",message:"Upgrade to generate AI captions.",plan}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
      if(cl!==-1){const period=getPeriod();const{data:u}=await supabase.from("usage_tracking").select("ai_analyses_used,caption_credits_bonus").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();const used=u?.ai_analyses_used??0,bonus=u?.caption_credits_bonus??0,eff=cl+bonus;if(used>=eff)return new Response(JSON.stringify({error:"limit_reached",message:"You have used all "+eff+" AI captions this month.",used,limit:eff,plan,feature:"captions"}),{status:429,headers:{...cors,"Content-Type":"application/json"}});}
      const toneG=buildTone(tone||"");
      const selP=(platforms??[]).filter(p=>typeof p==="string"&&p.trim().length>0);
      if(!selP.length)return new Response(JSON.stringify({error:"platforms required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});

      // Research: fetch live context for description-based captions (video transcripts are already content-rich)
      let researchBlock = "";
      if (mode === "captions_from_description" && source.trim()) {
        try {
          const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
          const intel = await tavilySearch(`${source.slice(0, 100)} ${month}`, 4);
          if (intel) researchBlock = `\n\nLIVE CONTEXT (use to sharpen hooks with current specificity — ground angles in what is actually happening right now where relevant):\n${intel}`;
        } catch { /* proceed without research */ }
      }

      const hasYT=selP.includes("youtube");
      const pInstr=selP.map(p=>PR[p]||p+": Write an engaging caption.").join("\n");
      const raw=await callClaude(SYS,"Tone:\n"+toneG+"\n\nContent:\n\""+source+"\""+researchBlock+"\n\nPlatforms: "+selP.join(", ")+"\n\n"+pInstr+"\n\nRespond ONLY with JSON.");
      const parsed=JSON.parse(raw);let youTubeTitle:string|undefined;
      if(hasYT&&parsed.youtube_title){youTubeTitle=parsed.youtube_title;}
      const captions=Object.fromEntries(selP.map(p=>[p,parsed[p]]).filter(([,v])=>typeof v==="string"&&(v as string).trim().length>0));
      for(const k of["x","twitter"]){if(typeof captions[k]==="string"&&captions[k].length>280)captions[k]=captions[k].slice(0,280);}
      const result={captions,...(youTubeTitle?{youTubeTitle}:{})};
      try{await supabase.rpc("increment_usage",{p_user_id:user.id,p_period:getPeriod(),p_field:"ai_analyses_used"});}catch(e){console.error("Usage increment failed:",e);}
      return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json"}});
    }else if(mode==="repurpose_ideas"){
      const toneG=buildTone(tone||"");
      const raw=await callClaude("You are a content strategist. Return ONLY valid JSON. Never use em-dashes (—) in any output.","Tone: "+toneG+"\n\nContent:\n\""+source+"\"\n\nReturn JSON: {\"short_clips\":[{\"title\":\"string\",\"angle\":\"string\",\"platform\":\"string\"}],\"blog_angles\":[{\"headline\":\"string\",\"angle\":\"string\"}],\"social_hooks\":[\"string\"],\"series_ideas\":[{\"series_name\":\"string\",\"concept\":\"string\"}],\"other_formats\":[{\"format\":\"string\",\"concept\":\"string\"}]}\n3-4 items per section.");
      return new Response(JSON.stringify({ideas:JSON.parse(raw)}),{headers:{...cors,"Content-Type":"application/json"}});
    }else if(mode==="repurpose_posts"){
      const toneG=buildTone(tone||"");
      const selP2=(platforms??[]).filter(p=>typeof p==="string"&&p.trim().length>0);
      const hasThreads=selP2.some(p=>p.toLowerCase()==="threads");
      const hasTwitter=selP2.some(p=>{const lp=p.toLowerCase();return lp==="x"||lp==="twitter";});
      const postPlatforms=[...new Set((selP2.length>0?selP2:["twitter","linkedin"]).map(p=>{const lp=p.toLowerCase();if(lp==="x"||lp==="twitter")return"twitter";if(lp==="linkedin")return"linkedin";if(lp==="threads")return"twitter";return"twitter";}))];
      const topicsRaw:string[]=Array.isArray(topicsBody)?topicsBody.map((t:any)=>String(t).trim()).filter(Boolean):[];
      const topicList=topicsRaw.length>0?topicsRaw.slice(0,3):[source];
      const postsPerTopic=topicList.length===1?10:topicList.length===2?5:4;

      // Research: fetch live context for the primary topic/source
      let researchBlock = "";
      try {
        const primaryTopic = topicList[0] || source;
        if (primaryTopic.trim()) {
          const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
          const intel = await tavilySearch(`${primaryTopic.slice(0, 100)} ${month}`, 4);
          if (intel) researchBlock = `\n\nLIVE CONTEXT (ground hooks in what is actually trending right now — use for specificity, not as subject matter to name-drop):\n${intel}`;
        }
      } catch { /* proceed without research */ }

      const buildPrompt=(topic:string)=>`Create exactly ${postsPerTopic} posts per platform from the content below. You MUST return exactly ${postsPerTopic} items in each platform array — no fewer.\n\nTone directive:\n${toneG}\n\nContent:\n"${topic}"${researchBlock}\n\nPlatforms: ${postPlatforms.join(", ")}\n\nUniversal rules:\n- every single post MUST use a completely different hook mechanic — embody it, never label it or name it\n- hook mechanics to rotate through: pattern interrupt, curiosity gap, stakes/consequences, contrarian claim, transformation frame, unexpected stat or observation, direct challenge, hard truth, micro-lesson, social proof frame\n- if two posts share the same opening structure, emotional register, or angle type, rewrite one of them\n- each post should feel natively written for its platform\n- avoid generic filler and AI phrasing\n- sound current and human\n\nPlatform rules:\n- twitter posts: between 200-280 characters (hard minimum 200, hard maximum 280 — count every character)\n- linkedin posts: 100-300 words, same hook mechanic diversity — different hook type and framing per post`;
      const inputSchema={type:"object",additionalProperties:false,properties:Object.fromEntries(postPlatforms.map((platform)=>[platform,{type:"array",items:{type:"string"},minItems:postsPerTopic,maxItems:postsPerTopic}])),required:postPlatforms};
      const allResults=await Promise.all(topicList.map(topic=>callClaudeJson(SYS_RP,buildPrompt(topic),inputSchema,Math.max(3000,postsPerTopic*postPlatforms.length*400))));
      const merged:Record<string,string[]>={};
      for(const res of allResults){for(const[k,v]of Object.entries(res as Record<string,unknown>)){const isTwitter=k==="twitter"||k==="x";const arr=Array.isArray(v)?v.map((x:any)=>{const s=String(x).trim();return isTwitter&&s.length>280?s.slice(0,280):s;}).filter(Boolean):[];if(arr.length){if(!merged[k])merged[k]=[];merged[k].push(...arr);}}}
      const validPosts:Record<string,string[]>=Object.fromEntries(Object.entries(merged).filter(([,arr])=>arr.length>0));
      if(hasThreads&&validPosts["twitter"]){validPosts["threads"]=validPosts["twitter"];}
      if(hasThreads&&!hasTwitter){delete validPosts["twitter"];}
      if(Object.keys(validPosts).length===0)throw new Error("Generation failed. Please try again.");
      return new Response(JSON.stringify({posts:validPosts}),{headers:{...cors,"Content-Type":"application/json"}});
    }else if(mode==="thread_posts"){
      const toneG=buildTone(tone||"");
      const tweetCount=Math.max(3,Math.min(10,Number(thread_count)||5));
      const raw=await callClaude("You are a ghostwriter. Sound like a real human. Return ONLY valid JSON. Never use em-dashes (—) in any output.","Tone: "+toneG+"\n\nTopic/content:\n\""+source+"\"\n\nWrite a Twitter/X thread of "+tweetCount+" tweets. Rules:\n- Each tweet MUST be strictly under 280 characters — hard limit, never exceed\n- First tweet is the hook — make it impossible to scroll past\n- Each tweet stands alone but flows into the next\n- No tweet numbering (no '1/' or '1.')\n- 0-1 hashtags per tweet max\n- Sound like a real person, not an AI\n- Last tweet must be a CTA (ask to share, follow, reply, save, tag someone, DM for more — feel human, never salesy)\n\nReturn JSON: {\"thread\":[\"tweet1\",\"tweet2\",\"tweet3\"]}",2000);
      const parsed=JSON.parse(raw);
      const thread:string[]=Array.isArray(parsed.thread)?parsed.thread.map((t:string)=>String(t).slice(0,280)):[];
      return new Response(JSON.stringify({thread}),{headers:{...cors,"Content-Type":"application/json"}});
    }else return new Response(JSON.stringify({error:"Invalid mode"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e.message||"Failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
