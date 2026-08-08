import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getMyContext } from "@/lib/business.functions";
import { 
  getMenu, 
  saveCategory, 
  saveProduct, 
  setProductAvailability, 
  setProductState,
  saveVariant,
  saveAddonGroup,
  saveAddon
} from "@/lib/menu.functions";
import { 
  MenuSquare, 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  Clock, 
  ChefHat, 
  Layers, 
  DollarSign,
  Loader2,
  Filter,
  Camera,
  Utensils
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/menu")({
  component: MenuCMS,
});

function MenuCMS() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);

  // Menu Data State
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [addonGroups, setAddonGroups] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);

  // Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Product Form State
  const [prodId, setProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState(100);
  const [prodPrepTime, setProdPrepTime] = useState(10);
  const [prodFoodTag, setProdFoodTag] = useState("veg");
  const [prodStation, setProdStation] = useState<"kitchen" | "bar">("kitchen");
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const bucketName = "product-images";
      const fileExt = file.name.split(".").pop();
      const fileName = `${context?.membership?.business_id}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) {
        if (error.message.includes("bucket not found") || error.message.includes("does not exist")) {
          // Attempt to create bucket dynamically
          await supabase.storage.createBucket(bucketName, { public: true });
          const retry = await supabase.storage.from(bucketName).upload(filePath, file, { upsert: true });
          if (retry.error) throw retry.error;
          const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
          return publicUrlData.publicUrl;
        }
        throw error;
      }

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Storage upload failed, falling back to data URL:", err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  };

  // Variant Form State
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState(50);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);
      if (ctx?.membership?.business_id) {
        const menu = await getMenu({ data: { businessId: ctx.membership.business_id } });
        setCategories(menu.categories || []);
        setProducts(menu.products || []);
        setVariants(menu.variants || []);
        setAddonGroups(menu.addonGroups || []);
        setAddons(menu.addons || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Save Category Handler
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !context?.membership?.business_id) return;
    try {
      await saveCategory({
        data: {
          businessId: context.membership.business_id,
          name: catName,
          description: catDesc || undefined,
          state: "published",
        },
      });
      toast.success("Category saved!");
      setCatName("");
      setCatDesc("");
      setCatModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save category");
    }
  };

  // Save Product Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !context?.membership?.business_id) return;
    try {
      await saveProduct({
        data: {
          businessId: context.membership.business_id,
          id: prodId || undefined,
          categoryId: prodCatId || undefined,
          name: prodName,
          description: prodDesc || undefined,
          basePrice: Number(prodPrice),
          prepTimeMinutes: Number(prodPrepTime),
          foodTags: [prodFoodTag],
          station: prodStation,
          state: "published",
          images: prodImages,
        },
      });
      toast.success(prodId ? "Product updated!" : "Product created!");
      resetProdForm();
      setProdModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product");
    }
  };

  // Save Variant Handler
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantName || !selectedProductForVariant || !context?.membership?.business_id) return;
    try {
      await saveVariant({
        data: {
          businessId: context.membership.business_id,
          productId: selectedProductForVariant.id,
          name: variantName,
          price: Number(variantPrice),
        },
      });
      toast.success("Variant added!");
      setVariantName("");
      setVariantPrice(50);
      setVariantModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add variant");
    }
  };

  // Toggle Out of Stock
  const handleToggleStock = async (productId: string, currentAvailable: boolean) => {
    if (!context?.membership?.business_id) return;
    try {
      await setProductAvailability({
        data: {
          businessId: context.membership.business_id,
          productId,
          isAvailable: !currentAvailable,
        },
      });
      toast.success(!currentAvailable ? "Marked Available" : "Marked Out of Stock");
      fetchMenuData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update availability");
    }
  };

  const resetProdForm = () => {
    setProdId(null);
    setProdName("");
    setProdCatId("");
    setProdDesc("");
    setProdPrice(100);
    setProdPrepTime(10);
    setProdFoodTag("veg");
    setProdStation("kitchen");
    setProdImages([]);
  };

  const openEditProduct = (p: any) => {
    setProdId(p.id);
    setProdName(p.name);
    setProdCatId(p.category_id || "");
    setProdDesc(p.description || "");
    setProdPrice(Number(p.base_price));
    setProdPrepTime(p.prep_time_minutes || 10);
    setProdFoodTag(p.food_tags?.[0] || "veg");
    setProdStation(p.station || "kitchen");
    setProdImages(p.images || []);
    setProdModalOpen(true);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const currencySymbol = context?.business?.currency === "INR" ? "₹" : "$";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Utensils className="h-7 w-7 text-amber-500 shrink-0" /> Menu CMS
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage menu categories, items, variants, add-on options, and live stock toggles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setCatName("");
              setCatDesc("");
              setCatModalOpen(true);
            }}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4 shrink-0" /> Add Category
          </Button>

          <Button
            onClick={() => {
              resetProdForm();
              setProdModalOpen(true);
            }}
            size="sm"
            className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
          >
            <Plus className="mr-2 h-4 w-4 shrink-0" /> Add Item
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none" />
          <Input
            placeholder="Search items by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500 h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white">
              <SelectItem value="all">All Categories ({products.length})</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories Summary Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory === "all"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          All Items
          <span
            className={`rounded-full px-1.5 text-[10px] font-bold min-w-[18px] text-center ${
              selectedCategory === "all" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-slate-150 dark:bg-slate-800 text-slate-500"
            }`}
          >
            {products.length}
          </span>
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === c.id
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {c.name}
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold min-w-[18px] text-center ${
                  selectedCategory === c.id ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-slate-150 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center text-slate-500 dark:text-slate-400">
          <MenuSquare className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No Menu Items Found</h3>
          <p className="text-xs">Add your first menu item or change search query.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const itemVariants = variants.filter((v) => v.product_id === p.id);
            const tag = p.food_tags?.[0] || "veg";

            return (
              <Card key={p.id} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-lg text-slate-800 dark:text-slate-100 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all overflow-hidden">
                {p.images?.[0] ? (
                  <div className="h-36 w-full overflow-hidden relative">
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 dark:from-slate-900 dark:via-slate-900/30 to-transparent" />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-750 relative border-b border-slate-200 dark:border-slate-900/40">
                    <Utensils className="h-8 w-8 opacity-20" />
                  </div>
                )}
                <CardContent className="p-5 space-y-4">
                  {/* Header: Name, Tag, Stock Switch */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {/* Veg / Non-Veg Indicator */}
                        {tag === "veg" && (
                          <span className="flex h-4 w-4 items-center justify-center rounded border border-emerald-500 p-0.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        {tag === "non_veg" && (
                          <span className="flex h-4 w-4 items-center justify-center rounded border border-red-500 p-0.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                          </span>
                        )}
                        {tag === "vegan" && (
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            VEGAN
                          </Badge>
                        )}
                        <h3 className="font-bold text-base text-slate-800 dark:text-white">{p.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{p.description || "No description."}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Switch
                        checked={p.is_available}
                        onCheckedChange={() => handleToggleStock(p.id, p.is_available)}
                      />
                      <span className={`text-[10px] font-bold ${p.is_available ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {p.is_available ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Prep Time */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                      {currencySymbol}{Number(p.base_price).toFixed(2)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                      {p.prep_time_minutes} mins prep
                    </span>
                  </div>

                  {/* Variants List */}
                  {itemVariants.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Variants ({itemVariants.length}):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {itemVariants.map((v) => (
                          <Badge key={v.id} variant="outline" className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px]">
                            {v.name}: {currencySymbol}{Number(v.price).toFixed(2)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={() => openEditProduct(p)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white h-8 text-xs font-bold"
                    >
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>

                    <Button
                      onClick={() => {
                        setSelectedProductForVariant(p);
                        setVariantModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-8 text-xs font-bold"
                    >
                      + Variant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Menu Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Category Name *</Label>
              <Input
                placeholder="e.g. Starters, Main Course, Drinks"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Description</Label>
              <Input
                placeholder="Freshly prepared tandoori and sizzler items"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400">
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Product Dialog */}
      <Dialog open={prodModalOpen} onOpenChange={setProdModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{prodId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-slate-300">Item Name *</Label>
                <Input
                  placeholder="e.g. Butter Chicken"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Category</Label>
                <Select value={prodCatId} onValueChange={setProdCatId}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Base Price ({currencySymbol}) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Food Tag</Label>
                <Select value={prodFoodTag} onValueChange={setProdFoodTag}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="egg">Egg</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Prep Time (mins)</Label>
                <Input
                  type="number"
                  min={1}
                  value={prodPrepTime}
                  onChange={(e) => setProdPrepTime(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-slate-300">Description</Label>
                <Input
                  placeholder="Short description for customer menu"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {/* Photo Upload & Preview Widget */}
              <div className="space-y-2 sm:col-span-2 border-t border-slate-800/80 pt-4 mt-2">
                <Label className="text-xs font-bold text-amber-400">Dish Photo</Label>
                <div className="flex items-center gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  {prodImages?.[0] ? (
                    <div className="h-16 w-16 rounded-lg overflow-hidden border border-slate-800 shrink-0 relative group">
                      <img src={prodImages[0]} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProdImages([])}
                        className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-900 border border-dashed border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Camera className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="dish-image-file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingImage(true);
                          const url = await handleImageUpload(file);
                          if (url) {
                            setProdImages([url]);
                          }
                          setUploadingImage(false);
                        }
                      }}
                    />
                    <label
                      htmlFor="dish-image-file"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer hover:bg-slate-800 hover:text-white transition-all ${
                        uploadingImage ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        "Select Photo"
                      )}
                    </label>
                    <p className="text-[10px] text-slate-500">Supports JPEG, PNG, WEBP (Max 2MB)</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 w-full sm:w-auto">
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <Dialog open={variantModalOpen} onOpenChange={setVariantModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Variant for {selectedProductForVariant?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVariant} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Variant Name *</Label>
              <Input
                placeholder="e.g. Small / Medium / Large / Half / Full"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Variant Price ({currencySymbol}) *</Label>
              <Input
                type="number"
                min={0}
                value={variantPrice}
                onChange={(e) => setVariantPrice(Number(e.target.value))}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400">
                Save Variant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
