import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Lock, 
  User, 
  Clock, 
  FileText,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit")({
  component: AuditLogsView,
});

function AuditLogsView() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        const { data: auditRows, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("business_id", ctx.membership.business_id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(auditRows || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.actor_role && l.actor_role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-amber-500 shrink-0" /> Append-Only Audit Trail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-proof audit logs recording all sensitive business mutations and access events.
          </p>
        </div>

        <Button
          onClick={fetchAuditLogs}
          variant="outline"
          size="sm"
          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} /> Refresh Logs
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <Input
          placeholder="Filter logs by action, entity type, actor role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-850 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
        />
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12 text-amber-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center text-slate-500 dark:text-slate-400">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No Audit Records Found</h3>
          <p className="text-xs">No audit events match your search query.</p>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-xl overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                  <th className="p-4 font-bold">Timestamp</th>
                  <th className="p-4 font-bold">Action</th>
                  <th className="p-4 font-bold">Entity</th>
                  <th className="p-4 font-bold">Actor Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-750 dark:text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-amber-600 dark:text-amber-400">{log.action}</td>
                    <td className="p-4">
                      <span className="font-mono text-slate-850 dark:text-white">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-slate-500 ml-1">({log.entity_id.slice(0, 8)})</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className="uppercase text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                        {log.actor_role || "SYSTEM"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
