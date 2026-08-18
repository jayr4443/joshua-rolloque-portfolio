import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  Code2,
  Database,
  Layers3,
  Mail,
  MapPin,
  Phone,
  Menu,
  PlugZap,
  ScanLine,
  Send,
  ServerCog,
  ShoppingBag,
  Sparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { DemoApp, getDemoLinks } from "@/components/DemoApp";

const capabilities = [
  {
    icon: ShoppingBag,
    eyebrow: "Commerce systems",
    title: "E-commerce that runs the business",
    text: "Customer-facing storefronts paired with practical back offices for products, orders, fulfillment, and reporting.",
  },
  {
    icon: Boxes,
    eyebrow: "Operations",
    title: "Warehouse to delivery",
    text: "Inventory, weighing, receiving, distribution, and service workflows designed around how teams actually work.",
  },
  {
    icon: Code2,
    eyebrow: "Product engineering",
    title: "Web, desktop, and mobile",
    text: "Reliable applications across browser, desktop, and on-the-go experiences, with one consistent system underneath.",
  },
  {
    icon: PlugZap,
    eyebrow: "Integrations",
    title: "APIs that connect the stack",
    text: "RESTful services, Shopify, SAP, payments, and webhook-driven workflows that keep data moving.",
  },
];

const projects = [
  {
    number: "01",
    type: "Commerce platform",
    title: "Retail operations, from checkout to control room.",
    description:
      "A scalable e-commerce foundation with back-office tools for catalog, order handling, and fulfillment visibility.",
    tags: ["React", "Laravel", "REST API"],
    tone: "lime",
  },
  {
    number: "02",
    type: "Warehouse intelligence",
    title: "Every movement accounted for.",
    description:
      "Connected weighing, inventory, receiving, and delivery workflows that turn physical operations into reliable data.",
    tags: ["MSSQL", "Desktop", "SAP"],
    tone: "blue",
  },
  {
    number: "03",
    type: "Global AI Storefront Localizer",
    title: "One catalog. Every market.",
    description:
      "AI-assisted translation, local tone, currency context, and structured product data for storefronts that feel native anywhere.",
    tags: ["AI workflow", "Structured output", "Shopify"],
    tone: "amber",
  },
];

const timeline = [
  {
    year: "2023 — now",
    title: "Software Engineer · Co Ban Kiat Hardware Inc.",
    text: "Maintaining and improving high-use web and desktop systems across performance, data integrity, operations, and delivery.",
  },
  {
    year: "Core practice",
    title: "Build the system around the workflow",
    text: "From process maps and UAT plans to release pipelines and production support, the work stays connected to the people using it.",
  },
  {
    year: "Next chapter",
    title: "AI-native product experiences",
    text: "Bringing structured AI workflows into commerce, localization, support, and the tools that make teams faster.",
  },
];

