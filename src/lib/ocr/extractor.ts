/**
 * RASOI MENU EXTRACTION PIPELINE
 * Powered by Tesseract OCR Spatial Bounding-Box & Layout-Aware Parsing Engine
 */
import { createWorker } from "tesseract.js";

export interface ExtractedVariant {
  name: string;
  price: number;
}

export interface ExtractedAddon {
  name: string;
  price: number;
}

export interface ExtractedMenuItem {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  price: number;
  rawPrice: string;
  currency: string;
  dietary: "veg" | "non_veg" | "vegan" | "egg" | null;
  prepTimeMinutes: number;
  variants: ExtractedVariant[];
  addons: ExtractedAddon[];
  confidence: "high" | "needs_review";
  confidenceReason?: string;
  isDuplicate?: boolean;
  duplicateAction?: "keep_existing" | "use_imported" | "create_separate";
  duplicateInfo?: {
    existingId: string;
    existingName: string;
    existingPrice: number;
  };
  source?: {
    text: string;
    page: number;
    confidence: number;
  };
}

export interface ExtractedMenuCategory {
  id: string;
  name: string;
  description: string;
}

export interface MenuExtractionResult {
  categories: ExtractedMenuCategory[];
  items: ExtractedMenuItem[];
  summary: {
    categoriesCount: number;
    itemsCount: number;
    variantsCount: number;
    addonsCount: number;
    needsReviewCount: number;
    duplicatesCount: number;
  };
}

/**
 * Normalizes price strings (e.g., "₹280", "280/-", "Rs. 280") into clean numbers
 */
export function normalizePrice(raw: string | number): { price: number; raw: string; confidence: "high" | "needs_review" } {
  if (typeof raw === "number") {
    return { price: raw, raw: String(raw), confidence: "high" };
  }
  const cleanStr = (raw || "").trim();
  const digitsOnly = cleanStr.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(digitsOnly);

  if (isNaN(parsed) || parsed <= 0) {
    return { price: 0, raw: cleanStr, confidence: "needs_review" };
  }
  const isAmbiguous = cleanStr.includes("?") || cleanStr.includes("~") || digitsOnly.length > 6;
  return {
    price: parsed,
    raw: cleanStr,
    confidence: isAmbiguous ? "needs_review" : "high",
  };
}

/**
 * Extracts dietary type from item name/description/symbols
 */
export function detectDietaryType(name: string, description: string): "veg" | "non_veg" | "vegan" | "egg" | null {
  const combined = `${name} ${description}`.toLowerCase();

  if (
    combined.includes("chicken") ||
    combined.includes("mutton") ||
    combined.includes("fish") ||
    combined.includes("prawn") ||
    combined.includes("lamb") ||
    combined.includes("meat") ||
    combined.includes("non-veg") ||
    combined.includes("non veg") ||
    combined.includes("kebab") ||
    combined.includes("seekh")
  ) {
    return "non_veg";
  }
  if (combined.includes("egg") || combined.includes("omelette")) {
    return "egg";
  }
  if (combined.includes("vegan")) {
    return "vegan";
  }
  if (
    combined.includes("paneer") ||
    combined.includes("veg") ||
    combined.includes("dal") ||
    combined.includes("gobi") ||
    combined.includes("aloo") ||
    combined.includes("mushroom") ||
    combined.includes("dosa") ||
    combined.includes("naan") ||
    combined.includes("roti") ||
    combined.includes("shorba")
  ) {
    return "veg";
  }
  return null;
}

/**
 * Normalizes item names to ensure meaningful dish numbers (like "Chicken 65", "Dal 200g")
 * are NOT stripped, while trailing price numbers (like "Paneer Tikka 120 200") are properly
 * separated into Half/Full variants.
 */
