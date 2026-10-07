/**
 * RoadFix — Database & Supabase Primary Backend Abstraction Layer
 * Connects directly to Supabase PostgreSQL (PostgREST API + GoTrue Auth)
 * Performs real CREATE, READ, UPDATE, and DELETE operations.
 * Implements reactive caching for instant UI response and resilient fallbacks.
 */

class RoadFixDB {
  constructor() {
    this.storageKey = "roadfix_reports_v2";
    this.auditKey = "roadfix_audit_v2";
    this.userKey = "roadfix_user_v2";
    this.notifKey = "roadfix_notifs_v2";
    this.configKey = "roadfix_supabase_config_v2";

    // In-memory reactive caches
    this.reportsCache = [];
    this.hotspotsCache = [];
    this.notificationsCache = [];
    this.auditLogsCache = [];
    this.currentUser = null;

    // Status flags
    this.supabaseConnected = false;
    this.tablesReady = false;
    this.isSyncing = false;
    this.lastSyncError = null;

    this.initDatabase();
  }

  getSupabaseConfig() {
    const envConfig = window.ROADFIX_CONFIG || {};
    try {
      const stored = localStorage.getItem(this.configKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          url: parsed.url || envConfig.SUPABASE_URL || "",
          anonKey: parsed.anonKey || envConfig.SUPABASE_PUBLISHABLE_KEY || "",
          enabled: typeof parsed.enabled !== "undefined" ? parsed.enabled : true
        };
      }
    } catch (e) {
      console.warn("Could not read local Supabase config:", e);
    }

