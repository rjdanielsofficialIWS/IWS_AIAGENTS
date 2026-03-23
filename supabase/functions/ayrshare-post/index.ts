import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const LATE_API_KEY="sk_1adb5186f3be9a2321b4c2ede480187d250c324f03fce819cc22632d19abb7c2";
const LATE_API_URL="https://getlate.dev/api/v1";
const MEDIA_REQUIRED=new Set(["youtube","tiktok","instagram"]);
const VIDEO_ONLY=new Set(["youtube","tiktok"]);
const PLAN_LIMITS={starter:{posts:100,platforms:3},viral:{posts:100,platforms:-1},agency:{posts:-1,platforms:-1}};
function getPeriod(){const d=new Date();return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0");}
Deno.serve(async(req)=>{
  const _o=req.headers.get("Origin")??"";const _allowed=["https://infinitewealthsolutionsai.com","https://www.infinitewealthsolutionsai.com"].includes(_o)?_o:"https://infinitewealthsolutionsai.com";
  const cors={"Access-Control-Allow-Origin":_allowed,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  const respond=(code,data)=>new Response(JSON.stringify(data),{status:code,headers:cors});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false}});
  let userId="";
  const token=(req.headers.get("Authorization")??"").replace("Bearer ","").trim();
  if(token){const{data:{user},error}=await supabase.auth.getUser(token);if(!error&&user)userId=user.id;}
  let body;try{body=await req.json();}catch{return respond(400,{error:"Invalid JSON"});}
  if(!userId)userId=body.userId??"";
  if(!userId)return respond(401,{error:"Not authenticated."});
  const{data:sub}=await supabase.from("subscriptions").select("plan,status,stripe_customer_id,current_period_end").eq("supabase_user_id",userId).maybeSingle();
  const isPromo=sub?.stripe_customer_id?.startsWith("promo_");
  const isTrialing=sub?.status==="trialing"&&!!sub?.current_period_end&&new Date(sub.current_period_end)>new Date();
  const isActive=(sub?.status==="active"||isPromo||isTrialing)&&!!sub?.plan;
  const plan=isActive?sub!.plan.toLowerCase():"free";
  if(plan==="free")return respond(403,{error:"upgrade_required",message:"You need an active subscription to post.",plan});
  const limits=PLAN_LIMITS[plan]??{posts:0,platforms:0};
  const period=getPeriod();
  if(limits.posts!==-1){const{data:usage}=await supabase.from("usage_tracking").select("posts_scheduled").eq("supabase_user_id",userId).eq("period",period).maybeSingle();const used=usage?.posts_scheduled??0;if(used>=limits.posts)return respond(429,{error:"limit_reached",feature:"posts",message:"You have scheduled "+used+" of "+limits.posts+" posts this month.",used,limit:limits.posts,plan});}
  const platforms=body.platforms??[];
  const post=body.post??"";
  const mediaUrls=body.mediaUrls??[];
  const scheduleDate=body.scheduleDate??"";
  const threadPosts:string[]=Array.isArray(body.thread)?body.thread.filter((t:unknown)=>typeof t==="string"&&(t as string).trim()):[];
  const isCarousel:boolean=body.carousel===true;
  // Keep original platform IDs for cache lookup; map to API names only in the request
  const rawPlatforms=platforms.filter((p:unknown)=>typeof p==="string"&&(p as string).trim().length>0);
  const toApiName=(p:string)=>p==="x"?"twitter":p;
  const cleanPlatforms=rawPlatforms.map(toApiName);
  if(limits.platforms!==-1&&cleanPlatforms.length>limits.platforms)return respond(403,{error:"platform_limit",feature:"platforms",message:"Your "+plan+" plan supports up to "+limits.platforms+" platform(s) per post.",plan});
  if(!cleanPlatforms.length||!post)return respond(400,{error:"platforms and post required"});
  if(post.length>50000)return respond(400,{error:"Post content exceeds maximum length"});
  if(mediaUrls.length>10)return respond(400,{error:"Too many media URLs"});
  const invalidMedia=mediaUrls.find((u:unknown)=>typeof u!=="string"||(u as string).length>2000);
  if(invalidMedia!==undefined)return respond(400,{error:"Invalid media URL"});
  const needsMedia=cleanPlatforms.filter(p=>MEDIA_REQUIRED.has(p));
  if(needsMedia.length>0&&mediaUrls.length===0)return respond(400,{error:needsMedia.map(p=>p[0].toUpperCase()+p.slice(1)).join(", ")+" require media."});
  const isVideoUrl=(url:string)=>/\.(mp4|mov|webm|avi|mkv|m4v)/i.test(url);
  const hasVideo=mediaUrls.some(isVideoUrl);
  const voP=cleanPlatforms.filter(p=>VIDEO_ONLY.has(p));
  if(voP.length>0&&mediaUrls.length>0&&!hasVideo)return respond(400,{error:voP.map(p=>p[0].toUpperCase()+p.slice(1)).join(", ")+" only accept video files."});
  try{
    const workspaceId:string=typeof body.workspaceId==="string"?body.workspaceId.trim():"";
    let profileKey="";
    let cc:Array<{id?:string;profile?:string;platform?:string;accountId?:string}>=[];
    if(workspaceId){
      const{data:ws}=await supabase.from("workspaces").select("profile_key,cached_channels").eq("id",workspaceId).eq("owner_user_id",userId).maybeSingle();
      if(ws?.profile_key){profileKey=ws.profile_key;cc=Array.isArray(ws.cached_channels)?ws.cached_channels:[];}
    }
    if(!profileKey){
      const{data:profile}=await supabase.from("ayrshare_profiles").select("profile_key,cached_channels").eq("supabase_user_id",userId).maybeSingle();
      if(!profile?.profile_key)return respond(400,{error:"No connected accounts found."});
      profileKey=profile.profile_key;
      cc=Array.isArray(profile.cached_channels)?profile.cached_channels:[];
    }
    // Look up by both original ID (e.g. "x") and API name (e.g. "twitter") to handle reconnects
    const pp=rawPlatforms.map((raw:string)=>{
      const api=toApiName(raw);
      const c=cc.find((ch:{id?:string;profile?:string;platform?:string;accountId?:string})=>
        (ch.id||"").toLowerCase()===raw||
        (ch.id||"").toLowerCase()===api||
        (ch.profile||"").toLowerCase()===raw||
        (ch.profile||"").toLowerCase()===api||
        (ch.platform||"").toLowerCase()===raw||
        (ch.platform||"").toLowerCase()===api
      );
      return{platform:api,accountId:c?.accountId||c?.id||""};
    }).filter((p:{platform:string;accountId:string})=>p.accountId);
    if(pp.length===0)return respond(400,{error:"No connected accounts for selected platforms."});
    let lb:Record<string,unknown>;
    if(threadPosts.length>0){
      const firstItem:Record<string,unknown>={content:post};
      if(mediaUrls.length>0)firstItem.mediaItems=mediaUrls.map((url:string)=>({type:isVideoUrl(url)?"video":"image",url}));
      const threadItems=[firstItem,...threadPosts.map((t:string)=>({content:t}))];
      lb={content:post,platforms:pp.map((p:{platform:string;accountId:string})=>({...p,platformSpecificData:{threadItems}}))};
    }else{
      lb={content:post,platforms:pp};
      if(mediaUrls.length>0){
        if(isCarousel){
          lb.mediaItems=mediaUrls.map((url:string)=>({type:"image",url}));
        }else{
          lb.mediaItems=mediaUrls.map((url:string)=>({type:isVideoUrl(url)?"video":"image",url}));
        }
      }
    }
    if(scheduleDate){lb.scheduledFor=new Date(scheduleDate).toISOString();}else{lb.publishNow=true;}
    console.log("API request:",JSON.stringify(lb));
    const lateRes=await fetch(LATE_API_URL+"/posts?profileId="+profileKey,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+LATE_API_KEY},body:JSON.stringify(lb),redirect:"follow"});
    const result=await lateRes.json();
    const isError=!lateRes.ok;
    const errorMsg=isError?(result.message||result.error||"API error "+lateRes.status):null;
    if(isError)console.error("API error:",lateRes.status,JSON.stringify(result),"sent:",JSON.stringify(lb));
    try{await supabase.from("scheduled_posts").insert({supabase_user_id:userId,profile_key:profileKey,ayrshare_post_id:result._id??result.id??null,platforms:rawPlatforms,content:post,media_urls:mediaUrls,scheduled_at:scheduleDate?new Date(scheduleDate).toISOString():new Date().toISOString(),status:isError?"error":(scheduleDate?"scheduled":"published"),error:errorMsg??null,workspace_id:workspaceId||null});}catch(e){console.error("DB insert failed:",e);}
    if(!isError){try{await supabase.rpc("increment_usage",{p_user_id:userId,p_period:period,p_field:"posts_scheduled"});}catch(e){console.error("Usage increment failed:",e);}}
    if(isError)return respond(500,{error:errorMsg,detail:result});
    return respond(200,{success:true,postId:result._id||result.id,result});
  }catch(e){console.error("ayrshare-post error:",e);return respond(500,{error:"Failed to publish post"});}
});
