/**
 * RASOI INTELLIGENT MENU UNDERSTANDING ENGINE v2
 * ================================================
 * Multi-stage pipeline: OCR → Layout → Classification → Structure → Validate
 *
 * Architecture:
 *   IMAGE
 *   → Tesseract OCR (words + bounding boxes)
 *   → Column Detection (X-coordinate clustering)
 *   → Row Clustering per Column (Y-center proximity)
 *   → Text Block Classification (food vocab + blocklist + signals)
 *   → Category Context Propagation (column-by-column, top-to-bottom)
 *   → Food/Price Association
 *   → Deduplication & Validation
 *   → Quality Score
 *   → Structured Menu Output
 *
 * FUNDAMENTAL RULE: Tesseract is an OCR engine, NOT a menu understanding engine.
 * The application has a MENU UNDERSTANDING LAYER above OCR.
 */
import { createWorker } from "tesseract.js";

// ==================== TYPE DEFINITIONS ====================

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
  subCategoryName?: string;
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
  displayOrder?: number;
}

export interface ExtractedMenuCategory {
  id: string;
  name: string;
  description: string;
  subCategories?: string[];
  sortOrder: number;
}

export interface ExcludedTextBlock {
  text: string;
  classification: TextClassification;
  reason: string;
}

export interface MenuExtractionResult {
  categories: ExtractedMenuCategory[];
  items: ExtractedMenuItem[];
  excludedText: ExcludedTextBlock[];
  qualityScore: number;
  qualityRating: "High" | "Good" | "Needs Review";
  isDuplicateFile?: boolean;
  duplicateFileImportId?: string;
  fileHash?: string;
  summary: {
    categoriesCount: number;
    itemsCount: number;
    variantsCount: number;
    addonsCount: number;
    needsReviewCount: number;
    duplicatesCount: number;
    verifiedPricesCount: number;
    excludedCount: number;
  };
}

// ==================== CLASSIFICATION TYPES ====================

type TextClassification =
  | "MENU_CATEGORY"
  | "MENU_ITEM"
  | "RESTAURANT_METADATA"
  | "CONTACT_INFO"
  | "DECORATIVE_TEXT"
  | "HEADER_FOOTER"
  | "UNKNOWN";

interface ClassifiedBlock {
  text: string;
  classification: TextClassification;
  confidence: number;
  reason: string;
  // Parsed data (only for MENU_ITEM / MENU_CATEGORY)
  itemName?: string;
  price?: number;
  variants?: ExtractedVariant[];
  displayOrder?: number;
  categoryName?: string;
  column: number;
  rowY: number;
}

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

interface OcrRow {
  yCenter: number;
  words: OcrWord[];
  lineText: string;
  column: number;
}

// ==================== SHA-256 FILE HASH ====================

