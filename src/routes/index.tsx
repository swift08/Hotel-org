import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import {
  QrCode,
  Utensils,
  ChefHat,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Building2,
  CheckCircle2,
  Smartphone,
  Layers,
  BarChart3,
  Globe,
  Zap,
  Users,
  Clock,
  TrendingUp,
  Star,
  Play,
  HelpCircle,
  ShieldAlert,
  ThumbsUp,
  Laptop,
  Check,
  Monitor,
  Printer,
  ChevronDown,
  Bell,
  User,
  CreditCard,
  MessageSquare
} from "lucide-react";

export const Route = createFileRoute("/")(
  { component: Index },
);

function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const ctx = await getMyContext();
          setUserContext(ctx);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  return (
    <div className="landing-page" style={{ minHeight: "100vh", background: "#ffffff", color: "#334155", overflowX: "hidden", fontFamily: "'Manrope', sans-serif" }}>
      
      {/* ═══════ 1. FIXED HEADER / NAVIGATION ═══════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="container">
          <div className="row align-items-center" style={{ minHeight: 80 }}>
            {/* Logo */}
            <div className="col-auto">
              <Link to="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                <img
                  src="/images/logo.png"
                  alt="Rasoi Logo"
                  width={140}
                  height={42}
                  style={{
                    height: "42px",
                    width: "auto",
                    objectFit: "contain",
                    transition: "transform 0.3s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
              </Link>
            </div>

            {/* Menu Links */}
            <div className="col d-none d-xl-flex justify-content-center" style={{ gap: 32 }}>
              <Link to="/" style={{ color: "#0f172a", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Home</Link>
              <a href="#features" style={{ color: "#475569", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>Products</a>
              <a href="#features" style={{ color: "#475569", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>Customers</a>
              <a href="#features" style={{ color: "#475569", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>Partners</a>
              <Link to="/contact" style={{ color: "#475569", fontWeight: 500, fontSize: 15, textDecoration: "none" }}>Contact Us</Link>
            </div>

            {/* Action Buttons */}
            <div className="col d-flex justify-content-end align-items-center" style={{ gap: 12 }}>
              <button
                className="d-none d-md-inline-flex align-items-center justify-content-center"
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 24,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Bell size={14} /> What's New
              </button>

              {userContext?.onboarded ? (
                <button
                  onClick={() => navigate({ to: "/admin/dashboard" })}
                  style={{
                    background: "#f59e0b",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "10px 22px",
                    borderRadius: 24,
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.background = "#d97706";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "#f59e0b";
                  }}
                >
                  Go to Dashboard <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    style={{
                      color: "#475569",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      border: "1px solid #cbd5e1",
                      padding: "8px 20px",
                      borderRadius: 24,
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.borderColor = "#94a3b8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  >
                    <User size={14} /> Login
                  </Link>

                  <Link
                    to="/auth/signup"
                    style={{
                      background: "#f59e0b",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "10px 22px",
                      borderRadius: 24,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 4px 14px rgba(245,158,11,0.25)",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.background = "#d97706";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.background = "#f59e0b";
                    }}
                  >
                    Request Demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ 2. HERO SECTION (With Padding Top for Fixed Header) ═══════ */}
      <section
        style={{
          position: "relative",
          padding: "150px 0 90px",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          overflow: "hidden",
        }}
      >
        {/* Background Network Graphic Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "60%",
            height: "100%",
            backgroundImage: "radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.06), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="row align-items-center g-5">
            {/* Hero Left Content */}
            <div className="col-12 col-lg-6">
              <h1
                style={{
                  fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: "#0f172a",
                  marginBottom: 24,
                }}
              >
                In-Room Dining Software <br />
                <span style={{ color: "#f59e0b" }}>with QR Code Ordering</span> <br />
                &amp; Smart Kitchen management
              </h1>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: 1.7,
                  color: "#475569",
                  marginBottom: 36,
                  maxWidth: "540px",
                }}
              >
                A complete room-service solution: guests order from their room or lobby by scanning a QR code, and the kitchen receives the ticket in real time on KDS, prep sheets, or printer.
              </p>

              <div className="d-flex align-items-center flex-wrap gap-3">
                <Link to="/auth/signup" style={{ textDecoration: "none" }}>
                  <button
                    style={{
                      background: "#0284c7",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 16,
                      padding: "14px 36px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: "0 4px 18px rgba(2, 132, 199, 0.35)",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#0369a1";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#0284c7";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <Monitor size={18} /> Request for Demo
                  </button>
                </Link>
              </div>

              {/* Scroll down indicator */}
              <div className="d-flex align-items-center gap-2" style={{ marginTop: 48, color: "#64748b", fontSize: 14, fontWeight: 500 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 18, transform: "rotate(90deg)", display: "inline-block", fontWeight: 700 }}>→</span>
                </div>
                <span>Scroll Down to learn more</span>
              </div>
            </div>

            {/* Hero Right Mockup Graphics */}
            <div className="col-12 col-lg-6 text-center text-lg-end">
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  maxWidth: "100%",
                }}
              >
                <img
                  src="/images/rasoi_hero_devices.webp"
                  alt="Rasoi Digital Menu Ordering, QR Scanner & Kitchen KDS Display System Mockup"
                  width={600}
                  height={450}
                  loading="eager"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    filter: "drop-shadow(0 20px 40px rgba(15, 23, 42, 0.12))",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 3. FOUR BENEFITS ROW (REDESIGNED PREMIUM INDIVIDUAL CARDS) ═══════ */}
      <section style={{ padding: "60px 0 50px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
        <div className="container">
          <div className="row g-4">
            {[
              {
                icon: <CreditCard size={24} />,
                title: "Low Monthly Price",
                desc: "From $20/month base + $0.10 per order — no per-room charges.",
                color: "#0ea5e9",
                bg: "rgba(14, 165, 233, 0.06)",
                borderColor: "3px solid #0ea5e9",
              },
              {
                icon: <MessageSquare size={24} />,
                title: "Free Help & Support",
                desc: "24/7 in-app chat support included on every single plan.",
                color: "#10b981",
                bg: "rgba(16, 185, 129, 0.06)",
                borderColor: "3px solid #10b981",
              },
              {
                icon: <Zap size={24} />,
                title: "No Setup Charges",
                desc: "Free digital menu setup, PMS connection, and complete staff training.",
                color: "#f59e0b",
                bg: "rgba(245, 158, 11, 0.06)",
                borderColor: "3px solid #f59e0b",
              },
              {
                icon: <Clock size={24} />,
                title: "Free 30-Day Trial",
                desc: "Full unrestricted access to every platform module. No credit card required.",
                color: "#8b5cf6",
                bg: "rgba(139, 92, 246, 0.06)",
                borderColor: "3px solid #8b5cf6",
              },
            ].map((benefit, i) => (
              <div key={i} className="col-12 col-md-6 col-lg-3">
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderTop: benefit.borderColor,
                    borderRadius: "16px",
                    padding: "28px 24px",
                    height: "100%",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.02)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                  className="benefit-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 15px 35px rgba(15, 23, 42, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.02)";
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: benefit.bg,
                      color: benefit.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                      flexShrink: 0,
                    }}
                  >
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8, lineHeight: 1.3 }}>
                      {benefit.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 4. ALTERNATING FEATURES SECTION ═══════ */}
      <section style={{ padding: "80px 0", background: "#ffffff" }}>
        <div className="container">
          {/* Main Header */}
          <div className="row justify-content-center" style={{ marginBottom: 60 }}>
            <div className="col-12 col-lg-8 text-center">
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>
                Rasoi In-Room Dining &amp; Room Service
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.6, maxWidth: "680px", margin: "0 auto" }}>
                Rasoi In-Room Dining is the <strong>ultimate solution for hotels and resorts</strong> looking to offer guests a seamless, efficient, and modern dining experience. From the moment a guest <strong>scans a QR code to browse the menu</strong> to the <strong>instant their order is received by the kitchen</strong>, Rasoi ensures a hassle-free process.
              </p>
            </div>
          </div>

          {/* Row 1: Ordering + Payment side-by-side cards */}
          <div className="row g-4" style={{ marginBottom: 40 }}>
            <div className="col-12 col-lg-6">
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "40px",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(2, 132, 199, 0.08)",
                      color: "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                      Effortless Ordering from Anywhere
                    </h3>
                    <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>
                      Guests can access the menu instantly by scanning the room's QR code. This connects them to a visually rich, highly customizable takeout and delivery menu. Guests can effortlessly browse, select items, and complete their orders within minutes. The platform supports multiple languages, ensuring accessibility for international travelers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "40px",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.08)",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                      Secure Payment &amp; Order Validation
                    </h3>
                    <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>
                      Simplify guest payments with flexible choices: charge directly to their room or pay securely via credit card. Rasoi verifies the check-in details with the PMS to ensure a seamless and secure transaction, giving both guests and hotel staff peace of mind. The system integrates with hotel property management systems (PMS) to provide accurate billing and tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Full width KDS card */}
          <div className="row">
            <div className="col-12">
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: "40px",
                }}
              >
                <div className="row align-items-center g-4">
                  <div className="col-12 col-lg-7">
                    <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: "rgba(245, 158, 11, 0.08)",
                          color: "#f59e0b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ChefHat size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>
                          Real-Time Kitchen Order Management
                        </h3>
                        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
                          Rasoi's notification system and Order Management Services immediately alert the kitchen staff when an order is placed. Every detail is accurately transmitted to prevent errors, ensuring food is prepared to perfection and delivered on time.
                        </p>
                        
                        <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 700, marginBottom: 12 }}>
                          Hotels can manage kitchen operations with multiple options, including:
                        </div>
                        
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                          <li style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569", fontWeight: 500 }}>
                            <span style={{ color: "#f59e0b", fontWeight: 700 }}>»</span>
                            <strong>Digital prep sheets</strong> for organized order fulfillment.
                          </li>
                          <li style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569", fontWeight: 500 }}>
                            <span style={{ color: "#f59e0b", fontWeight: 700 }}>»</span>
                            <strong>Kitchen display systems (KDS)</strong> to streamline communication.
                          </li>
                          <li style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569", fontWeight: 500 }}>
                            <span style={{ color: "#f59e0b", fontWeight: 700 }}>»</span>
                            <strong>Traditional ticket printing</strong> for businesses that prefer paper records.
                          </li>
                        </ul>

                        <p style={{ fontSize: 14, color: "#64748b", fontStyle: "italic", marginTop: 20, marginBottom: 0 }}>
                          The system also allows chefs to update order statuses in real time, ensuring guests receive accurate ETAs for their meals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-5 text-center">
                    <img
                      src="/images/rasoi_qr_ordering.webp"
                      alt="Rasoi QR Code Ordering customer smartphone experience"
                      width={440}
                      height={320}
                      loading="lazy"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 5. IMAGE LEFT (GLASS FRAME + GLOW), SLEEK LIST FEATURES RIGHT (REDESIGNED) ═══════ */}
      <section
        style={{
          padding: "90px 0",
          background: "radial-gradient(circle at 15% 50%, rgba(245, 158, 11, 0.05), transparent 60%), #ffffff",
          borderTop: "1px solid #f1f5f9"
        }}
      >
        <div className="container">
          <div className="row align-items-center g-5">
            {/* Tablet Mockup Left inside glowing glass frame */}
            <div className="col-12 col-lg-6 text-center text-lg-start">
              <div
                style={{
                  display: "inline-block",
                  padding: "16px",
                  borderRadius: "28px",
                  background: "rgba(255, 255, 255, 0.65)",
                  border: "1px solid rgba(245, 158, 11, 0.12)",
                  boxShadow: "0 35px 70px rgba(15, 23, 42, 0.08), 0 0 50px rgba(245, 158, 11, 0.1)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transition: "transform 0.4s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <img
                  src="/images/rasoi_kds_tablet.webp"
                  alt="Rasoi Kitchen Display System (KDS) tablet device layout"
                  width={560}
                  height={400}
                  loading="lazy"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "16px",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* List Features Right (Premium design with custom border-left and layout) */}
            <div className="col-12 col-lg-6">
              <div className="row g-4">
                {[
                  {
                    icon: <QrCode size={22} />,
                    iconBg: "rgba(245, 158, 11, 0.08)",
                    iconColor: "#d97706",
                    borderColor: "4px solid #f59e0b",
                    title: "QR Code Ordering",
                    desc: "Guests can access the menu instantly by scanning a QR code, reducing the need for phone calls and minimizing wait times.",
                  },
                  {
                    icon: <Layers size={22} />,
                    iconBg: "rgba(2, 132, 199, 0.08)",
                    iconColor: "#0284c7",
                    borderColor: "4px solid #0284c7",
                    title: "Customizable Menus",
                    desc: "Tailor the digital menu with high-resolution images, detailed descriptions, dietary labels, and real-time price adjustments.",
                  },
                  {
                    icon: <CreditCard size={22} />,
                    iconBg: "rgba(124, 58, 237, 0.08)",
                    iconColor: "#7c3aed",
                    borderColor: "4px solid #7c3aed",
                    title: "Multiple Payment Options",
                    desc: "Guests can charge to their room, pay securely via credit card, or opt for digital wallets like Apple Pay and Google Pay.",
                  },
                  {
                    icon: <Bell size={22} />,
                    iconBg: "rgba(22, 163, 74, 0.08)",
                    iconColor: "#16a34a",
                    borderColor: "4px solid #16a34a",
                    title: "Real-Time Notifications",
                    desc: "Instant alerts to the kitchen ensure timely food preparation and reduce wait times.",
                  },
                ].map((feature, i) => (
                  <div key={i} className="col-12 col-sm-6">
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #f1f5f9",
                        borderLeft: feature.borderColor,
                        borderRadius: "16px",
                        padding: "28px 24px",
                        height: "100%",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.02)",
                        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                      className="feature-list-card"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 18px 40px rgba(15, 23, 42, 0.06)";
                        e.currentTarget.style.borderColor = "rgba(15, 23, 42, 0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.02)";
                        e.currentTarget.style.borderLeft = feature.borderColor;
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "12px",
                            background: feature.iconBg,
                            color: feature.iconColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {feature.icon}
                        </div>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                          {feature.title}
                        </h3>
                      </div>
                      
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 6. DETAILED FEATURES GRID (With Mockup Images Inside Each Container) ═══════ */}
      <section style={{ padding: "80px 0", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
        <div className="container">
          <div className="row justify-content-center" style={{ marginBottom: 56 }}>
            <div className="col-12 col-lg-8 text-center">
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                Advanced Features &amp; Integrations
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: "600px", margin: "0 auto" }}>
                Rasoi provides the infrastructure required to run multi-outlet high-performance operations.
              </p>
            </div>
          </div>

          <div className="row g-4">
            {[
              {
                icon: <Clock size={22} />,
                title: "Seamless Order Tracking",
                desc: "Live order states tracked from placement to preparation status updates pushed directly back to the guest's browser.",
                img: "/images/rasoi_feature_tracking.webp",
              },
              {
                icon: <Utensils size={22} />,
                title: "Easy-to-use Order Management",
                desc: "Central command panel that handles incoming room service tickets, counter billing, bar tickets, and delivery states.",
                img: "/images/rasoi_feature_mgmt.webp",
              },
              {
                icon: <ChefHat size={22} />,
                title: "Multiple Kitchen Management",
                desc: "Route tickets automatically to different stations (Main Kitchen, Pastry Station, Lobby Bar) based on menu item tags.",
                img: "/images/rasoi_feature_kitchen.webp",
              },
              {
                icon: <Monitor size={22} />,
                title: "User-Friendly Interface",
                desc: "Glanceable touch interfaces requiring zero training for line chefs, receptionists, and waiting staff.",
                img: "/images/rasoi_feature_interface.webp",
              },
              {
                icon: <Layers size={22} />,
                title: "Integrated PMS/POS",
                desc: "Syncs directly with hotel property management systems (PMS) for automated check-in verification and room folio charge posting.",
                img: "/images/rasoi_feature_pms_pos.webp",
              },
              {
                icon: <Building2 size={22} />,
                title: "Flexible Setup & Customization",
                desc: "Fully customizable branding options, currency support, tax templates (GST/VAT), service fees, and menu hour templates.",
                img: "/images/rasoi_feature_setup.webp",
              },
              {
                icon: <TrendingUp size={22} />,
                title: "Live Reporting & Analytics",
                desc: "Detailed breakdowns of daily revenue, peak operating hours, top-selling items, and feedback ratings.",
                img: "/images/rasoi_feature_analytics.webp",
              },
              {
                icon: <ThumbsUp size={22} />,
                title: "Guest Reviews & Ratings",
                desc: "Collect real-time satisfaction surveys automatically after billing to monitor and elevate service delivery standards.",
                img: "/images/rasoi_feature_reviews.webp",
              },
            ].map((gridItem, i) => (
              <div key={i} className="col-12 col-md-6 col-lg-3">
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "28px 24px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.3s, box-shadow 0.3s",
                  }}
                  className="hover-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "rgba(245, 158, 11, 0.08)",
                        color: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      {gridItem.icon}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                      {gridItem.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 16 }}>
                      {gridItem.desc}
                    </p>
                  </div>
                  
                  {/* Container Image */}
                  <div style={{ marginTop: "auto", paddingTop: 16, textAlign: "center" }}>
                    <img
                      src={gridItem.img}
                      alt={gridItem.title}
                      width={220}
                      height={120}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "contain",
                        borderRadius: 8,
                        display: "block",
                        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.03))",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ 7. BOTTOM CTA SECTION ═══════ */}
      <section
        style={{
          padding: "100px 0",
          background: "radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 60%), radial-gradient(circle at 10% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), #030712",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Decorative Grid Overlay */}
        <div 
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.8,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Moody Restaurant Background Photo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: 'url("/images/cta_bg_restaurant.webp")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.12,
            mixBlendMode: "luminosity",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div className="container relative z-10">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              {/* Glassmorphic CTA Card using Tailwind CSS */}
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/40 backdrop-blur-xl px-6 py-16 md:py-24 text-center shadow-2xl">
                {/* Subtle Inner Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-2/5 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

                <div className="mx-auto max-w-[680px] space-y-6">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-white to-amber-400 bg-clip-text text-transparent">
                    Ready to Upgrade Your Operations?
                  </h2>
                  <p className="text-sm md:text-base lg:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
                    Improve guest satisfaction, speed up kitchen operations, and drive incremental service revenue with Rasoi today.
                  </p>

                  <div className="pt-4 d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3">
                    <Link to="/auth/signup" style={{ textDecoration: "none", width: "100%", maxWidth: "240px" }}>
                      <button
                        style={{
                          width: "100%",
                          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                          color: "#030712",
                          fontWeight: 800,
                          fontSize: 16,
                          padding: "16px 36px",
                          borderRadius: "16px",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          boxShadow: "0 10px 25px rgba(245,158,11,0.25)",
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.boxShadow = "0 15px 35px rgba(245,158,11,0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 10px 25px rgba(245,158,11,0.25)";
                        }}
                      >
                        Start Free Trial Now <ArrowRight size={18} />
                      </button>
                    </Link>

                    <Link to="/auth/login" style={{ textDecoration: "none", width: "100%", maxWidth: "240px" }}>
                      <button
                        style={{
                          width: "100%",
                          background: "rgba(255, 255, 255, 0.03)",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: 16,
                          padding: "15px 32px",
                          borderRadius: "16px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                          e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        Request a Demo
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer
        style={{
          padding: "80px 0 40px",
          background: "#030712",
          color: "#94a3b8",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          position: "relative",
        }}
      >
        <div className="container">
          {/* Footer Grid */}
          <div className="row g-5 pb-5 border-b border-slate-800/40" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            {/* Column 1: Brand details */}
            <div className="col-12 col-lg-5">
              <div className="space-y-4">
                <img
                  src="/images/logo.webp"
                  alt="Rasoi Logo"
                  width={130}
                  height={38}
                  style={{ height: 38, width: "auto", objectFit: "contain", opacity: 0.95 }}
                />
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: "1.6", maxWidth: "340px", marginTop: "16px" }}>
                  The complete HORECA & restaurant operating system. Streamlining tables, QR ordering, KDS, staff roles, and payments.
                </p>
              </div>
            </div>

            {/* Column 2: Operations */}
            <div className="col-6 col-md-4 col-lg-2">
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
                Operations
              </h4>
              <div className="d-flex flex-column" style={{ gap: 12 }}>
                <a href="#features" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Live Orders</a>
                <a href="#features" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Kitchen KDS</a>
                <a href="#features" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Tables & QRs</a>
              </div>
            </div>

            {/* Column 3: Platform */}
            <div className="col-6 col-md-4 col-lg-2">
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
                Workspace
              </h4>
              <div className="d-flex flex-column" style={{ gap: 12 }}>
                <Link to="/auth/login" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Sign In</Link>
                <Link to="/auth/signup" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Sign Up</Link>
                <a href="#" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Platform Status</a>
              </div>
            </div>

            {/* Column 4: Legal & Policy */}
            <div className="col-12 col-md-4 col-lg-3">
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
                Resources
              </h4>
              <div className="d-flex flex-column" style={{ gap: 12 }}>
                <Link to="/privacy" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Privacy Policy</Link>
                <Link to="/terms" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Terms of Service</Link>
                <Link to="/contact" style={{ color: "#64748b", fontSize: 14, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}>Support Center</Link>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Block */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-4" style={{ marginTop: "24px" }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, textAlign: "center" }}>
              © 2026 <a href="https://www.admarkdigitals.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>ADMARK DIGITALS</a>. All rights reserved.
            </p>
            <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 0", textAlign: "center" }}>
              The Operating System for Modern HORECA. Designed & Engineered by ADMARK DIGITALS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