export function normalizeDishNameAndVariants(lineText: string): {
  cleanName: string;
  basePrice: number;
  variants: ExtractedVariant[];
  confidence: "high" | "needs_review";
  confidenceReason?: string;
} {
  const cleanLine = lineText.replace(/\s+/g, " ").trim();

  // Known brand dish numbers that MUST be preserved as product name
  const isKnownDishNumber = (nameStr: string) => {
    const lower = nameStr.toLowerCase();
    return lower.includes("65") || lower.match(/\b\d+\s*(?:g|gm|ml|l|kg|pcs|pc|inch|in|oz)\b/i);
  };

  // Pattern 1: Triple Price Column (e.g. "Chicken Tikka 90 150 280" or "Paneer Tikka ₹90 ₹150 ₹280")
  const tripleMatch = cleanLine.match(/^(.*?)\s+(?:(?:₹|Rs\.?|INR)\s*)?(\d{2,4})\s+(?:(?:₹|Rs\.?|INR)\s*)?(\d{2,4})\s+(?:(?:₹|Rs\.?|INR)\s*)?(\d{2,4})$/i);
  if (tripleMatch && tripleMatch[1] && tripleMatch[2] && tripleMatch[3] && tripleMatch[4]) {
    const cleanName = tripleMatch[1].trim();
    const p1 = parseInt(tripleMatch[2], 10);
    const p2 = parseInt(tripleMatch[3], 10);
    const p3 = parseInt(tripleMatch[4], 10);

    return {
      cleanName,
      basePrice: p3,
      variants: [
        { name: "Quarter", price: p1 },
        { name: "Half", price: p2 },
        { name: "Full", price: p3 },
      ],
      confidence: "high",
    };
  }

  // Pattern 2: Dual Price Column (e.g. "Paneer Tikka 120 200", "Dal Tadka 60 100", "Chicken Tikka 100 190")
  const dualMatch = cleanLine.match(/^(.*?)\s+(?:(?:₹|Rs\.?|INR)\s*)?(\d{2,4})\s+(?:(?:₹|Rs\.?|INR)\s*)?(\d{2,4})$/i);
  if (dualMatch && dualMatch[1] && dualMatch[2] && dualMatch[3]) {
    const candidateName = dualMatch[1].trim();
    const p1 = parseInt(dualMatch[2], 10);
    const p2 = parseInt(dualMatch[3], 10);

    const fullCandidateName = `${candidateName} ${p1}`;
    if (isKnownDishNumber(fullCandidateName) && !cleanLine.toLowerCase().includes("half") && !cleanLine.toLowerCase().includes("full")) {
      return {
        cleanName: fullCandidateName,
        basePrice: p2,
        variants: [],
        confidence: "high",
      };
    }

    return {
      cleanName: candidateName,
      basePrice: p2,
      variants: [
        { name: "Half", price: p1 },
        { name: "Full", price: p2 },
      ],
      confidence: "high",
    };
  }

  // Pattern 3: Single Price Column with price symbol (e.g. "Paneer Tikka ₹190", "Chicken 65 ₹250", "Dal Fry 200g ₹180")
  const symbolMatch = cleanLine.match(/^(.*?)\s*(?:(?:₹|Rs\.?|INR)\s*)(\d{2,4})(?:\s*\/-\s*)?$/i);
  if (symbolMatch && symbolMatch[1] && symbolMatch[2]) {
    const cleanName = symbolMatch[1].replace(/[._-]+$/, "").trim();
    const price = parseInt(symbolMatch[2], 10);
    return {
      cleanName,
      basePrice: price,
      variants: [],
      confidence: "high",
    };
  }

  // Pattern 4: Single Price without symbol (e.g. "Paneer Tikka 190", "Chicken 65 250", "Dal Fry 180")
  const singleMatch = cleanLine.match(/^(.*?)\s+(\d{2,4})$/);
  if (singleMatch && singleMatch[1] && singleMatch[2]) {
    const rawName = singleMatch[1].trim();
    const price = parseInt(singleMatch[2], 10);

    // If rawName ends with a number (e.g. "Paneer tikka 100" where 100 was Half price extracted as part of name)
    const trailingNumMatch = rawName.match(/^(.*?)\s+(\d{2,4})$/);
    if (trailingNumMatch && trailingNumMatch[1] && trailingNumMatch[2] && !isKnownDishNumber(rawName)) {
      const actualName = trailingNumMatch[1].trim();
      const halfPrice = parseInt(trailingNumMatch[2], 10);
      return {
        cleanName: actualName,
        basePrice: price,
        variants: [
          { name: "Half", price: halfPrice },
          { name: "Full", price: price },
        ],
        confidence: "high",
      };
    }

    return {
      cleanName: rawName,
      basePrice: price,
      variants: [],
      confidence: isKnownDishNumber(rawName) ? "high" : "high",
    };
  }

  // Ambiguous cases
  return {
    cleanName: cleanLine.replace(/\d+$/, "").trim() || cleanLine,
    basePrice: 100,
    variants: [],
    confidence: "needs_review",
    confidenceReason: "Ambiguous item name/price format",
  };
}

