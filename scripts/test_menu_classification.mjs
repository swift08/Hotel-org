/**
 * RASOI Menu Classification Regression Tests
 * Tests the text block classification, food vocabulary, and non-menu detection.
 */

// Inline the classification functions for testing
// (In production these are in src/lib/ocr/extractor.ts)

const FOOD_VOCABULARY = new Set([
  "paratha",
  "naan",
  "roti",
  "kulcha",
  "bhature",
  "puri",
  "chapati",
  "rumali",
  "tandoori",
  "missi",
  "laccha",
  "stuffed",
  "plain",
  "butter",
  "garlic",
  "rice",
  "biryani",
  "pulao",
  "jeera",
  "fried",
  "khichdi",
  "dal",
  "daal",
  "tadka",
  "fry",
  "makhani",
  "tarka",
  "aloo",
  "gobhi",
  "gobi",
  "palak",
  "matar",
  "mushroom",
  "paneer",
  "bhindi",
  "baingan",
  "shimla",
  "mirch",
  "pyaz",
  "mooli",
  "arbi",
  "lauki",
  "masala",
  "curry",
  "kadhai",
  "kadai",
  "korma",
  "tikka",
  "butter",
  "lababdar",
  "makhani",
  "do pyaza",
  "shahi",
  "mughlai",
  "malai",
  "cream",
  "achari",
  "handi",
  "tawa",
  "chaap",
  "soya",
  "keema",
  "rajma",
  "chole",
  "chhole",
  "chana",
  "kadhi",
  "pakoda",
  "pakora",
  "noodles",
  "chowmein",
  "chow",
  "mein",
  "manchurian",
  "schezwan",
  "hakka",
  "singapore",
  "american",
  "samosa",
  "tikki",
  "cutlet",
  "bhatura",
  "bhaji",
  "roll",
  "wrap",
  "sandwich",
  "burger",
  "kebab",
  "seekh",
  "galouti",
  "shammi",
  "soup",
  "shorba",
  "rasam",
  "tomato",
  "dosa",
  "idli",
  "vada",
  "uttapam",
  "gulab",
  "jamun",
  "rasgulla",
  "rasmalai",
  "kheer",
  "halwa",
  "jalebi",
  "kulfi",
  "rabri",
  "barfi",
  "ladoo",
  "lassi",
  "chaas",
  "buttermilk",
  "sharbat",
  "nimbu",
  "jaljeera",
  "chai",
  "tea",
  "coffee",
  "cold",
  "hot",
  "milk",
  "shake",
  "pepsi",
  "cola",
  "coke",
  "sprite",
  "fanta",
  "limca",
  "soda",
  "water",
  "juice",
  "fresh",
  "lime",
  "raita",
  "salad",
  "onion",
  "green",
  "papad",
  "pickle",
  "chutney",
  "special",
  "classic",
  "premium",
  "chef",
  "house",
  "combo",
  "thali",
  "platter",
  "plate",
  "cheese",
  "corn",
  "potato",
  "capsicum",
  "maggi",
  "pasta",
  "macaroni",
  "curd",
  "dahi",
  "bhel",
  "sev",
  "chilli",
  "dragon",
  "crispy",
  "golden",
  "manchow",
  "wok",
  "spring roll",
  "veg",
  "vegetable",
  "dry",
  "gravy",
  "mix",
]);

function hasAnyFoodWord(lowerText) {
  const words = lowerText.split(/[\s,./\-()]+/);
  for (const word of words) {
    if (word.length >= 2 && FOOD_VOCABULARY.has(word)) return true;
  }
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (FOOD_VOCABULARY.has(bigram)) return true;
  }
  return false;
}

