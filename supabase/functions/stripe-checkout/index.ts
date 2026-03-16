import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const PLAN_PRICE_IDS={"starter":"price_1TBNx6E9lvvsgykljqvbHkNt","viral":"price_1TBNx9E9lvvsgyklTfsIiHGQ","agency":"price_1TBNxCE9lvvsgyklJwtWCfHP"};
const ADDON_PRICE_IDS={"video_60s":{priceId:"price_1TBNxeE9lvvsgyklaQbyEvOg",videoSeconds:60,label:"60 Video Seconds"},"video_180s":{priceId:"price_1TBNxhE9lvvsgyklh6cbC8NV",videoSeconds:180,label:"180 Video Seconds"},"captions_25":{priceId:"price_1TBNxlE9lvvsgyklSgVMQdY2",captionCredits:25,label:"25 Caption Credits"},"captions_100":{priceId:"price_1TBNxnE9lvvsgyklWqYQQbPh",captionCredits:100,label:"100 Caption Credits"}};
const REFERRAL_COUPON_ID="yfctlvZ1";
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    const stripe=new Stripe(Deno.env.get("STRIPE_SECRET_KEY"),{apiVersion:"2024-06-20",httpClient:Stripe.createFetchHttpClient()});
    const supabase=createClient(Deno.env.get("SUPABASE_URL"),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const token=(req.headers.get("Authorization")??"").replace("Bearer ","");
    const{data:{user},error:authErr}=await supabase.auth.getUser(token);
    if(authErr||!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
    const body=await req.json();
    const plan=body.plan?.toLowerCase();
    const addon=body.addon?.toLowerCase();
    const{data:existingSub}=await supabase.from("subscriptions").select("stripe_customer_id").eq("supabase_user_id",user.id).maybeSingle();
    let customerId=existingSub?.stripe_customer_id;
    if(!customerId||customerId.startsWith("promo_")){const c=await stripe.customers.create({email:user.email,metadata:{supabase_user_id:user.id}});customerId=c.id;}
    if(addon){
      const ac=ADDON_PRICE_IDS[addon];
      if(!ac)return new Response(JSON.stringify({error:"Invalid addon"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
      const s=await stripe.checkout.sessions.create({customer:customerId,payment_method_types:["card"],mode:"payment",line_items:[{price:ac.priceId,quantity:1}],success_url:body.successUrl||"https://infinitewealthsolutionsai.com/MediaMachine?addon_success="+addon,cancel_url:body.cancelUrl||"https://infinitewealthsolutionsai.com/MediaMachine",metadata:{supabase_user_id:user.id,addon_type:addon,video_seconds:String(ac.videoSeconds??0),caption_credits:String(ac.captionCredits??0)}});
      return new Response(JSON.stringify({url:s.url,addon,label:ac.label}),{status:200,headers:{...cors,"Content-Type":"application/json"}});
    }
    if(!plan||!PLAN_PRICE_IDS[plan])return new Response(JSON.stringify({error:"Invalid plan"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    const{data:referral}=await supabase.from("referrals").select("id").eq("referred_user_id",user.id).maybeSingle();
    const sp={customer:customerId,payment_method_types:["card"],mode:"subscription",line_items:[{price:PLAN_PRICE_IDS[plan],quantity:1}],success_url:body.successUrl||"https://infinitewealthsolutionsai.com/MediaMachine?checkout=success",cancel_url:body.cancelUrl||"https://infinitewealthsolutionsai.com/MediaMachine?checkout=canceled",metadata:{supabase_user_id:user.id,plan},subscription_data:{metadata:{supabase_user_id:user.id,plan}},allow_promotion_codes:true};
    if(referral){sp.discounts=[{coupon:REFERRAL_COUPON_ID}];delete sp.allow_promotion_codes;}
    const s=await stripe.checkout.sessions.create(sp);
    return new Response(JSON.stringify({url:s.url,referralDiscount:!!referral}),{status:200,headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
