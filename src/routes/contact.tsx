import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { submitContactForm } from "@/lib/public.functions";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  Headphones,
  Globe,
  Building2,
  Send,
  CheckCircle2,
  AlertCircle,
  Utensils,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    workEmail: "",
    phoneNumber: "",
    businessType: "Restaurant / Cafe",
    numberOfOutlets: "1 Outlet",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Client-side validation
    if (!formData.fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      setLoading(false);
      return;
    }
    if (!formData.businessName.trim()) {
      setErrorMsg("Please enter your business or restaurant name.");
      setLoading(false);
      return;
    }
    if (!formData.workEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      setErrorMsg("Please enter a valid work email address.");
      setLoading(false);
      return;
    }
    if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 7) {
      setErrorMsg("Please enter a valid phone number.");
      setLoading(false);
      return;
    }

    try {
      const res = await submitContactForm({ data: formData });
      if (res && res.ok) {
        setSubmitted(res.referenceId);
        toast.success("Contact request submitted successfully!");
      } else {
        throw new Error("Failed to submit request.");
      }
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ═══════ 1. NAVIGATION HEADER ═══════ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="inline-flex items-center transition-transform hover:scale-105">
              <img
                src="/images/logo.webp"
                alt="Rasoi Logo"
                width={140}
                height={42}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              <a href="/#features" className="text-slate-300 hover:text-white transition-colors">Products</a>
              <Link to="/privacy" className="text-slate-300 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-slate-300 hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="text-amber-400 font-bold">Contact Us</Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full transition-all"
              >
                <ArrowLeft size={14} /> Back to Platform
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ 2. HERO SECTION ═══════ */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,158,11,0.08),transparent_60%)] pointer-events-none" />
        
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> HORECA Operations Consultation
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              Let's Build Better <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                Restaurant Operations.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Empower your venue with automated QR ordering, kitchen display systems (KDS), multi-branch billing, staff permissions, and real-time operational analytics.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <a
                href="#contact-form"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-7 py-3.5 rounded-xl shadow-lg shadow-amber-500/20 text-sm transition-all flex items-center gap-2"
              >
                Talk to Our Team <ChevronRight size={16} />
              </a>
              <Link
                to="/"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold px-7 py-3.5 rounded-xl text-sm transition-all"
              >
                Explore Rasoi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 3. MAIN CONTACT & FORM SECTION ═══════ */}
      <section id="contact-form" className="py-16 relative">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Form & Interactive Cards */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Send className="text-amber-400" size={22} /> Get in Touch with Our Team
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Fill in your details below and our operations specialist will get back to you within 24 hours.
                  </p>
                </div>

                {submitted ? (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Thank You for Reaching Out!</h3>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                      Your inquiry has been received. Our hospitality technology team will review your requirements and reach out promptly.
                    </p>
                    <div className="text-xs font-mono bg-slate-950/80 px-4 py-2 rounded-xl text-emerald-400 inline-block border border-emerald-500/20">
                      Reference ID: {submitted}
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setSubmitted(null);
                          setFormData({
                            fullName: "",
                            businessName: "",
                            workEmail: "",
                            phoneNumber: "",
                            businessType: "Restaurant / Cafe",
                            numberOfOutlets: "1 Outlet",
                            message: "",
                          });
                        }}
                        className="text-xs font-bold text-amber-400 hover:underline mt-4"
                      >
                        Submit another inquiry
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {errorMsg && (
                      <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Full Name <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="e.g. Rahul Sharma"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Restaurant / Business Name <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          placeholder="e.g. Royal Spice Hospitality"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Work Email <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="email"
                          name="workEmail"
                          value={formData.workEmail}
                          onChange={handleChange}
                          placeholder="rahul@royalspice.com"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Phone Number <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          required
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Business Type <span className="text-amber-400">*</span>
                        </label>
                        <select
                          name="businessType"
                          value={formData.businessType}
                          onChange={handleChange}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                        >
                          <option value="Fine Dining Restaurant">Fine Dining Restaurant</option>
                          <option value="Casual Dining / Cafe">Casual Dining / Cafe</option>
                          <option value="Hotel & Room Service">Hotel & Room Service</option>
                          <option value="Quick Service (QSR) / Food Court">Quick Service (QSR)</option>
                          <option value="Bar / Brewery">Bar / Brewery / Lounge</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Number of Outlets <span className="text-amber-400">*</span>
                        </label>
                        <select
                          name="numberOfOutlets"
                          value={formData.numberOfOutlets}
                          onChange={handleChange}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                        >
                          <option value="1 Outlet">1 Outlet</option>
                          <option value="2 - 5 Outlets">2 – 5 Outlets</option>
                          <option value="6 - 15 Outlets">6 – 15 Outlets</option>
                          <option value="15+ Multi-branch Enterprise">15+ Multi-branch Enterprise</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        How can we help your operations?
                      </label>
                      <textarea
                        name="message"
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your menu, order volume, or current POS integration needs..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 text-sm transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          Submitting Consultation Request...
                        </>
                      ) : (
                        <>
                          Submit Inquiry <Send size={16} />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-2">
                      <ShieldCheck size={14} className="text-amber-400" /> Server-side payload validation & zero spam guarantee.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Contact Cards & ADMARK DIGITALS Information */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card 1: Direct Support */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-amber-500/30 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Direct Inbox Support</h3>
                    <p className="text-xs text-slate-400">Response within 24 hours</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm font-semibold pt-2 border-t border-slate-800">
                  <a href="mailto:info@admarkdigitals.com" className="text-amber-400 hover:underline block">info@admarkdigitals.com</a>
                  <a href="mailto:info@aadmarkdigitals.com" className="text-slate-300 hover:underline block text-xs">info@aadmarkdigitals.com</a>
                </div>
              </div>

              {/* Card 2: Phone & WhatsApp */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-emerald-500/30 transition-all space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Call & WhatsApp</h3>
                    <p className="text-xs text-slate-400">Mon – Sat: 9:00 AM – 7:00 PM IST</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm font-semibold pt-2 border-t border-slate-800">
                  <a href="tel:+919686658055" className="text-emerald-400 hover:underline block">+91 96866 58055</a>
                  <a href="tel:9632092273" className="text-slate-300 hover:underline block text-xs">+91 96320 92273</a>
                </div>
              </div>

              {/* Card 3: Corporate HQ & Locations */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-purple-500/30 transition-all space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">ADMARK DIGITALS Corporate</h3>
                    <p className="text-xs text-slate-400">Official Tech Partner</p>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed space-y-2 border-t border-slate-800 pt-3">
                  <p className="flex items-start gap-2">
                    <MapPin size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>Prashanth Plaza, 5th Cross, 4th Main, Saraswathipuram, Mysuru 570009, Karnataka, India</span>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-400">Primary: Mysuru</span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-400">Also in: Bengaluru</span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-400">Hyderabad</span>
                  </div>
                </div>
              </div>

              {/* Card 4: WebP Hero Device Showcase */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center">
                <img
                  src="/images/rasoi_hero_devices.webp"
                  alt="Rasoi HORECA Devices Showcase"
                  width={400}
                  height={250}
                  className="w-full h-auto object-contain rounded-xl drop-shadow-xl"
                />
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  Rasoi Operations Core on Tablet, POS & Mobile Web
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ═══════ 4. FOOTER ═══════ */}
      <footer className="py-12 border-t border-white/10 bg-slate-950 text-slate-400 text-sm">
        <div className="container mx-auto px-4 max-w-7xl text-center space-y-4">
          <div className="flex items-center justify-center space-x-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/contact" className="text-amber-400 font-semibold">Contact Support</Link>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 <a href="https://www.admarkdigitals.com/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline font-semibold">ADMARK DIGITALS</a>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
