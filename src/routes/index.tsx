import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import ScrollExpand from "@/components/ui/ScrollExpand";
import CursorGrid from "@/components/ui/CursorGrid";
import SpecularButton from "@/components/ui/SpecularButton";
import MagicBento from "@/components/ui/MagicBento";
import BorderGlow from "@/components/ui/BorderGlow";

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
  MessageSquare,
  Menu,
  X,
  Instagram
} from "lucide-react";


export const Route = createFileRoute("/")(
  { component: Index },
);

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
  </svg>
);

function Index() {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="col d-none d-xl-flex justify-content-center" style={{ gap: 36 }}>
              <Link to="/" style={{ color: "#0f172a", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>Home</Link>
              <a href="#features" style={{ color: "#475569", fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "color 0.2s" }}>Features & Operations</a>
              <Link to="/contact" style={{ color: "#475569", fontWeight: 600, fontSize: 15, textDecoration: "none", transition: "color 0.2s" }}>Contact Us</Link>
            </div>

            {/* Action Buttons with Glowing Animations & Mobile Hamburger Toggle */}
            <div className="col d-flex justify-content-end align-items-center" style={{ gap: 12 }}>
              {/* Desktop Buttons */}
              <div className="d-none d-md-flex align-items-center" style={{ gap: 12 }}>
                {userContext?.onboarded ? (
                  <Link to="/admin/dashboard" style={{ textDecoration: "none" }}>
                    <button className="bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 text-sm">
                      Go to Dashboard <ArrowRight size={16} />
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth/login" style={{ textDecoration: "none" }}>
                      <button className="bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 font-bold px-5 py-2.5 rounded-full border border-slate-200/80 shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2 text-sm">
                        <User size={15} /> Login
                      </button>
                    </Link>

                    <Link to="/auth/signup" style={{ textDecoration: "none" }}>
                      <button className="bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2 text-sm">
                        Request Demo
                      </button>
                    </Link>
                  </>
                )}
              </div>


              {/* Mobile Hamburger Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="d-xl-none border border-slate-300 rounded-xl p-2.5 bg-white text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="d-xl-none border-t border-slate-200 bg-white/98 backdrop-blur-xl px-6 py-6 space-y-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <nav className="flex flex-col space-y-3 font-semibold text-slate-800 text-base">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-amber-500 transition-colors py-2 border-b border-slate-100"
              >
                Home
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-amber-500 transition-colors py-2 border-b border-slate-100"
              >
                Features & Operations
              </a>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-amber-500 transition-colors py-2 border-b border-slate-100"
              >
                Contact Us
              </Link>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-amber-500 transition-colors py-2 border-b border-slate-100"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-amber-500 transition-colors py-2 border-b border-slate-100"
              >
                Terms of Service
              </Link>
            </nav>

            <div className="pt-2 flex flex-col gap-3">
              {userContext?.onboarded ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate({ to: "/admin/dashboard" });
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  Go to Dashboard <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center border border-slate-300 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg hover:from-amber-400 hover:to-amber-500 transition-colors"
                  >
                    Request Demo
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
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

        {/* CursorGrid Interactive Background */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "auto" }}>
          <CursorGrid
            cellSize={70}
            color="#EAB308"
            radius={140}
            falloff="smooth"
            holdTime={400}
            fadeDuration={800}
            lineWidth={1.2}
            maxOpacity={1}
            fillOpacity={0}
            gridOpacity={0}
            cellRadius={0}
            clickPulse
            pulseSpeed={600}
          />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 2 }}>

          <div className="row align-items-center g-5">
            {/* Hero Left Content */}
            <div className="col-12 col-lg-6">
              {/* Highlight 1: Hero Pricing Text (Clean without container box) */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#d97706", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  TRANSPARENT PRICING:
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                  One-Time Setup: <strong style={{ color: "#d97706", fontWeight: 800 }}>₹5,000</strong> &nbsp;|&nbsp; Monthly: <strong style={{ color: "#0284c7", fontWeight: 800 }}>₹1,000</strong>
                </span>
              </div>


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
                  <button className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-xl shadow-sky-500/30 hover:shadow-sky-500/45 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-3 border border-sky-400/30">
                    <Monitor size={20} /> Request for Demo
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
                  decoding="async"
                  fetchPriority="high"

                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                    filter: "drop-shadow(0 20px 40px rgba(15, 23, 42, 0.12))",
                    transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px) scale(1.025)";
                    e.currentTarget.style.filter = "drop-shadow(0 30px 60px rgba(245, 158, 11, 0.25))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.filter = "drop-shadow(0 20px 40px rgba(15, 23, 42, 0.12))";
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
                title: "Monthly Subscription",
                desc: "Flat ₹1,000 / month — unlimited QR orders, KDS displays, & tables.",
                color: "#0ea5e9",
                bg: "rgba(14, 165, 233, 0.06)",
                borderColor: "3px solid #0ea5e9",
              },
              {
                icon: <MessageSquare size={24} />,
                title: "Free Help & Support",
                desc: "24/7 in-app chat & phone support included on every subscription.",
                color: "#10b981",
                bg: "rgba(16, 185, 129, 0.06)",
                borderColor: "3px solid #10b981",
              },
              {
                icon: <Zap size={24} />,
                title: "One-Time Setup Fee",
                desc: "₹5,000 one-time setup — full digital menu setup, PMS/POS sync & staff training.",
                color: "#f59e0b",
                bg: "rgba(245, 158, 11, 0.06)",
                borderColor: "3px solid #f59e0b",
              },
              {
                icon: <Clock size={24} />,
                title: "Free 30-Day Trial",
                desc: "Full unrestricted access to all platform modules. No hidden charges.",
                color: "#8b5cf6",
                bg: "rgba(139, 92, 246, 0.06)",
                borderColor: "3px solid #8b5cf6",
              },
            ].map((benefit, i) => (

              <div key={i} className="col-12 col-md-6 col-lg-3">
                <BorderGlow
                  backgroundColor="#ffffff"
                  borderRadius={16}
                  glowRadius={30}
                  edgeSensitivity={30}
                  colors={['#f59e0b', '#0ea5e9', '#10b981']}
                  style={{ height: "100%" }}
                >
                  <div
                    style={{
                      padding: "28px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      height: "100%",
                      borderTop: benefit.borderColor,
                      borderRadius: "16px",
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
                </BorderGlow>
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
              <BorderGlow
                backgroundColor="#ffffff"
                borderRadius={16}
                glowRadius={40}
                edgeSensitivity={30}
                colors={['#0284c7', '#38bdf8', '#0ea5e9']}
                style={{ height: "100%" }}
              >
                <div style={{ padding: "40px", height: "100%" }}>
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
              </BorderGlow>
            </div>

            <div className="col-12 col-lg-6">
              <BorderGlow
                backgroundColor="#ffffff"
                borderRadius={16}
                glowRadius={40}
                edgeSensitivity={30}
                colors={['#10b981', '#34d399', '#059669']}
                style={{ height: "100%" }}
              >
                <div style={{ padding: "40px", height: "100%" }}>
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
              </BorderGlow>
            </div>
          </div>

          {/* Row 2: Full width KDS card */}
          <div className="row">
            <div className="col-12">
              <BorderGlow
                backgroundColor="#ffffff"
                borderRadius={16}
                glowRadius={50}
                edgeSensitivity={30}
                colors={['#f59e0b', '#fbbf24', '#d97706']}
              >
                <div style={{ padding: "40px" }}>
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
            </BorderGlow>
          </div>
        </div>
      </div>
    </section>



      {/* ═══════ 5. FEATURE SHOWCASE SECTION (ScrollExpand Left + 2x2 Grid Right) ═══════ */}
      <section
        id="features"
        style={{
          padding: "100px 0 120px",
          background: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "0 24px" }}>
          <div className="row align-items-center g-5" style={{ minHeight: "560px" }}>
            
            {/* LEFT: ScrollExpand Image Showcase Container */}
            <div className="col-12 col-lg-6">
              <ScrollExpand
                src="/images/rasoi_kitchen_kds_showcase.webp"
                alt="Rasoi restaurant kitchen management"
                startWidth={85}
                startHeight={420}
                startRadius={24}
                endRadius={16}
                mediaZoom={1.25}
                scrollDistance={1.2}
                holdDistance={0.35}
                smoothing={0.08}
                overlayScrim={0.2}
                useWindowScroll
              />
            </div>

            {/* RIGHT: 2x2 Grid of Feature Cards */}
            <div className="col-12 col-lg-6">
              <div className="row g-4">
                {[
                  {
                    icon: <QrCode size={22} strokeWidth={2} />,
                    iconBg: "#fff7ed",
                    iconColor: "#ea580c",
                    title: "QR Code Ordering",
                    desc: "Guests can access the menu instantly by scanning a QR code, reducing the need for phone calls and minimizing wait times.",
                  },
                  {
                    icon: <Layers size={22} strokeWidth={2} />,
                    iconBg: "#f0f9ff",
                    iconColor: "#0284c7",
                    title: "Customizable Menus",
                    desc: "Tailor the digital menu with high-resolution imagery, detailed descriptions, dietary labels, and real-time price adjustments.",
                  },
                  {
                    icon: <CreditCard size={22} strokeWidth={2} />,
                    iconBg: "#faf5ff",
                    iconColor: "#9333ea",
                    title: "Multiple Payment Options",
                    desc: "Guests can charge to their room, pay securely via credit card, or opt for digital wallets like Apple Pay and Google Pay.",
                  },
                  {
                    icon: <Bell size={22} strokeWidth={2} />,
                    iconBg: "#f0fdf4",
                    iconColor: "#16a34a",
                    title: "Real-Time Notifications",
                    desc: "Instant alerts to the kitchen ensure timely food preparation and reduce wait times.",
                  },
                ].map((card, i) => (
                  <div key={i} className="col-12 col-sm-6">
                    <BorderGlow
                      backgroundColor="#ffffff"
                      borderRadius={20}
                      glowRadius={35}
                      edgeSensitivity={30}
                      colors={['#f59e0b', '#0284c7', '#10b981']}
                      style={{ height: "100%" }}
                    >
                      <div
                        style={{
                          padding: "32px 28px",
                          minHeight: "220px",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          gap: "18px",
                        }}
                      >
                        {/* Top-left icon container */}
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "14px",
                            background: card.iconBg,
                            color: card.iconColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {card.icon}
                        </div>

                        {/* Content */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <h3
                            style={{
                              fontSize: "20px",
                              fontWeight: 700,
                              color: "#0f172a",
                              lineHeight: 1.25,
                              margin: 0,
                            }}
                          >
                            {card.title}
                          </h3>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "#64748b",
                              lineHeight: 1.55,
                              margin: 0,
                            }}
                          >
                            {card.desc}
                          </p>
                        </div>
                      </div>
                    </BorderGlow>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ═══════ 6. DETAILED FEATURES GRID (MagicBento Component) ═══════ */}
      <section style={{ padding: "80px 0", background: "#f8fafc", borderTop: "1px solid #f1f5f9" }}>
        <div className="container">
          <div className="row justify-content-center" style={{ marginBottom: 40 }}>
            <div className="col-12 col-lg-8 text-center">
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                Advanced Features &amp; Integrations
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: "600px", margin: "0 auto" }}>
                Rasoi provides the infrastructure required to run multi-outlet high-performance operations.
              </p>
            </div>
          </div>

          <MagicBento
            glowColor="245, 158, 11"
            spotlightRadius={600}
            particleCount={10}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
          />
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

                  {/* Highlight 2: CTA Section Pricing Highlight */}
                  <div className="pt-2">
                    <div
                      className="mx-auto"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: "12px",
                        padding: "10px 24px",
                        borderRadius: "50px",
                        background: "rgba(15, 23, 42, 0.85)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        boxShadow: "0 0 25px rgba(245, 158, 11, 0.15)",
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>
                        💰 Setup Cost: <strong style={{ color: "#ffffff" }}>₹5,000 (One-Time)</strong>
                      </span>
                      <span style={{ color: "#64748b" }}>•</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>
                        Monthly Subscription: <strong style={{ color: "#ffffff" }}>₹1,000 / Month</strong>
                      </span>
                    </div>
                  </div>


                  <div className="pt-4 d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3">
                    <Link to="/auth/signup" style={{ textDecoration: "none" }}>
                      <SpecularButton
                        size="lg"
                        radius={16}
                        tint="#f59e0b"
                        tintOpacity={1}
                        textColor="#ffffff"
                        lineColor="#ffffff"
                        baseColor="#d97706"
                        intensity={1.2}
                      >
                        Start Free Trial Now <ArrowRight size={18} />
                      </SpecularButton>
                    </Link>

                    <Link to="/auth/login" style={{ textDecoration: "none" }}>
                      <SpecularButton
                        size="lg"
                        radius={16}
                        tint="#1e293b"
                        tintOpacity={0.8}
                        textColor="#ffffff"
                        lineColor="#94a3b8"
                        baseColor="#334155"
                      >
                        Request a Demo
                      </SpecularButton>
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
            <div className="d-flex flex-wrap align-items-center gap-3">
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, textAlign: "center" }}>
                © 2026 <a href="https://www.admarkdigitals.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>ADMARK DIGITALS</a>. All rights reserved.
              </p>
              <a
                href="https://www.instagram.com/admarkdigitals?igsh=MWVhZmxzbDg1ZzBpZg=="
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#e1306c",
                  background: "rgba(225, 48, 108, 0.1)",
                  border: "1px solid rgba(225, 48, 108, 0.3)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(225, 48, 108, 0.2)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(225, 48, 108, 0.1)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Instagram size={14} /> @admarkdigitals
              </a>
              <a
                href="https://wa.me/?text=Hello%20Rasoi%20Team%2C%20I%20would%20like%20to%20know%20more%20about%20your%20HORECA%20solution."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#25D366",
                  background: "rgba(37, 211, 102, 0.1)",
                  border: "1px solid rgba(37, 211, 102, 0.3)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(37, 211, 102, 0.2)";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(37, 211, 102, 0.1)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <WhatsAppIcon size={14} /> WhatsApp Chat
              </a>
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 0", textAlign: "center" }}>
              The Operating System for Modern HORECA. Designed & Engineered by ADMARK DIGITALS.
            </p>
          </div>

        </div>
      </footer>

      {/* Floating WhatsApp Quick Chat Button */}
      <a
        href="https://wa.me/?text=Hello%20Rasoi%20Team%2C%20I%20would%20like%20to%20know%20more%20about%20your%20HORECA%20solution."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          zIndex: 9999,
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#25D366",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(37, 211, 102, 0.45)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.12)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(37, 211, 102, 0.65)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 211, 102, 0.45)";
        }}
      >
        <WhatsAppIcon size={30} />
      </a>

    </div>
  );
}