function isNonMenuText(text) {
  const lower = text.toLowerCase().trim();
  const original = text.trim();

  if (lower.length <= 1) return { blocked: true, classification: "UNKNOWN", reason: "Too short" };

  if (/(?:mob|mobile|phone|tel|call|whatsapp)[\s.:]*[\d\-+()]{7,}/i.test(original))
    return { blocked: true, classification: "CONTACT_INFO", reason: "Phone number detected" };

  if (/^\+?\d[\d\s\-()]{8,}$/.test(original.replace(/\s/g, "")))
    return { blocked: true, classification: "CONTACT_INFO", reason: "Phone number pattern" };

  if (
    /\b(?:road|street|lane|block|sector|nagar|colony|market|main|floor|plot|no\.|building)\b/i.test(
      original,
    ) &&
    /\d/.test(original)
  )
    return { blocked: true, classification: "CONTACT_INFO", reason: "Address detected" };

  if (
    /\b(?:delhi|mumbai|kolkata|chennai|bangalore)\b/i.test(original) &&
    !/\b(?:biryani|kebab|chicken|special|style)\b/i.test(original)
  )
    return {
      blocked: true,
      classification: "CONTACT_INFO",
      reason: "City name in non-food context",
    };

  if (/\b\d{6}\b/.test(original) && !/₹|rs|price/i.test(original))
    return { blocked: true, classification: "CONTACT_INFO", reason: "PIN code detected" };

  if (
    /\b(?:restaurant|hotel|cafe|dhaba|bhawan|palace)\b/i.test(original) &&
    original.length < 50 &&
    !/\b(?:style|special|wala|type)\b/i.test(original)
  )
    return {
      blocked: true,
      classification: "RESTAURANT_METADATA",
      reason: "Restaurant/Hotel name",
    };

  if (
    /\b(?:menu|take\s*away|home\s*delivery|dine\s*in)\b/i.test(original) &&
    !/\b(?:combo|thali|special|set)\b/i.test(original)
  )
    return { blocked: true, classification: "DECORATIVE_TEXT", reason: "Menu header text" };

  if (/\b(?:100\s*%?\s*(?:pure\s+)?(?:veg|vegetarian)|pure\s+vegetarian)\b/i.test(original))
    return {
      blocked: true,
      classification: "RESTAURANT_METADATA",
      reason: "Vegetarian declaration",
    };

  if (/\b(?:gst|fssai|lic|license|tin|pan|tax)\b/i.test(original))
    return { blocked: true, classification: "RESTAURANT_METADATA", reason: "Tax/License info" };

  if (/(?:@|www\.|\.com|\.in|http|facebook|instagram)/i.test(original))
    return { blocked: true, classification: "CONTACT_INFO", reason: "Website/Social media" };

  if (/\b(?:owner|manager|proprietor|prop\.|chef|founder|mr\.|mrs\.)\b/i.test(original))
    return {
      blocked: true,
      classification: "RESTAURANT_METADATA",
      reason: "Person title detected",
    };

  const alphaCount = (original.match(/[a-zA-Z]/g) || []).length;
  if (original.length > 3 && alphaCount / original.length < 0.3)
    return { blocked: true, classification: "UNKNOWN", reason: "OCR artifact" };

  if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(original) && !hasAnyFoodWord(lower))
    return {
      blocked: true,
      classification: "RESTAURANT_METADATA",
      reason: "Looks like a person name",
    };

  return { blocked: false, classification: "UNKNOWN", reason: "" };
}