    return {
      url: envConfig.SUPABASE_URL || "https://pnqgwxmgtptzygydttzr.supabase.co",
      anonKey: envConfig.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Vk-Fz3sITT2fFNVqrVxigg_gEONLaJ5",
      enabled: true
    };
  }

  saveSupabaseConfig(url, anonKey, enabled = true) {
    localStorage.setItem(
      this.configKey,
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim(), enabled: Boolean(enabled) })
    );

    // Reinitialize Supabase client if available
    if (typeof window.supabase !== "undefined" && url && anonKey) {
      try {
        window.supabaseClient = window.supabase.createClient(url.trim(), anonKey.trim(), {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        });
      } catch (e) {
        console.error("Failed to reinitialize Supabase client:", e);
      }
    }

    this.logAudit("SYSTEM", "CONFIG_UPDATED", "Supabase credentials updated in settings");
    this.syncWithSupabase();
  }

  isSupabaseActive() {
    const cfg = this.getSupabaseConfig();
    return Boolean(cfg.enabled && cfg.url && cfg.anonKey && window.supabaseClient);
  }

  async initDatabase() {
    // 1. Initialize local cache from stored state or seed data for instant first-paint
    this.initLocalFallbackCache();

    // 2. Check current Supabase Auth session
    await this.initAuthSession();

    // 3. Connect to Supabase and sync data
    await this.syncWithSupabase();

    // 4. Setup Supabase Auth state listener
    this.setupAuthListener();
  }

  initLocalFallbackCache() {
    try {
      const storedReports = localStorage.getItem(this.storageKey);
      if (storedReports) {
        this.reportsCache = JSON.parse(storedReports);
      } else if (window.ROADFIX_SEEDS && window.ROADFIX_SEEDS.reports) {
        this.reportsCache = JSON.parse(JSON.stringify(window.ROADFIX_SEEDS.reports));
        localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
      }
    } catch (e) {
      this.reportsCache = (window.ROADFIX_SEEDS && window.ROADFIX_SEEDS.reports) || [];
    }

    try {
      this.notificationsCache = JSON.parse(localStorage.getItem(this.notifKey) || "[]");
    } catch (e) {
      this.notificationsCache = [];
    }

    try {
      this.auditLogsCache = JSON.parse(localStorage.getItem(this.auditKey) || "[]");
    } catch (e) {
      this.auditLogsCache = [];
    }

    if (window.ROADFIX_SEEDS && window.ROADFIX_SEEDS.hotspots) {
      this.hotspotsCache = [...window.ROADFIX_SEEDS.hotspots];
    }

    // Default user profile
    this.currentUser = this.getUserProfile();
  }

  // ==========================================================================
  // SUPABASE BACKEND SYNC & HEALTH CHECK
  // ==========================================================================

  async syncWithSupabase() {
    if (!this.isSupabaseActive()) {
      this.supabaseConnected = false;
      this.tablesReady = false;
      return;
    }

    this.isSyncing = true;
    try {
      // Test querying pothole_reports
      const { data, error, status } = await window.supabaseClient
        .from("pothole_reports")
        .select("*")
        .order("priority_score", { ascending: false });

      if (error) {
        if (error.code === "PGRST205" || status === 404 || error.message?.includes("schema cache")) {
          // Connected to Supabase PostgREST, but tables are pending creation via supabase_schema.sql
          this.supabaseConnected = true;
          this.tablesReady = false;
          this.lastSyncError = "Tables not yet detected in PostgreSQL schema. Run supabase_schema.sql in the Supabase SQL Editor.";
          console.warn("RoadFix: Supabase connected, but PostgreSQL tables need to be created. See supabase_schema.sql.");
        } else {
          this.supabaseConnected = false;
          this.tablesReady = false;
          this.lastSyncError = error.message;
          console.error("RoadFix: Supabase sync error:", error);
        }
      } else {
        // Tables exist and query succeeded!
        this.supabaseConnected = true;
        this.tablesReady = true;
        this.lastSyncError = null;

        if (Array.isArray(data) && data.length > 0) {
          // Normalize records from Supabase to frontend model
          this.reportsCache = data.map((r) => this.normalizeSupabaseReport(r));
          localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
        } else if (Array.isArray(data) && data.length === 0) {
          // Connected table is empty — automatically populate with initial seed reports!
          await this.seedSupabaseReports();
        }

        // Fetch hotspots from Supabase
        await this.fetchHotspotsFromSupabase();

        // Fetch notifications from Supabase
        await this.fetchNotificationsFromSupabase();

        // Fetch audit logs from Supabase
        await this.fetchAuditLogsFromSupabase();

        console.log(`RoadFix: Connected to Supabase! Loaded ${this.reportsCache.length} live reports.`);
      }
    } catch (err) {
      this.supabaseConnected = false;
      this.tablesReady = false;
      this.lastSyncError = err.message;
      console.error("RoadFix: Unexpected connection error:", err);
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(
        new CustomEvent("roadfix:supabaseConnectionChanged", {
          detail: {
            connected: this.supabaseConnected,
            tablesReady: this.tablesReady,
            error: this.lastSyncError,
            reportCount: this.reportsCache.length
          }
        })
      );
      window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    }
  }

  // Converts database column names to camelCase if needed
  normalizeSupabaseReport(dbRecord) {
    if (!dbRecord) return null;
    return {
      id: dbRecord.id,
      ticketNumber: dbRecord.ticket_number || dbRecord.ticketNumber,
      city: dbRecord.city || "Hyderabad",
      road: dbRecord.road || "Main Road",
      title: dbRecord.title || "Road Surface Damage",
      description: dbRecord.description || "",
      category: dbRecord.category || "pothole",
      severity: dbRecord.severity || "medium",
      status: dbRecord.status || "reported",
      priorityScore: dbRecord.priority_score ?? dbRecord.priorityScore ?? 50,
      slaHours: dbRecord.sla_hours ?? dbRecord.slaHours ?? 48,
      upvotesCount: dbRecord.upvotes_count ?? dbRecord.upvotesCount ?? 0,
      upvotedByMe: false,
      commentsCount: dbRecord.comments_count ?? dbRecord.commentsCount ?? 0,
      isHotspot: Boolean(dbRecord.is_hotspot ?? dbRecord.isHotspot),
      location: dbRecord.location || {
        lat: 17.4485,
        lng: 78.3772,
        address: "Indian Metro City",
        landmark: "Nearby Junction",
        ward: "Ward 1"
      },
      images: dbRecord.images || {
        before: "assets/images/pothole_crater.jpg",
        after: null
      },
      aiAnalysis: dbRecord.ai_analysis || dbRecord.aiAnalysis || {
        detected: true,
        confidence: 94.0,
        depthCm: 12,
        diameterCm: 50,
        hazardLevel: "High Risk",
        insights: "Road hazard verified."
      },
      assignment: dbRecord.assignment || null,
      repair: dbRecord.repair || null,
      citizenVerification: dbRecord.citizen_verification || dbRecord.citizenVerification || null,
      citizen: dbRecord.citizen || {
        name: "Citizen Reporter",
        role: "citizen",
        badge: "Pothole Spotter"
      },
      statusHistory: dbRecord.status_history || dbRecord.statusHistory || [],
      createdAt: dbRecord.created_at || dbRecord.createdAt || new Date().toISOString(),
      updatedAt: dbRecord.updated_at || dbRecord.updatedAt || new Date().toISOString()
    };
  }

  // Prepares report for inserting/updating into Supabase
  toSupabaseReportPayload(rep) {
    return {
      ticket_number: rep.ticketNumber,
      city: rep.city,
      road: rep.road,
      title: rep.title,
      description: rep.description,
      category: rep.category,
      severity: rep.severity,
      status: rep.status,
      priority_score: rep.priorityScore,
      sla_hours: rep.slaHours,
      upvotes_count: rep.upvotesCount || 0,
      comments_count: rep.commentsCount || 0,
      is_hotspot: Boolean(rep.isHotspot),
      location: rep.location,
      images: rep.images,
      ai_analysis: rep.aiAnalysis,
      assignment: rep.assignment,
      repair: rep.repair,
      citizen_verification: rep.citizenVerification,
      citizen: rep.citizen,
      status_history: rep.statusHistory || [],
      updated_at: new Date().toISOString()
    };
  }

  async seedSupabaseReports() {
    if (!this.tablesReady || !window.supabaseClient) return;
    try {
      const seedList = window.ROADFIX_SEEDS?.reports || [];
      if (seedList.length === 0) return;

      const payloads = seedList.map((r) => this.toSupabaseReportPayload(r));
      const { data, error } = await window.supabaseClient
        .from("pothole_reports")
        .insert(payloads)
        .select();

      if (!error && Array.isArray(data)) {
        this.reportsCache = data.map((r) => this.normalizeSupabaseReport(r));
        localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
        console.log(`RoadFix: Successfully seeded ${data.length} reports into Supabase.`);
      }
    } catch (e) {
      console.warn("Could not auto-seed Supabase reports:", e);
    }
  }

  async fetchHotspotsFromSupabase() {
    if (!this.tablesReady || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from("hotspots").select("*");
      if (!error && Array.isArray(data) && data.length > 0) {
        this.hotspotsCache = data.map((h) => ({
          id: h.id,
          city: h.city,
          zoneName: h.zone_name,
          center: [h.center_lat, h.center_lng],
          radius: h.radius_meters,
          activePotholes: h.active_potholes_count,
          riskLevel: h.risk_level,
          roadType: h.road_type
        }));
      }
    } catch (e) {
      console.warn("Could not fetch hotspots from Supabase:", e);
    }
  }

  async fetchNotificationsFromSupabase() {
    if (!this.tablesReady || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data) && data.length > 0) {
        this.notificationsCache = data.map((n) => ({
          id: n.id,
          reportId: n.report_id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: Boolean(n.is_read),
          time: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }));
      }
    } catch (e) {
      console.warn("Could not fetch notifications from Supabase:", e);
    }
  }

  async fetchAuditLogsFromSupabase() {
    if (!this.tablesReady || !window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data) && data.length > 0) {
        this.auditLogsCache = data.map((a) => ({
          id: a.id,
          actor: a.actor,
          action: a.action,
          details: a.details,
          timestamp: a.created_at
        }));
      }
    } catch (e) {
      console.warn("Could not fetch audit logs from Supabase:", e);
    }
  }

  // ==========================================================================
  // REAL CRUD OPERATIONS (SUPABASE PRIMARY)
  // ==========================================================================

  // READ: Get all reports with optional filters
  getReports(filters = {}) {
    let reports = [...this.reportsCache];

    if (filters.city && filters.city !== "All") {
      reports = reports.filter((r) => r.city && r.city.toLowerCase() === filters.city.toLowerCase());
    }
    if (filters.status && filters.status !== "all") {
      if (filters.status === "pending") {
        reports = reports.filter((r) => !["closed", "rejected"].includes(r.status));
      } else {
        reports = reports.filter((r) => r.status === filters.status);
      }
    }
    if (filters.severity && filters.severity !== "all") {
      reports = reports.filter((r) => r.severity === filters.severity);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      reports = reports.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.road && r.road.toLowerCase().includes(q)) ||
          (r.location?.address && r.location.address.toLowerCase().includes(q)) ||
          (r.ticketNumber && r.ticketNumber.toLowerCase().includes(q))
      );
    }

    return reports.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  // READ: Single report by ID or Ticket Number
  getReportById(id) {
    return this.reportsCache.find((r) => r.id === id || r.ticketNumber === id) || null;
  }

  // CREATE: Insert new pothole report into Supabase
  async createReport(reportInput) {
    const cityCode = (reportInput.city || "IND").substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const ticketNumber = `RF-${cityCode}-${year}-${randomNum}`;

    const newReport = {
      id: `rep-${Date.now()}`,
      ticketNumber,
      city: reportInput.city || "Hyderabad",
      title: reportInput.title,
      description: reportInput.description,
      category: reportInput.category || "pothole",
      severity: reportInput.severity || "medium",
      status: "ai_verified",
      priorityScore: reportInput.priorityScore || 70,
      slaHours: reportInput.slaHours || 48,
      road: reportInput.road || "Main Arterial Road",
      location: reportInput.location,
      images: {
        before: reportInput.imageBefore || "assets/images/pothole_crater.jpg",
        after: null
      },
      aiAnalysis: reportInput.aiAnalysis || {
        detected: true,
        confidence: 94.2,
        depthCm: 12,
        diameterCm: 50,
        hazardLevel: "High Risk",
        boundingBox: { ymin: 45, xmin: 25, ymax: 80, xmax: 65 },
        duplicateRisk: 0.0,
        insights: "RoadVision AI detected pavement distress."
      },
      assignment: null,
      repair: null,
      citizenVerification: null,
      upvotesCount: 1,
      upvotedByMe: true,
      commentsCount: 1,
      citizen: reportInput.citizen || {
        name: this.currentUser?.name || "Citizen Reporter",
        role: this.currentUser?.role || "citizen",
        badge: "Pothole Spotter"
      },
      statusHistory: [
        {
          from: null,
          to: "ai_verified",
          time: new Date().toISOString(),
          notes: "Report filed and AI verified."
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Supabase Primary Insert
    if (this.tablesReady && window.supabaseClient) {
      try {
        const payload = this.toSupabaseReportPayload(newReport);
        // Link authenticated Supabase user ID if available
        const session = await this.getCurrentSession();
        if (session && session.user) {
          payload.citizen_id = session.user.id;
        }

        const { data, error } = await window.supabaseClient
          .from("pothole_reports")
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error("Supabase createReport error:", error);
        } else if (data) {
          // Adopt server-generated UUID
          newReport.id = data.id;
        }
      } catch (e) {
        console.error("Failed to insert report into Supabase:", e);
      }
    }

    // 2. Update reactive cache
    this.reportsCache.unshift(newReport);
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));

    // 3. Rewards & Notifications
    this.addCivicPoints(25, "New Report Submitted");
    await this.addNotification({
      reportId: newReport.id,
      title: "Report AI Verified",
      message: `Your report #${newReport.ticketNumber} was verified by RoadVision AI with priority score ${newReport.priorityScore}/100.`,
      type: "ai_verified"
    });

    await this.logAudit("Citizen", "CREATE_REPORT", `Filed report #${ticketNumber} at ${newReport.road}`);
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return newReport;
  }

  // UPDATE: Status update
  async updateReportStatus(reportId, newStatus, notes = "") {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    const oldStatus = rep.status;
    rep.status = newStatus;
    rep.updatedAt = new Date().toISOString();

    if (!rep.statusHistory) rep.statusHistory = [];
    rep.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      time: new Date().toISOString(),
      notes
    });

    // 1. Supabase Primary Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            status: newStatus,
            status_history: rep.statusHistory,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase updateReportStatus error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    await this.logAudit("Authority", "STATUS_CHANGE", `Report #${rep.ticketNumber} changed to ${newStatus}`);

    await this.addNotification({
      reportId: rep.id,
      title: `Status: ${newStatus.replace(/_/g, " ").toUpperCase()}`,
      message: `Ticket #${rep.ticketNumber} is now ${newStatus}. ${notes}`,
      type: "status_update"
    });

    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return rep;
  }

  // UPDATE: Assign Contractor Crew
  async assignContractor(reportId, assignment) {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    rep.status = "assigned";
    rep.assignment = {
      contractor: assignment.contractor || "GHMC Rapid Patch Squad #4",
      engineer: assignment.engineer || "Er. Municipal Engineer",
      contact: assignment.contact || "+91 98490 00000",
      scheduledDate: assignment.scheduledDate || new Date().toISOString().split("T")[0],
      estimatedCost: assignment.estimatedCost || 5500,
      materials: assignment.materials || "Dense Bituminous Macadam (DBM)"
    };
    rep.updatedAt = new Date().toISOString();

    // 1. Supabase Primary Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            status: "assigned",
            assignment: rep.assignment,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase assignContractor error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    await this.logAudit("Authority", "ASSIGN_CONTRACTOR", `Assigned #${rep.ticketNumber} to ${rep.assignment.contractor}`);

    await this.addNotification({
      reportId: rep.id,
      title: "Repair Crew Dispatched",
      message: `${rep.assignment.contractor} scheduled for ${rep.assignment.scheduledDate}.`,
      type: "assigned"
    });

    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return rep;
  }

  // UPDATE: Start physical repair
  async startRepairWork(reportId) {
    return await this.updateReportStatus(reportId, "repair_in_progress", "Crew dispatched to site with equipment.");
  }

  // UPDATE: Complete physical repair
  async completeRepair(reportId, afterImageUrl, crewNotes, asphaltType) {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    rep.status = "citizen_verification";
    rep.images.after = afterImageUrl || "assets/images/pothole_repaired.jpg";
    rep.repair = {
      completedAt: new Date().toISOString(),
      crewNotes: crewNotes || "Pothole squared off, base compacted, hot mix asphalt rolled to grade.",
      asphaltType: asphaltType || "Hot Mix Bituminous Concrete (BC)",
      warrantyMonths: 12
    };
    rep.updatedAt = new Date().toISOString();

    // 1. Supabase Primary Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            status: "citizen_verification",
            images: rep.images,
            repair: rep.repair,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase completeRepair error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    await this.logAudit("Authority", "COMPLETE_REPAIR", `Completed physical repair for #${rep.ticketNumber}. Sent for Citizen Verification.`);

    await this.addNotification({
      reportId: rep.id,
      title: "Action Needed: Verify Repair",
      message: `Repair completed for #${rep.ticketNumber}. Please verify quality to close the ticket.`,
      type: "verification_request"
    });

    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return rep;
  }

  // UPDATE: Citizen Verification
  async citizenVerify(reportId, isSatisfied, rating = 5, comment = "") {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    if (isSatisfied) {
      rep.status = "closed";
      rep.citizenVerification = {
        verified: true,
        rating: rating,
        comment: comment || "Road repair verified smooth and safe.",
        verifiedAt: new Date().toISOString()
      };
      this.addCivicPoints(50, "Citizen Repair Verification");
      await this.logAudit("Citizen", "VERIFY_REPAIR_SUCCESS", `Citizen verified and closed #${rep.ticketNumber}`);
    } else {
      rep.status = "authority_review";
      rep.citizenVerification = {
        verified: false,
        rating: rating,
        comment: comment || "Repair substandard or uneven.",
        verifiedAt: new Date().toISOString()
      };
      await this.logAudit("Citizen", "VERIFY_REPAIR_REJECT", `Substandard repair flagged for #${rep.ticketNumber}`);
    }

    rep.updatedAt = new Date().toISOString();

    // 1. Supabase Primary Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            status: rep.status,
            citizen_verification: rep.citizenVerification,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase citizenVerify error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return rep;
  }

  // UPDATE: Upvote / Support
  async toggleUpvote(reportId) {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    if (rep.upvotedByMe) {
      rep.upvotesCount = Math.max(0, (rep.upvotesCount || 1) - 1);
      rep.upvotedByMe = false;
    } else {
      rep.upvotesCount = (rep.upvotesCount || 0) + 1;
      rep.upvotedByMe = true;
      this.addCivicPoints(5, "Supported Hazard Report");
    }

    rep.updatedAt = new Date().toISOString();

    // 1. Supabase Primary Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            upvotes_count: rep.upvotesCount,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase toggleUpvote error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return rep;
  }

  // CREATE: Comment
  async addComment(reportId, text, userName = "Citizen", userRole = "citizen") {
    const rep = this.getReportById(reportId);
    if (!rep) return null;

    if (!rep.commentsList) rep.commentsList = [];

    const cmt = {
      id: `cmt-${Date.now()}`,
      author: userName,
      role: userRole,
      text: text.trim(),
      time: "Just now"
    };

    rep.commentsList.push(cmt);
    rep.commentsCount = rep.commentsList.length;
    rep.updatedAt = new Date().toISOString();

    // 1. Supabase Primary Insert / Update
    if (this.tablesReady && window.supabaseClient) {
      try {
        // Insert into comments table
        await window.supabaseClient.from("comments").insert([
          {
            report_id: rep.id,
            user_name: userName,
            user_role: userRole,
            content: text.trim()
          }
        ]);

        // Update count on report
        await window.supabaseClient
          .from("pothole_reports")
          .update({
            comments_count: rep.commentsCount,
            updated_at: new Date().toISOString()
          })
          .eq("id", rep.id);
      } catch (e) {
        console.error("Supabase addComment error:", e);
      }
    }

    // 2. Cache & Persistence
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));
    await this.logAudit(userName, "ADD_COMMENT", `Comment on #${rep.ticketNumber}: "${text.substring(0, 30)}..."`);
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return cmt;
  }

  // DELETE: Remove report from Supabase (Destructive Operation)
  async deleteReport(reportId) {
    const index = this.reportsCache.findIndex((r) => r.id === reportId || r.ticketNumber === reportId);
    if (index === -1) return false;

    const targetReport = this.reportsCache[index];

    // 1. Supabase Primary Delete
    if (this.tablesReady && window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from("pothole_reports")
          .delete()
          .eq("id", targetReport.id);

        if (error) {
          console.error("Supabase deleteReport error:", error);
          throw new Error(error.message);
        }
      } catch (e) {
        console.error("Failed to delete report from Supabase:", e);
        throw e;
      }
    }

    // 2. Remove from local cache
    this.reportsCache.splice(index, 1);
    localStorage.setItem(this.storageKey, JSON.stringify(this.reportsCache));

    await this.logAudit("Admin", "DELETE_REPORT", `Deleted report #${targetReport.ticketNumber}`);
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
    return true;
  }

  // ==========================================================================
  // SUPABASE AUTHENTICATION
  // ==========================================================================

  async initAuthSession() {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.auth.getSession();
      if (!error && data?.session?.user) {
        this.currentUser = {
          id: data.session.user.id,
          email: data.session.user.email,
          name: data.session.user.user_metadata?.full_name || data.session.user.email.split("@")[0],
          role: data.session.user.user_metadata?.role || "citizen",
          city: data.session.user.user_metadata?.city || "Hyderabad",
          points: 150,
          badges: ["Pothole Spotter"],
          isAuthenticated: true
        };
        localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
      }
    } catch (e) {
      console.warn("Could not retrieve Supabase Auth session:", e);
    }
  }

  setupAuthListener() {
    if (!window.supabaseClient) return;
    try {
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("RoadFix Auth state changed:", event);
        if (event === "SIGNED_IN" && session?.user) {
          this.currentUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email.split("@")[0],
            role: session.user.user_metadata?.role || "citizen",
            city: session.user.user_metadata?.city || "Hyderabad",
            points: 150,
            badges: ["Pothole Spotter"],
            isAuthenticated: true
          };
          localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
          window.dispatchEvent(new CustomEvent("roadfix:authChanged", { detail: this.currentUser }));
        } else if (event === "SIGNED_OUT") {
          this.currentUser = {
            id: "usr-guest-default",
            name: "Rohit Varma",
            role: "citizen",
            city: "Hyderabad",
            points: 350,
            badges: ["Pothole Spotter", "Road Guardian"],
            isAuthenticated: false
          };
          localStorage.setItem(this.userKey, JSON.stringify(this.currentUser));
          window.dispatchEvent(new CustomEvent("roadfix:authChanged", { detail: this.currentUser }));
        }
      });
    } catch (e) {
      console.warn("Could not setup Auth state listener:", e);
    }
  }

  async signUp(email, password, fullName = "Citizen Reporter", role = "citizen", city = "Hyderabad") {
    if (!window.supabaseClient) throw new Error("Supabase client is not available.");
    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          city: city
        }
      }
    });

    if (error) throw error;
    await this.logAudit(fullName, "USER_SIGNUP", `Signed up with email ${email}`);
    return data;
  }

  async signIn(email, password) {
    if (!window.supabaseClient) throw new Error("Supabase client is not available.");
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    await this.logAudit(data.user?.email || "User", "USER_LOGIN", "Logged into Supabase account");
    return data;
  }

  async signOut() {
    if (!window.supabaseClient) return;
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    await this.logAudit("User", "USER_LOGOUT", "Signed out of session");
  }

  async getCurrentSession() {
    if (!window.supabaseClient) return null;
    const { data } = await window.supabaseClient.auth.getSession();
    return data?.session || null;
  }

  // ==========================================================================
  // ANALYTICS, HOTSPOTS, AUDIT & NOTIFICATIONS
  // ==========================================================================

  getAnalytics(city = "All") {
    const all = this.getReports();
    const filtered = city === "All" ? all : all.filter((r) => r.city && r.city.toLowerCase() === city.toLowerCase());

    const total = filtered.length;
    const critical = filtered.filter((r) => r.severity === "critical").length;
    const repaired = filtered.filter((r) => ["repair_completed", "citizen_verification", "closed"].includes(r.status)).length;
    const inProgress = filtered.filter((r) => ["assigned", "repair_scheduled", "repair_in_progress"].includes(r.status)).length;
    const closed = filtered.filter((r) => r.status === "closed").length;

    const resolutionRate = total > 0 ? Math.round((repaired / total) * 100) : 0;
    const avgFixTimeHours = 36;

    const categoryCounts = {};
    filtered.forEach((r) => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    const cityCounts = {};
    all.forEach((r) => {
      cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
    });

    return {
      total,
      critical,
      repaired,
      inProgress,
      closed,
      resolutionRate,
      avgFixTimeHours,
      categoryCounts,
      cityCounts
    };
  }

  getHotspots(city = "All") {
    const all = this.hotspotsCache;
    if (city === "All") return all;
    return all.filter((h) => h.city && h.city.toLowerCase() === city.toLowerCase());
  }

  getAuditLogs() {
    return this.auditLogsCache;
  }

  async logAudit(actor, action, details) {
    const logItem = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details
    };

    this.auditLogsCache.unshift(logItem);
    if (this.auditLogsCache.length > 100) this.auditLogsCache.pop();
    localStorage.setItem(this.auditKey, JSON.stringify(this.auditLogsCache));

    // Supabase insert if ready
    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient.from("audit_logs").insert([
          {
            actor,
            action,
            details
          }
        ]);
      } catch (e) {
        // silent fallback
      }
    }
  }

  getUserProfile() {
    try {
      const stored = localStorage.getItem(this.userKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    return {
      id: "usr-citizen-default",
      name: "Rohit Varma",
      role: "citizen",
      city: "Hyderabad",
      points: 350,
      badges: ["Pothole Spotter", "Road Guardian"]
    };
  }

  setUserRole(role) {
    const user = this.getUserProfile();
    user.role = role;
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser = user;
    this.logAudit(user.name, "SWITCH_ROLE", `Switched active role to ${role.toUpperCase()}`);
    window.dispatchEvent(new CustomEvent("roadfix:roleChanged", { detail: { role } }));
  }

  addCivicPoints(pts, reason) {
    const user = this.getUserProfile();
    user.points = (user.points || 0) + pts;

    if (user.points >= 200 && !user.badges.includes("Road Guardian")) {
      user.badges.push("Road Guardian");
      this.addNotification({
        title: "New Badge Unlocked!",
        message: "Congratulations! You earned the 'Road Guardian' badge for 200+ civic points.",
        type: "badge"
      });
    }
    if (user.points >= 400 && !user.badges.includes("Civic Champion")) {
      user.badges.push("Civic Champion");
      this.addNotification({
        title: "New Badge Unlocked!",
        message: "You are now a 'Civic Champion' for championing safer Indian roads!",
        type: "badge"
      });
    }

    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser = user;
    window.dispatchEvent(new CustomEvent("roadfix:pointsUpdated", { detail: { points: user.points, reason } }));
  }

  getNotifications() {
    return this.notificationsCache;
  }

  async addNotification(notif) {
    const item = {
      id: `notif-${Date.now()}`,
      time: "Just now",
      read: false,
      ...notif
    };

    this.notificationsCache.unshift(item);
    localStorage.setItem(this.notifKey, JSON.stringify(this.notificationsCache));

    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient.from("notifications").insert([
          {
            title: notif.title,
            message: notif.message,
            type: notif.type || "status_update",
            is_read: false
          }
        ]);
      } catch (e) {
        // silent fallback
      }
    }

    window.dispatchEvent(new CustomEvent("roadfix:notificationAdded"));
  }

  async markAllNotificationsRead() {
    this.notificationsCache.forEach((n) => (n.read = true));
    localStorage.setItem(this.notifKey, JSON.stringify(this.notificationsCache));

    if (this.tablesReady && window.supabaseClient) {
      try {
        await window.supabaseClient
          .from("notifications")
          .update({ is_read: true })
          .eq("is_read", false);
      } catch (e) {
        // silent fallback
      }
    }

    window.dispatchEvent(new CustomEvent("roadfix:notificationAdded"));
  }
}

// Global DB instance
window.db = new RoadFixDB();