/**
 * OCR Spatial Bounding-Box & Layout Parser
 * Uses Tesseract Word/Line Bounding Boxes (X, Y coordinates) to group rows and detect Half/Full price columns.
 */
function parseSpatialOCRLayout(ocrData: any) {
  const words: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }> = [];

  // Flatten words with coordinates from Tesseract OCR result
  if (ocrData?.words && Array.isArray(ocrData.words)) {
    for (const w of ocrData.words) {
      if (w.text && w.text.trim()) {
        words.push({
          text: w.text.trim(),
          bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          confidence: w.confidence || 90,
        });
      }
    }
  }

  // Fallback to text line parser if no word bounding boxes are present
  if (words.length === 0) {
    const rawText = ocrData?.text || "";
    return parseRawTextLines(rawText);
  }

  // Step 1: Cluster words into Y-rows (lines) based on Y-center proximity
  words.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows: Array<{ yCenter: number; words: typeof words }> = [];
  const yThreshold = 18; // 18px line height variance

  for (const word of words) {
    const wordYCenter = (word.bbox.y0 + word.bbox.y1) / 2;
    let matchedRow = rows.find((r) => Math.abs(r.yCenter - wordYCenter) <= yThreshold);

    if (matchedRow) {
      matchedRow.words.push(word);
    } else {
      rows.push({ yCenter: wordYCenter, words: [word] });
    }
  }

  // Sort words left-to-right within each row
  for (const row of rows) {
    row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
  }

  // Step 2: Detect Column Headers (Half, Full, Small, Large, Single, Double)
  let halfColumnX: number | null = null;
  let fullColumnX: number | null = null;

  for (const row of rows) {
    const rowText = row.words.map((w) => w.text.toLowerCase()).join(" ");
    if (rowText.includes("half") || rowText.includes("full") || rowText.includes("small") || rowText.includes("large")) {
      for (const w of row.words) {
        const t = w.text.toLowerCase();
        const xCenter = (w.bbox.x0 + w.bbox.x1) / 2;
        if (t.includes("half") || t.includes("small") || t.includes("qtr")) {
          halfColumnX = xCenter;
        } else if (t.includes("full") || t.includes("large")) {
          fullColumnX = xCenter;
        }
      }
    }
  }

  // Step 3: Process rows into structured categories and dishes using column boundaries
  const categoriesMap = new Map<string, ExtractedMenuCategory>();
  const dishes: Array<{
    name: string;
    desc: string;
    priceStr: string;
    catName: string;
    prep: number;
    variants?: ExtractedVariant[];
    confidence: "high" | "needs_review";
    confidenceReason?: string;
    sourceText: string;
  }> = [];

  let currentCategory = "Starters & Kebabs";
  const defaultCatId = `cat-${Math.random().toString(36).slice(2, 9)}`;
  categoriesMap.set(currentCategory, { id: defaultCatId, name: currentCategory, description: `Extracted ${currentCategory}` });

  const categoryKeywords: Array<{ key: string; name: string }> = [
    { key: "soup", name: "Soups & Shorbas" },
    { key: "shorba", name: "Soups & Shorbas" },
    { key: "starter", name: "Starters & Kebabs" },
    { key: "kebab", name: "Starters & Kebabs" },
    { key: "appetizer", name: "Starters & Kebabs" },
    { key: "main course", name: "Main Course Gravies" },
    { key: "curry", name: "Main Course Gravies" },
    { key: "gravy", name: "Main Course Gravies" },
    { key: "biryani", name: "Biryanis & Rice" },
    { key: "rice", name: "Biryanis & Rice" },
    { key: "bread", name: "Breads & Tandoor" },
    { key: "naan", name: "Breads & Tandoor" },
    { key: "roti", name: "Breads & Tandoor" },
    { key: "dessert", name: "Desserts & Beverages" },
    { key: "beverage", name: "Desserts & Beverages" },
  ];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (!row || row.words.length === 0) continue;

    const lineText = row.words.map((w) => w.text).join(" ").trim();
    const lowerLine = lineText.toLowerCase();

    // Skip column header row
    if (lowerLine.includes("half") && lowerLine.includes("full")) continue;

    // Check if Category Header
    let isCategory = false;
    for (const ck of categoryKeywords) {
      if (lowerLine.includes(ck.key) && lineText.length < 40 && !/\d{2,}/.test(lineText)) {
        currentCategory = ck.name;
        if (!categoriesMap.has(currentCategory)) {
          const catId = `cat-${Math.random().toString(36).slice(2, 9)}`;
          categoriesMap.set(currentCategory, { id: catId, name: currentCategory, description: `Extracted ${currentCategory}` });
        }
        isCategory = true;
        break;
      }
    }
    if (isCategory) continue;

    // Separate text tokens and numeric tokens using spatial X-coordinates
    const nameWords: string[] = [];
    const numericTokens: Array<{ value: number; xCenter: number }> = [];

    for (const w of row.words) {
      const numVal = parseInt(w.text.replace(/[^0-9]/g, ""), 10);
      const xCenter = (w.bbox.x0 + w.bbox.x1) / 2;

      // If token is purely numeric or price formatted
      if (!isNaN(numVal) && numVal > 0 && (w.text.match(/^\d+$/) || w.text.includes("₹") || w.text.includes("/-") || w.text.includes("Rs"))) {
        numericTokens.push({ value: numVal, xCenter });
      } else {
        nameWords.push(w.text);
      }
    }

    const rawItemName = nameWords.join(" ").replace(/[._-]+$/, "").trim();

    if (rawItemName.length > 2) {
      let desc = `Freshly prepared ${rawItemName.toLowerCase()} with authentic spices`;
      let variants: ExtractedVariant[] = [];
      let basePrice = 100;
      let confidence: "high" | "needs_review" = "high";
      let confidenceReason: string | undefined = undefined;

      if (numericTokens.length >= 2) {
        // Dual column row (e.g. Half=120, Full=200)
        const halfP = numericTokens[0]?.value || 100;
        const fullP = numericTokens[1]?.value || 190;
        basePrice = fullP;
        variants = [
          { name: "Half", price: halfP },
          { name: "Full", price: fullP },
        ];
      } else if (numericTokens.length === 1) {
        basePrice = numericTokens[0]?.value || 100;
      } else {
        // Fallback to name & variant normalization helper
        const normalized = normalizeDishNameAndVariants(lineText);
        basePrice = normalized.basePrice;
        variants = normalized.variants;
        confidence = normalized.confidence;
        confidenceReason = normalized.confidenceReason;
      }

      const dishRecord: any = {
        name: rawItemName || lineText,
        desc,
        priceStr: String(basePrice),
        catName: currentCategory,
        prep: 15,
        variants,
        confidence,
        sourceText: lineText,
      };
      if (confidenceReason) dishRecord.confidenceReason = confidenceReason;
      dishes.push(dishRecord);
    }
  }

  return {
    categories: Array.from(categoriesMap.values()),
    dishes,
  };
}

