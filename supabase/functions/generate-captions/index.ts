import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ANTHROPIC_API_KEY=Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL=Deno.env.get("SUPABASE_URL");
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const REPURPOSE_PLANS=new Set(["viral","agency"]);
const CAPTION_LIMITS={starter:15,viral:100,agency:-1,free:0};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
function buildTone(tone){const t=(tone||"").toLowerCase();if(t.includes("alex hormozi"))return"Short punchy sentences. No fluff. ROI-focused.";if(t.includes("gary vee"))return"High energy. Conversational. Light emojis ok.";if(t.includes("luxury"))return"Calm confidence. Premium. No hype.";if(t.includes("casual"))return"Normal person talking. Warm and conversational.";if(t.includes("professional"))return"Clear, credible, polished.";if(t.includes("funny"))return"Genuinely funny. Dry wit.";return tone||"Natural and genuine. Not an AI.";}
const SYS="You are a social media ghostwriter. Sound completely human.\nNever use: game-changer, leverage, synergy, unlock, empower, transformative.\nNo fake urgency. Use contractions. Short sentences.\nReturn ONLY valid JSON, no markdown.\nFor YouTube: keys youtube_title (max 100 chars) and youtube (description).";
const PR={tiktok:"TikTok: 1-2 punchy lines. 2-4 hashtags.",instagram:"Instagram: Scroll-stopping first line. 3-8 lines. 3-6 hashtags.",facebook:"Facebook: Conversational. 2-4 sentences. 0-2 hashtags.",linkedin:"LinkedIn: Professional but human. 2-3 hashtags.",x:"X/Twitter: Under 270 chars. Sharp. 0-1 hashtags.",youtube:"YouTube: youtube_title (under 100 chars) and youtube (2-3 sentence description).",threads:"Threads: Casual. 1-3 sentences.",bluesky:"Bluesky: Thoughtful, direct. Under 200 chars."};
async function callClaude(sys,usr,max=3000){const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,system:sys,messages:[{role:"user",content:usr}]})});if(!r.ok)throw new Error("Claude error: "+await r.text());const d=await r.json();return(d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const supabase=createClient(SUPABASE_URL,SERVICE_KEY);
    const token=(req.headers.get("Authorization")??"").replace("Bearer ","").trim();
    const{data:{user}}=token?await supabase.auth.getUser(token):{data:{user:null}};
    if(!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id").eq("supabase_user_id",user.id).maybeSingle();
    const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
    const plan=((sub?.status==="active"||isPromo)&&sub?.plan)?sub.plan.toLowerCase():"free";
    const{mode,transcript,description,platforms,tone}=await req.json();
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
      const raw=await callClaude("You are a content strategist. Return ONLY valid JSON.","Tone: "+toneG+"\n\nContent:\n\""+source+"\"\n\nReturn JSON: {\"short_clips\":[{\"title\":\"string\",\"angle\":\"string\",\"platform\":\"string\"}],\"blog_angles\":[{\"headline\":\"string\",\"angle\":\"string\"}],\"social_hooks\":[\"string\"],\"series_ideas\":[{\"series_name\":\"string\",\"concept\":\"string\"}],\"other_formats\":[{\"format\":\"string\",\"concept\":\"string\"}]}\n3-4 items per section.");
      result={ideas:JSON.parse(raw)};
    }else if(mode==="repurpose_posts"){
      const raw=await callClaude("You are a ghostwriter. Sound like real people. Return ONLY valid JSON.","Tone: "+toneG+"\n\nContent:\n\""+source+"\"\n\nReturn JSON: {\"twitter\":[\"t1\",\"t2\",\"t3\",\"t4\",\"t5\",\"t6\",\"t7\",\"t8\",\"t9\",\"t10\"],\"linkedin\":[\"p1\",\"p2\",\"p3\",\"p4\",\"p5\",\"p6\",\"p7\",\"p8\",\"p9\",\"p10\"]}\nTweets under 270 chars. LinkedIn 100-300 words each.",4000);
      result={posts:JSON.parse(raw)};
    }else return new Response(JSON.stringify({error:"Invalid mode"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e.message||"Failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
