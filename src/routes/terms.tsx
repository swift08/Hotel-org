import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="container">
          <Link to="/" style={{ color: "#f59e0b", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 800, padding: "60px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, padding: "8px 16px", marginBottom: 20 }}>
            <ScrollText size={16} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Legal</span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em", margin: "0 0 12px" }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div style={{ lineHeight: 1.8, fontSize: 15, color: "#94a3b8" }} className="space-y-8">
          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>1. Acceptance of Terms</h2>
            <p>By accessing or using the Rasoi Platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you are registering on behalf of a business entity, you represent and warrant that you have authority to bind that entity to these Terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>2. Description of Service</h2>
            <p>Rasoi provides a cloud-based restaurant and HORECA management platform including: QR-based table ordering, kitchen display system (KDS), staff role-based access control (RBAC), menu content management, order lifecycle management, billing and invoicing, and financial reporting tools.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to: provide accurate and current registration information, notify us immediately of any unauthorized access, and not share account credentials with unauthorized persons. Restaurant operators are responsible for managing staff access levels and permissions within their organization.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>4. Acceptable Use</h2>
            <p>You agree not to: attempt to gain unauthorized access to other accounts, tenants, or system resources; manipulate pricing, discount, or payment data; interfere with Platform security measures; upload malicious content through the menu CMS; use the Platform for any illegal purpose; or resell access to the Platform without our prior written consent.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>5. Multi-Tenancy</h2>
            <p>The Platform operates in a multi-tenant environment. Each restaurant tenant's data is logically isolated. You agree not to attempt to access, modify, or exfiltrate data belonging to other tenants. Any such attempt constitutes a material breach of these Terms and may result in immediate account termination and legal action.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>6. Payment & Billing</h2>
            <p>If you subscribe to a paid plan, you agree to pay all applicable fees. Subscription fees are non-refundable except as required by applicable law. We reserve the right to modify pricing with 30 days' prior notice. Payment processing is handled by authorized third-party payment providers.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>7. Content & Menu Data</h2>
            <p>You retain ownership of content you upload to the Platform (menu items, images, descriptions). You grant us a limited license to host, display, and distribute this content as necessary to operate the Platform. You are responsible for ensuring your content does not infringe third-party rights or contain harmful material.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>8. Financial Data & Compliance</h2>
            <p>Rasoi provides tools for GST-compliant invoicing and financial reporting. However, you are ultimately responsible for the accuracy of your financial records and tax compliance. Rasoi is a technology provider, not a financial advisor or tax consultant.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Rasoi shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the amount paid by you for the Platform during the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>10. Termination</h2>
            <p>Either party may terminate this agreement with 30 days' written notice. We may suspend or terminate your access immediately if you breach these Terms or engage in prohibited activities. Upon termination, your data will be retained for the legally required period and then securely deleted.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>11. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>12. Contact</h2>
            <p>For questions about these Terms, contact us at legal@rasoi.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
