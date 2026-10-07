/**
 * RoadFix — Application Runtime Configuration
 * Loads environment variables and credentials in a centralized manner.
 * Never stores or exposes service-role keys.
 */

(function () {
  // Default values sourced from project environment configuration (.env)
  const DEFAULT_ENV = {
    SUPABASE_URL: "https://pnqgwxmgtptzygydttzr.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_Vk-Fz3sITT2fFNVqrVxigg_gEONLaJ5",
    APP_NAME: "RoadFix",
    ENVIRONMENT: "production",
    VERSION: "2.4.0"
  };

  // Allow runtime override via localStorage if configured via settings UI
  let savedConfig = {};
  try {
    const raw = localStorage.getItem("roadfix_supabase_config_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url) {
        savedConfig.SUPABASE_URL = parsed.url;
      }
      if (parsed && (parsed.anonKey || parsed.publishableKey)) {
        savedConfig.SUPABASE_PUBLISHABLE_KEY = parsed.anonKey || parsed.publishableKey;
      }
    }
  } catch (e) {
    console.warn("Could not read local config overrides:", e);
  }

  window.ROADFIX_CONFIG = Object.freeze({
    ...DEFAULT_ENV,
    ...savedConfig
  });
})();
