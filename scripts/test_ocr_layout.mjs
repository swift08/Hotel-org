import { normalizeDishNameAndVariants } from "../src/lib/ocr/extractor.ts";

function runTests() {
  console.log("==========================================");
  console.log("RUNNING OCR LAYOUT & VARIANT PARSER ACCEPTANCE TESTS");
  console.log("==========================================");

  let passedCount = 0;
  let totalCount = 0;

  function assertTest(testName, inputLine, checkFn) {
    totalCount++;
    const res = normalizeDishNameAndVariants(inputLine);
    const passed = checkFn(res);
    if (passed) {
      passedCount++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      console.error(`   Input: "${inputLine}"`);
      console.error(`   Output:`, res);
    }
  }

  // TEST 1: Paneer Tikka 120 200 (Dual Price Column)
  assertTest("TEST 1: Dual Price Column (Paneer Tikka 120 200)", "Paneer Tikka 120 200", (res) => {
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

  // TEST 2: Paneer Tikka ₹120 ₹200 (Dual Price with Currency Symbols)
  assertTest("TEST 2: Dual Price Currency Symbols (Paneer Tikka ₹120 ₹200)", "Paneer Tikka ₹120 ₹200", (res) => {
    return (
      res.cleanName === "Paneer Tikka" &&
      res.variants.length === 2 &&
      res.variants[0].name === "Half" &&
      res.variants[0].price === 120 &&
      res.variants[1].name === "Full" &&
      res.variants[1].price === 200
    );
  });

  // TEST 3: Chicken 65 ₹250 (Preserve Brand Number)
  assertTest("TEST 3: Dish Brand Number Preservation (Chicken 65 ₹250)", "Chicken 65 ₹250", (res) => {
    return (
      res.cleanName === "Chicken 65" &&
      res.basePrice === 250 &&
      res.variants.length === 0
    );
  });

  // TEST 4: Dal Fry 200g ₹180 (Preserve Portion Weight Number)
  assertTest("TEST 4: Weight Number Preservation (Dal Fry 200g ₹180)", "Dal Fry 200g ₹180", (res) => {
    return (
      res.cleanName === "Dal Fry 200g" &&
      res.basePrice === 180 &&
      res.variants.length === 0
    );
  });

  // TEST 5: Triple Price Column (Quarter 90, Half 150, Full 280)
  assertTest("TEST 5: Triple Price Column (Mutton Kebab 90 150 280)", "Mutton Kebab 90 150 280", (res) => {
    return (
      res.cleanName === "Mutton Kebab" &&
      res.variants.length === 3 &&
      res.variants[0].name === "Quarter" &&
      res.variants[0].price === 90 &&
      res.variants[1].name === "Half" &&
      res.variants[1].price === 150 &&
      res.variants[2].name === "Full" &&
      res.variants[2].price === 280
    );
  });

  // TEST 6: Paneer Tikka 100 190 (Fix Screenshot Bug)
  assertTest("TEST 6: Screenshot Bug Fix (Paneer tikka 100 190)", "Paneer tikka 100 190", (res) => {
    return (
      res.cleanName === "Paneer tikka" &&
      res.variants.length === 2 &&
      res.variants[0].name === "Half" &&
      res.variants[0].price === 100 &&
      res.variants[1].name === "Full" &&
      res.variants[1].price === 190 &&
      res.basePrice === 190
    );
  });

  console.log("==========================================");
  console.log(`RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log("==========================================");

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runTests();
