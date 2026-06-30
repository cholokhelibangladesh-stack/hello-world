import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { video_id, bkash_number } = await req.json();

    // ── IDOR check: verify the caller owns this video before any payment work ──
    const { data: videoRow, error: videoLookupError } = await supabase
      .from("videos")
      .select("id, user_id")
      .eq("id", video_id)
      .maybeSingle();

    if (videoLookupError) {
      return new Response(JSON.stringify({ error: videoLookupError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!videoRow || videoRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // ── bKash Payment Gateway Integration ──
    // Check for bKash API credentials
    const BKASH_APP_KEY = Deno.env.get("BKASH_APP_KEY");
    const BKASH_APP_SECRET = Deno.env.get("BKASH_APP_SECRET");
    const BKASH_USERNAME = Deno.env.get("BKASH_USERNAME");
    const BKASH_PASSWORD = Deno.env.get("BKASH_PASSWORD");
    const BKASH_BASE_URL = Deno.env.get("BKASH_BASE_URL") || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

    let transactionId: string;
    let paymentMethod = "bkash";

    if (BKASH_APP_KEY && BKASH_APP_SECRET && BKASH_USERNAME && BKASH_PASSWORD) {
      // ── Real bKash API Flow ──
      // Step 1: Get token
      const tokenRes = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          username: BKASH_USERNAME,
          password: BKASH_PASSWORD,
        },
        body: JSON.stringify({
          app_key: BKASH_APP_KEY,
          app_secret: BKASH_APP_SECRET,
        }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.id_token) {
        return new Response(JSON.stringify({ error: "bKash token grant failed", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const idToken = tokenData.id_token;

      // Step 2: Create payment
      const paymentRes = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
          "X-APP-Key": BKASH_APP_KEY,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: bkash_number,
          callbackURL: `${supabaseUrl}/functions/v1/process-payment-callback`,
          amount: "100",
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: `INV-${Date.now()}`,
        }),
      });
      const paymentData = await paymentRes.json();

      if (paymentData.paymentID) {
        // Step 3: Execute payment
        const executeRes = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: idToken,
            "X-APP-Key": BKASH_APP_KEY,
          },
          body: JSON.stringify({ paymentID: paymentData.paymentID }),
        });
        const executeData = await executeRes.json();

        if (executeData.statusCode === "0000" || executeData.transactionStatus === "Completed") {
          transactionId = executeData.trxID || paymentData.paymentID;
        } else {
          return new Response(JSON.stringify({ error: "bKash payment execution failed", details: executeData }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "bKash payment creation failed", details: paymentData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // ── Simulation fallback (no bKash credentials configured) ──
      transactionId = `BK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // Create payment record
    const { data: payment, error: payError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        video_id,
        amount: 100.00,
        method: paymentMethod,
        status: "success",
        transaction_id: transactionId,
      })
      .select()
      .single();

    if (payError) {
      return new Response(JSON.stringify({ error: payError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update video status to live
    await supabase
      .from("videos")
      .update({ status: "live" })
      .eq("id", video_id)
      .eq("user_id", user.id);

    // Create certificate record
    const { data: cert } = await supabase
      .from("certificates")
      .insert({
        user_id: user.id,
        video_id,
        payment_id: payment.id,
        certificate_url: null,
      })
      .select()
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      transaction_id: transactionId,
      payment_id: payment.id,
      certificate_id: cert?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
