import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS_ORIGINS=["https://infinitewealthsolutionsai.com","https://www.infinitewealthsolutionsai.com"];
const PLAN_LIMITS={
  starter:{ai_captions_per_month:15,posts_per_month:30,platforms_allowed:3,video_seconds_per_month:60,strategies_per_month:0,repurpose_allowed:false,ai_ideas_allowed:false},
  viral:  {ai_captions_per_month:100,posts_per_month:100,platforms_allowed:-1,video_seconds_per_month:180,strategies_per_month:4,repurpose_allowed:true,ai_ideas_allowed:true},
  agency: {ai_captions_per_month:-1,posts_per_month:-1,platforms_allowed:-1,video_seconds_per_month:540,strategies_per_month:-1,repurpose_allowed:true,ai_ideas_allowed:true},
  free:   {ai_captions_per_month:0,posts_per_month:0,platforms_allowed:0,video_seconds_per_month:0,strategies_per_month:0,repurpose_allowed:false,ai_ideas_allowed:false},
};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
Deno.serve(async(req)=>{
  const _o=req.headers.get("Origin")??"";const cors={"Access-Control-Allow-Origin":CORS_ORIGINS.includes(_o)?_o:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, content-type"};
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"");
  const token=(req.headers.get("Authorization")??"").replace("Bearer ","").trim();
  if(!token)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const{data:{user},error}=await supabase.auth.getUser(token);
  if(error||!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id",user.id).maybeSingle();
  const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
  const isTrialing=sub?.status==="trialing"&&!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date();
  const isActive=((sub?.status==="active"||isPromo)||isTrialing)&&!!sub?.plan;
  const plan=isActive?sub!.plan.toLowerCase():"free";
  const limits=PLAN_LIMITS[plan]??PLAN_LIMITS.free;
  const period=getPeriod();
  const{data:u}=await supabase.from("usage_tracking").select("ai_analyses_used,posts_scheduled,video_seconds_used,video_seconds_bonus,caption_credits_bonus").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();
  const usage={ai_captions_used:u?.ai_analyses_used??0,posts_scheduled:u?.posts_scheduled??0,video_seconds_used:u?.video_seconds_used??0,video_seconds_bonus:u?.video_seconds_bonus??0,caption_credits_bonus:u?.caption_credits_bonus??0,strategies_used:0};
  // strategies_used may not exist as a column yet — query separately and handle gracefully
  try{const{data:su}=await supabase.from("usage_tracking").select("strategies_used").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();usage.strategies_used=su?.strategies_used??0;}catch{/* column not yet migrated */}
  const effectiveLimits={...limits,video_seconds_per_month:limits.video_seconds_per_month===-1?-1:limits.video_seconds_per_month+(u?.video_seconds_bonus??0),ai_captions_per_month:limits.ai_captions_per_month===-1?-1:limits.ai_captions_per_month+(u?.caption_credits_bonus??0)};
  return new Response(JSON.stringify({
    plan,isActive,limits:effectiveLimits,usage,period,
    at_caption_limit:effectiveLimits.ai_captions_per_month!==-1&&usage.ai_captions_used>=effectiveLimits.ai_captions_per_month,
    at_post_limit:effectiveLimits.posts_per_month!==-1&&usage.posts_scheduled>=effectiveLimits.posts_per_month,
    at_video_limit:effectiveLimits.video_seconds_per_month!==-1&&usage.video_seconds_used>=effectiveLimits.video_seconds_per_month,
    at_strategy_limit:limits.strategies_per_month!==0&&limits.strategies_per_month!==-1&&usage.strategies_used>=limits.strategies_per_month,
  }),{headers:{...cors,"Content-Type":"application/json"}});
});
