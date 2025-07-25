/*
  # Stripe Checkout Session Creation

  This Edge Function creates a Stripe Checkout Session for the Premium AI Agent plan.
  
  ## Features
  - Creates checkout session with setup fee and monthly subscription
  - Handles CORS for browser requests
  - Returns checkout URL for frontend redirection
  
  ## Environment Variables Required
  - STRIPE_SECRET_KEY: Your Stripe secret key from the dashboard
  
  ## Usage
  POST /functions/v1/stripe-checkout
  Body: { success_url: string, cancel_url: string }
*/

import { corsHeaders } from '../_shared/cors.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { success_url, cancel_url } = await req.json();

    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'success_url and cancel_url are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Stripe
    const stripe = new (await import('npm:stripe@latest')).default(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Create Checkout Session
    // Note: You'll need to replace these price IDs with your actual Stripe Price IDs
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_setup_fee_199', // Replace with your actual setup fee price ID
          quantity: 1,
        },
        {
          price: 'price_monthly_399', // Replace with your actual monthly subscription price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        plan: 'premium',
        setup_fee: '199.99',
        monthly_fee: '399.99',
      },
      subscription_data: {
        metadata: {
          plan: 'premium',
        },
      },
    });

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});