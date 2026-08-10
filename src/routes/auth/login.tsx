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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 selection:bg-primary selection:text-primary-foreground">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center justify-center">
            <img
              src="/images/rasoi-logo.png"
              alt="Rasoi"
              className="h-16 w-auto object-contain drop-shadow-lg"
            />
          </Link>
          <h1 className="mt-4 text-xl font-bold text-white">Rasoi Platform</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to the organization control plane</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white">Platform Administrator Login</CardTitle>
            <CardDescription className="text-slate-400">
              Access is restricted to authorized Rasoi platform administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@orderlyhub.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-primary focus:ring-primary"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary font-bold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Not a platform administrator? Contact your Rasoi systems owner for access.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