function extractNamePriceVariants(lineText) {
  let text = lineText.replace(/\s+/g, " ").trim();
  let displayOrder = null;
  const leadingNumMatch = text.match(/^(\d{1,2})[.):\s]+\s*(.*)/);
  if (leadingNumMatch && leadingNumMatch[1] && leadingNumMatch[2]) {
    const num = parseInt(leadingNumMatch[1], 10);
    if (num >= 1 && num <= 99 && leadingNumMatch[2].trim().length > 1) {
      displayOrder = num;
      text = leadingNumMatch[2].trim();
    }
  }

  const dualMatch = text.match(
    /^(.*?)\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})\s+(?:(?:₹|Rs\.?\s*|INR\s*)?)(\d{2,4})$/i,
  );
  if (dualMatch && dualMatch[1] && dualMatch[2] && dualMatch[3]) {
    return {
      cleanName: dualMatch[1].replace(/[._\-]+$/, "").trim(),
      price: parseInt(dualMatch[3], 10),
      variants: [
        { name: "Half", price: parseInt(dualMatch[2], 10) },
        { name: "Full", price: parseInt(dualMatch[3], 10) },
      ],
      hasPrice: true,
      displayOrder,
    };
  }

  const symbolMatch = text.match(/^(.*?)\s*(?:(?:₹|Rs\.?\s*|INR\s*))(\d{2,5})(?:\s*\/-\s*)?$/i);
  if (symbolMatch && symbolMatch[1] && symbolMatch[2]) {
    return {
      cleanName: symbolMatch[1].replace(/[._\-]+$/, "").trim(),
      price: parseInt(symbolMatch[2], 10),
      variants: [],
      hasPrice: true,
      displayOrder,
    };
  }

  const singleMatch = text.match(/^(.*?)\s+(\d{2,4})(?:\s*\/-\s*)?$/);
  if (singleMatch && singleMatch[1] && singleMatch[2]) {
    const price = parseInt(singleMatch[2], 10);
    if (price >= 5 && price <= 9999) {
      return {
        cleanName: singleMatch[1].replace(/[._\-]+$/, "").trim(),
        price,
        variants: [],
        hasPrice: true,
        displayOrder,
      };
    }
  }

  return { cleanName: text, price: 0, variants: [], hasPrice: false, displayOrder };
}

// ============ TEST RUNNER ============

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`         ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected "${expected}", got "${actual}"`);
  }
}

// ============ TESTS ============

console.log("\n=== RASOI Menu Classification Regression Tests ===\n");

console.log("--- Non-Menu Text Exclusion ---");

test('"GUPTA RESTAURANT" → RESTAURANT_METADATA', () => {
  const r = isNonMenuText("GUPTA RESTAURANT");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "RESTAURANT_METADATA", "classification");
});

test('"Naveen Gupta" → RESTAURANT_METADATA', () => {
  const r = isNonMenuText("Naveen Gupta");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "RESTAURANT_METADATA", "classification");
});

test('"Mob. 8010477802" → CONTACT_INFO', () => {
  const r = isNonMenuText("Mob. 8010477802");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "CONTACT_INFO", "classification");
});

test('"B-1/9 Main Road, New Ashok Nagar" → CONTACT_INFO', () => {
  const r = isNonMenuText("B-1/9 Main Road, New Ashok Nagar");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "CONTACT_INFO", "classification");
});

test('"Delhi-110096" → CONTACT_INFO (PIN code)', () => {
  const r = isNonMenuText("Delhi-110096");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "CONTACT_INFO", "classification");
});

test('"MENU TAKE AWAY" → DECORATIVE_TEXT', () => {
  const r = isNonMenuText("MENU TAKE AWAY");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "DECORATIVE_TEXT", "classification");
});

test('"100 % Pure Vegetarian" → RESTAURANT_METADATA', () => {
  const r = isNonMenuText("100 % Pure Vegetarian");
  assertEqual(r.blocked, true, "blocked");
  assertEqual(r.classification, "RESTAURANT_METADATA", "classification");
});

console.log("\n--- Food Items Must NOT Be Excluded ---");

test('"Paneer Tikka 200" → NOT blocked', () => {
  const r = isNonMenuText("Paneer Tikka 200");
  assertEqual(r.blocked, false, "blocked");
});

test('"Plain Paratha 40" → NOT blocked', () => {
  const r = isNonMenuText("Plain Paratha 40");
  assertEqual(r.blocked, false, "blocked");
});

test('"Aloo Paratha 60" → NOT blocked', () => {
  const r = isNonMenuText("Aloo Paratha 60");
  assertEqual(r.blocked, false, "blocked");
});

test('"Dal Banjara 220" → NOT blocked (unknown dish, still valid)', () => {
  const r = isNonMenuText("Dal Banjara 220");
  assertEqual(r.blocked, false, "blocked");
});

