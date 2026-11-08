// Load .env.local if present in Node 20+
if (typeof (process as any).loadEnvFile === "function") {
  try {
    (process as any).loadEnvFile(".env.local");
  } catch {}
}

async function run() {
  const {
    ORBINOVA_MODULES,
    getDonorAppUrl,
    getImagingAppUrl,
    isDonorConfigured,
    isImagingConfigured,
  } = await import("../src/config/modules");

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
  }

  console.log("==================================================");
  console.log("RUNNING ORBINOVA EXTERNAL MODULE CONFIG TEST SUITE");
  console.log("==================================================");

  // 1. Structure integrity
  assert(Boolean(ORBINOVA_MODULES.donor), "ORBINOVA Donor module configuration exists");
  assert(Boolean(ORBINOVA_MODULES.imaging), "ORBINOVA Imaging module configuration exists");
  assert(ORBINOVA_MODULES.donor.id === "donor", "Donor ID is 'donor'");
  assert(ORBINOVA_MODULES.imaging.id === "imaging", "Imaging ID is 'imaging'");
  assert(ORBINOVA_MODULES.donor.envVar === "NEXT_PUBLIC_DONOR_APP_URL", "Donor envVar matches expected");
  assert(ORBINOVA_MODULES.imaging.envVar === "NEXT_PUBLIC_IMAGING_APP_URL", "Imaging envVar matches expected");

  // 2. Open in new tab behavior
  assert(typeof ORBINOVA_MODULES.donor.openInNewTab === "boolean", "Donor openInNewTab is boolean");
  assert(ORBINOVA_MODULES.imaging.openInNewTab === true, "Imaging opens in new tab");

  // 3. Helper functions & loaded values from .env.local
  const donorUrl = getDonorAppUrl();
  const imagingUrl = getImagingAppUrl();
  console.log(`Current Donor App URL: ${donorUrl || "UNCONFIGURED"}`);
  console.log(`Current Imaging App URL: ${imagingUrl || "UNCONFIGURED"}`);

  assert(isDonorConfigured() === true, "isDonorConfigured is true when configured");
  assert(isImagingConfigured() === true, "isImagingConfigured is true when configured");
  assert(Boolean(donorUrl), "Donor URL is defined");
  assert(Boolean(imagingUrl), "Imaging URL is defined");
  assert(!imagingUrl?.includes("/login/login"), "Imaging URL does not duplicate /login path");

  console.log("==================================================");
  console.log("ALL ORBINOVA MODULE CONFIG TESTS PASSED (100%)");
  console.log("==================================================");
}

run();
