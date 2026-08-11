const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckoutItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const provider: string = (body.provider ?? "stripe").toLowerCase();
    const customerName: string = (body.customer_name ?? "")
      .toString()
      .slice(0, 120);
    const customerEmail: string = (body.customer_email ?? "")
      .toString()
      .slice(0, 320);
    const shippingAddress: string = (body.shipping_address ?? "")
      .toString()
      .slice(0, 500);
    const items: CheckoutItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "No items in cart" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const origin = req.headers.get("origin") || "https://example.com";

    if (provider === "stripe") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return new Response(
          JSON.stringify({
            error:
              "Stripe is not configured. Add STRIPE_SECRET_KEY as an edge function secret to enable live payments.",
            provider: "stripe",
            configured: false,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const lineItems = items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      const sessionRes = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            mode: "payment",
            success_url: `${origin}/#/payments?status=success`,
            cancel_url: `${origin}/#/payments?status=cancelled`,
            customer_email: customerEmail,
            line_items: JSON.stringify(lineItems),
            "metadata[customer_name]": customerName,
            "metadata[shipping_address]": shippingAddress,
          }),
        },
      );

      if (!sessionRes.ok) {
        const errText = await sessionRes.text();
        console.error(`Stripe error: ${errText}`);
        return new Response(
          JSON.stringify({ error: "Failed to create Stripe session" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const session = await sessionRes.json();
      return new Response(
        JSON.stringify({
          provider: "stripe",
          checkout_url: session.url,
          session_id: session.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (provider === "xendit") {
      const xenditKey = Deno.env.get("XENDIT_SECRET_KEY");
      if (!xenditKey) {
        return new Response(
          JSON.stringify({
            error:
              "Xendit is not configured. Add XENDIT_SECRET_KEY as an edge function secret to enable live payments.",
            provider: "xendit",
            configured: false,
          }),
          {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const invoiceRes = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(xenditKey + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: `portfolio-${Date.now()}`,
          amount: total,
          currency: "USD",
          success_redirect_url: `${origin}/#/payments?status=success`,
          failure_redirect_url: `${origin}/#/payments?status=cancelled`,
          payer_email: customerEmail || undefined,
          description: `Order by ${customerName || "Customer"}`,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
        }),
      });

      if (!invoiceRes.ok) {
        const errText = await invoiceRes.text();
        console.error(`Xendit error: ${errText}`);
        return new Response(
          JSON.stringify({ error: "Failed to create Xendit invoice" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const invoice = await invoiceRes.json();
      return new Response(
        JSON.stringify({
          provider: "xendit",
          checkout_url: invoice.invoice_url,
          session_id: invoice.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown provider. Use 'stripe' or 'xendit'." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export {};
