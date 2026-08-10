import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformContext } from "@/lib/platform.functions";
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isUnconfirmed = error.message.toLowerCase().includes("email not confirmed");
        const msg = isUnconfirmed
          ? "Email not confirmed. Please check your inbox to confirm your account."
          : error.message;
        setErrorMsg(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMsg("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      let ctx: Awaited<ReturnType<typeof getPlatformContext>> | null = null;
      try {
        ctx = await getPlatformContext();
      } catch (ctxError: any) {
        await supabase.auth.signOut();
        const msg = ctxError?.message || "Could not verify platform access.";
        setErrorMsg(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (!ctx?.isPlatformAdmin) {
        await supabase.auth.signOut();
        const msg = "This account does not have platform administrator access.";
        setErrorMsg(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Signed in successfully!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setErrorMsg(err?.message || "An error occurred during sign in.");
      toast.error("Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-foreground">
      <div
        aria-hidden
        className="absolute inset-0 bg-[oklch(0.14_0.02_45)]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.45 0.16 48 / 0.45), transparent), radial-gradient(ellipse 50% 40% at 90% 80%, oklch(0.55 0.14 80 / 0.2), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.9 0.05 70 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.05 70 / 0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-7">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center justify-center">
            <img
              src="/images/rasoi-logo.png"
              alt="Rasoi"
              className="h-[4.5rem] w-auto object-contain drop-shadow-[0_8px_24px_oklch(0.55_0.18_48/0.35)]"
            />
          </Link>
          <p className="mt-5 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-white">
            Platform control plane
          </p>
          <p className="mt-1.5 text-sm text-white/55">
            Sign in to manage organizations across Rasoi
          </p>
        </div>

        <Card className="border-white/10 bg-[oklch(0.2_0.02_45/0.85)] text-white shadow-[var(--shadow-elevated)] backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="font-[var(--font-display)] text-lg text-white">
              Administrator login
            </CardTitle>
            <CardDescription className="text-white/50">
              Restricted to authorized Rasoi platform administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-white/35" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rasoi.app"
                    className="border-white/15 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 size-4 text-white/35" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-white/15 bg-white/5 pl-10 pr-10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-white/35 hover:text-white/70"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full brand-gradient border-0 text-primary-foreground" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
