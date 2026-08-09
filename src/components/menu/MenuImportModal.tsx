import React, { useState } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Utensils,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Eye,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Filter,
  ListChecks,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createMenuImportJob,
  processMenuImportJob,
  updateMenuImportDraft,
  publishMenuImport,
} from "@/lib/menu-import.functions";
import { ExtractedMenuItem, ExtractedMenuCategory } from "@/lib/ocr/extractor";

interface MenuImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onPublishedSuccess: () => void;
}

async function compressImageForUpload(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 2048;
      const MAX_HEIGHT = 2048;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve(dataUrl);
    };

    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

export const MenuImportModal: React.FC<MenuImportModalProps> = ({
  open,
  onOpenChange,
  businessId,
  onPublishedSuccess,
}) => {
  // Step workflow: "upload" | "processing" | "review" | "summary"
  const [step, setStep] = useState<"upload" | "processing" | "review" | "summary">("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);

  // Extracted Data State
  const [categories, setCategories] = useState<ExtractedMenuCategory[]>([]);
  const [items, setItems] = useState<ExtractedMenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ExtractedMenuItem | null>(null);

  // Document Preview Controls
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [previewFileIndex, setPreviewFileIndex] = useState<number>(0);

  // Bulk Selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Step 1 -> Step 2: Start Import & AI Extraction
  const handleStartImport = async () => {
    if (files.length === 0 || !businessId) return;

    try {
      setLoading(true);
      setStep("processing");

      // File reader & client image compression to avoid payload size limit
      const filePayloads = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await compressImageForUpload(file);
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          };
        })
      );

      // Create server import job
      const job = await createMenuImportJob({
        data: {
          businessId,
          files: filePayloads,
        },
      });

      setCurrentImportId(job.id);

      // Trigger server processing & AI extraction pipeline
      const result = await processMenuImportJob({
        data: {
          businessId,
          importId: job.id,
        },
      });

      const reviewData = result.review_data as any;
      setCategories(reviewData.categories || []);
      setItems(reviewData.items || []);
      if (reviewData.items?.[0]) {
        setSelectedItemId(reviewData.items[0].id);
      }

      setStep("review");
      toast.success(`Extraction complete! Found ${reviewData.items?.length || 0} menu items.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to extract menu. Please try again.");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  // Item Edit & Updates
  const handleUpdateItemField = (id: string, field: keyof ExtractedMenuItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "price") {
            updated.confidence = "high";
            delete updated.confidenceReason;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleResolveDuplicate = (id: string, action: "keep_existing" | "use_imported" | "create_separate") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            isDuplicate: false,
            confidence: "high" as const,
            duplicateAction: action,
          };
          delete updated.confidenceReason;
          return updated as any;
        }
        return item;
      })
    );
    toast.success(`Duplicate preference saved.`);
  };

  const handleAddVariantToItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const currentVars = item.variants || [];
          const newVar =
            currentVars.length === 0
              ? { name: "Half", price: Math.round(item.price * 0.6) }
              : currentVars.length === 1
              ? { name: "Full", price: item.price }
              : { name: `Option ${currentVars.length + 1}`, price: item.price };
          return { ...item, variants: [...currentVars, newVar] };
        }
        return item;
      })
    );
  };

  const handleUpdateVariantInItem = (itemId: string, varIdx: number, field: "name" | "price", value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedVars = [...(item.variants || [])];
          if (updatedVars[varIdx]) {
            updatedVars[varIdx] = { ...updatedVars[varIdx], [field]: value };
          }
          return { ...item, variants: updatedVars };
        }
        return item;
      })
    );
  };

  const handleRemoveVariantFromItem = (itemId: string, varIdx: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedVars = (item.variants || []).filter((_, idx) => idx !== varIdx);
          return { ...item, variants: updatedVars };
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleAddItem = () => {
    const defaultCat = categories[0]?.name || "Main Course";
    const newItem: ExtractedMenuItem = {
      id: `manual-${Math.random().toString(36).slice(2, 8)}`,
      name: "New Menu Item",
      description: "Item description",
      categoryName: defaultCat,
      price: 150,
      rawPrice: "150",
      currency: "INR",
      dietary: "veg",
      prepTimeMinutes: 15,
      variants: [],
      addons: [],
      confidence: "high",
    };
    setItems((prev) => [newItem, ...prev]);
    setSelectedItemId(newItem.id);
  };

  // Bulk selection handling
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    setItems((prev) => prev.filter((item) => !selectedItemIds.has(item.id)));
    setSelectedItemIds(new Set());
    toast.success(`Deleted ${selectedItemIds.size} items.`);
  };

  const handleBulkAssignCategory = (catName: string) => {
    setItems((prev) =>
      prev.map((item) => (selectedItemIds.has(item.id) ? { ...item, categoryName: catName } : item))
    );
    setSelectedItemIds(new Set());
    toast.success(`Assigned category to ${selectedItemIds.size} items.`);
  };

  // Step 3 -> Step 4: Review Summary
  const handleProceedToSummary = async () => {
    if (!currentImportId || !businessId) return;
    try {
      setLoading(true);
      await updateMenuImportDraft({
        data: {
          businessId,
          importId: currentImportId,
          reviewData: { categories, items },
        },
      });
      setStep("summary");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update review draft.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Final Publish
  const handlePublishMenu = async () => {
    if (!currentImportId || !businessId) return;
    try {
      setLoading(true);
      const res = await publishMenuImport({
        data: {
          businessId,
          importId: currentImportId,
        },
      });

      toast.success(`🎉 Menu Published! Version v${res.versionNum} with ${res.publishedCount} items is now active.`);
      onPublishedSuccess();
      onOpenChange(false);
      // Reset state
      setStep("upload");
      setFiles([]);
      setItems([]);
      setCategories([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish menu.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) => selectedCategory === "all" || item.categoryName === selectedCategory
  );

  const needsReviewItems = items.filter((i) => i.confidence === "needs_review");
  const activeSelectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/40 pr-12">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2.5 text-slate-900 dark:text-white">
              <UploadCloud className="h-6 w-6 text-amber-500 shrink-0" />
              {step === "upload" && "Import Existing Menu"}
              {step === "processing" && "AI Menu Extraction in Progress"}
              {step === "review" && "Side-by-Side Menu Review"}
              {step === "summary" && "Publish Menu Summary"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {step === "upload" && "Upload a menu photo, scanned menu, or PDF to extract your digital menu."}
              {step === "processing" && "Rasoi AI is detecting categories, items, prices, variants, and add-ons..."}
              {step === "review" && "Compare original document (left) with extracted digital menu (right)."}
              {step === "summary" && "Review final item counts and publish directly to customer QR menus."}
            </p>
          </div>

          {/* Stepper Badges */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold">
            <span className={`px-2.5 py-1 rounded-full ${step === "upload" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
              1. Upload
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className={`px-2.5 py-1 rounded-full ${step === "processing" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
              2. Extract
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className={`px-2.5 py-1 rounded-full ${step === "review" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
              3. Review
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className={`px-2.5 py-1 rounded-full ${step === "summary" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
              4. Publish
            </span>
          </div>
        </div>

        {/* STEP 1: UPLOAD ZONE */}
        {step === "upload" && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-8 sm:p-12 text-center bg-slate-50 dark:bg-slate-950/50 transition-all flex flex-col items-center justify-center min-h-[260px] cursor-pointer"
            >
              <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-500">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Drag & Drop your menu document here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Upload menu photos taken from phone, printed menus, scanned documents, or restaurant menu PDFs.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center justify-center rounded-xl text-sm font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-400 h-10 px-5 transition-all shadow-md shadow-amber-500/20">
                  <UploadCloud className="mr-2 h-4 w-4 shrink-0" /> Choose Files
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-4">
                Supported formats: JPG, PNG, WEBP, AVIF, PDF (Max 25MB per file)
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                  Uploaded Files ({files.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={handleStartImport}
                disabled={files.length === 0 || loading}
                size="lg"
                className="bg-amber-500 font-extrabold text-slate-950 hover:bg-amber-400 px-8 shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Process & Extract Menu <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING SCREEN */}
        {step === "processing" && (
          <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-amber-500/20 border-2 border-amber-500 animate-ping absolute inset-0" />
              <div className="h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center relative">
                <Sparkles className="h-10 w-10 text-amber-500 animate-spin" />
              </div>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-4">
              Analyzing Menu Document...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Extracting category headers, item names, prices, dietary symbols, variants, and add-ons using server-side vision AI.
            </p>
          </div>
        )}

        {/* STEP 3: SIDE-BY-SIDE REVIEW SCREEN */}
        {step === "review" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-t border-slate-200 dark:border-slate-800">
            {/* LEFT PANEL: ORIGINAL MENU SOURCE VIEW */}
            <div className="w-full lg:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex flex-col h-64 lg:h-auto">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Eye className="h-4 w-4 text-amber-500" /> Original Uploaded Document
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewScale((s) => Math.max(0.6, s - 0.2))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    <ZoomOut className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">{(previewScale * 100).toFixed(0)}%</span>
                  <button
                    onClick={() => setPreviewScale((s) => Math.min(2.5, s + 0.2))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  >
                    <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
                {files[previewFileIndex] ? (
                  <div
                    style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                    className="transition-transform duration-200 max-w-full"
                  >
                    <img
                      src={URL.createObjectURL(files[previewFileIndex])}
                      alt="Source Menu"
                      className="rounded-lg shadow-xl max-h-[70vh] object-contain border border-slate-300 dark:border-slate-700"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">Document preview active</div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: EXTRACTED DIGITAL MENU EDITOR */}
            <div className="w-full lg:w-1/2 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
              {/* Menu Quality & Review Required Banner */}
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Menu Import Quality: {Math.round((items.filter(i => i.price > 0 && i.confidence === "high").length / Math.max(1, items.length)) * 100)}% — {items.filter(i => i.confidence === "needs_review").length === 0 ? "High Quality" : "Review Recommended"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {items.length} items detected across {categories.length} categories. {items.filter(i => i.confidence === "high").length} verified automatically. Review required before publishing.
                  </p>
                </div>

                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold shrink-0">
                  ⚠ Review Required Before Publishing
                </Badge>
              </div>

              {/* Category Toolbar & Item Controls */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-500" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 text-xs w-44 bg-white dark:bg-slate-950">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories ({items.length})</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {needsReviewItems.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      <AlertTriangle className="mr-1 h-3 w-3" /> {needsReviewItems.length} Needs Review
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAddItem}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>
              </div>

              {/* Bulk Action Bar */}
              {selectedItemIds.size > 0 && (
                <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs px-4">
                  <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> {selectedItemIds.size} item(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="h-7 text-[11px]">
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              {/* Extracted Item List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredItems.map((item) => {
                  const isNeedsReview = item.confidence === "needs_review";
                  const isSelected = selectedItemIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isNeedsReview
                          ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 shrink-0"
                          />
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateItemField(item.id, "name", e.target.value)}
                            className="h-8 font-bold text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">₹</span>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateItemField(item.id, "price", Number(e.target.value))}
                            className="h-8 w-24 font-bold text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-right"
                          />

                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Item Sub-details */}
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <Input
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) => handleUpdateItemField(item.id, "description", e.target.value)}
                          className="h-7 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        />

                        <Select
                          value={item.categoryName}
                          onValueChange={(val) => handleUpdateItemField(item.id, "categoryName", val)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-white dark:bg-slate-950">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Portion Sizes & Variants Editor */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="h-3 w-3 text-amber-500" /> Portion Sizes / Variants
                          </span>
                          <button
                            onClick={() => handleAddVariantToItem(item.id)}
                            className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" /> Add Half / Full Variant
                          </button>
                        </div>

                        {item.variants && item.variants.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {item.variants.map((v, vIdx) => (
                              <div
                                key={vIdx}
                                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <input
                                  type="text"
                                  value={v.name}
                                  onChange={(e) => handleUpdateVariantInItem(item.id, vIdx, "name", e.target.value)}
                                  className="w-16 font-bold bg-transparent border-none p-0 focus:outline-none text-slate-800 dark:text-slate-200 text-xs"
                                  placeholder="Variant"
                                />
                                <span className="text-amber-500 font-bold text-xs">₹</span>
                                <input
                                  type="number"
                                  value={v.price}
                                  onChange={(e) => handleUpdateVariantInItem(item.id, vIdx, "price", Number(e.target.value))}
                                  className="w-14 font-bold bg-transparent border-none p-0 focus:outline-none text-slate-800 dark:text-slate-200 text-xs text-right"
                                />
                                <button
                                  onClick={() => handleRemoveVariantFromItem(item.id, vIdx)}
                                  className="text-slate-400 hover:text-rose-500 ml-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            Single price item. Click "+ Add Half / Full Variant" if this item offers Half/Full portions.
                          </p>
                        )}
                      </div>

                      {/* Confidence & Duplicate Banner */}
                      {item.confidenceReason && (
                        <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
                          <span className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {item.confidenceReason}
                          </span>

                          {item.isDuplicate && item.duplicateInfo && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleResolveDuplicate(item.id, "keep_existing")}
                                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold hover:bg-slate-300 text-[10px]"
                              >
                                Keep Existing
                              </button>
                              <button
                                onClick={() => handleResolveDuplicate(item.id, "use_imported")}
                                className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-[10px]"
                              >
                                Use Imported
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Review Footer Bar */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  {items.length} items extracted ({needsReviewItems.length} needs review)
                </span>

                <Button
                  onClick={handleProceedToSummary}
                  disabled={loading}
                  className="bg-amber-500 font-extrabold text-slate-950 hover:bg-amber-400 text-xs px-6 shadow-md shadow-amber-500/20"
                >
                  Review Summary <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY & PUBLISH */}
        {step === "summary" && (
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Menu Import Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Categories</p>
                  <p className="text-2xl font-extrabold text-amber-500">{categories.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Items Detected</p>
                  <p className="text-2xl font-extrabold text-emerald-500">{items.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Variants</p>
                  <p className="text-2xl font-extrabold text-blue-500">
                    {items.reduce((acc, item) => acc + (item.variants?.length || 0), 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-xs text-slate-500">Add-ons</p>
                  <p className="text-2xl font-extrabold text-purple-500">
                    {items.reduce((acc, item) => acc + (item.addons?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={() => setStep("review")} variant="outline" size="lg" className="text-xs">
                Back to Review
              </Button>

              <Button
                onClick={handlePublishMenu}
                disabled={loading}
                size="lg"
                className="bg-emerald-600 font-extrabold text-white hover:bg-emerald-500 px-8 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Publish Menu Live
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
