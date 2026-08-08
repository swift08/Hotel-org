import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import { Utensils, Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
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
          ? "Email not confirmed. Please check your email inbox to confirm your account, or disable 'Confirm Email' in your Supabase Auth settings."
          : error.message;
        setErrorMsg(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Signed in successfully!");
      // Check user context to redirect to onboarding or admin
      const ctx = await getMyContext();
      if (!ctx.onboarded) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/admin/dashboard" });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An error occurred during sign in.");
      toast.error("Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center">
            <img src="/images/logo.png" alt="Rasoi Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
          </Link>
          <h1 className="mt-4 text-xl font-bold text-white">Sign in to your account</h1>
          <p className="mt-1 text-sm text-slate-400">Access your restaurant management console</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white">Staff / Manager Login</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to manage orders, menu, and KDS.
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
                    type="email"
                    placeholder="owner@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
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
                className="w-full h-11 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20"
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
              Don't have a business account?{" "}
              <Link to="/auth/signup" className="font-semibold text-amber-400 hover:underline">
                Register Business
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