const demoLinks = getDemoLinks();

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [formStatus, setFormStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const visibleProjects = showAllProjects ? projects : projects.slice(0, 2);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    try {
      // Using FormSubmit.co - completely free and works with Cloudflare
      const response = await fetch(
        "https://formsubmit.co/ajax/jayrroullo16@gmail.com",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: name,
            email: email,
            message: message,
            _subject: `Portfolio Inquiry from ${name}`,
            _captcha: "false",
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.success !== false) {
        setFormStatus("sent");
        form.reset();
        // Auto-reset after 5 seconds
        setTimeout(() => setFormStatus("idle"), 5000);
      } else {
        setFormStatus("error");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setFormStatus("error");
      // Auto-reset after 5 seconds
      setTimeout(() => setFormStatus("idle"), 5000);
    }
  }

  return (
    <div className="site-shell">
      <DemoApp />

      <header className="topbar">
        <a
          className="brand"
          href="#top"
          aria-label="Joshua G. Rolloque — portfolio home"
        >
          <span className="brand-mark">
            <Sparkles size={16} />
          </span>
          <span>JOSHUA G. ROLLOQUE</span>
        </a>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <a href="#capabilities" onClick={() => setMenuOpen(false)}>
            What I build
          </a>
          <a href="#demos" onClick={() => setMenuOpen(false)}>
            Live demos
          </a>
          <a href="#work" onClick={() => setMenuOpen(false)}>
            Selected work
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>
        </nav>
        <a className="nav-cta" href="#contact">
          Start a conversation <ArrowUpRight size={15} />
        </a>
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow reveal">
              <span className="status-pulse" /> FULL-STACK ENGINEER · MALABON
              CITY, PH
            </div>
            <h1 className="display reveal-delay-one">
              I build the
              <br />
              <em>systems behind</em>
              <br />
              what's next.
            </h1>
            <p className="hero-text reveal-delay-two">
              Web, desktop, mobile, and AI workflows for teams that need their
              ideas to work in the real world — from the first API call to the
              last delivered order.
            </p>
            <div className="hero-actions reveal-delay-two">
              <a className="button button-primary" href="#demos">
                Try the live demos <ArrowUpRight size={17} />
              </a>
              <a className="text-link" href="#contact">
                Have a system in mind? <ChevronRight size={16} />
              </a>
            </div>
            <div className="hero-meta reveal-delay-three">
              <span>
                <MapPin size={14} /> Philippines
              </span>
              <span>
                <Zap size={14} /> Available for select projects
              </span>
            </div>
          </div>
          <div
            className="hero-visual reveal-delay-one"
            aria-label="System architecture visualization"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-core">
              <Layers3 size={28} />
              <span>
                the
                <br />
                whole
                <br />
                <b>system</b>
              </span>
            </div>
            <div className="orbit-node node-api">
              <ServerCog size={17} />
              <span>API</span>
            </div>
            <div className="orbit-node node-ai">
              <Bot size={17} />
              <span>AI</span>
            </div>
            <div className="orbit-node node-data">
              <Database size={17} />
              <span>DATA</span>
            </div>
            <div className="visual-caption">
              <span>01</span>
              <span>Systems thinking / applied daily</span>
            </div>
          </div>
        </section>

        <section className="proof-strip">
          <div className="proof-marquee">
            <div className="proof-track">
              <span className="proof-label">BUILT WITH</span>
              <span>React.js</span>
              <span>Next.js</span>
              <span>Vite</span>
              <span>Node.js</span>
              <span>Express.js</span>
              <span>TypeScript</span>
              <span>PHP</span>
              <span>HTML</span>
              <span>CSS</span>
              <span>JavaScript</span>
              <span>Tailwind CSS</span>
              <span>Lighting CSS</span>
              <span>Bootstrap</span>
              <span>Laravel</span>
              <span>MySQL / MSSQL</span>
              <span>PostgreSQL</span>
              <span>Supabase</span>
              <span>SAP</span>
              <span>REST APIs</span>
              <span>AI workflows</span>
              <span>React Native</span>
              <span>Kotlin</span>
              <span>Java</span>
              <span>Gradle</span>
            </div>
            {/* duplicate track for seamless looping */}
            <div className="proof-track" aria-hidden="true">
              <span className="proof-label">BUILT WITH</span>
              <span>React.js</span>
              <span>Next.js</span>
              <span>Vite</span>
              <span>Node.js</span>
              <span>Express.js</span>
              <span>TypeScript</span>
              <span>PHP</span>
              <span>HTML</span>
              <span>CSS</span>
              <span>JavaScript</span>
              <span>Tailwind CSS</span>
              <span>Lighting CSS</span>
              <span>Bootstrap</span>
              <span>Laravel</span>
              <span>MySQL / MSSQL</span>
              <span>PostgreSQL</span>
              <span>Supabase</span>
              <span>SAP</span>
              <span>REST APIs</span>
              <span>AI workflows</span>
              <span>React Native</span>
              <span>Kotlin</span>
              <span>Java</span>
              <span>Gradle</span>
            </div>
          </div>
        </section>

        <section
          className="section-wrap capabilities section-space"
          id="capabilities"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / CAPABILITIES</span>
              <h2>
                More than an interface.
                <br />
                <em>A working advantage.</em>
              </h2>
            </div>
            <p>
              Good software meets people where they are. I bring product
              thinking, systems discipline, and a practical understanding of the
              operations underneath.
            </p>
          </div>
          <div className="capability-grid">
            {capabilities.map(({ icon: Icon, eyebrow, title, text }) => (
              <article className="capability-card" key={title}>
                <div className="card-icon">
                  <Icon size={21} />
                </div>
                <span className="card-eyebrow">{eyebrow}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="card-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="marquee-band">
          <div className="marquee-track">
            <span>MAKE IT USEFUL</span>
            <i>✦</i>
            <span>MAKE IT SCALE</span>
            <i>✦</i>
            <span>MAKE IT HUMAN</span>
            <i>✦</i>
            <span>MAKE IT USEFUL</span>
            <i>✦</i>
          </div>
        </section>

        <section
          className="section-wrap demos-section section-space"
          id="demos"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / LIVE DEMOS</span>
              <h2>
                Don't just read about it.
                <br />
                <em>Try it yourself.</em>
              </h2>
            </div>
            <p>
              These aren't screenshots or mockups. Every demo below is a real,
              working application backed by a live database, edge functions, and
              the same architecture I build for clients.
            </p>
          </div>
          <div className="demo-grid">
            {demoLinks.map(({ route, icon: Icon, label, desc, tag }) => {
              const isExternal =
                route.startsWith("http://") || route.startsWith("https://");
              const href = isExternal ? route : `#/${route}`;

              return (
                <a
                  key={route}
                  className="demo-card"
                  href={href}
                  target={isExternal ? "_blank" : "_self"}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={!isExternal ? scrollToTop : undefined}
                >
                  <div className="demo-card-top">
                    <div className="demo-card-icon">
                      <Icon size={24} />
                    </div>
                    <span className="demo-card-tag">{tag}</span>
                  </div>
                  <h3>{label}</h3>
                  <p>{desc}</p>
                  <span className="demo-card-cta">
                    Launch demo <ArrowUpRight size={16} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="section-wrap work section-space" id="work">
          <div className="section-heading work-heading">
            <div>
              <span className="eyebrow">03 / SELECTED WORK</span>
              <h2>
                Complex problems,
                <br />
                <em>clear outcomes.</em>
              </h2>
            </div>
            <button
              className="text-link"
              onClick={() => setShowAllProjects(!showAllProjects)}
            >
              {showAllProjects ? "Show less" : "View all work"}{" "}
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="project-list">
            {visibleProjects.map((project) => (
              <article
                className={`project-card ${project.tone}`}
                key={project.number}
              >
                <div className="project-index">{project.number}</div>
                <div className="project-content">
                  <span className="card-eyebrow">{project.type}</span>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="tag-row">
                    {project.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="project-link">
                  <ArrowUpRight size={21} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="section-wrap ai-section section-space"
          id="approach"
        >
          <div className="ai-panel">
            <div className="ai-copy">
              <span className="eyebrow">04 / AI, WITH GUARDRAILS</span>
              <h2>
                Useful intelligence.
                <br />
                <em>Grounded in your system.</em>
              </h2>
              <p>
                Not a chatbot bolted onto the side. I build assistants around
                trusted product data, clear permissions, and structured outputs
                that your application can actually use.
              </p>
              <div className="ai-stack">
                <span>
                  <Bot size={15} /> Groq / OpenAI ready
                </span>
                <span>
                  <Workflow size={15} /> Tool-aware flows
                </span>
                <span>
                  <Check size={15} /> System-only context
                </span>
              </div>
              <a
                className="button button-primary"
                href="#/assistant"
                onClick={scrollToTop}
              >
                Try the live assistant <ArrowUpRight size={15} />
              </a>
            </div>
            <div className="ai-visual">
              <div className="ai-visual-grid">
                <div className="ai-visual-card">
                  <Bot size={20} />
                  <span>System prompt</span>
                </div>
                <div className="ai-visual-card">
                  <Database size={20} />
                  <span>Product data</span>
                </div>
                <div className="ai-visual-card">
                  <Workflow size={20} />
                  <span>Structured output</span>
                </div>
                <div className="ai-visual-card">
                  <Check size={20} />
                  <span>Safe to use</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-wrap story section-space">
          <div className="story-intro">
            <span className="eyebrow">05 / THE PRACTICE</span>
            <h2>
              From process
              <br />
              <em>to product.</em>
            </h2>
            <p>
              Every strong application starts with understanding the work around
              it. That is where I'm most useful: connecting business rules,
              technical decisions, and the experience people have every day.
            </p>
          </div>
          <div className="timeline">
            {timeline.map((item, index) => (
              <div className="timeline-item" key={item.title}>
                <span className="timeline-number">0{index + 1}</span>
                <div>
                  <span className="timeline-year">{item.year}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="section-wrap contact-inner">
            <div>
              <span className="eyebrow">06 / LET'S BUILD</span>
              <h2>
                Have a real problem
                <br />
                <em>worth solving?</em>
              </h2>
              <p>
                Tell me what you're working on. I'll bring the questions, the
                systems view, and a practical path forward.
              </p>
              <div className="contact-details">
                <a href="mailto:jayrroullo16@gmail.com">
                  <Mail size={16} /> jayrroullo16@gmail.com
                </a>
                <span>
                  <MapPin size={16} /> Malabon City, Philippines
                </span>
                <span>
                  <Phone size={16} /> +63 912 345 6789
                </span>
              </div>
            </div>
            <form className="inquiry-form" onSubmit={submitInquiry}>
              <label>
                <span>Your name</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  placeholder="Jane / Team name"
                />
              </label>
              <label>
                <span>Work email</span>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                />
              </label>
              <label>
                <span>What are you building?</span>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="A storefront, warehouse system, API, AI workflow..."
                />
              </label>
              <button
                className="button button-light"
                type="submit"
                disabled={formStatus === "sending"}
              >
                {formStatus === "sending"
                  ? "Sending..."
                  : formStatus === "sent"
                    ? "Message received ✓"
                    : "Send the brief"}{" "}
                <Send size={16} />
              </button>
              {formStatus === "error" && (
                <p className="form-error">
                  Something went wrong. Please try again or email me directly.
                </p>
              )}
              {formStatus === "sent" && (
                <p className="form-success">
                  Thanks — your message is on its way! I'll get back to you
                  soon.
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer section-wrap">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <Sparkles size={16} />
          </span>
          <span>
            JOSHUA<span className="brand-dot">.</span>G
          </span>
        </a>
        <span>Full-stack systems engineer · 2026</span>
        <div className="footer-links">
          <a href="mailto:jayrroullo16@gmail.com">Email</a>
          <a href="#demos">Demos</a>
          <a href="#work">Work</a>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