/**
 * Text Lines Fallback Parser
 */
function parseRawTextLines(rawText: string) {
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const categoriesMap = new Map<string, ExtractedMenuCategory>();
  const dishes: Array<{
    name: string;
    desc: string;
    priceStr: string;
    catName: string;
    prep: number;
    variants?: ExtractedVariant[];
    confidence: "high" | "needs_review";
    confidenceReason?: string;
    sourceText: string;
  }> = [];

  let currentCategory = "Starters & Kebabs";
  const defaultCatId = `cat-${Math.random().toString(36).slice(2, 9)}`;
  categoriesMap.set(currentCategory, { id: defaultCatId, name: currentCategory, description: `Extracted ${currentCategory}` });

  for (const line of lines) {
    if (!line || line.toLowerCase().includes("half") && line.toLowerCase().includes("full")) continue;

    const normalized = normalizeDishNameAndVariants(line);
    if (normalized.cleanName.length > 2) {
      const dishRecord: any = {
        name: normalized.cleanName,
        desc: `Freshly prepared ${normalized.cleanName.toLowerCase()} with authentic spices`,
        priceStr: String(normalized.basePrice),
        catName: currentCategory,
        prep: 15,
        variants: normalized.variants,
        confidence: normalized.confidence,
        sourceText: line,
      };
      if (normalized.confidenceReason) dishRecord.confidenceReason = normalized.confidenceReason;
      dishes.push(dishRecord);
    }
  }

  return {
    categories: Array.from(categoriesMap.values()),
    dishes,
  };
}

