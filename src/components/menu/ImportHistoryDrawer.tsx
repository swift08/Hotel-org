import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { rollbackMenuVersion } from "@/lib/menu-import.functions";

interface ImportHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  imports: any[];
  onRefresh: () => void;
}

export const ImportHistoryDrawer: React.FC<ImportHistoryDrawerProps> = ({
  open,
  onOpenChange,
  businessId,
  imports,
  onRefresh,
}) => {
  const [rollbackLoading, setRollbackLoading] = React.useState<string | null>(null);

  const handleRollback = async (versionId: string, versionNum: number) => {
    if (!businessId) return;
    try {
      setRollbackLoading(versionId);
      await rollbackMenuVersion({
        data: {
          businessId,
          versionId,
        },
      });
      toast.success(`Successfully restored Menu Version v${versionNum}`);
      onRefresh();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to rollback version");
    } finally {
      setRollbackLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
            <Clock className="h-5 w-5 text-amber-500" /> Menu Import & Version History
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Audit history of physical & digital menu uploads, AI extractions, published versions,
            and rollbacks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {imports.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/40">
              <FileText className="h-10 w-10 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No import history found
              </p>
              <p className="text-xs text-slate-500">
                Upload your first menu PDF or photograph to populate history.
              </p>
            </div>
          ) : (
            imports.map((imp) => {
              const files = imp.source_files || [];
              const summary = imp.summary || {};
              const isPublished = imp.status === "published";

              return (
                <div
                  key={imp.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-amber-500/40"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {files[0]?.name || "Menu Document"}
                      </span>
                      {files.length > 1 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-300 dark:border-slate-700"
                        >
                          +{files.length - 1} more file(s)
                        </Badge>
                      )}
                      <Badge
                        className={`text-[10px] font-bold ${
                          isPublished
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isPublished ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Published
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-1 h-3 w-3" />{" "}
                            {imp.status?.toUpperCase() || "DRAFT"}
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>📅 {new Date(imp.created_at).toLocaleDateString()}</span>
                      <span>📂 {summary.itemsCount || 0} items detected</span>
                      {summary.categoriesCount > 0 && (
                        <span>📁 {summary.categoriesCount} categories</span>
                      )}
                    </div>
                  </div>

                  {isPublished && (
                    <Button
                      onClick={() => handleRollback(imp.id, summary.versionNumber || 1)}
                      disabled={rollbackLoading === imp.id}
                      variant="outline"
                      size="sm"
                      className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs shrink-0"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Restore Version
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
