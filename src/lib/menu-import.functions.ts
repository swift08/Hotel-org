import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractMenuFromFiles } from "@/lib/ocr/extractor";

/**
 * Initialize a Menu Import Job
 */
export const createMenuImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        branchId: z.string().uuid().optional(),
        files: z.array(
          z.object({
            name: z.string(),
            size: z.number(),
            type: z.string(),
            url: z.string().optional(),
            dataUrl: z.string().optional(),
          })
        ),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const db = (supabaseAdmin || supabase) as any;

    const payload = {
      business_id: data.businessId,
      branch_id: data.branchId ?? membership.branch_id ?? null,
      status: "processing",
      source_files: data.files,
      created_by: userId,
    };

    const { data: row, error } = await db
      .from("menu_imports")
      .insert(payload)
      .select("id, status, created_at")
      .single();

    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "menu.import_started",
      entity_type: "menu_import",
      entity_id: row.id,
      after_state: { filesCount: data.files.length },
    });

    return row;
  });

/**
 * Process Menu Import Extraction
 */
export const processMenuImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        importId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const db = (supabaseAdmin || supabase) as any;

    // Fetch import job
    const { data: job, error: jobErr } = await db
      .from("menu_imports")
      .select("*")
      .eq("id", data.importId)
      .eq("business_id", data.businessId)
      .single();

    if (jobErr || !job) throw new Error("Import job not found.");

    // Fetch existing products for duplicate detection
    const { data: existingProducts } = await supabase
      .from("products")
      .select("id, name, base_price")
      .eq("business_id", data.businessId)
      .eq("is_archived", false);

    const files = (job.source_files as any[]) || [];
    const extractionResult = await extractMenuFromFiles(files, existingProducts || []);

    const updatedPayload = {
      status: "review_required",
      extracted_data: extractionResult,
      review_data: extractionResult,
      summary: extractionResult.summary,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await db
      .from("menu_imports")
      .update(updatedPayload)
      .eq("id", data.importId)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "menu.import_extracted",
      entity_type: "menu_import",
      entity_id: data.importId,
      after_state: extractionResult.summary,
    });

    return updated;
  });

/**
 * Update Menu Import Review Draft
 */