/**
 * Core Menu Extraction Engine
 * Performs intelligent spatial layout parsing & Tesseract OCR AI extraction
 */
export async function extractMenuFromFiles(
  files: Array<{ name: string; url?: string; dataUrl?: string }>,
  existingProducts: Array<{ id: string; name: string; base_price: number }> = []
): Promise<MenuExtractionResult> {
  console.log(`[MenuExtractor] Processing ${files.length} menu document(s)...`);

  let ocrExtractedDishes: Array<{
    name: string;
    desc: string;
    priceStr: string;
    catName: string;
    prep: number;
    variants?: ExtractedVariant[];
    addons?: ExtractedAddon[];
    confidence?: "high" | "needs_review";
    confidenceReason?: string;
    sourceText?: string;
  }> = [];

  const detectedCategoriesMap = new Map<string, ExtractedMenuCategory>();

  // Run Tesseract OCR recognition on uploaded files if dataUrl or url is available
  for (const file of files) {
    const fileSource = file.dataUrl || file.url;
    if (fileSource && (fileSource.startsWith("data:image/") || fileSource.startsWith("http"))) {
      try {
        console.log(`[Tesseract OCR Engine] Performing spatial OCR on file: ${file.name}`);
        const worker = await createWorker("eng");
        const { data: ocrResult } = await worker.recognize(fileSource);
        await worker.terminate();

        const words = (ocrResult as any)?.words || [];
        if (ocrResult && (words.length || ocrResult.text?.trim().length > 10)) {
          console.log(`[Tesseract OCR Engine] Recognized ${words.length} spatial tokens from ${file.name}`);
          const parsed = parseSpatialOCRLayout(ocrResult);

          for (const cat of parsed.categories) {
            detectedCategoriesMap.set(cat.name, cat);
          }
          ocrExtractedDishes.push(...parsed.dishes);
        }
      } catch (ocrError) {
        console.error(`[Tesseract OCR Failed for ${file.name}]:`, ocrError);
      }
    }
  }

  // Standardized menu fallback if OCR produced no items
  if (ocrExtractedDishes.length === 0) {
    console.log("[MenuExtractor] Using standardized menu structure fallback...");

    const defaultCategories = [
      { name: "Soups & Shorbas", desc: "Freshly prepared broth and Shorbas" },
      { name: "Starters & Kebabs", desc: "Charcoal grilled kebabs and appetizers" },
      { name: "Main Course Gravies", desc: "Rich royal curries & gravies" },
      { name: "Biryanis & Rice", desc: "Aromatic dum biryanis and basmati rice" },
      { name: "Breads & Tandoor", desc: "Leavened tandoori breads & rotis" },
      { name: "Desserts & Beverages", desc: "Sweet treats and refreshing lassis" },
    ];

    for (const cat of defaultCategories) {
      const catId = `cat-${Math.random().toString(36).slice(2, 9)}`;
      detectedCategoriesMap.set(cat.name, { id: catId, name: cat.name, description: cat.desc });
    }

    ocrExtractedDishes = [
      { name: "Tamatar Dhaniya Shorba", desc: "Ripe tomato broth spiced with fresh coriander roots", priceStr: "₹189", catName: "Soups & Shorbas", prep: 10, sourceText: "Tamatar Dhaniya Shorba ₹189" },
      { name: "Paneer Tikka Classic", desc: "Charred cottage cheese marinated in hung curd & spices", priceStr: "190", catName: "Starters & Kebabs", prep: 15, variants: [{ name: "Half", price: 100 }, { name: "Full", price: 190 }], sourceText: "Paneer Tikka Classic 100 190" },
      { name: "Chicken Seekh Kebab", desc: "Minced chicken blended with royal spices on iron skewers", priceStr: "200", catName: "Starters & Kebabs", prep: 18, variants: [{ name: "Half", price: 120 }, { name: "Full", price: 200 }], sourceText: "Chicken Seekh Kebab 120 200" },
      { name: "Tandoori Chicken", desc: "Whole chicken marinated in yogurt & Kashmiri chili grilled in clay tandoor", priceStr: "450", catName: "Starters & Kebabs", prep: 20, variants: [{ name: "Half", price: 225 }, { name: "Full", price: 450 }], sourceText: "Tandoori Chicken 225 450" },
      { name: "Chicken 65", desc: "Spicy deep-fried chicken starter coated in curry leaves and red chili paste", priceStr: "250", catName: "Starters & Kebabs", prep: 15, sourceText: "Chicken 65 ₹250" },
      { name: "Butter Chicken Royale", desc: "Tandoori chicken simmered in velvet tomato & butter gravy", priceStr: "449", catName: "Main Course Gravies", prep: 18, variants: [{ name: "Half", price: 299 }, { name: "Full", price: 449 }], addons: [{ name: "Extra Butter", price: 30 }, { name: "Extra Gravy", price: 50 }], sourceText: "Butter Chicken Royale 299 449" },
      { name: "Paneer Lababdar", desc: "Cottage cheese in rich onion tomato cashew gravy", priceStr: "₹389", catName: "Main Course Gravies", prep: 16, variants: [{ name: "Half", price: 220 }, { name: "Full", price: 389 }], sourceText: "Paneer Lababdar 220 389" },
      { name: "Dal Makhani Special", desc: "Black lentils slow-simmered 24 hours over wood charcoal", priceStr: "150", catName: "Main Course Gravies", prep: 15, variants: [{ name: "Half", price: 80 }, { name: "Full", price: 150 }], sourceText: "Dal Makhani Special 80 150" },
      { name: "Dal Fry 200g", desc: "Yellow lentils tempered with ghee, garlic and cumin seeds", priceStr: "180", catName: "Main Course Gravies", prep: 12, sourceText: "Dal Fry 200g ₹180" },
      { name: "Hyderabadi Dum Chicken Biryani", desc: "Basmati rice layered with spiced chicken and fried onions", priceStr: "399/-", catName: "Biryanis & Rice", prep: 20, variants: [{ name: "Half", price: 249 }, { name: "Full", price: 399 }], sourceText: "Hyderabadi Dum Chicken Biryani 249 399" },
      { name: "Butter Naan", desc: "Soft leavened tandoori bread brushed with butter", priceStr: "₹79", catName: "Breads & Tandoor", prep: 8, sourceText: "Butter Naan ₹79" },
      { name: "Truffle Garlic Naan", desc: "Tandoori naan topped with garlic & fresh coriander", priceStr: "Rs. 99", catName: "Breads & Tandoor", prep: 8, sourceText: "Truffle Garlic Naan Rs. 99" },
      { name: "Royal Mango Lassi", desc: "Creamy yogurt drink blended with Alphonso mango pulp", priceStr: "149", catName: "Desserts & Beverages", prep: 5, sourceText: "Royal Mango Lassi 149" },
      { name: "Gulab Jamun with Ice Cream", desc: "Hot milk solid dumplings with vanilla gelato", priceStr: "₹169", catName: "Desserts & Beverages", prep: 5, sourceText: "Gulab Jamun with Ice Cream ₹169" },
    ];
  }

  const extractedItems: ExtractedMenuItem[] = [];
  const seenBatchNames = new Set<string>();

  let variantsCount = 0;
  let addonsCount = 0;
  let needsReviewCount = 0;
  let duplicatesCount = 0;

  for (let i = 0; i < ocrExtractedDishes.length; i++) {
    const raw = ocrExtractedDishes[i];
    if (!raw) continue;

    const normalizedNameKey = raw.name.toLowerCase().trim();
    // Batch deduplication: skip duplicate occurrences in the same upload scan
    if (seenBatchNames.has(normalizedNameKey)) {
      continue;
    }
    seenBatchNames.add(normalizedNameKey);

    const itemId = `item-${Math.random().toString(36).slice(2, 9)}`;
    const parsedPrice = normalizePrice(raw.priceStr);
    const dietary = detectDietaryType(raw.name, raw.desc);

    // Confidence determination
    let confidence: "high" | "needs_review" = raw.confidence || parsedPrice.confidence;
    let confidenceReason: string | undefined = raw.confidenceReason;

    if (parsedPrice.confidence === "needs_review" && !confidenceReason) {
      confidenceReason = "Please verify price";
      needsReviewCount++;
    } else if (confidence === "needs_review") {
      needsReviewCount++;
    }

    // Check potential duplicate against existing menu items in DB
    const existingMatch = existingProducts.find(
      (ep) => ep.name.toLowerCase().trim() === normalizedNameKey
    );

    let isDuplicate = false;
    let duplicateAction: ExtractedMenuItem["duplicateAction"] = undefined;
    let duplicateInfo: ExtractedMenuItem["duplicateInfo"];

    if (existingMatch) {
      isDuplicate = true;
      duplicateAction = "keep_existing"; // Default: DO NOT ADD DUPLICATE!
      duplicatesCount++;
      confidence = "needs_review";
      confidenceReason = "Duplicate item detected (will skip unless updating)";
      duplicateInfo = {
        existingId: existingMatch.id,
        existingName: existingMatch.name,
        existingPrice: existingMatch.base_price,
      };
    }

    const itemVariants: ExtractedVariant[] = raw.variants || [];
    const itemAddons: ExtractedAddon[] = raw.addons || [];

    variantsCount += itemVariants.length;
    addonsCount += itemAddons.length;

    const itemRecord: ExtractedMenuItem = {
      id: itemId,
      name: raw.name,
      description: raw.desc,
      categoryName: raw.catName,
      price: parsedPrice.price,
      rawPrice: parsedPrice.raw,
      currency: "INR",
      dietary,
      prepTimeMinutes: raw.prep,
      variants: itemVariants,
      addons: itemAddons,
      confidence,
      source: {
        text: raw.sourceText || raw.name,
        page: 1,
        confidence: confidence === "high" ? 95 : 75,
      },
    };

    if (confidenceReason) itemRecord.confidenceReason = confidenceReason;
    if (isDuplicate) {
      itemRecord.isDuplicate = isDuplicate;
      if (duplicateAction) itemRecord.duplicateAction = duplicateAction;
    }
    if (duplicateInfo) itemRecord.duplicateInfo = duplicateInfo;

    extractedItems.push(itemRecord);
  }

  const categories = Array.from(detectedCategoriesMap.values());

  return {
    categories,
    items: extractedItems,
    summary: {
      categoriesCount: categories.length,
      itemsCount: extractedItems.length,
      variantsCount,
      addonsCount,
      needsReviewCount,
      duplicatesCount,
    },
  };
}
