import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ANTHROPIC_API_KEY=Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL=Deno.env.get("SUPABASE_URL");
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS_ORIGINS=["https://infinitewealthsolutionsai.com","https://www.infinitewealthsolutionsai.com"];
const corsFor=(req:Request)=>{const o=req.headers.get("Origin")??"";return{"Access-Control-Allow-Origin":CORS_ORIGINS.includes(o)?o:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};};
let cors:Record<string,string>={};// defined per-request inside handler
const REPURPOSE_PLANS=new Set(["viral","agency"]);
const CAPTION_LIMITS={starter:15,viral:100,agency:-1,free:0};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
function buildTone(tone){const t=(tone||"").toLowerCase();if(t.includes("alex hormozi"))return"Short punchy sentences. No fluff. ROI-focused.";if(t.includes("gary vee"))return"High energy. Conversational. Light emojis ok.";if(t.includes("luxury"))return"Calm confidence. Premium. No hype.";if(t.includes("casual"))return"Normal person talking. Warm and conversational.";if(t.includes("professional"))return"Clear, credible, polished.";if(t.includes("funny"))return"Genuinely funny. Dry wit.";return tone||"Natural and genuine. Not an AI.";}
const SYS=`You are an elite social media ghostwriter with a proven track record of writing viral content for 7-figure creators and brands. Your captions convert scrollers into followers and followers into buyers.

Core rules (non-negotiable):
- Sound like a real human being talking — never like a marketing bot or AI
- Never use: game-changer, leverage, synergy, unlock, empower, transformative, elevate, cutting-edge, dive deep, journey, landscape, streamline, it's important to note, in today's fast-paced world
- Never use em-dashes (—) in any output. Use a comma, period, or rewrite the sentence instead
- No fake urgency or hype. No emojis unless the platform expects them
- Use contractions (I'm, we'll, that's, you're). Short punchy sentences
- Every first line must make the reader physically unable to scroll past
- Return ONLY valid JSON, no markdown, no code fences
- For YouTube: keys youtube_title (max 100 chars) and youtube (description, 2-3 sentences)`;
const PR={
  tiktok:"TikTok caption: 1-2 lines max. Spoken casual tone. Strong hook in first 5 words. 3-5 relevant hashtags. End with 'follow for part 2' or 'watch till the end' style CTA.",
  instagram:"Instagram caption: FIRST LINE must be a scroll-stopping hook (no more than 10 words, leaves a curiosity gap). Then line break. Then 3-6 short punchy paragraphs or bullet points. Relatable and specific. 3-6 strategic hashtags at end. End with an engagement CTA (comment, save, or share).",
  facebook:"Facebook caption: Open with a relatable scenario or bold statement. 2-4 conversational sentences. Tell a micro-story or share a specific insight. End with a question that sparks comments. 0-2 hashtags max.",
  linkedin:"LinkedIn post: Professional but human — not corporate. Hook in first line (must make people click 'see more'). Then line breaks between short paragraphs. Share a specific insight, lesson, or story. 3-4 paragraphs. End with a clear CTA or thought-provoking question. 2-3 relevant hashtags.",
  x:"X/Twitter: Strictly under 280 characters — this is a hard limit. Sharp and punchy. One strong insight or contrarian take. 0-1 hashtags. No thread format. Must stand alone.",
  youtube:"YouTube: youtube_title under 100 chars (curiosity-driven, specific, no clickbait) and youtube description (2-3 sentences, what the video covers, natural keyword inclusion).",
  threads:"Threads: Casual, conversational. 1-3 sentences. Feels like a text to a friend. No hashtags needed.",
  bluesky:"Bluesky: Thoughtful and direct. Under 200 chars. Intellectual but approachable tone."
};
async function callClaude(sys,usr,max=3000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),55000);let r:Response;try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:max,system:sys,messages:[{role:"user",content:usr}]}),signal:ctrl.signal});}catch(e:any){clearTimeout(t);if(e?.name==="AbortError")throw new Error("AI generation timed out. Please try again.");throw e;}finally{clearTimeout(t);}if(!r.ok)throw new Error("Claude error: "+await r.text());const d=await r.json();const raw0=(d.content?.[0]?.text||"{}").replace(/```json|```/g,"").replace(/—/g,"-").trim();const s=raw0.indexOf("{");if(s===-1)return"{}";let depth=0,inStr=false,esc=false,end=-1;for(let i=s;i<raw0.length;i++){const c=raw0[i];if(esc){esc=false;continue;}if(c==="\\"&&inStr){esc=true;continue;}if(c==='"'){inStr=!inStr;continue;}if(inStr)continue;if(c==="{")depth++;else if(c==="}"){depth--;if(depth===0){end=i;break;}}}const extracted=end>=0?raw0.slice(s,end+1):raw0.slice(s);// Sanitize literal control chars inside JSON string values before parsing
const sanitized=extracted.replace(/"(?:[^"\\]|\\.)*"/g,(m)=>m.replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t"));// Verify it parses; if not, attempt to close open structures
try{JSON.parse(sanitized);return sanitized;}catch{let fix=sanitized.replace(/,\s*$/,"").replace(/:\s*"[^"]*$/,': ""');const closers:string[]=[];let d2=0;for(const ch of fix){if(ch==="{"){d2++;closers.push("}");}else if(ch==="["){d2++;closers.push("]");}else if(ch==="}"||ch==="]"){d2--;closers.pop();}}fix+=closers.reverse().join("");try{JSON.parse(fix);return fix;}catch{return "{}";}}}
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
    const{mode,transcript,description,platforms,tone,thread_count}=await req.json();
    const source=transcript||description||"";
    if(!source)return new Response(JSON.stringify({error:"Content required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    if((mode==="repurpose_ideas"||mode==="repurpose_posts")&&!REPURPOSE_PLANS.has(plan))return new Response(JSON.stringify({error:"upgrade_required",message:"Content Repurposing is available on Viral and Agency plans.",plan}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
    if(mode==="captions_from_video"||mode==="captions_from_description"){
      const cl=CAPTION_LIMITS[plan]??0;
      if(cl===0)return new Response(JSON.stringify({error:"upgrade_required",message:"Upgrade to generate AI captions.",plan}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
      if(cl!==-1){const period=getPeriod();const{data:u}=await supabase.from("usage_tracking").select("ai_analyses_used,caption_credits_bonus").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();const used=u?.ai_analyses_used??0,bonus=u?.caption_credits_bonus??0,eff=cl+bonus;if(used>=eff)return new Response(JSON.stringify({error:"limit_reached",message:"You have used all "+eff+" AI captions this month.",used,limit:eff,plan,feature:"captions"}),{status:429,headers:{...cors,"Content-Type":"application/json"}});}
    }
    const toneG=buildTone(tone||"");
    const selP=(platforms??[]).filter(p=>typeof p==="string"&&p.trim().length>0);
    if(!selP.length&&(mode==="captions_from_video"||mode==="captions_from_description"))return new Response(JSON.stringify({error:"platforms required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    let result={};
    if(mode==="captions_from_video"||mode==="captions_from_description"){
      const hasYT=selP.includes("youtube");
      const pInstr=selP.map(p=>PR[p]||p+": Write an engaging caption.").join("\n");
      const raw=await callClaude(SYS,"Tone:\n"+toneG+"\n\nContent:\n\""+source+"\"\n\nPlatforms: "+selP.join(", ")+"\n\n"+pInstr+"\n\nRespond ONLY with JSON.");
      const parsed=JSON.parse(raw);let captions={...parsed},youTubeTitle;
      if(hasYT&&parsed.youtube_title){youTubeTitle=parsed.youtube_title;delete captions.youtube_title;}
      result={captions,...(youTubeTitle?{youTubeTitle}:{})};
      try{await supabase.rpc("increment_usage",{p_user_id:user.id,p_period:getPeriod(),p_field:"ai_analyses_used"});}catch(e){console.error("Usage increment failed:",e);}
    }else if(mode==="repurpose_ideas"){
      const raw=await callClaude("You are a content strategist. Return ONLY valid JSON. Never use em-dashes (—) in any output.","Tone: "+toneG+"\n\nContent:\n\""+source+"\"\n\nReturn JSON: {\"short_clips\":[{\"title\":\"string\",\"angle\":\"string\",\"platform\":\"string\"}],\"blog_angles\":[{\"headline\":\"string\",\"angle\":\"string\"}],\"social_hooks\":[\"string\"],\"series_ideas\":[{\"series_name\":\"string\",\"concept\":\"string\"}],\"other_formats\":[{\"format\":\"string\",\"concept\":\"string\"}]}\n3-4 items per section.");
      result={ideas:JSON.parse(raw)};
    }else if(mode==="repurpose_posts"){
      const POSTS_STYLE:Record<string,string>={twitter:"10 X/Twitter posts. Each strictly under 280 characters — hard limit, never exceed. Sharp hook, punchy, one strong insight per post. No thread format.",linkedin:"10 LinkedIn posts. Each 100-300 words. Professional but human tone. Strong first line that makes people click 'see more'. Line breaks between short paragraphs. End with a CTA or question.",threads:"10 Threads posts. Each under 500 characters. Casual and conversational, like a text to a friend."};
      const postPlatforms=[...new Set((selP.length>0?selP:["twitter","linkedin"]).map(p=>{const lp=p.toLowerCase();if(lp==="x"||lp==="twitter")return"twitter";if(lp==="linkedin")return"linkedin";if(lp==="threads")return"threads";return"twitter";}))];
      const schema="{"+postPlatforms.map(p=>`"${p}":["post1","post2","post3","post4","post5","post6","post7","post8","post9","post10"]`).join(",")+"}" ;
      const instructions=postPlatforms.map(p=>POSTS_STYLE[p]||p+": Write 10 engaging posts.").join("\n\n");
      const raw=await callClaude("You are a ghostwriter. Sound like real people. Return ONLY valid JSON. Never use em-dashes (—) in any output.","Tone: "+toneG+"\n\nContent:\n\""+source+"\"\n\n"+instructions+"\n\nReturn JSON: "+schema,4000);
      result={posts:JSON.parse(raw)};
    }else if(mode==="thread_posts"){
      const tweetCount=Math.max(3,Math.min(10,Number(thread_count)||5));
      const raw=await callClaude("You are a ghostwriter. Sound like a real human. Return ONLY valid JSON. Never use em-dashes (—) in any output.","Tone: "+toneG+"\n\nTopic/content:\n\""+source+"\"\n\nWrite a Twitter/X thread of "+tweetCount+" tweets. Rules:\n- Each tweet MUST be strictly under 280 characters — hard limit, never exceed\n- First tweet is the hook — make it impossible to scroll past\n- Each tweet stands alone but flows into the next\n- No tweet numbering (no '1/' or '1.')\n- 0-1 hashtags per tweet max\n- Sound like a real person, not an AI\n- Last tweet must be a CTA (ask to share, follow, reply, save, tag someone, DM for more — feel human, never salesy)\n\nReturn JSON: {\"thread\":[\"tweet1\",\"tweet2\",\"tweet3\"]}",2000);
      const parsed=JSON.parse(raw);
      const thread:string[]=Array.isArray(parsed.thread)?parsed.thread.map((t:string)=>String(t).slice(0,280)):[];
      result={thread};
    }else return new Response(JSON.stringify({error:"Invalid mode"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e.message||"Failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
