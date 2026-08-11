import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CreditCard,
  ScanLine,
  Store,
  Store as StoreIcon,
} from "lucide-react";
import { AssistantChat } from "@/components/AssistantChat";
import { PosTerminal } from "@/components/PosTerminal";
import { BackOffice } from "@/components/BackOffice";
import { Storefront } from "@/components/Storefront";

type Route = "home" | "assistant" | "pos" | "payments" | "storefront";

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace("#/", "").replace("#", "");
  if (
    hash === "assistant" ||
    hash === "pos" ||
    hash === "payments" ||
    hash === "storefront"
  )
    return hash;
  return "home";
}

export function DemoApp() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const handler = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (route === "assistant")
    return <AssistantDemo onBack={() => (window.location.hash = "#/")} />;
  if (route === "pos")
    return <PosDemo onBack={() => (window.location.hash = "#/")} />;
  if (route === "payments")
    return <PaymentDemo onBack={() => (window.location.hash = "#/")} />;
  if (route === "storefront")
    return <Storefront onBack={() => (window.location.hash = "#/")} />;
  return null;
}

export function getDemoLinks() {
  return [
    {
      route: "storefront" as Route,
      icon: StoreIcon,
      label: "E-Commerce Storefront + Back Office",
      desc: "Customer-facing online shop with cart, checkout, and real Stripe / Xendit payment integration",
      tag: "Stripe · Xendit · Shopify",
    },
    {
      route: "pos" as Route,
      icon: ScanLine,
      label: "POS + Back Office",
      desc: "Point-of-sale terminal with full back office: dashboard, products, orders, customers, analytics, and channel management",
      tag: "Full system",
    },
    {
      route: "assistant" as Route,
      icon: Bot,
      label: "AI Assistant",
      desc: "Live LLM-powered chat grounded in Joshua's experience, running on a Groq / OpenAI edge function",
      tag: "Groq · OpenAI",
    },
    {
      route: "payments" as Route,
      icon: CreditCard,
      label: "Payment Architecture",
      desc: "Stripe and Xendit checkout flow with webhook-driven order updates and signed verification",
      tag: "Stripe · Xendit",
    },
  ];
}

function DemoHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <header className="demo-header">
      <div className="section-wrap demo-header-inner">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to portfolio
        </button>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

function AssistantDemo({ onBack }: { onBack: () => void }) {
  return (
    <div className="demo-page">
      <DemoHeader
        title="AI Assistant"
        subtitle="Real LLM integration running on a Groq/OpenAI-powered edge function"
        onBack={onBack}
      />
      <div className="section-wrap demo-content">
        <AssistantChat />
      </div>
    </div>
  );
}

function PosDemo({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"pos" | "backoffice">("pos");
  return (
    <div className="demo-page">
      <DemoHeader
        title="POS + Back Office"
        subtitle="A working commerce system — point-of-sale terminal, product catalog, order management, stock control, customers, analytics, and channels"
        onBack={onBack}
      />
      <div className="section-wrap demo-content">
        <div className="pos-view-toggle">
          <button
            className={view === "pos" ? "active" : ""}
            onClick={() => setView("pos")}
          >
            <ScanLine size={16} /> POS Terminal
          </button>
          <button
            className={view === "backoffice" ? "active" : ""}
            onClick={() => setView("backoffice")}
          >
            <Store size={16} /> Back Office
          </button>
        </div>
        {view === "pos" ? <PosTerminal /> : <BackOffice />}
      </div>
    </div>
  );
}

function PaymentDemo({ onBack }: { onBack: () => void }) {
  return (
    <div className="demo-page">
      <DemoHeader
        title="Payment Integration"
        subtitle="Stripe and Xendit checkout architecture with webhook-driven order updates"
        onBack={onBack}
      />
      <div className="section-wrap demo-content">
        <div className="payment-demo">
          <div className="payment-flow-diagram">
            <div className="flow-step">
              <div className="flow-icon">
                <CreditCard size={24} />
              </div>
              <h3>1. Checkout</h3>
              <p>
                Customer completes order in the storefront or POS. The system
                calls a secure edge function to create a payment session.
              </p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="flow-icon">
                <CreditCard size={24} />
              </div>
              <h3>2. Payment Gateway</h3>
              <p>
                Stripe or Xendit processes the card, e-wallet, or bank transfer
                on their hosted page. No sensitive data touches our servers.
              </p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <div className="flow-icon">
                <Store size={24} />
              </div>
              <h3>3. Webhook</h3>
              <p>
                The gateway sends a signed webhook to our edge function. We
                verify the signature, update the order status, and adjust stock.
              </p>
            </div>
          </div>

          <div className="payment-architecture">
            <h3>Architecture</h3>
            <div className="arch-grid">
              <div className="arch-card">
                <h4>Edge Function: create-checkout</h4>
                <p>
                  Receives the cart from the storefront or POS, creates a Stripe
                  Checkout Session or Xendit invoice, returns the hosted payment
                  URL.
                </p>
                <code>POST /functions/v1/create-checkout</code>
              </div>
              <div className="arch-card">
                <h4>Edge Function: payment-webhook</h4>
                <p>
                  Receives signed webhook events from Stripe/Xendit, verifies
                  the signature using the Stripe SDK, updates order status and
                  stock atomically.
                </p>
                <code>POST /functions/v1/payment-webhook</code>
              </div>
              <div className="arch-card">
                <h4>Database: create_storefront_order()</h4>
                <p>
                  SECURITY DEFINER function that handles stock decrement, order
                  creation, line items, and customer profile upsert in a single
                  transaction.
                </p>
                <code>SECURITY DEFINER · atomic</code>
              </div>
              <div className="arch-card">
                <h4>Multi-Channel Orders</h4>
                <p>
                  Orders from storefront, POS, and Shopify are unified with
                  channel tracking. The back office shows revenue by channel and
                  syncs inventory.
                </p>
                <code>storefront + POS + Shopify</code>
              </div>
            </div>
          </div>

          <div className="payment-status">
            <div className="payment-status-card">
              <div className="status-pending">
                <CreditCard size={20} />
              </div>
              <h3>Ready for Activation</h3>
              <p>
                This payment architecture is fully designed and deployed. To
                enable live payments, add a <code>STRIPE_SECRET_KEY</code> or{" "}
                <code>XENDIT_SECRET_KEY</code> as an edge function secret. Once
                configured, the storefront checkout will redirect to a real
                hosted payment page.
              </p>
              <div className="payment-providers">
                <div className="provider-badge">
                  <CreditCard size={16} /> Stripe — global card payments
                </div>
                <div className="provider-badge">
                  <CreditCard size={16} /> Xendit — Southeast Asia payments
                </div>
              </div>
            </div>
          </div>

          <div className="payment-try-it">
            <h3>Try the Full Flow</h3>
            <p>
              The e-commerce storefront includes real checkout with Stripe and
              Xendit. Head there to browse products, add to cart, and go through
              the payment flow.
            </p>
            <button
              className="button button-light"
              onClick={() => (window.location.hash = "#/storefront")}
            >
              Open Storefront →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