test('"Nargisi Kofta 280" → NOT blocked', () => {
  const r = isNonMenuText("Nargisi Kofta 280");
  assertEqual(r.blocked, false, "blocked");
});

test('"Chicken 65 250" → NOT blocked', () => {
  const r = isNonMenuText("Chicken 65 250");
  assertEqual(r.blocked, false, "blocked");
});

console.log("\n--- Food Vocabulary Check ---");

test('"paneer tikka" has food word', () => {
  assertEqual(hasAnyFoodWord("paneer tikka"), true, "hasFood");
});

test('"dal makhani" has food word', () => {
  assertEqual(hasAnyFoodWord("dal makhani"), true, "hasFood");
});

test('"gupta restaurant" does NOT have food word', () => {
  assertEqual(hasAnyFoodWord("gupta restaurant"), false, "hasFood");
});

test('"naveen gupta" does NOT have food word', () => {
  assertEqual(hasAnyFoodWord("naveen gupta"), false, "hasFood");
});

console.log("\n--- Price/Name Extraction ---");

test('"1 Paneer Tikka 200" → name=Paneer Tikka, order=1, price=200', () => {
  const r = extractNamePriceVariants("1 Paneer Tikka 200");
  assertEqual(r.cleanName, "Paneer Tikka", "name");
  assertEqual(r.displayOrder, 1, "displayOrder");
  assertEqual(r.price, 200, "price");
});

test('"Plain Paratha 40" → name=Plain Paratha, price=40', () => {
  const r = extractNamePriceVariants("Plain Paratha 40");
  assertEqual(r.cleanName, "Plain Paratha", "name");
  assertEqual(r.price, 40, "price");
  assertEqual(r.hasPrice, true, "hasPrice");
});

test('"Paneer Tikka 120 200" → Half=120, Full=200', () => {
  const r = extractNamePriceVariants("Paneer Tikka 120 200");
  assertEqual(r.cleanName, "Paneer Tikka", "name");
  assertEqual(r.variants.length, 2, "variant count");
  assertEqual(r.variants[0].name, "Half", "variant 0 name");
  assertEqual(r.variants[0].price, 120, "variant 0 price");
  assertEqual(r.variants[1].name, "Full", "variant 1 name");
  assertEqual(r.variants[1].price, 200, "variant 1 price");
});

test('"Paneer Tikka ₹190" → price=190', () => {
  const r = extractNamePriceVariants("Paneer Tikka ₹190");
  assertEqual(r.cleanName, "Paneer Tikka", "name");
  assertEqual(r.price, 190, "price");
});

test('"TAWA PARATHA" → no price, category candidate', () => {
  const r = extractNamePriceVariants("TAWA PARATHA");
  assertEqual(r.hasPrice, false, "hasPrice");
  assertEqual(r.cleanName, "TAWA PARATHA", "name");
});

console.log("\n--- Unknown Dishes With Price Must Be Accepted ---");

test('"Dal Banjara 220" is accepted as menu item (price present, name >= 3 chars)', () => {
  const r = extractNamePriceVariants("Dal Banjara 220");
  assertEqual(r.hasPrice, true, "hasPrice");
  assertEqual(r.cleanName, "Dal Banjara", "name");
  assertEqual(r.price, 220, "price");
  // Even without food vocab match, price + name = accept
});

test('"Methi Malai Murgh 320" is accepted', () => {
  const r = extractNamePriceVariants("Methi Malai Murgh 320");
  assertEqual(r.hasPrice, true, "hasPrice");
  assertEqual(r.cleanName, "Methi Malai Murgh", "name");
  assertEqual(r.price, 320, "price");
});

test('"Chef Special 450" is accepted', () => {
  const r = extractNamePriceVariants("Chef Special 450");
  assertEqual(r.hasPrice, true, "hasPrice");
  assertEqual(r.cleanName, "Chef Special", "name");
});

// ============ SUMMARY ============

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
