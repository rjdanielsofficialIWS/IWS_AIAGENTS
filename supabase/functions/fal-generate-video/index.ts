import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_ORIGINS=[
  "https://infinitewealthsolutionsai.com",
  "https://www.infinitewealthsolutionsai.com",
  "https://iws-aiagents.vercel.app",
];
// free=0: no video for unauthenticated/unsubscribed users
const VIDEO_LIMITS={starter:60,viral:180,agency:540,free:0};
const VALID_DURATIONS = new Set(["3","4","5","6","7","8","9","10","11","12","13","14","15"]);
const VALID_ASPECT_RATIOS = new Set(["16:9","9:16","1:1"]);

function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}

function json(body: unknown, status: number, cors: Record<string,string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDuration(value: unknown): string {
  const parsed = Number.parseInt(String(value ?? "5"), 10);
  const clamped = Math.max(3, Math.min(15, Number.isFinite(parsed) ? parsed : 5));
  const normalized = String(clamped);
  return VALID_DURATIONS.has(normalized) ? normalized : "5";
}

function normalizeAspectRatio(value: unknown): string {
  const aspect = cleanString(value);
  return VALID_ASPECT_RATIOS.has(aspect) ? aspect : "16:9";
}

function normalizeCfgScale(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function normalizeDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const [, contentType, base64] = match;
  if (!contentType.startsWith("image/")) throw new Error("Reference data URL must be an image");
  try { atob(base64); } catch { throw new Error("Invalid image data URL"); }
  return dataUrl;
}

function normalizeImageUrl(value: unknown): string {
  const url = cleanString(value);
  if (!url) return "";
  if (url.startsWith("data:")) return normalizeDataUrl(url);
  if (/^https?:\/\//i.test(url)) return url;
  throw new Error("Reference image must be an http(s) URL or a valid data URL");
}

Deno.serve(async(req)=>{
  const _o=req.headers.get("Origin")??"";const cors={"Access-Control-Allow-Origin":CORS_ORIGINS.includes(_o)?_o:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:cors});
  try{
    const auth=req.headers.get("Authorization")??"";
    if(!auth.startsWith("Bearer "))return json({error:"Unauthorized"},401,cors);
    const supabase=createClient(Deno.env.get("SUPABASE_URL") ?? "",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const{data:{user},error:ae}=await supabase.auth.getUser(auth.replace("Bearer ",""));
    if(ae||!user)return json({error:"Unauthorized"},401,cors);
    const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id",user.id).maybeSingle();
    const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
    const isTrialing=sub?.status==="trialing"&&!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date();
    const isActive=((sub?.status==="active"||isPromo)||isTrialing)&&!!sub?.plan;
    const plan=isActive?sub!.plan.toLowerCase():"free";
    if(plan==="free")return json({error:"upgrade_required",message:"AI video generation requires an active plan. Choose a plan to get started.",plan},403,cors);
    const body=await req.json();
    const prompt=cleanString(body.prompt ?? body.promptText ?? body.text);
    if(!prompt)return json({error:"prompt is required"},400,cors);
    const FAL=Deno.env.get("FAL_API_KEY");
    if(!FAL)throw new Error("FAL_API_KEY not configured");
    const textToVideo=body.textToVideo===true;
    const startImageUrl=normalizeImageUrl(body.startImageUrl ?? body.start_image_url ?? body.imageUrl ?? body.image_url);
    const endImageUrl=normalizeImageUrl(body.endImageUrl ?? body.end_image_url ?? body.tailImageUrl ?? body.tail_image_url);
    if(!textToVideo&&!startImageUrl)return json({error:"startImageUrl is required for image-to-video"},400,cors);
    const durationValue=normalizeDuration(body.duration);
    const secs=Number.parseInt(durationValue,10);
    const period=getPeriod();
    const planLimit=VIDEO_LIMITS[plan]??0;
    const{data:u}=await supabase.from("usage_tracking").select("video_seconds_used,video_seconds_bonus").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();
    const used=u?.video_seconds_used??0,bonus=u?.video_seconds_bonus??0,eff=planLimit+bonus,rem=eff-used;
    if(rem<=0)return json({error:"limit_reached",feature:"video_seconds",message:"You've used all "+eff+"s of AI video this month.",used,limit:eff,plan},429,cors);
    if(secs>rem)return json({error:"limit_reached",feature:"video_seconds",message:"Only "+rem+"s remaining. This "+secs+"s video would exceed your limit.",used,limit:eff,remaining:rem,plan},429,cors);

    let model: string;
    let payload: Record<string, unknown>;
    const basePayload: Record<string, unknown> = {
      prompt,
      duration: durationValue,
      generate_audio: typeof body.generateAudio === "boolean" ? body.generateAudio : body.generate_audio === true,
      shot_type: cleanString(body.shotType ?? body.shot_type) || "customize",
      aspect_ratio: normalizeAspectRatio(body.aspectRatio ?? body.aspect_ratio),
      negative_prompt: cleanString(body.negativePrompt ?? body.negative_prompt) || "blur, distort, and low quality",
      cfg_scale: normalizeCfgScale(body.cfgScale ?? body.cfg_scale),
    };
    if(textToVideo){
      model="fal-ai/kling-video/v3/pro/text-to-video";
      payload={...basePayload};
    } else {
      model="fal-ai/kling-video/v3/pro/image-to-video";
      payload={...basePayload,start_image_url:startImageUrl};
      if(endImageUrl)payload.end_image_url=endImageUrl;
    }
    console.log("fal-generate-video submit",JSON.stringify({model,textToVideo,promptLength:prompt.length,inputKeys:Object.keys(payload),duration:durationValue,aspectRatio:payload.aspect_ratio}));
    const sr=await fetch("https://queue.fal.run/"+model,{method:"POST",headers:{"Authorization":"Key "+FAL,"Content-Type":"application/json"},body:JSON.stringify({input:payload})});
    const rt=await sr.text();let sd;try{sd=JSON.parse(rt);}catch{throw new Error("fal non-JSON ("+sr.status+"): "+rt.slice(0,300));}
    if(!sr.ok)throw new Error("fal failed ("+sr.status+"): "+JSON.stringify(sd));
    if(!sd.request_id)throw new Error("No request_id from fal.ai");
    try{await supabase.rpc("increment_video_seconds",{p_user_id:user.id,p_period:period,p_seconds:secs});}catch(e){console.error("Seconds deduction failed:",e);}
    return json({requestId:sd.request_id,model,statusUrl:sd.status_url,responseUrl:sd.response_url,secondsDeducted:secs,secondsRemaining:rem-secs},200,cors);
  }catch(e: any){console.error("fal-generate-video error:",e);return json({error:e?.message ?? "Internal server error"},500,cors);}
});
