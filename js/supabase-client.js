/**
 * RoadFix — Centralized Supabase Client Configuration
 * Initializes the official @supabase/supabase-js client with session persistence.
 * Exposes window.supabaseClient and connection state listeners.
 */

(function () {
  const config = window.ROADFIX_CONFIG || {};
  const supabaseUrl = config.SUPABASE_URL;
  const supabasePublishableKey = config.SUPABASE_PUBLISHABLE_KEY;

  let client = null;
  let connectionState = {
    connected: false,
    checkedAt: null,
    error: null,
    tablesFound: false
  };

  if (typeof window.supabase !== "undefined" && typeof window.supabase.createClient === "function") {
    try {
      if (supabaseUrl && supabasePublishableKey) {
        client = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        });
        console.log("RoadFix: Official Supabase Client initialized successfully.");
      } else {
        console.warn("RoadFix: Supabase URL or Publishable Key is missing in config.");
      }
    } catch (err) {
      console.error("RoadFix: Error creating Supabase client:", err);
      connectionState.error = err.message;
    }
  } else {
    console.warn("RoadFix: Supabase library not yet loaded on window.supabase.");
  }

  // Centralized export
  window.supabaseClient = client;

  // Connection check helper
  window.checkSupabaseConnection = async function () {
    if (!window.supabaseClient) {
      connectionState.connected = false;
      connectionState.error = "Supabase client not initialized";
      return connectionState;
    }

    try {
      // Test REST query against pothole_reports
      const { data, error, status } = await window.supabaseClient
        .from("pothole_reports")
        .select("id")
        .limit(1);

      connectionState.checkedAt = new Date().toISOString();

      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("schema cache") || status === 404) {
          // Connected to Supabase PostgREST, but tables are pending migration in SQL Editor!
          connectionState.connected = true;
          connectionState.tablesFound = false;
          connectionState.error = "Tables not found in PostgreSQL schema cache. Please execute supabase_schema.sql in the Supabase SQL Editor.";
        } else {
          connectionState.connected = false;
          connectionState.error = error.message;
        }
      } else {
        connectionState.connected = true;
        connectionState.tablesFound = true;
        connectionState.error = null;
      }
    } catch (e) {
      connectionState.connected = false;
      connectionState.error = e.message;
    }

    window.dispatchEvent(
      new CustomEvent("roadfix:supabaseConnectionChanged", { detail: connectionState })
    );
    return connectionState;
  };

  window.getSupabaseConnectionState = function () {
    return { ...connectionState };
  };
})();
