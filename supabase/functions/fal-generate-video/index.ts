import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
const CORS_ORIGINS=["https://infinitewealthsolutionsai.com","https://www.infinitewealthsolutionsai.com"];
// free=0: no video for unauthenticated/unsubscribed users
const VIDEO_LIMITS={starter:60,viral:180,agency:540,free:0};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
Deno.serve(async(req)=>{
  const _o=req.headers.get("Origin")??"";const cors={"Access-Control-Allow-Origin":CORS_ORIGINS.includes(_o)?_o:CORS_ORIGINS[0],"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:cors});
  try{
    const auth=req.headers.get("Authorization")??"";
    if(!auth.startsWith("Bearer "))return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const supabase=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const{data:{user},error:ae}=await supabase.auth.getUser(auth.replace("Bearer ",""));
    if(ae||!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id",user.id).maybeSingle();
    const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
    const isTrialing=sub?.status==="trialing"&&!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date();
    const isActive=((sub?.status==="active"||isPromo)||isTrialing)&&!!sub?.plan;
    const plan=isActive?sub!.plan.toLowerCase():"free";
    if(plan==="free")return new Response(JSON.stringify({error:"upgrade_required",message:"AI video generation requires an active plan. Choose a plan to get started.",plan}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
    const{imageUrl,tailImageUrl,prompt,duration,aspectRatio,textToVideo,style}=await req.json();
    if(!prompt)return new Response(JSON.stringify({error:"prompt is required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    if(!textToVideo&&!imageUrl)return new Response(JSON.stringify({error:"imageUrl is required for image-to-video"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    const secs=parseInt(String(duration??5),10);
    const period=getPeriod();
    const planLimit=VIDEO_LIMITS[plan]??0;
    const{data:u}=await supabase.from("usage_tracking").select("video_seconds_used,video_seconds_bonus").eq("supabase_user_id",user.id).eq("period",period).maybeSingle();
    const used=u?.video_seconds_used??0,bonus=u?.video_seconds_bonus??0,eff=planLimit+bonus,rem=eff-used;
    if(rem<=0)return new Response(JSON.stringify({error:"limit_reached",feature:"video_seconds",message:"You've used all "+eff+"s of AI video this month.",used,limit:eff,plan}),{status:429,headers:{...cors,"Content-Type":"application/json"}});
    if(secs>rem)return new Response(JSON.stringify({error:"limit_reached",feature:"video_seconds",message:"Only "+rem+"s remaining. This "+secs+"s video would exceed your limit.",used,limit:eff,remaining:rem,plan}),{status:429,headers:{...cors,"Content-Type":"application/json"}});
    const FAL=Deno.env.get("FAL_API_KEY");
    if(!FAL)throw new Error("FAL_API_KEY not configured");
    let model,payload;
    if(textToVideo){
      model="fal-ai/kling-video/v2.1/master/text-to-video";
      payload={prompt,duration:String(secs),aspect_ratio:aspectRatio||"16:9",negative_prompt:"blurry, low quality, watermark, ugly, distorted",cfg_scale:0.5,generate_audio:style==="speaking"?false:true};
    } else {
      model="fal-ai/kling-video/v3/pro/image-to-video";
      payload={prompt,image_url:imageUrl,duration:String(secs),aspect_ratio:aspectRatio||"16:9",negative_prompt:"blurry, low quality, watermark, text overlay, ugly, distorted, scene change, different background",cfg_scale:0.7,generate_audio:style==="speaking"?false:true};
      if(tailImageUrl)payload.tail_image_url=tailImageUrl;
    }
    const sr=await fetch("https://queue.fal.run/"+model,{method:"POST",headers:{"Authorization":"Key "+FAL,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const rt=await sr.text();let sd;try{sd=JSON.parse(rt);}catch{throw new Error("fal non-JSON ("+sr.status+"): "+rt.slice(0,300));}
    if(!sr.ok)throw new Error("fal failed ("+sr.status+"): "+JSON.stringify(sd));
    if(!sd.request_id)throw new Error("No request_id from fal.ai");
    try{await supabase.rpc("increment_video_seconds",{p_user_id:user.id,p_period:period,p_seconds:secs});}catch(e){console.error("Seconds deduction failed:",e);}
    return new Response(JSON.stringify({requestId:sd.request_id,model,statusUrl:sd.status_url,responseUrl:sd.response_url,secondsDeducted:secs,secondsRemaining:rem-secs}),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
