import {
  normalizeDishNameAndVariants,
  calculateMenuQualityScore,
  detectDietaryType,
} from "../src/lib/ocr/extractor.ts";

function runEngineTests() {
  console.log("==========================================");
  console.log("RUNNING INTELLIGENT MENU UNDERSTANDING ENGINE TESTS");
  console.log("==========================================");

  let passedCount = 0;
  let totalCount = 0;

  function assertTest(testName, checkFn) {
    totalCount++;
    const passed = checkFn();
    if (passed) {
      passedCount++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // TEST 1: Dual Portion Variant Extraction (Paneer Tikka 120 200)
  assertTest("TEST 1: Dual Portion Variant Extraction (Paneer Tikka 120 200)", () => {
    const res = normalizeDishNameAndVariants("Paneer Tikka 120 200");
    return (
      res.cleanName === "Paneer Tikka" &&
      res.variants.length === 2 &&
      res.variants[0].name === "Half" &&
      res.variants[0].price === 120 &&
      res.variants[1].name === "Full" &&
      res.variants[1].price === 200 &&
      res.basePrice === 200
    );
  });

  // TEST 2: Preservation of Dish Brand Numbers (Chicken 65 ₹250)
  assertTest("TEST 2: Dish Brand Number Preservation (Chicken 65 ₹250)", () => {
    const res = normalizeDishNameAndVariants("Chicken 65 ₹250");
    return res.cleanName === "Chicken 65" && res.basePrice === 250 && res.variants.length === 0;
  });

  // TEST 3: Dietary Marker Classification
  assertTest("TEST 3: Dietary Marker Classification", () => {
    const vegRes = detectDietaryType("Paneer Butter Masala", "Cottage cheese in rich gravy");
    const nonVegRes = detectDietaryType("Mutton Seekh Kebab", "Minced mutton grilled on skewers");
    const eggRes = detectDietaryType("Masala Omelette", "Double egg cooked with onions");
    return vegRes === "veg" && nonVegRes === "non_veg" && eggRes === "egg";
  });

  // TEST 4: Quality Score Calculation Engine
  assertTest("TEST 4: Quality Score Calculation Engine", () => {
    const dummyItems = [
      {
        id: "1",
        name: "Paneer Tikka",
        description: "",
        categoryName: "Starters",
        price: 200,
        rawPrice: "200",
        currency: "INR",
        dietary: "veg",
        prepTimeMinutes: 15,
        variants: [],
        addons: [],
        confidence: "high",
      },
      {
        id: "2",
        name: "Chicken Tikka",
        description: "",
        categoryName: "Starters",
        price: 300,
        rawPrice: "300",
        currency: "INR",
        dietary: "non_veg",
        prepTimeMinutes: 15,
        variants: [],
        addons: [],
        confidence: "high",
      },
    ];
    const quality = calculateMenuQualityScore(dummyItems, 1);
    return quality.score === 100 && quality.rating === "High";
  });

  console.log("==========================================");
  console.log(`RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log("==========================================");

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runEngineTests();