export async function computeFileHash(dataUrl: string): Promise<string> {
  try {
    const base64Data = dataUrl.split(",")[1] || dataUrl;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    return `hash-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ==================== PRICE NORMALIZATION ====================

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

// ==================== DIETARY DETECTION ====================

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
    combined.includes("seekh") ||
    combined.includes("keema") ||
    combined.includes("gosht") ||
    combined.includes("pampret") ||
    combined.includes("pomfret")
  ) {
    return "non_veg";
  }
  if (combined.includes("egg") || combined.includes("omelette") || combined.includes("anda")) {
    return "egg";
  }
  if (combined.includes("vegan")) {
    return "vegan";
  }
  return "veg";
}

// ==================== INDIAN FOOD VOCABULARY (~500 words) ====================

const FOOD_VOCABULARY = new Set([
  // Breads & Parathas
  "paratha", "naan", "roti", "kulcha", "bhature", "puri", "chapati", "rumali",
  "tandoori", "missi", "laccha", "stuffed", "plain", "butter", "garlic",
  // Rice & Biryani
  "rice", "biryani", "pulao", "jeera", "fried", "khichdi", "tahri",
  // Dal & Lentils
  "dal", "daal", "tadka", "fry", "makhani", "tarka",
  // Vegetables
  "aloo", "gobhi", "gobi", "palak", "matar", "mushroom", "paneer", "bhindi",
  "baingan", "shimla", "mirch", "pyaz", "mooli", "arbi", "lauki", "tinda",
  "karela", "mix", "veg", "vegetable", "sabzi", "sabji",
  // Indian Curries & Gravies
  "masala", "curry", "kadhai", "kadai", "korma", "tikka", "butter",
  "lababdar", "makhani", "do pyaza", "dopayaza", "shahi", "mughlai",
  "malai", "cream", "achari", "handi", "tawa",
  // Chaap / Soya
  "chaap", "soya", "keema",
  // Rajma / Chole / Kadhi
  "rajma", "chole", "chhole", "chana", "kadhi", "pakoda", "pakora",
  // Chinese
  "noodles", "chowmein", "chow", "mein", "manchurian", "schezwan",
  "szechuan", "spring roll", "momos", "momo", "wonton",
  "hakka", "singapore", "american",
  // Snacks & Starters
  "samosa", "tikki", "cutlet", "bhatura", "bhaji", "bhajia", "pav",
  "chaat", "golgappa", "pani puri", "dahi", "papdi",
  "roll", "wrap", "sandwich", "burger", "pizza", "fries", "toast",
  "finger", "nugget", "popcorn",
  // Kebabs
  "kebab", "seekh", "galouti", "shammi", "boti", "reshmi",
  // Tandoori
  "tandoori", "tikka", "angara", "achari",
  // Soups
  "soup", "shorba", "rasam", "tomato", "sweet corn", "hot", "sour",
  // South Indian
  "dosa", "idli", "vada", "uttapam", "upma", "pongal", "appam",
  // Desserts
  "gulab", "jamun", "rasgulla", "rasmalai", "kheer", "halwa", "jalebi",
  "kulfi", "rabri", "barfi", "ladoo", "laddu", "cake", "pastry",
  "brownie", "sundae", "ice cream",
  // Beverages
  "lassi", "chaas", "buttermilk", "sharbat", "nimbu", "pani", "jaljeera",
  "chai", "tea", "coffee", "cold", "hot", "milk", "shake", "smoothie",
  "pepsi", "cola", "coke", "sprite", "fanta", "limca", "thums",
  "mountain", "dew", "soda", "water", "juice", "fresh", "lime",
  "mango", "orange", "pineapple", "watermelon",
  // Raita & Accompaniments
  "raita", "salad", "onion", "green", "papad", "pickle", "chutney",
  "achaar",
  // Cooking Methods
  "fried", "roasted", "grilled", "steamed", "baked", "stuffed",
  "dry", "gravy", "tawa", "handi", "dum",
  // Generic food words
  "special", "classic", "premium", "chef", "house",
  "combo", "thali", "platter", "plate",
  // Ingredients commonly in dish names
  "cheese", "corn", "potato", "onion", "capsicum", "tomato",
  "ginger", "lemon", "honey", "mint",
  // Panner varieties
  "bhurji", "khurchan",
  // Quick bites
  "maggi", "pasta", "macaroni",
  // Additional common items
  "curd", "dahi", "bhel", "sev", "mixture",
  "chilli", "pepper", "salt", "sweet",
  "biryani", "pulao", "tahri",
  // Chinese specific
  "chilli", "dragon", "crispy", "golden",
  "manchow", "wok",
]);

// ==================== NON-MENU TEXT PATTERNS (BLOCKLIST) ====================

/**
 * Returns true if the text is clearly NOT a food item.
 * Uses pattern matching for restaurant metadata, contact info, decorative text, etc.
 */
function isNonMenuText(text: string): { blocked: boolean; classification: TextClassification; reason: string } {
  const lower = text.toLowerCase().trim();
  const original = text.trim();

  // Empty or too short
  if (lower.length <= 1) {
    return { blocked: true, classification: "UNKNOWN", reason: "Too short" };
  }

  // Phone numbers / mobile numbers
  if (/(?:mob|mobile|phone|tel|call|whatsapp)[\s.:]*[\d\-+()]{7,}/i.test(original)) {
    return { blocked: true, classification: "CONTACT_INFO", reason: "Phone number detected" };
  }
  if (/^\+?\d[\d\s\-()]{8,}$/.test(original.replace(/\s/g, ""))) {
    return { blocked: true, classification: "CONTACT_INFO", reason: "Phone number pattern" };
  }

  // Addresses
  if (/\b(?:road|street|lane|block|sector|nagar|colony|market|main|floor|plot|no\.|building|bldg|near|opp|opposite|behind|above|below|beside|next to)\b/i.test(original) && /\d/.test(original)) {
    return { blocked: true, classification: "CONTACT_INFO", reason: "Address detected" };
  }
  if (/\b(?:delhi|mumbai|kolkata|chennai|bangalore|bengaluru|hyderabad|pune|jaipur|lucknow|ahmedabad|noida|gurgaon|gurugram|faridabad|ghaziabad)\b/i.test(original)) {
    if (!/\b(?:biryani|kebab|chicken|special|style)\b/i.test(original)) {
      return { blocked: true, classification: "CONTACT_INFO", reason: "City name in non-food context" };
    }
  }
  if (/\b\d{6}\b/.test(original) && !/₹|rs|price/i.test(original)) {
    return { blocked: true, classification: "CONTACT_INFO", reason: "PIN code detected" };
  }

  // Restaurant / Hotel / Menu branding
  if (/\b(?:restaurant|hotel|cafe|dhaba|bhawan|palace|inn|lodge|motel)\b/i.test(original) && original.length < 50) {
    if (!/\b(?:style|special|wala|type)\b/i.test(original)) {
      return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Restaurant/Hotel name" };
    }
  }

  // Menu / Take Away headers
  if (/\b(?:menu|take\s*away|home\s*delivery|dine\s*in|eat\s*in|order\s*online)\b/i.test(original) && !/\b(?:combo|thali|special|set)\b/i.test(original)) {
    return { blocked: true, classification: "DECORATIVE_TEXT", reason: "Menu header text" };
  }

  // Pure Vegetarian / Non-Veg markers
  if (/\b(?:100\s*%?\s*(?:pure\s+)?(?:veg|vegetarian)|pure\s+vegetarian|all\s+veg)\b/i.test(original)) {
    return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Vegetarian declaration" };
  }

  // GST / FSSAI / Tax
  if (/\b(?:gst|fssai|lic|license|tin|pan|tax|cgst|sgst|igst)\b/i.test(original)) {
    return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Tax/License info" };
  }

  // Email / Website / Social
  if (/(?:@|www\.|\.com|\.in|\.org|http|facebook|instagram|twitter|youtube|zomato|swiggy)/i.test(original)) {
    return { blocked: true, classification: "CONTACT_INFO", reason: "Website/Social media" };
  }

  // Owner / Manager names (no food words, short, title-case, no price)
  if (/\b(?:owner|manager|proprietor|prop\.|chef|founder|director|mr\.|mrs\.|ms\.|shri|smt)\b/i.test(original)) {
    return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Person title detected" };
  }

  // Opening hours
  if (/\b(?:am|pm|hrs|hours|timing|open|close|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(original) && /\d/.test(original)) {
    if (!/\b(?:masala|tikka|biryani|naan|roti|dal|paneer|chicken|mutton)\b/i.test(original)) {
      return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Opening hours" };
    }
  }

  // Copyright / promotional
  if (/\b(?:copyright|©|all rights|reserved|since|est\.|established|serving since)\b/i.test(original)) {
    return { blocked: true, classification: "DECORATIVE_TEXT", reason: "Copyright/promotional" };
  }

  // Purely numeric (not a price in food context)
  if (/^\d+$/.test(original) && parseInt(original) > 9999) {
    return { blocked: true, classification: "UNKNOWN", reason: "Large standalone number" };
  }

  // Very short OCR garbage (1-2 characters of random symbols)
  if (/^[^a-zA-Z0-9]*$/.test(original) || (original.length <= 3 && !/\w{2,}/.test(original))) {
    return { blocked: true, classification: "UNKNOWN", reason: "OCR artifact" };
  }

  // Lines that are mostly special characters / OCR garbage
  const alphaCount = (original.match(/[a-zA-Z]/g) || []).length;
  const totalLength = original.length;
  if (totalLength > 3 && alphaCount / totalLength < 0.3) {
    return { blocked: true, classification: "UNKNOWN", reason: "Low alphabetic ratio — likely OCR noise" };
  }

  // Person-like names: two capitalized words, no food vocabulary match
  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(original) && !hasAnyFoodWord(lower)) {
    return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Looks like a person name" };
  }

  return { blocked: false, classification: "UNKNOWN", reason: "" };
}

// ==================== FOOD WORD CHECK ====================

/**
 * Checks if text contains at least one word from the food vocabulary.
 */
function hasAnyFoodWord(lowerText: string): boolean {
  const words = lowerText.split(/[\s,./\-()]+/);
  for (const word of words) {
    if (word.length >= 2 && FOOD_VOCABULARY.has(word)) {
      return true;
    }
  }
  // Check 2-word combinations
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (FOOD_VOCABULARY.has(bigram)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes a food-plausibility score (0-100) for a candidate item name.
 */
function foodPlausibilityScore(name: string): number {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/[\s,./\-()]+/).filter(Boolean);

  let score = 0;

  // Food vocabulary word matches
  let foodWordCount = 0;
  for (const w of words) {
    if (FOOD_VOCABULARY.has(w)) foodWordCount++;
  }

  if (foodWordCount > 0) {
    score += Math.min(60, foodWordCount * 25);
  }

  // Reasonable name length (2-6 words)
  if (words.length >= 1 && words.length <= 6) score += 15;
  if (words.length > 8) score -= 20;

  // Contains price nearby (handled externally, slight bonus for having structure)
  // This function only evaluates the name itself

  // Penalty for non-food patterns
  if (/\d{5,}/.test(lower)) score -= 40; // long numbers
  if (/@/.test(lower)) score -= 40; // email
  if (/www|\.com|\.in/.test(lower)) score -= 40; // URL

  return Math.max(0, Math.min(100, score));
}

// ==================== CATEGORY DETECTION ====================

/**
 * Determines whether a text line is a menu CATEGORY heading.
 * Categories typically: ALL CAPS, no price, short, no digits, positioned before food items.
 */
function isCategoryHeading(lineText: string, hasPrice: boolean): { isCategory: boolean; categoryName: string; confidence: number } {
  const trimmed = lineText.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { isCategory: false, categoryName: "", confidence: 0 };
  }

  // Must NOT have a price (categories don't have prices)
  if (hasPrice) {
    return { isCategory: false, categoryName: "", confidence: 0 };
  }

  // Strip leading numbers/bullets (e.g., "1.", "•", "-")
  const stripped = trimmed.replace(/^[\d.\-•*#)\]]+\s*/, "").trim();
  if (stripped.length < 2) {
    return { isCategory: false, categoryName: "", confidence: 0 };
  }

  let score = 0;
  const upper = stripped.toUpperCase();

  // ALL CAPS is a strong category signal
  if (stripped === upper && /[A-Z]/.test(stripped)) {
    score += 40;
  }

  // No digits (categories rarely contain numbers)
  if (!/\d/.test(stripped)) {
    score += 15;
  }

  // Known category keywords
  const categoryKeywords = [
    "paratha", "bread", "roti", "naan", "rice", "biryani", "pulao",
    "vegetable", "veg", "dry", "gravy", "main course", "starter",
    "appetizer", "soup", "shorba", "snack", "dessert", "sweet",
    "beverage", "drink", "juice", "shake", "tandoor", "kebab",
    "chinese", "noodle", "chowmein", "fried rice", "momos",
    "roll", "rumali", "quick bite", "combo", "thali", "special",
    "south indian", "dosa", "idli", "chaat",
    "salad", "raita", "accompaniment", "extra", "add on",
    "breakfast", "lunch", "dinner", "meal",
  ];

  const lowerStripped = stripped.toLowerCase();
  for (const kw of categoryKeywords) {
    if (lowerStripped.includes(kw)) {
      score += 25;
      break;
    }
  }

  // Short length is a category signal
  if (stripped.length < 30) score += 10;

  // Title case the category name
  const titleCased = stripped
    .toLowerCase()
    .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase())
    .replace(/\b(And|Of|The|In|On|At|To|For|With|A|An)\b/g, (m) => m.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());

  if (score >= 40) {
    return { isCategory: true, categoryName: titleCased, confidence: Math.min(100, score) };
  }

  return { isCategory: false, categoryName: "", confidence: score };
}

// ==================== PRICE & VARIANT EXTRACTION ====================

interface PriceExtractionResult {
  cleanName: string;
  price: number;
  variants: ExtractedVariant[];
  hasPrice: boolean;
  displayOrder: number | null;
}

/**
 * Extracts item name, price, variants, and display order from a line of text.
 * Handles: "Paneer Tikka 120 200" → name: "Paneer Tikka", Half: 120, Full: 200
 * Handles: "1 Plain Paratha 40" → name: "Plain Paratha", price: 40, displayOrder: 1
 * Handles: "Chicken 65 250" → name: "Chicken 65", price: 250 (preserves brand numbers)
 */
function extractNamePriceVariants(lineText: string): PriceExtractionResult {
  let text = lineText.replace(/\s+/g, " ").trim();

  // Strip leading item number (e.g., "1 ", "1.", "2)", "23 ", "23.")
  let displayOrder: number | null = null;
  const leadingNumMatch = text.match(/^(\d{1,2})[.):\s]+\s*(.*)/);
  if (leadingNumMatch && leadingNumMatch[1] && leadingNumMatch[2]) {
    const num = parseInt(leadingNumMatch[1], 10);
    // Only treat as display order if it's reasonable (1-99) and rest has text
    if (num >= 1 && num <= 99 && leadingNumMatch[2].trim().length > 1) {
      displayOrder = num;
      text = leadingNumMatch[2].trim();
    }
  }

  // Known brand dish numbers that MUST be preserved
  const isKnownDishNumber = (nameStr: string) => {
    const lower = nameStr.toLowerCase();
    return lower.includes("65") || lower.match(/\b\d+\s*(?:g|gm|ml|l|kg|pcs|pc|inch|in|oz)\b/i);
  };

  // Pattern 1: Triple Price (e.g., "Chicken Tikka 90 150 280")
  const tripleMatch = text.match(/^(.*?)\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})$/i);
  if (tripleMatch && tripleMatch[1] && tripleMatch[2] && tripleMatch[3] && tripleMatch[4]) {
    const name = tripleMatch[1].replace(/[._\-]+$/, "").trim();
    const p1 = parseInt(tripleMatch[2], 10);
    const p2 = parseInt(tripleMatch[3], 10);
    const p3 = parseInt(tripleMatch[4], 10);
    return {
      cleanName: name,
      price: p3,
      variants: [
        { name: "Quarter", price: p1 },
        { name: "Half", price: p2 },
        { name: "Full", price: p3 },
      ],
      hasPrice: true,
      displayOrder,
    };
  }

  // Pattern 2: Dual Price (e.g., "Paneer Tikka 120 200")
  const dualMatch = text.match(/^(.*?)\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})$/i);
  if (dualMatch && dualMatch[1] && dualMatch[2] && dualMatch[3]) {
    const candidateName = dualMatch[1].replace(/[._\-]+$/, "").trim();
    const p1 = parseInt(dualMatch[2], 10);
    const p2 = parseInt(dualMatch[3], 10);

    // Check if the first number is part of a brand name (e.g., "Chicken 65")
    const fullName = `${candidateName} ${p1}`;
    if (isKnownDishNumber(fullName) && !text.toLowerCase().includes("half") && !text.toLowerCase().includes("full")) {
      return {
        cleanName: fullName,
        price: p2,
        variants: [],
        hasPrice: true,
        displayOrder,
      };
    }

    return {
      cleanName: candidateName,
      price: p2,
      variants: [
        { name: "Half", price: p1 },
        { name: "Full", price: p2 },
      ],
      hasPrice: true,
      displayOrder,
    };
  }

  // Pattern 3: Single Price with currency symbol (e.g., "Paneer Tikka ₹190")
  const symbolMatch = text.match(/^(.*?)\s*(?:(?:₹|Rs\.?\s*|INR\s*))(\d{2,5})(?:\s*\/-\s*)?$/i);
  if (symbolMatch && symbolMatch[1] && symbolMatch[2]) {
    const name = symbolMatch[1].replace(/[._\-]+$/, "").trim();
    const price = parseInt(symbolMatch[2], 10);
    return { cleanName: name, price, variants: [], hasPrice: true, displayOrder };
  }

  // Pattern 4: Single Price without symbol (e.g., "Aloo Paratha 60")
  const singleMatch = text.match(/^(.*?)\s+(\d{2,4})(?:\s*\/-\s*)?$/);
  if (singleMatch && singleMatch[1] && singleMatch[2]) {
    const rawName = singleMatch[1].replace(/[._\-]+$/, "").trim();
    const price = parseInt(singleMatch[2], 10);

    // Check for nested price in name (e.g., "Paneer tikka 100 190" was already split wrong upstream)
    const trailingCheck = rawName.match(/^(.*?)\s+(\d{2,4})$/);
    if (trailingCheck && trailingCheck[1] && trailingCheck[2] && !isKnownDishNumber(rawName)) {
      const actualName = trailingCheck[1].replace(/[._\-]+$/, "").trim();
      const halfPrice = parseInt(trailingCheck[2], 10);
      return {
        cleanName: actualName,
        price,
        variants: [
          { name: "Half", price: halfPrice },
          { name: "Full", price },
        ],
        hasPrice: true,
        displayOrder,
      };
    }

    // Validate price range (₹5 - ₹9999)
    if (price >= 5 && price <= 9999) {
      return { cleanName: rawName, price, variants: [], hasPrice: true, displayOrder };
    }
  }

  // No price detected
  return {
    cleanName: text.replace(/[._\-]+$/, "").trim(),
    price: 0,
    variants: [],
    hasPrice: false,
    displayOrder,
  };
}

// ==================== STAGE 3: COLUMN DETECTION ====================

/**
 * Detects column boundaries from OCR word bounding boxes.
 * Uses X-coordinate gap analysis to find vertical separators.
 */
function detectColumns(words: OcrWord[]): { boundaries: number[]; count: number; imageWidth: number } {
  if (words.length === 0) {
    return { boundaries: [0, 1000], count: 1, imageWidth: 1000 };
  }

  const imageWidth = Math.max(...words.map((w) => w.bbox.x1));
  const imageHeight = Math.max(...words.map((w) => w.bbox.y1));

  // For very small images or few words, assume single column
  if (words.length < 10 || imageWidth < 400) {
    return { boundaries: [0, imageWidth], count: 1, imageWidth };
  }

  // Build X-center histogram (buckets of 20px)
  const bucketSize = 20;
  const bucketCount = Math.ceil(imageWidth / bucketSize);
  const histogram = new Array(bucketCount).fill(0);

  for (const w of words) {
    const xCenter = (w.bbox.x0 + w.bbox.x1) / 2;
    const bucket = Math.min(Math.floor(xCenter / bucketSize), bucketCount - 1);
    histogram[bucket]++;
  }

  // Find significant gaps in the histogram (potential column dividers)
  // A gap is where multiple consecutive buckets have zero or very low word count
  const gaps: Array<{ start: number; end: number; width: number }> = [];
  const threshold = Math.max(1, Math.floor(words.length / (bucketCount * 2)));

  let gapStart = -1;
  for (let i = 1; i < bucketCount - 1; i++) {
    if (histogram[i] <= threshold) {
      if (gapStart === -1) gapStart = i;
    } else {
      if (gapStart !== -1) {
        const gapWidth = (i - gapStart) * bucketSize;
        if (gapWidth >= 30) { // Minimum 30px gap to be a column divider
          gaps.push({
            start: gapStart * bucketSize,
            end: i * bucketSize,
            width: gapWidth,
          });
        }
        gapStart = -1;
      }
    }
  }

  // Sort gaps by width (largest first) and pick the most significant ones
  gaps.sort((a, b) => b.width - a.width);

  // Determine column boundaries
  const boundaries: number[] = [0];
  const selectedGaps = gaps.slice(0, 3).sort((a, b) => a.start - b.start);

  for (const gap of selectedGaps) {
    const divider = (gap.start + gap.end) / 2;
    // Only accept if it divides the image into reasonable proportions (each column >= 15% width)
    const prevBoundary = boundaries[boundaries.length - 1] ?? 0;
    if ((divider - prevBoundary) / imageWidth >= 0.15 && (imageWidth - divider) / imageWidth >= 0.15) {
      boundaries.push(divider);
    }
  }
  boundaries.push(imageWidth);

  return {
    boundaries,
    count: boundaries.length - 1,
    imageWidth,
  };
}

/**
 * Assigns a word to its column based on X-coordinate.
 */
function getWordColumn(word: OcrWord, boundaries: number[]): number {
  const xCenter = (word.bbox.x0 + word.bbox.x1) / 2;
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (xCenter >= (boundaries[i] ?? 0) && xCenter < (boundaries[i + 1] ?? Infinity)) {
      return i;
    }
  }
  return boundaries.length - 2; // Last column
}

// ==================== STAGE 4: ROW CLUSTERING PER COLUMN ====================

/**
 * Groups words into rows within each column, using Y-center proximity.
 */
function clusterRowsPerColumn(words: OcrWord[], columnBoundaries: number[], columnCount: number): OcrRow[][] {
  // Adaptive row threshold based on image height — not a hardcoded value
  const imageHeight = words.length > 0 ? Math.max(...words.map((w) => w.bbox.y1)) : 1000;
  const yThreshold = Math.max(8, Math.round(imageHeight * 0.008));
  const columns: OcrRow[][] = Array.from({ length: columnCount }, () => []);

  // Group words by column
  const wordsByColumn: OcrWord[][] = Array.from({ length: columnCount }, () => []);
  for (const word of words) {
    const col = getWordColumn(word, columnBoundaries);
    wordsByColumn[col]!.push(word);
  }

  // For each column, cluster words into rows
  for (let col = 0; col < columnCount; col++) {
    const colWords = wordsByColumn[col]!.sort((a, b) => a.bbox.y0 - b.bbox.y0);
    const rows: Array<{ yCenter: number; words: OcrWord[] }> = [];

    for (const word of colWords) {
      const wordYCenter = (word.bbox.y0 + word.bbox.y1) / 2;
      let matchedRow = rows.find((r) => Math.abs(r.yCenter - wordYCenter) <= yThreshold);

      if (matchedRow) {
        matchedRow.words.push(word);
        // Recalculate yCenter as average
        matchedRow.yCenter = matchedRow.words.reduce((sum, w) => sum + (w.bbox.y0 + w.bbox.y1) / 2, 0) / matchedRow.words.length;
      } else {
        rows.push({ yCenter: wordYCenter, words: [word] });
      }
    }

    // Sort rows top-to-bottom, words left-to-right within each row
    rows.sort((a, b) => a.yCenter - b.yCenter);
    for (const row of rows) {
      row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    }

    columns[col] = rows.map((r) => ({
      yCenter: r.yCenter,
      words: r.words,
      lineText: r.words.map((w) => w.text).join(" ").trim(),
      column: col,
    }));
  }

  return columns;
}

// ==================== STAGE 5-6: CLASSIFY & BUILD MENU STRUCTURE ====================

/**
 * The main menu understanding pipeline.
 * Processes columns sequentially, classifying each row and building structured menu data.
 */
function buildMenuStructure(columns: OcrRow[][]): {
  categories: ExtractedMenuCategory[];
  items: Array<{
    name: string;
    desc: string | null;
    price: number;
    catName: string;
    variants: ExtractedVariant[];
    confidence: "high" | "needs_review";
    confidenceReason?: string;
    sourceText: string;
    displayOrder: number | null;
  }>;
  excluded: ExcludedTextBlock[];
} {
  const categoriesMap = new Map<string, ExtractedMenuCategory>();
  const items: Array<{
    name: string;
    desc: string | null;
    price: number;
    catName: string;
    variants: ExtractedVariant[];
    confidence: "high" | "needs_review";
    confidenceReason?: string;
    sourceText: string;
    displayOrder: number | null;
  }> = [];
  const excluded: ExcludedTextBlock[] = [];

  let currentCategory = "General";
  let sortOrderCounter = 1;
  const seenItemNames = new Set<string>();

  // Process each column, top-to-bottom
  for (let col = 0; col < columns.length; col++) {
    const rows = columns[col];
    // Reset category for each column — each column likely starts its own category hierarchy
    // but we keep the last seen category as fallback

    for (const row of rows!) {
      const lineText = row.lineText;
      if (!lineText || lineText.trim().length === 0) continue;

      // ---- STEP 1: Check non-menu exclusion blocklist ----
      const blockCheck = isNonMenuText(lineText);
      if (blockCheck.blocked) {
        excluded.push({
          text: lineText,
          classification: blockCheck.classification,
          reason: blockCheck.reason,
        });
        continue;
      }

      // ---- STEP 2: Skip "Half / Full" header rows ----
      const lowerLine = lineText.toLowerCase();
      if (/^\s*(?:half\s+full|full\s+half|s\.?\s*no|sr\.?\s*no|item\s+(?:name|price)|name\s+price)\s*$/i.test(lineText.trim())) {
        excluded.push({ text: lineText, classification: "HEADER_FOOTER", reason: "Table header row" });
        continue;
      }
      // Lines that are ONLY "Half" and "Full" with no food name
      if (/^(?:half|full|quarter|small|medium|large|regular)(?:\s+(?:half|full|quarter|small|medium|large|regular))*\s*$/i.test(lineText.trim())) {
        excluded.push({ text: lineText, classification: "HEADER_FOOTER", reason: "Variant header row" });
        continue;
      }

      // ---- STEP 3: Extract price and name ----
      const extracted = extractNamePriceVariants(lineText);

      // ---- STEP 4: Check if this is a CATEGORY heading ----
      const catCheck = isCategoryHeading(extracted.cleanName, extracted.hasPrice);
      if (catCheck.isCategory && catCheck.confidence >= 40) {
        currentCategory = catCheck.categoryName;
        if (!categoriesMap.has(currentCategory)) {
          categoriesMap.set(currentCategory, {
            id: `cat-${Math.random().toString(36).slice(2, 9)}`,
            name: currentCategory,
            description: `${currentCategory} items`,
            sortOrder: sortOrderCounter++,
          });
        }
        continue;
      }

      // ---- STEP 5: Multi-signal food classification ----
      // IMPORTANT: Food vocabulary is ONE signal, NOT a gate.
      // An unknown dish with a valid price is still a valid menu item.
      // e.g., "Dal Banjara 220" — even though "Banjara" isn't in the vocabulary.
      const hasFoodWord = hasAnyFoodWord(extracted.cleanName.toLowerCase());

      let isFoodItem = false;
      let confidence: "high" | "needs_review" = "high";
      let confidenceReason: string | undefined;

      if (extracted.hasPrice && extracted.cleanName.length >= 3) {
        // Has a valid price AND a reasonable-length name → accept as food item.
        // Food vocabulary match boosts confidence but absence does NOT reject.
        isFoodItem = true;
        confidence = hasFoodWord ? "high" : "high"; // price + name = accept
      } else if (hasFoodWord && !extracted.hasPrice) {
        // Food word but no price — could be a category or price-less item
        if (extracted.cleanName === extracted.cleanName.toUpperCase() && extracted.cleanName.length < 30) {
          // ALL CAPS + no price → treat as category heading
          currentCategory = extracted.cleanName
            .toLowerCase()
            .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
          if (!categoriesMap.has(currentCategory)) {
            categoriesMap.set(currentCategory, {
              id: `cat-${Math.random().toString(36).slice(2, 9)}`,
              name: currentCategory,
              description: `${currentCategory} items`,
              sortOrder: sortOrderCounter++,
            });
          }
          continue;
        }
        // Otherwise, price-less food item (e.g., "Market Price" dishes)
        isFoodItem = true;
        confidence = "needs_review";
        confidenceReason = "No price detected — please add price manually";
      } else if (!extracted.hasPrice && extracted.cleanName.length >= 3) {
        // No food word, no price, but has text — likely non-menu text or a category
        // Check if it looks like a category heading
        if (extracted.cleanName === extracted.cleanName.toUpperCase() && extracted.cleanName.length < 30 && !/\d/.test(extracted.cleanName)) {
          currentCategory = extracted.cleanName
            .toLowerCase()
            .replace(/(?:^|\s)\w/g, (c) => c.toUpperCase());
          if (!categoriesMap.has(currentCategory)) {
            categoriesMap.set(currentCategory, {
              id: `cat-${Math.random().toString(36).slice(2, 9)}`,
              name: currentCategory,
              description: `${currentCategory} items`,
              sortOrder: sortOrderCounter++,
            });
          }
          continue;
        }
        // Otherwise exclude
        excluded.push({
          text: lineText,
          classification: "UNKNOWN",
          reason: "No price detected and no food vocabulary match",
        });
        continue;
      } else {
        // Very short name, no price → exclude
        excluded.push({
          text: lineText,
          classification: "UNKNOWN",
          reason: "Text too short to be a menu item",
        });
        continue;
      }

      if (!isFoodItem) continue;

      // ---- STEP 6: Clean up and deduplicate ----
      const normalizedKey = extracted.cleanName.toLowerCase().trim();
      if (seenItemNames.has(normalizedKey)) continue;
      if (extracted.cleanName.length < 2) continue;

      seenItemNames.add(normalizedKey);

      // Ensure current category exists
      if (!categoriesMap.has(currentCategory)) {
        categoriesMap.set(currentCategory, {
          id: `cat-${Math.random().toString(36).slice(2, 9)}`,
          name: currentCategory,
          description: `${currentCategory} items`,
          sortOrder: sortOrderCounter++,
        });
      }

      // Description: source-derived ONLY. Never generate hallucinated descriptions.
      const desc: string | null = null;

      const itemRecord: any = {
        name: extracted.cleanName,
        desc,
        price: extracted.price,
        catName: currentCategory,
        variants: extracted.variants,
        confidence,
        sourceText: lineText,
        displayOrder: extracted.displayOrder,
      };
      if (confidenceReason) {
        itemRecord.confidenceReason = confidenceReason;
      }

      items.push(itemRecord);
    }
  }

  return {
    categories: Array.from(categoriesMap.values()),
    items,
    excluded,
  };
}

// ==================== STAGE 8: QUALITY SCORE ====================

export function calculateMenuQualityScore(items: ExtractedMenuItem[], categoriesCount: number) {
  if (items.length === 0) {
    return { score: 0, rating: "Needs Review" as const, verifiedPrices: 0, needsReview: 0 };
  }
  const total = items.length;
  const verifiedPrices = items.filter((i) => i.price > 0 && i.confidence === "high").length;
  const needsReview = items.filter((i) => i.confidence === "needs_review").length;

  const priceScore = (verifiedPrices / total) * 50;
  const reviewScore = ((total - needsReview) / total) * 30;
  const categoryBonus = categoriesCount > 1 ? 20 : categoriesCount === 1 ? 10 : 0;

  const score = Math.min(100, Math.round(priceScore + reviewScore + categoryBonus));
  const rating: "High" | "Good" | "Needs Review" = score >= 85 ? "High" : score >= 65 ? "Good" : "Needs Review";

  return { score, rating, verifiedPrices, needsReview };
}

// ==================== BACKWARD COMPAT EXPORTS ====================

/**
 * Exported for backward compatibility with existing test scripts.
 */
export function normalizeDishNameAndVariants(lineText: string) {
  const result = extractNamePriceVariants(lineText);
  return {
    cleanName: result.cleanName,
    basePrice: result.price,
    variants: result.variants,
    confidence: result.hasPrice ? ("high" as const) : ("needs_review" as const),
    confidenceReason: result.hasPrice ? undefined : "Ambiguous item name/price format",
  };
}

// ==================== CORE ENGINE: extractMenuFromFiles ====================

/**
 * Core Menu Extraction Engine v2
 *
 * Pipeline:
 *   Tesseract OCR (words + bounding boxes)
 *   → Column Detection
 *   → Row Clustering per Column
 *   → Text Block Classification
 *   → Category Context Propagation
 *   → Food/Price Association
 *   → Deduplication & Validation
 *   → Quality Score
 */
export async function extractMenuFromFiles(
  files: Array<{ name: string; url?: string; dataUrl?: string }>,
  existingProducts: Array<{ id: string; name: string; base_price: number }> = []
): Promise<MenuExtractionResult> {
  console.log(`[MenuExtractor v2] Processing ${files.length} menu document(s)...`);

  // Compute primary file hash
  let primaryFileHash = "";
  if (files[0]?.dataUrl) {
    primaryFileHash = await computeFileHash(files[0].dataUrl);
  }

  let allWords: OcrWord[] = [];
  let allExcluded: ExcludedTextBlock[] = [];

  // ---- STAGE 1-2: Run Tesseract OCR with bounding boxes ----
  for (const file of files) {
    const fileSource = file.dataUrl || file.url;
    if (fileSource && (fileSource.startsWith("data:image/") || fileSource.startsWith("http"))) {
      try {
        console.log(`[Tesseract OCR] Performing spatial OCR on: ${file.name}`);
        const worker = await createWorker("eng");
        const { data: ocrResult } = await worker.recognize(fileSource);
        await worker.terminate();

        const words: OcrWord[] = [];
        if ((ocrResult as any)?.words && Array.isArray((ocrResult as any).words)) {
          for (const w of (ocrResult as any).words) {
            if (w.text && w.text.trim()) {
              words.push({
                text: w.text.trim(),
                bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
                confidence: w.confidence || 90,
              });
            }
          }
        }

        if (words.length > 0) {
          console.log(`[Tesseract OCR] Recognized ${words.length} spatial tokens from ${file.name}`);
          allWords.push(...words);
        } else {
          // Fallback: parse raw text into synthetic words
          const rawText = ocrResult?.text || "";
          console.log(`[Tesseract OCR] No bounding boxes, using raw text fallback (${rawText.length} chars)`);
          const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
          let y = 0;
          for (const line of lines) {
            const lineWords = line.trim().split(/\s+/);
            let x = 0;
            for (const word of lineWords) {
              allWords.push({
                text: word,
                bbox: { x0: x, y0: y, x1: x + word.length * 10, y1: y + 20 },
                confidence: 80,
              });
              x += word.length * 10 + 10;
            }
            y += 30;
          }
        }
      } catch (ocrError) {
        console.error(`[Tesseract OCR FAILED for ${file.name}]:`, ocrError);
      }
    }
  }

  // ---- STAGE 3: Column Detection ----
  console.log(`[Pipeline Stage 3] Detecting columns from ${allWords.length} words...`);
  const { boundaries: columnBoundaries, count: columnCount } = detectColumns(allWords);
  console.log(`[Pipeline Stage 3] Detected ${columnCount} column(s): boundaries = [${columnBoundaries.map((b) => Math.round(b)).join(", ")}]`);

  // ---- STAGE 4: Row Clustering per Column ----
  console.log(`[Pipeline Stage 4] Clustering words into rows per column...`);
  const columns = clusterRowsPerColumn(allWords, columnBoundaries, columnCount);
  const totalRows = columns.reduce((sum, col) => sum + col.length, 0);
  console.log(`[Pipeline Stage 4] Clustered into ${totalRows} rows across ${columnCount} column(s)`);

  // ---- STAGES 5-6: Classification, Category Propagation, Food/Price Association ----
  console.log(`[Pipeline Stage 5-6] Classifying text blocks & building menu structure...`);
  const structured = buildMenuStructure(columns);
  allExcluded = structured.excluded;
  console.log(`[Pipeline Stage 5-6] Found ${structured.categories.length} categories, ${structured.items.length} food items, excluded ${allExcluded.length} non-menu blocks`);

  // ---- STAGE 7: Build final ExtractedMenuItem[] with dedup & existing-product matching ----
  const extractedItems: ExtractedMenuItem[] = [];
  const seenBatchNames = new Set<string>();
  let variantsCount = 0;
  let addonsCount = 0;
  let needsReviewCount = 0;
  let duplicatesCount = 0;

  for (let i = 0; i < structured.items.length; i++) {
    const raw = structured.items[i];
    if (!raw) continue;

    const normalizedNameKey = raw.name.toLowerCase().trim();
    if (seenBatchNames.has(normalizedNameKey)) continue;
    seenBatchNames.add(normalizedNameKey);

    const itemId = `item-${Math.random().toString(36).slice(2, 9)}`;
    const dietary = detectDietaryType(raw.name, raw.desc || "");

    let confidence: "high" | "needs_review" = raw.confidence;
    let confidenceReason: string | undefined = raw.confidenceReason;

    if (raw.price <= 0 && confidence !== "needs_review") {
      confidence = "needs_review";
      confidenceReason = "Please verify price";
    }
    if (confidence === "needs_review") needsReviewCount++;

    // Check for existing product match
    const existingMatch = existingProducts.find(
      (ep) => ep.name.toLowerCase().trim() === normalizedNameKey
    );

    let isDuplicate = false;
    let duplicateAction: ExtractedMenuItem["duplicateAction"] = undefined;
    let duplicateInfo: ExtractedMenuItem["duplicateInfo"];

    if (existingMatch) {
      isDuplicate = true;
      duplicateAction = "keep_existing";
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
    variantsCount += itemVariants.length;

    const itemRecord: ExtractedMenuItem = {
      id: itemId,
      name: raw.name,
      description: raw.desc || "",
      categoryName: raw.catName,
      price: raw.price,
      rawPrice: String(raw.price),
      currency: "INR",
      dietary,
      prepTimeMinutes: 15,
      variants: itemVariants,
      addons: [],
      confidence,
      source: {
        text: raw.sourceText,
        page: 1,
        confidence: confidence === "high" ? 95 : 70,
      },
    };

    if (raw.displayOrder) itemRecord.displayOrder = raw.displayOrder;
    if (confidenceReason) itemRecord.confidenceReason = confidenceReason;
    if (isDuplicate) {
      itemRecord.isDuplicate = isDuplicate;
      if (duplicateAction) itemRecord.duplicateAction = duplicateAction;
    }
    if (duplicateInfo) itemRecord.duplicateInfo = duplicateInfo;

    extractedItems.push(itemRecord);
  }

  // ---- STAGE 8: Quality Score ----
  const categories = structured.categories;
  const quality = calculateMenuQualityScore(extractedItems, categories.length);

  console.log(`[MenuExtractor v2] COMPLETE: ${categories.length} categories, ${extractedItems.length} items, ${allExcluded.length} excluded, Quality: ${quality.score}% (${quality.rating})`);

  return {
    categories,
    items: extractedItems,
    excludedText: allExcluded,
    qualityScore: quality.score,
    qualityRating: quality.rating,
    fileHash: primaryFileHash,
    summary: {
      categoriesCount: categories.length,
      itemsCount: extractedItems.length,
      variantsCount,
      addonsCount,
      needsReviewCount,
      duplicatesCount,
      verifiedPricesCount: quality.verifiedPrices,
      excludedCount: allExcluded.length,
    },
  };
}
