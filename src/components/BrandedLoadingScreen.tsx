import React from "react";
import { Loader2, Utensils } from "lucide-react";

interface BrandedLoadingScreenProps {
  restaurantName?: string;
  subtitle?: string;
  logoUrl?: string;
}

export const BrandedLoadingScreen: React.FC<BrandedLoadingScreenProps> = ({
  restaurantName = "RASOI",
  subtitle = "Preparing live digital menu...",
  logoUrl = "/images/logo.png",
}) => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100 overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Warm Ambient Glow Effects */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full p-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl space-y-6">
        
        {/* Animated Glowing Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Outer Spinning Ring */}
          <div className="absolute -inset-3 rounded-3xl border-2 border-dashed border-amber-500/30 animate-[spin_8s_linear_infinite]" />
          
          {/* Outer Pulse Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 opacity-30 blur animate-pulse" />

          {/* Logo Box */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-amber-500/40 bg-slate-950/90 p-3 shadow-xl shadow-amber-500/10">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={restaurantName}
                className="h-full w-full object-contain drop-shadow-md"
                onError={(e) => {
                  // Fallback if logo fails to load
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
            ) : null}
            <Utensils className={`h-10 w-10 text-amber-400 ${logoUrl ? "hidden" : ""}`} />
          </div>
        </div>

        {/* Branding & Titles */}
        <div className="space-y-1.5 pt-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>{restaurantName}</span>
          </h2>
          <p className="text-xs font-medium text-amber-400/90 tracking-wide">
            {subtitle}
          </p>
        </div>

        {/* Smooth Loading Indicator Bar */}
        <div className="w-full space-y-2 pt-1">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 w-1/2 rounded-full animate-[shimmer_1.5s_infinite_linear]" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span>Loading experience</span>
          </div>
        </div>

        {/* Footer Tagline */}
        <div className="pt-2 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <span>Powered by</span>
          <span className="font-extrabold text-amber-400 tracking-wider">RASOI</span>
        </div>
      </div>
    </div>
  );
};
