import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { runSecurityAuditServer, type AuditTestResult } from "@/lib/security-audit.server";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Key, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/security-test")({
  component: SecurityTestDashboard,
});

function SecurityTestDashboard() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{ total: number; pass: number; fail: number } | null>(null);
  const [results, setResults] = useState<AuditTestResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const executeAudit = async () => {
    setRunning(true);
    try {
      const response: any = await runSecurityAuditServer({ data: { runSecretScanner: true } });
      if (response && response.ok && response.summary && response.results) {
        setResults(response.results);
        setSummary(response.summary);
        if (response.summary.fail === 0) {
          toast.success(`Security Audit Passed! All ${response.summary.total} tests PASSED.`);
        } else {
          toast.error(`Security Audit Failed! ${response.summary.fail} of ${response.summary.total} tests failed.`);
        }
      } else {
        throw new Error(response?.error || "Audit failed to execute");
      }
    } catch (err: any) {
      toast.error(`Audit error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    executeAudit();
  }, []);

  const categories = ["ALL", ...Array.from(new Set(results.map((r) => r.category)))];
  const filteredResults = selectedCategory === "ALL" ? results : results.filter((r) => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
                  Rasoi Security & Compliance Audit
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                  Automated 30-Test Production Authorization, BOLA, IDOR, Tenant Isolation & Secret Audit
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeAudit}
              disabled={running}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
            >
              <RefreshCw size={16} className={running ? "animate-spin" : ""} />
              {running ? "Running Audit..." : "Rerun Full Audit"}
            </button>
          </div>
        </div>

        {/* Corporate Legal Attribution Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Key size={16} className="text-amber-400 flex-shrink-0" />
            <span>
              Engineered & Maintained by{" "}
              <a href="https://www.admarkdigitals.com/" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1">
                ADMARK DIGITALS <ExternalLink size={12} />
              </a>{" "}
              · Mysuru · Bengaluru · Hyderabad
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">© 2026 ADMARK DIGITALS Rights Reserved</span>
        </div>

        {/* Audit Metrics Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Evaluated Tests</span>
              <div className="text-3xl font-black text-white mt-1">{summary.total}</div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5">
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Passed Assertions</span>
              <div className="text-3xl font-black text-emerald-400 mt-1 flex items-center gap-2">
                {summary.pass} <CheckCircle2 size={24} />
              </div>
            </div>

            <div className={`border rounded-2xl p-5 ${summary.fail === 0 ? "bg-slate-900/40 border-slate-800" : "bg-red-950/20 border-red-500/20"}`}>
              <span className={`text-xs uppercase font-bold tracking-wider ${summary.fail === 0 ? "text-slate-400" : "text-red-400"}`}>Failed Assertions</span>
              <div className={`text-3xl font-black mt-1 flex items-center gap-2 ${summary.fail === 0 ? "text-slate-400" : "text-red-400"}`}>
                {summary.fail} {summary.fail > 0 && <XCircle size={24} />}
              </div>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Test Results List */}
        <div className="space-y-3">
          {filteredResults.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-2xl border transition-all ${
                r.status === "PASS"
                  ? "bg-emerald-950/10 border-emerald-500/20 text-emerald-100"
                  : r.status === "FAIL"
                  ? "bg-red-950/20 border-red-500/30 text-red-100"
                  : "bg-amber-950/20 border-amber-500/20 text-amber-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      #{r.id} · {r.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-100">{r.name}</h3>
                  </div>

                  <div className="text-xs text-slate-400 font-mono mt-2 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div><span className="text-slate-500 font-semibold">Expected:</span> {r.expected}</div>
                    <div><span className="text-slate-500 font-semibold">Actual:</span> {r.actual}</div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    <strong className="text-slate-400">Evidence:</strong> {r.evidence}
                  </p>
                  {r.error && <p className="text-xs text-red-400 font-mono mt-1">Error: {r.error}</p>}
                </div>

                <span
                  className={`text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full flex-shrink-0 flex items-center gap-1.5 ${
                    r.status === "PASS"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : r.status === "FAIL"
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {r.status === "PASS" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
