/// <reference types="deno" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are the AI assistant embedded in Joshua G.'s portfolio website. You help visitors — potential clients, recruiters, and employers — understand what Joshua can build and how he works.

About Joshua:
- Full-stack systems engineer based in Malabon City, Philippines
- Currently a Software Engineer at Co Ban Kiat Hardware Inc.
- Contact: jayrroullo16@gmail.com

What Joshua builds:
- Web, desktop, and mobile applications
- E-commerce with full back office: product catalog, order management, POS, fulfillment, reporting
- Warehouse management: inventory, weighing, receiving, distribution, delivery
- Distribution management systems
- Mobile commerce ("shop on the go")
- RESTful API design and integration
- AI assistants with structured outputs (Groq, OpenAI)
- Payment integration: Stripe, Xendit, webhooks
- Shopify and SAP integration

Tech stack:
- React.js, Next.js, TypeScript, Laravel, MySQL, MSSQL
- Modern API and webhook-driven architectures
- Process mapping, UAT planning, release pipelines, production support

How to answer:
- Be concise (under 150 words), professional, and warm
- Answer based only on the information above — do not invent projects or claims
- If asked about availability or hiring, encourage them to use the contact form on the portfolio
- If asked something outside Joshua's work, politely redirect to his capabilities
- You are running on a Groq/OpenAI-powered edge function, which demonstrates Joshua's ability to integrate LLMs into real applications`;

const FALLBACK_REPLIES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["payment", "stripe", "xendit", "checkout", "pay"],
    reply:
      "Joshua integrates Stripe and Xendit for payment processing — including checkout flows, webhook handling for order status updates, refunds, and reconciliation. The POS demo on this site includes a simulated checkout that creates real orders in the database. To enable live payments, a Stripe or Xendit API key would be configured.",
  },
  {
    keywords: ["ai", "assistant", "llm", "groq", "openai", "grok", "chatbot"],
    reply:
      "This assistant itself is the demo — it runs on a Groq/OpenAI-powered edge function with a system prompt grounded in Joshua's actual experience. Joshua builds AI assistants that return structured data your application can use, not just chat responses. Ask me about payments, commerce, warehouse, or APIs to see more.",
  },
  {
    keywords: ["warehouse", "inventory", "distribution", "delivery", "stock"],
    reply:
      "Joshua builds warehouse management systems covering inventory tracking, weighing, receiving, distribution, and delivery workflows. These systems turn physical operations into reliable data that teams can act on — connected to e-commerce and back-office tools.",
  },
  {
    keywords: ["pos", "back office", "back-office", "point of sale", "cashier"],
    reply:
      "The POS + Back Office demo on this site is a working example. It includes a product catalog, point-of-sale terminal with cart and checkout, a dashboard with sales and stock alerts, product management, and order tracking — all backed by a real database with atomic order creation.",
  },
  {
    keywords: ["hire", "available", "work", "contact", "email", "reach"],
    reply:
      "Joshua is available for select projects. The best way to reach him is through the contact form on this portfolio — just scroll to the 'Let's Build' section at the bottom. You can also email him directly at jayrroullo16@gmail.com.",
  },
  {
    keywords: [
      "tech",
      "stack",
      "react",
      "next",
      "typescript",
      "laravel",
      "api",
    ],
    reply:
      "Joshua works with a modern stack: React.js, Next.js, TypeScript, Laravel, MySQL, and MSSQL. He designs RESTful APIs and webhook-driven architectures, and integrates platforms like Shopify and SAP into custom systems.",
  },
];

function getFallbackReply(message: string): string {
  const lower = message.toLowerCase();
  const match = FALLBACK_REPLIES.find((r) =>
    r.keywords.some((k) => lower.includes(k)),
  );
  return match
    ? match.reply
    : "I'm Joshua's portfolio assistant. I can tell you about his work in e-commerce, warehouse management, POS systems, RESTful APIs, AI assistants, and payment integration (Stripe/Xendit). Ask me about any of these, or use the contact form to start a conversation.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message: string = (body.message ?? "").toString().slice(0, 800);
    const history: { role: string; content: string }[] = Array.isArray(
      body.history,
    )
      ? body.history
      : [];

    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!groqKey && !openaiKey) {
      return new Response(
        JSON.stringify({ reply: getFallbackReply(message), fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = groqKey || openaiKey;
    const endpoint = groqKey
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = groqKey ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const llmResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error(`LLM API error ${llmResponse.status}: ${errText}`);
      return new Response(
        JSON.stringify({ reply: getFallbackReply(message), fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await llmResponse.json();
    const reply =
      data.choices?.[0]?.message?.content || getFallbackReply(message);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export {};