export const updateMenuImportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        importId: z.string().uuid(),
        reviewData: z.any(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const db = (supabaseAdmin || supabase) as any;

    const items = data.reviewData?.items || [];
    const categories = data.reviewData?.categories || [];
    const needsReviewCount = items.filter((i: any) => i.confidence === "needs_review").length;
    const duplicatesCount = items.filter((i: any) => i.isDuplicate).length;

    const summary = {
      categoriesCount: categories.length,
      itemsCount: items.length,
      variantsCount: items.reduce((acc: number, item: any) => acc + (item.variants?.length || 0), 0),
      addonsCount: items.reduce((acc: number, item: any) => acc + (item.addons?.length || 0), 0),
      needsReviewCount,
      duplicatesCount,
    };

    const { data: updated, error } = await db
      .from("menu_imports")
      .update({
        review_data: data.reviewData,
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.importId)
      .eq("business_id", data.businessId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return updated;
  });

/**
 * Publish Menu Import to Active Menu CMS & Create Version Snapshot
 */
export const publishMenuImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        importId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const db = (supabaseAdmin || supabase) as any;

    const { data: job, error: jobErr } = await db
      .from("menu_imports")
      .select("*")
      .eq("id", data.importId)
      .eq("business_id", data.businessId)
      .single();

    if (jobErr || !job) throw new Error("Import job not found.");

    const reviewData = job.review_data as any;
    const categories: any[] = reviewData?.categories || [];
    const items: any[] = reviewData?.items || [];

    // Map extracted category names to database UUIDs
    const catIdMap = new Map<string, string>();

    for (let idx = 0; idx < categories.length; idx++) {
      const cat = categories[idx];
      const { data: existingCat } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("business_id", data.businessId)
        .ilike("name", cat.name)
        .maybeSingle();

      if (existingCat) {
        catIdMap.set(cat.name, existingCat.id);
      } else {
        const { data: newCat } = await supabase
          .from("menu_categories")
          .insert({
            business_id: data.businessId,
            branch_id: membership.branch_id ?? null,
            name: cat.name,
            description: cat.description || null,
            sort_order: idx + 1,
            state: "published",
            is_active: true,
          })
          .select("id")
          .single();

        if (newCat) catIdMap.set(cat.name, newCat.id);
      }
    }

    // Default dish images mapper
    function getDishImage(name: string, catName: string) {
      const n = name.toLowerCase();
      const c = catName.toLowerCase();
      if (c.includes("soup") || n.includes("shorba")) return ["/images/dishes/tamatar_shorba.webp"];
      if (n.includes("paneer tikka") || n.includes("kebab")) return ["/images/dishes/paneer_tikka.webp"];
      if (n.includes("chicken tikka") || n.includes("seekh")) return ["/images/dishes/chicken_tikka.webp"];
      if (n.includes("butter chicken") || n.includes("makhani")) return ["/images/dishes/butter_chicken.webp"];
      if (n.includes("mutton") || n.includes("rogan")) return ["/images/dishes/mutton_curry.webp"];
      if (n.includes("paneer") || n.includes("dal")) return ["/images/dishes/paneer_butter_masala.webp"];
      if (n.includes("dosa")) return ["/images/dishes/masala_dosa.webp"];
      if (n.includes("naan") || n.includes("roti")) return ["/images/dishes/garlic_naan.webp"];
      if (n.includes("biryani") || n.includes("rice")) return n.includes("veg") ? ["/images/dishes/veg_biryani.webp"] : ["/images/dishes/mutton_biryani.webp"];
      if (n.includes("lassi") || n.includes("drink")) return ["/images/dishes/mango_lassi.webp"];
      if (n.includes("jamun") || n.includes("cake")) return ["/images/dishes/gulab_jamun.webp"];
      return ["/images/dishes/butter_chicken.webp"];
    }

    // Fetch live existing products from DB for strict duplicate prevention
    const { data: currentProducts } = await supabase
      .from("products")
      .select("id, name, base_price")
      .eq("business_id", data.businessId)
      .eq("is_archived", false);

    const existingProductMap = new Map<string, any>();
    (currentProducts || []).forEach((p) => {
      existingProductMap.set(p.name.toLowerCase().trim(), p);
    });

    let publishedCount = 0;
    let updatedCount = 0;
    let skippedDuplicateCount = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const categoryId = catIdMap.get(item.categoryName) ?? null;
      const images = getDishImage(item.name, item.categoryName);
      const foodTags = item.dietary ? [item.dietary] : ["veg"];
      const normName = (item.name || "").toLowerCase().trim();

      const existingProd = existingProductMap.get(normName) || (item.duplicateInfo?.existingId ? { id: item.duplicateInfo.existingId } : null);

      let targetProductId: string | null = null;

      if (existingProd) {
        // Product with same name exists in DB!
        if (item.duplicateAction === "use_imported") {
          // Update existing product with newly imported details
          const { data: updatedProd } = await supabase
            .from("products")
            .update({
              category_id: categoryId,
              description: item.description || null,
              base_price: item.price || 0,
              food_tags: foodTags,
              prep_time_minutes: item.prepTimeMinutes || 15,
              images,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingProd.id)
            .select("id")
            .single();

          if (updatedProd) {
            targetProductId = updatedProd.id;
            updatedCount++;
          }
        } else if (item.duplicateAction === "create_separate") {
          // Explicitly create separate product
          const productPayload = {
            business_id: data.businessId,
            category_id: categoryId,
            name: `${item.name} (Imported)`,
            description: item.description || null,
            base_price: item.price || 0,
            food_tags: foodTags,
            prep_time_minutes: item.prepTimeMinutes || 15,
            sort_order: idx + 1,
            state: "published" as const,
            is_available: true,
            images,
          };
          const { data: newProd } = await supabase.from("products").insert(productPayload).select("id").single();
          if (newProd) {
            targetProductId = newProd.id;
            publishedCount++;
          }
        } else {
          // DEFAULT: KEEP EXISTING (SKIP DUPLICATE CREATION!)
          skippedDuplicateCount++;
          continue;
        }
      } else {
        // No existing match: Insert as new product
        const productPayload = {
          business_id: data.businessId,
          category_id: categoryId,
          name: item.name,
          description: item.description || null,
          base_price: item.price || 0,
          food_tags: foodTags,
          prep_time_minutes: item.prepTimeMinutes || 15,
          sort_order: idx + 1,
          state: "published" as const,
          is_available: true,
          images,
        };

        const { data: prod } = await supabase.from("products").insert(productPayload).select("id").single();
        if (prod) {
          targetProductId = prod.id;
          publishedCount++;
        }
      }

      if (targetProductId) {
        // Insert / Update variants if present
        if (item.variants && item.variants.length > 0) {
          // Delete existing variants for this product to prevent duplicate rows!
          await supabase.from("product_variants").delete().eq("product_id", targetProductId);

          // Deduplicate item.variants array by lowercase variant name
          const seenVarNames = new Set<string>();
          const uniqueVars: any[] = [];
          for (const v of item.variants) {
            const key = (v.name || "").toLowerCase().trim();
            if (!seenVarNames.has(key)) {
              seenVarNames.add(key);
              uniqueVars.push(v);
            }
          }

          for (let vIdx = 0; vIdx < uniqueVars.length; vIdx++) {
            const v = uniqueVars[vIdx];
            await supabase.from("product_variants").insert({
              business_id: data.businessId,
              product_id: targetProductId,
              name: v.name,
              price: v.price,
              is_default: vIdx === 0,
              is_available: true,
              sort_order: vIdx + 1,
            });
          }
        }

        // Insert / Update add-ons if present
        if (item.addons && item.addons.length > 0) {
          const { data: grp } = await supabase
            .from("addon_groups")
            .insert({
              business_id: data.businessId,
              product_id: targetProductId,
              name: "Add-ons",
              min_select: 0,
              max_select: item.addons.length,
              is_required: false,
              sort_order: 1,
            })
            .select("id")
            .single();

          if (grp) {
            for (let aIdx = 0; aIdx < item.addons.length; aIdx++) {
              const a = item.addons[aIdx];
              await supabase.from("addons").insert({
                business_id: data.businessId,
                group_id: grp.id,
                name: a.name,
                price: a.price,
                is_available: true,
                sort_order: aIdx + 1,
              });
            }
          }
        }
      }
    }

    // Get current version count for menu_versions
    const { count } = await db
      .from("menu_versions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", data.businessId);

    const versionNum = (count || 0) + 1;

    // Create version snapshot
    await db.from("menu_versions").insert({
      business_id: data.businessId,
      branch_id: membership.branch_id ?? null,
      version_number: versionNum,
      status: "published",
      snapshot: reviewData,
      created_by: userId,
      published_at: new Date().toISOString(),
      published_by: userId,
    });

    // Update job status to published
    await db
      .from("menu_imports")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.importId);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "menu.import_published",
      entity_type: "menu_import",
      entity_id: data.importId,
      after_state: { versionNum, publishedCount },
    });

    return { success: true, versionNum, publishedCount };
  });

/**
 * List Import History for Business
 */
export const listMenuImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = (supabaseAdmin || supabase) as any;

    const { data: imports, error } = await db
      .from("menu_imports")
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return imports ?? [];
  });

/**
 * Rollback Menu Version to a Previous Published Snapshot
 */
export const rollbackMenuVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        versionId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const db = (supabaseAdmin || supabase) as any;

    let { data: version } = await db
      .from("menu_versions")
      .select("*")
      .eq("id", data.versionId)
      .eq("business_id", data.businessId)
      .maybeSingle();

    if (!version) {
      const { data: latestVer } = await db
        .from("menu_versions")
        .select("*")
        .eq("business_id", data.businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      version = latestVer;
    }

    if (!version) throw new Error("Menu version snapshot not found.");

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "menu.version_rolled_back",
      entity_type: "menu_version",
      entity_id: data.versionId,
      after_state: { versionNumber: (version as any).version_number },
    });

    return { success: true, versionNumber: (version as any).version_number };
  });
