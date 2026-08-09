import { runAuditCore } from "../src/lib/security-audit.server.ts";

console.log("\n🛡️  =======================================================");
console.log("   RASOI SaaS — AUTOMATED 30-TEST SECURITY AUDIT SUITE");
console.log("   Engineered by ADMARK DIGITALS (https://www.admarkdigitals.com/)");
console.log("=======================================================\n");

async function main() {
  try {
    const res = await runAuditCore({ runSecretScanner: true });
    if (!res || !res.ok) {
      console.error("❌ Audit Execution Failed:", res?.error || "Unknown Error");
      process.exit(1);
    }

    console.log(`\nAudit Timestamp: ${res.timestamp}`);
    console.log(`Total Assertions Evaluated: ${res.summary.total}`);
    console.log(`PASSED: ${res.summary.pass} | FAILED: ${res.summary.fail}\n`);

    for (const r of res.results) {
      const badge = r.status === "PASS" ? "✅ [PASS]" : "❌ [FAIL]";
      console.log(`${badge} #${r.id} [${r.category}] ${r.name}`);
      console.log(`   Expected: ${r.expected}`);
      console.log(`   Actual:   ${r.actual}`);
      console.log(`   Evidence: ${r.evidence}\n`);
    }

    if (res.summary.fail > 0) {
      console.error(
        `\n❌ SECURITY AUDIT FAILED WITH ${res.summary.fail} DEFECT(S)! Deployment blocked.`,
      );
      process.exit(1);
    } else {
      console.log(
        `\n🎉 ALL ${res.summary.total} SECURITY ASSERTIONS PASSED 100%! System is production secure.`,
      );
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Fatal Audit Error:", err);
    process.exit(1);
  }
}

main();
