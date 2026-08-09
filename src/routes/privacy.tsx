import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Nav */}
      <nav style={{ padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="container">
          <Link
            to="/"
            style={{
              color: "#f59e0b",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 800, padding: "60px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 12,
              padding: "8px 16px",
              marginBottom: 20,
            }}
          >
            <Shield size={16} style={{ color: "#f59e0b" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#f59e0b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Legal
            </span>
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: "#f8fafc",
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div style={{ lineHeight: 1.8, fontSize: 15, color: "#94a3b8" }} className="space-y-8">
          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              1. Introduction
            </h2>
            <p>
              Rasoi Platform ("we," "our," or "us") operates the Rasoi restaurant management and QR
              ordering platform. This Privacy Policy describes how we collect, use, disclose, and
              safeguard your personal information when you use our website, applications, and
              services (collectively, the "Platform").
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              2. Information We Collect
            </h2>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              2.1 Restaurant Operator Information
            </h3>
            <p>
              When restaurant operators register on our Platform, we may collect: business name,
              contact details, tax registration (GSTIN), staff names and roles, branch/outlet
              details, and business configuration preferences.
            </p>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              2.2 Guest/Customer Information
            </h3>
            <p>
              When guests use QR ordering, we may collect: name (optional), phone number (optional),
              order history within a dining session, and device identifiers via secure session
              cookies.
            </p>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              2.3 Automatically Collected Information
            </h3>
            <p>
              We automatically collect: IP addresses, browser type, device information, usage
              patterns, and analytics data to improve Platform performance and user experience.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              3. How We Use Your Information
            </h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>To provide, operate, and maintain the Platform</li>
              <li>To process QR-based orders and payments</li>
              <li>To manage restaurant staff access controls and roles</li>
              <li>To generate financial reports and GST-compliant invoices</li>
              <li>To send service-related notifications</li>
              <li>To improve our products, services, and customer experience</li>
              <li>To enforce our Terms of Service and ensure Platform security</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              4. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including: HMAC-signed secure
              HttpOnly session cookies, server-side authorization enforcement, role-based access
              controls (RBAC), row-level security (RLS) policies in our database, encrypted
              connections (TLS/HTTPS), and regular security audits.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              5. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share data with: payment processors
              (to complete transactions), cloud infrastructure providers (to host the Platform), and
              legal/regulatory authorities (when required by law).
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              6. Multi-Tenancy & Data Isolation
            </h2>
            <p>
              Rasoi is a multi-tenant platform. Each restaurant's data is logically isolated through
              tenant-level access controls and database-enforced row-level security. Restaurant
              operators can only access data belonging to their own business and authorized
              branches.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              7. Data Retention
            </h2>
            <p>
              We retain order and financial data as required by applicable tax regulations
              (typically 7 years in India under the GST framework). Customer session data is
              retained only for the duration of the active dining session plus a reasonable buffer
              for dispute resolution.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              8. Your Rights
            </h2>
            <p>
              You may request: access to your personal data, correction of inaccurate data, deletion
              of your data (subject to legal retention requirements), and data portability. Contact
              us at privacy@rasoi.app to exercise these rights.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
              9. Contact Us
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={16} style={{ color: "#f59e0b" }} /> privacy@rasoi.app
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={16} style={{ color: "#f59e0b" }} /> +91-XXXXX-XXXXX
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} style={{ color: "#f59e0b" }} /> India
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
