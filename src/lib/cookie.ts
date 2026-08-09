import crypto from "crypto";
import {
  getCookie as tsGetCookie,
  setCookie as tsSetCookie,
  deleteCookie as tsDeleteCookie,
} from "@tanstack/react-start/server";

const getSecret = () => {
  return (
    process.env["SESSION_SECRET"] ||
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    "fallback-rasoi-secure-secret-key-12345"
  );
};

export function signPayload(payload: Record<string, any>): string {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(data!)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(data!);
  } catch {
    return null;
  }
}

export function getCustomerSession(cookieName = "servio_customer_session") {
  const rawCookie = tsGetCookie(cookieName);
  if (!rawCookie) return null;
  return verifyPayload(rawCookie);
}

export function setCustomerSession(
  payload: Record<string, any>,
  cookieName = "servio_customer_session",
) {
  const signed = signPayload(payload);
  tsSetCookie(cookieName, signed, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function clearCustomerSession(cookieName = "servio_customer_session") {
  tsDeleteCookie(cookieName, {
    path: "/",
  });
}
