import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Utensils, Lock, Mail, User, Phone, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName,
            phone: phone,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        toast.success("Account created successfully!");
        navigate({ to: "/onboarding" });
      } else {
        toast.info("Account created! Please check your email inbox to confirm your account, or disable email confirmation in Supabase.");
        navigate({ to: "/auth/login" });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An error occurred during sign up.");
      toast.error("Failed to register.");
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
            <img src="/images/logo.webp" alt="Rasoi Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
          </Link>
          <h1 className="mt-4 text-xl font-bold text-white">Register Business Account</h1>
          <p className="mt-1 text-sm text-slate-400">Start managing your restaurant, cafe or hotel</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white">Business Owner Registration</CardTitle>
            <CardDescription className="text-slate-400">
              Step 1 of 2: Create your admin profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-300">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Harshith Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">
                  Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Work Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="owner@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
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
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Continue to Business Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an account?{" "}
              <Link to="/auth/login" className="font-semibold text-amber-400 hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
