import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { resolveTable, getPublicMenu, placeOrder } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";
import { 
  Utensils, 
  Search, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Loader2,
  Phone,
  User,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/q/$slug")({
  component: CustomerMenuScreen,
});

function CustomerMenuScreen() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tableContext, setTableContext] = useState<any>(null);
  const [menuData, setMenuData] = useState<{
    categories: any[];
    products: any[];
    variants: any[];
    addonGroups: any[];
    addons: any[];
  }>({
    categories: [],
    products: [],
    variants: [],
    addonGroups: [],
    addons: [],
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);

  // Options modal selection state
  const [modalVariant, setModalVariant] = useState<any>(null);
  const [modalAddons, setModalAddons] = useState<string[]>([]);
  const [modalInstructions, setModalInstructions] = useState("");
  const [modalQty, setModalQty] = useState(1);

  // Checkout modal
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Active placed order tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await resolveTable({ data: { slug } });
        if (!res.ok) {
          setTableContext({ errorReason: res.reason, tableLabel: (res as any).tableLabel });
          setLoading(false);
          return;
        }

        setTableContext(res);
        const menu = await getPublicMenu({ data: { slug } });
        setMenuData(menu);
      } catch (err) {
        console.error(err);
        setTableContext({ errorReason: "unknown" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Real-time tracking of active customer order status
  const [activeOrderStatus, setActiveOrderStatus] = useState<string>("pending");

  useEffect(() => {
    if (!activeOrderId) return;

    const channel = supabase
      .channel(`customer_order_${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${activeOrderId}`,
        },
        (payload: any) => {
          const nextStatus = payload.new?.status;
          setActiveOrderStatus(nextStatus);
          if (nextStatus === "preparing") {
            toast.info("🍳 The kitchen is preparing your meal!");
          } else if (nextStatus === "ready") {
            toast.success("🔔 Your order is READY! Serving to your table.");
          } else if (nextStatus === "served") {
            toast.success("✨ Served! Enjoy your food.");
          } else if (nextStatus === "completed") {
            toast.success("🙌 Thank you for dining with us!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId]);

  if (loading) {
    return (
      <BrandedLoadingScreen
        restaurantName={tableContext?.business?.name || "RASOI"}
        subtitle={`Preparing digital menu for ${tableContext?.table?.label || "your table"}...`}
        logoUrl="/images/logo.png"
      />
    );
  }

  const DEFAULT_DISH_LIMIT = 50;

  // Open Options Modal or Add Directly
  const handleAddToCartClick = (product: any) => {
    const dishLimit = product.max_qty || product.max_limit || DEFAULT_DISH_LIMIT;
    const currentDishQty = cartItems
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (currentDishQty >= dishLimit) {
      toast.error(`Maximum quantity limit (${dishLimit}) reached for ${product.name}!`);
      return;
    }

    const pVariants = menuData.variants.filter((v: any) => v.product_id === product.id);
    const pAddonGroups = menuData.addonGroups.filter((g: any) => g.product_id === product.id);

    if (pVariants.length > 0 || pAddonGroups.length > 0) {
      setSelectedProduct(product);
      setModalVariant(pVariants[0]?.id || null);
      setModalAddons([]);
      setModalInstructions("");
      setModalQty(1);
      setOptionsModalOpen(true);
    } else {
      // Add simple product
      addCartLine({
        productId: product.id,
        productName: product.name,
        basePrice: Number(product.base_price),
        variantId: null,
        variantName: null,
        variantPrice: 0,
        addonIds: [],
        addonsList: [],
        quantity: 1,
        maxLimit: dishLimit,
        specialInstructions: "",
      });
      toast.success(`Added ${product.name} to cart`);
    }
  };

  const handleConfirmOptionsAdd = () => {
    if (!selectedProduct) return;
    const dishLimit = selectedProduct.max_qty || selectedProduct.max_limit || DEFAULT_DISH_LIMIT;
    const currentDishQty = cartItems
      .filter((i) => i.productId === selectedProduct.id)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (currentDishQty + modalQty > dishLimit) {
      const allowed = Math.max(0, dishLimit - currentDishQty);
      if (allowed === 0) {
        toast.error(`Maximum quantity limit (${dishLimit}) reached for ${selectedProduct.name}!`);
        return;
      }
    }

    const pVariants = menuData.variants.filter((v: any) => v.product_id === selectedProduct.id);
    const variantObj = pVariants.find((v: any) => v.id === modalVariant);

    const selectedAddonsList = menuData.addons
      .filter((a: any) => modalAddons.includes(a.id))
      .map((a: any) => ({ id: a.id, name: a.name, price: Number(a.price) }));

    addCartLine({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      basePrice: Number(selectedProduct.base_price),
      variantId: variantObj?.id || null,
      variantName: variantObj?.name || null,
      variantPrice: Number(variantObj?.price || 0),
      addonIds: modalAddons,
      addonsList: selectedAddonsList,
      quantity: modalQty,
      maxLimit: dishLimit,
      specialInstructions: modalInstructions.trim(),
    });

    setOptionsModalOpen(false);
    toast.success(`Added ${selectedProduct.name} to cart`);
  };

  const addCartLine = (line: any) => {
    const dishLimit = line.maxLimit || DEFAULT_DISH_LIMIT;

    setCartItems((prev) => {
      const currentDishQty = prev
        .filter((i) => i.productId === line.productId)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (currentDishQty + line.quantity > dishLimit) {
        const allowedToAdd = Math.max(0, dishLimit - currentDishQty);
        if (allowedToAdd === 0) {
          toast.error(`Dish limit of ${dishLimit} reached for ${line.productName}!`);
          return prev;
        }

        toast.warning(`Added ${allowedToAdd} units of ${line.productName} (Dish limit: ${dishLimit})`);

        const existingIdx = prev.findIndex(
          (i) =>
            i.productId === line.productId &&
            i.variantId === line.variantId &&
            JSON.stringify(i.addonIds.sort()) === JSON.stringify(line.addonIds.sort()) &&
            i.specialInstructions === line.specialInstructions
        );

        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].quantity += allowedToAdd;
          return updated;
        }
        return [...prev, { ...line, quantity: allowedToAdd }];
      }

      // Check if exact same line exists
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === line.productId &&
          i.variantId === line.variantId &&
          JSON.stringify(i.addonIds.sort()) === JSON.stringify(line.addonIds.sort()) &&
          i.specialInstructions === line.specialInstructions
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += line.quantity;
        return updated;
      }
      return [...prev, line];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const targetItem = updated[index];
      if (!targetItem) return prev;

      const dishLimit = targetItem.maxLimit || DEFAULT_DISH_LIMIT;
      const currentDishQty = prev
        .filter((i) => i.productId === targetItem.productId)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (delta > 0 && currentDishQty + delta > dishLimit) {
        toast.error(`Cannot exceed dish limit of ${dishLimit} for ${targetItem.productName}!`);
        return prev;
      }

      const newQty = targetItem.quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  // Compute Cart Subtotal
  const cartSubtotal = cartItems.reduce((acc, item) => {
    const unitPrice = item.variantId ? item.variantPrice : item.basePrice;
    const addonsPrice = item.addonsList.reduce((a: number, b: any) => a + Number(b.price), 0);
    return acc + (unitPrice + addonsPrice) * item.quantity;
  }, 0);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmittingOrder(true);

    try {
      // Get or create session token
      let sessionToken = localStorage.getItem("servio_session_token");
      if (!sessionToken) {
        sessionToken = "sess_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("servio_session_token", sessionToken);
      }

      // Unique idempotency key per place order submit
      const idempotencyKey = "ord_" + Math.random().toString(36).substring(2, 15) + Date.now();

      const itemsPayload = cartItems.map((ci) => ({
        productId: ci.productId,
        variantId: ci.variantId || undefined,
        addonIds: ci.addonIds.length > 0 ? ci.addonIds : undefined,
        quantity: ci.quantity,
        specialInstructions: ci.specialInstructions || undefined,
      }));

      const res = await placeOrder({
        data: {
          slug,
          sessionToken,
          idempotencyKey,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: itemsPayload,
        },
      });

      toast.success(`Order #${res.orderNumber} placed successfully!`);
      setCartItems([]);
      setCartDrawerOpen(false);
      setActiveOrderId(res.orderId);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to place order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tableContext?.errorReason) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <Card className="border-slate-800 bg-slate-900/90 max-w-sm p-6 space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">QR Code Unavailable</h2>
          <p className="text-sm text-slate-400">
            {tableContext.errorReason === "disabled"
              ? "This table QR code has been disabled by the restaurant."
              : "This QR code URL is invalid or no longer active."}
          </p>
        </Card>
      </div>
    );
  }

  const currencySymbol = tableContext?.business?.currency === "INR" ? "₹" : "$";

  // Filtered Products
  const filteredProducts = menuData.products.filter((p: any) => {
    const matchesCat = selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      foodFilter === "all" ||
      p.food_tags?.some((t: string) => {
        const norm = t.toLowerCase().replace(/[^a-z0-9]/g, "");
        const filtNorm = foodFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (filtNorm === "veg") {
          return norm === "veg" && !norm.includes("non");
        }
        if (filtNorm === "nonveg") {
          return norm.includes("non");
        }
        return norm === filtNorm || norm.includes(filtNorm);
      });

    return matchesCat && matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 selection:bg-amber-500 selection:text-slate-950">
      {/* Sticky Table Header Banner */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-xl">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight leading-tight">
                {tableContext?.business?.name}
              </h1>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                <span>Ordering from {tableContext?.table?.label}</span>
              </div>
            </div>
          </div>

          {cartItems.length > 0 && (
            <Button
              onClick={() => setCartDrawerOpen(true)}
              size="sm"
              className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md"
            >
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              {cartItems.reduce((a, b) => a + b.quantity, 0)}
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Active Order Banner if placed */}
        {activeOrderId && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>Order Placed!</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Your kitchen ticket is active.</p>
            </div>
            <Badge className="bg-emerald-500 text-slate-950 font-bold px-3 py-1">
              Active
            </Badge>
          </div>
        )}

        {/* Search & Food Tag Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 h-10 rounded-xl"
            />
          </div>

          {/* Veg / Non-Veg Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFoodFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all ${
                foodFilter === "all" ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setFoodFilter("veg")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all ${
                foodFilter === "veg" ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10"
              }`}
            >
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded border border-emerald-500 p-0.5">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
              </span>
              Pure Veg
            </button>
            <button
              onClick={() => setFoodFilter("non_veg")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all ${
                foodFilter === "non_veg" ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-slate-900 text-red-400 border border-red-500/30 hover:bg-red-500/10"
              }`}
            >
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded border border-red-500 p-0.5">
                <span className="h-1 w-1 rounded-full bg-red-500" />
              </span>
              Non-Veg
            </button>
            <button
              onClick={() => setFoodFilter("bestseller")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all ${
                foodFilter === "bestseller" ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20" : "bg-slate-900 text-amber-300 border border-amber-500/30 hover:bg-amber-500/10"
              }`}
            >
              🔥 Bestsellers
            </button>
          </div>
        </div>

        {/* Category Horizontal Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === "all"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            All
          </button>
          {menuData.categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === c.id
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Food Items List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
              <Utensils className="h-10 w-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-white">No items found</p>
              <p className="text-xs">Try selecting another category or clear search.</p>
            </div>
          ) : (
            filteredProducts.map((p: any) => {
              const tag = p.food_tags?.[0] || "veg";
              const pVariants = menuData.variants.filter((v: any) => v.product_id === p.id);
              const inCartQty = cartItems
                .filter((ci) => ci.productId === p.id)
                .reduce((a, b) => a + b.quantity, 0);

              return (
                <Card key={p.id} className="border-slate-800 bg-slate-900/80 backdrop-blur text-slate-100 overflow-hidden shadow-md hover:border-slate-700 hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {tag === "veg" && (
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded border border-emerald-500 p-0.5 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        {tag === "non_veg" && (
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded border border-red-500 p-0.5 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          </span>
                        )}
                        <h3 className="font-bold text-base text-white leading-snug">{p.name}</h3>
                      </div>

                      {p.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-base font-extrabold text-amber-400">
                          {currencySymbol}{Number(p.base_price).toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.prep_time_minutes}m
                        </span>
                      </div>
                    </div>

                    {/* Add Button */}
                    <div className="shrink-0 flex flex-col items-center">
                      <Button
                        onClick={() => handleAddToCartClick(p)}
                        size="sm"
                        className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md h-9 px-4 rounded-xl"
                      >
                        + ADD {inCartQty > 0 ? `(${inCartQty})` : ""}
                      </Button>
                      {pVariants.length > 0 ? (
                        <span className="text-[10px] text-slate-500 mt-1">Customizable</span>
                      ) : inCartQty > 0 ? (
                        <span className="text-[10px] text-amber-400 font-semibold mt-1">{inCartQty} in cart</span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Sticky Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          <div className="mx-auto max-w-lg">
            <Button
              onClick={() => setCartDrawerOpen(true)}
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold hover:from-amber-400 hover:to-amber-500 shadow-2xl shadow-amber-500/30 flex items-center justify-between px-6 rounded-2xl"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-amber-400 text-xs font-bold">
                  {cartItems.reduce((a, b) => a + b.quantity, 0)}
                </span>
                <span className="text-sm">View Cart & Order</span>
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span>{currencySymbol}{cartSubtotal.toFixed(2)}</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </Button>
          </div>
        </div>
      )}

      {/* Options & Modifiers Modal */}
      <Dialog open={optionsModalOpen} onOpenChange={setOptionsModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Variants Choice */}
            {selectedProduct && menuData.variants.filter((v: any) => v.product_id === selectedProduct.id).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Choose Size / Variant</Label>
                <div className="space-y-2">
                  {menuData.variants
                    .filter((v: any) => v.product_id === selectedProduct.id)
                    .map((v: any) => (
                      <div
                        key={v.id}
                        onClick={() => setModalVariant(v.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          modalVariant === v.id
                            ? "border-amber-500 bg-amber-500/10 text-white font-bold"
                            : "border-slate-800 bg-slate-950/60 text-slate-300"
                        }`}
                      >
                        <span className="text-sm">{v.name}</span>
                        <span className="text-amber-400 font-extrabold">{currencySymbol}{Number(v.price).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Special Cooking Notes</Label>
              <Input
                placeholder="e.g. Less spicy, extra sauce, no onion..."
                value={modalInstructions}
                onChange={(e) => setModalInstructions(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-slate-300">Quantity</span>
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <button
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  className="text-slate-400 hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-bold text-white text-sm">{modalQty}</span>
                <button
                  onClick={() => {
                    const dishLimit = selectedProduct?.max_qty || selectedProduct?.max_limit || DEFAULT_DISH_LIMIT;
                    const currentInCart = cartItems
                      .filter((i) => i.productId === selectedProduct?.id)
                      .reduce((sum, i) => sum + i.quantity, 0);

                    if (currentInCart + modalQty >= dishLimit) {
                      toast.error(`Maximum quantity limit for ${selectedProduct?.name || "this dish"} is ${dishLimit}!`);
                    } else {
                      setModalQty(modalQty + 1);
                    }
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              onClick={handleConfirmOptionsAdd}
              className="w-full h-11 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 rounded-xl"
            >
              Add Item to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart & Checkout Sheet */}
      <Sheet open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
        <SheetContent side="bottom" className="bg-slate-900 border-slate-800 text-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-slate-800">
            <SheetTitle className="text-lg font-bold text-white flex items-center justify-between">
              <span>Your Cart ({tableContext?.table?.label})</span>
              <span className="text-amber-400 text-base">{currencySymbol}{cartSubtotal.toFixed(2)}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Cart Items List */}
            <div className="space-y-3">
              {cartItems.map((item, idx) => {
                const itemPrice = item.variantId ? item.variantPrice : item.basePrice;
                const addonsTotal = item.addonsList.reduce((a: number, b: any) => a + Number(b.price), 0);
                const linePrice = (itemPrice + addonsTotal) * item.quantity;

                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="space-y-0.5 flex-1">
                      <h4 className="font-bold text-sm text-white">{item.productName}</h4>
                      {item.variantName && (
                        <p className="text-xs text-slate-400">Variant: {item.variantName}</p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[11px] text-amber-400">Note: "{item.specialInstructions}"</p>
                      )}
                      <p className="text-xs text-amber-400 font-semibold">{currencySymbol}{linePrice.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                      <button onClick={() => updateQuantity(idx, -1)} className="text-slate-400 hover:text-white p-1">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-bold text-xs text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} className="text-slate-400 hover:text-white p-1">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customer Contact Form */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Details (Optional)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Name</Label>
                  <Input
                    placeholder="e.g. Harshith"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Mobile #</Label>
                  <Input
                    placeholder="9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-slate-800">
            <Button
              onClick={handlePlaceOrder}
              disabled={submittingOrder}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 rounded-xl shadow-xl"
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Order to Kitchen...
                </>
              ) : (
                <>
                  Place Order to Table ({currencySymbol}{cartSubtotal.toFixed(2)})
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
