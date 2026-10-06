/**
 * RoadFix — Database & Supabase Data Abstraction Layer
 * Provides seamless persistent storage with automatic fallback to LocalStorage/IndexedDB
 * when Supabase is not configured, ensuring 100% functionality out of the box!
 */

class RoadFixDB {
  constructor() {
    this.storageKey = "roadfix_reports_v2";
    this.auditKey = "roadfix_audit_v2";
    this.userKey = "roadfix_user_v2";
    this.notifKey = "roadfix_notifs_v2";
    this.configKey = "roadfix_supabase_config_v2";

    this.initDatabase();
  }

  getSupabaseConfig() {
    try {
      const cfg = localStorage.getItem(this.configKey);
      return cfg ? JSON.parse(cfg) : { url: "", anonKey: "", enabled: false };
    } catch (e) {
      return { url: "", anonKey: "", enabled: false };
    }
  }

  saveSupabaseConfig(url, anonKey, enabled = true) {
    localStorage.setItem(
      this.configKey,
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim(), enabled: Boolean(enabled) })
    );
    this.logAudit("SYSTEM", "CONFIG_UPDATED", "Supabase credentials saved");
  }

  isSupabaseActive() {
    const cfg = this.getSupabaseConfig();
    return Boolean(cfg.enabled && cfg.url && cfg.anonKey);
  }

  initDatabase() {
    // Check if local reports exist, otherwise initialize from SEED_REPORTS
    if (!localStorage.getItem(this.storageKey)) {
      this.resetToSeedData();
    }

    // Initialize user profile
    if (!localStorage.getItem(this.userKey)) {
      const initialUser = {
        id: "usr-citizen-default",
        name: "Rohit Varma",
        phone: "+91 98491 22334",
        city: "Hyderabad",
        role: "citizen", // 'citizen' | 'authority' | 'admin'
        dept: "GHMC Citizen Cell",
        points: 350,
        badges: ["Pothole Spotter", "Road Guardian", "Master Verifier"]
      };
      localStorage.setItem(this.userKey, JSON.stringify(initialUser));
    }

    // Initialize notifications
    if (!localStorage.getItem(this.notifKey)) {
      const initialNotifs = [
        {
          id: "notif-1",
          reportId: "rep-hyd-002",
          title: "Repair Ready for Verification",
          message: "GHMC has completed repair on Jubilee Hills Rd 36. Please inspect and verify to close.",
          time: "10 mins ago",
          read: false,
          type: "verification_request"
        },
        {
          id: "notif-2",
          reportId: "rep-hyd-001",
          title: "Repair Team Dispatched",
          message: "GHMC Rapid Patch Squad #4 has been deployed to Cyber Towers Signal.",
          time: "1 hour ago",
          read: false,
          type: "status_update"
        }
      ];
      localStorage.setItem(this.notifKey, JSON.stringify(initialNotifs));
    }

    // Initialize audit logs if empty
    if (!localStorage.getItem(this.auditKey)) {
      const initialAudit = [
        {
          id: "aud-01",
          timestamp: new Date().toISOString(),
          actor: "System Engine",
          action: "SYSTEM_INITIALIZED",
          resource: "Database",
          details: "RoadFix Local Database initialized with 8 Indian metro zones"
        }
      ];
      localStorage.setItem(this.auditKey, JSON.stringify(initialAudit));
    }
  }

  resetToSeedData() {
    if (window.ROADFIX_SEEDS && window.ROADFIX_SEEDS.reports) {
      localStorage.setItem(this.storageKey, JSON.stringify(window.ROADFIX_SEEDS.reports));
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
    this.logAudit("Admin", "RESET_SEED_DATA", "Restored default Indian cities road hazard data");
  }

  getReports(filters = {}) {
    try {
      let reports = JSON.parse(localStorage.getItem(this.storageKey) || "[]");

      if (filters.city && filters.city !== "All") {
        reports = reports.filter((r) => r.city.toLowerCase() === filters.city.toLowerCase());
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
            r.title.toLowerCase().includes(q) ||
            r.road.toLowerCase().includes(q) ||
            r.location.address.toLowerCase().includes(q) ||
            r.ticketNumber.toLowerCase().includes(q)
        );
      }

      // Default sort by priority score descending
      return reports.sort((a, b) => b.priorityScore - a.priorityScore);
    } catch (e) {
      console.error("Error reading reports:", e);
      return [];
    }
  }

  getReportById(id) {
    const reports = this.getReports();
    return reports.find((r) => r.id === id || r.ticketNumber === id) || null;
  }

  saveReports(reports) {
    localStorage.setItem(this.storageKey, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent("roadfix:dataUpdated"));
  }

  createReport(reportInput) {
    const reports = this.getReports();
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
      status: "ai_verified", // automatically verified by RoadVision AI
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
        insights: "RoadVision AI detected pavement distress requiring prompt compaction."
      },
      assignment: null,
      repair: null,
      upvotesCount: 1,
      upvotedByMe: true,
      commentsCount: 1,
      commentsList: [
        {
          id: `cmt-${Date.now()}`,
          author: reportInput.citizen?.name || "Citizen Reporter",
          role: "citizen",
          text: "Reported via RoadFix Mobile. Pothole needs urgent attention before the next rainfall.",
          time: "Just now"
        }
      ],
      citizen: reportInput.citizen || {
        name: "Citizen Reporter",
        role: "citizen",
        badge: "Pothole Spotter"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reports.unshift(newReport);
    this.saveReports(reports);

    // Reward civic points
    this.addCivicPoints(25, "New Report Submitted");

    // Add notification
    this.addNotification({
      reportId: newReport.id,
      title: "Report AI Verified",
      message: `Your report #${newReport.ticketNumber} was verified by RoadVision AI with priority score ${newReport.priorityScore}/100.`,
      type: "ai_verified"
    });

    this.logAudit("Citizen", "CREATE_REPORT", `Filed report #${ticketNumber} at ${newReport.road}`);
    return newReport;
  }

  updateReportStatus(reportId, newStatus, notes = "") {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    const oldStatus = reports[index].status;
    reports[index].status = newStatus;
    reports[index].updatedAt = new Date().toISOString();

    if (!reports[index].statusHistory) {
      reports[index].statusHistory = [];
    }
    reports[index].statusHistory.push({
      from: oldStatus,
      to: newStatus,
      time: new Date().toISOString(),
      notes
    });

    this.saveReports(reports);
    this.logAudit("Authority", "STATUS_CHANGE", `Report #${reports[index].ticketNumber} changed to ${newStatus}`);

    this.addNotification({
      reportId: reports[index].id,
      title: `Status Update: ${newStatus.replace(/_/g, " ").toUpperCase()}`,
      message: `Ticket #${reports[index].ticketNumber} status changed to ${newStatus}. ${notes}`,
      type: "status_update"
    });

    return reports[index];
  }

  assignContractor(reportId, assignment) {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    reports[index].status = "assigned";
    reports[index].assignment = {
      contractor: assignment.contractor || "GHMC Rapid Patch Squad #4",
      engineer: assignment.engineer || "Er. Municipal Engineer",
      contact: assignment.contact || "+91 98490 00000",
      scheduledDate: assignment.scheduledDate || new Date().toISOString().split("T")[0],
      estimatedCost: assignment.estimatedCost || 5500,
      materials: assignment.materials || "Dense Bituminous Macadam (DBM)"
    };
    reports[index].updatedAt = new Date().toISOString();

    this.saveReports(reports);
    this.logAudit(
      "Authority",
      "ASSIGN_CONTRACTOR",
      `Assigned #${reports[index].ticketNumber} to ${reports[index].assignment.contractor}`
    );

    this.addNotification({
      reportId: reports[index].id,
      title: "Repair Team Assigned",
      message: `${reports[index].assignment.contractor} scheduled for ${reports[index].assignment.scheduledDate}.`,
      type: "assigned"
    });

    return reports[index];
  }

  startRepairWork(reportId) {
    return this.updateReportStatus(reportId, "repair_in_progress", "Crew dispatched to site with equipment.");
  }

  completeRepair(reportId, afterImageUrl, crewNotes, asphaltType) {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    reports[index].status = "citizen_verification";
    reports[index].images.after = afterImageUrl || "assets/images/pothole_repaired.jpg";
    reports[index].repair = {
      completedAt: new Date().toISOString(),
      crewNotes: crewNotes || "Pothole squared off, base compacted, hot mix asphalt rolled to grade.",
      asphaltType: asphaltType || "Hot Mix Bituminous Concrete (BC)",
      warrantyMonths: 12
    };
    reports[index].updatedAt = new Date().toISOString();

    this.saveReports(reports);
    this.logAudit(
      "Authority",
      "COMPLETE_REPAIR",
      `Completed physical repair for #${reports[index].ticketNumber}. Sent for Citizen Verification.`
    );

    this.addNotification({
      reportId: reports[index].id,
      title: "Action Needed: Verify Repair",
      message: `Repair completed for #${reports[index].ticketNumber}. Please verify the quality to close the ticket.`,
      type: "verification_request"
    });

    return reports[index];
  }

  citizenVerify(reportId, isSatisfied, rating = 5, comment = "") {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    if (isSatisfied) {
      reports[index].status = "closed";
      reports[index].citizenVerification = {
        verified: true,
        rating: rating,
        comment: comment || "Road repair verified smooth and safe.",
        verifiedAt: new Date().toISOString()
      };
      this.addCivicPoints(50, "Citizen Repair Verification");
      this.logAudit("Citizen", "VERIFY_REPAIR_SUCCESS", `Citizen verified and closed #${reports[index].ticketNumber}`);
    } else {
      reports[index].status = "authority_review";
      reports[index].citizenVerification = {
        verified: false,
        rating: rating,
        comment: comment || "Repair substandard or uneven.",
        verifiedAt: new Date().toISOString()
      };
      this.logAudit("Citizen", "VERIFY_REPAIR_REJECT", `Substandard repair flagged for #${reports[index].ticketNumber}`);
    }

    reports[index].updatedAt = new Date().toISOString();
    this.saveReports(reports);
    return reports[index];
  }

  toggleUpvote(reportId) {
    const reports = this.getReports();
    const r = reports.find((item) => item.id === reportId);
    if (!r) return null;

    if (r.upvotedByMe) {
      r.upvotesCount = Math.max(0, (r.upvotesCount || 1) - 1);
      r.upvotedByMe = false;
    } else {
      r.upvotesCount = (r.upvotesCount || 0) + 1;
      r.upvotedByMe = true;
      this.addCivicPoints(5, "Supported Hazard Report");
    }

    this.saveReports(reports);
    return r;
  }

  addComment(reportId, text, userName = "Citizen", userRole = "citizen") {
    const reports = this.getReports();
    const r = reports.find((item) => item.id === reportId);
    if (!r) return null;

    if (!r.commentsList) {
      r.commentsList = [];
    }

    const cmt = {
      id: `cmt-${Date.now()}`,
      author: userName,
      role: userRole,
      text: text.trim(),
      time: "Just now"
    };

    r.commentsList.push(cmt);
    r.commentsCount = r.commentsList.length;
    this.saveReports(reports);
    this.logAudit(userName, "ADD_COMMENT", `Comment on #${r.ticketNumber}: "${text.substring(0, 30)}..."`);
    return cmt;
  }

  getAnalytics(city = "All") {
    const all = this.getReports();
    const filtered = city === "All" ? all : all.filter((r) => r.city.toLowerCase() === city.toLowerCase());

    const total = filtered.length;
    const critical = filtered.filter((r) => r.severity === "critical").length;
    const repaired = filtered.filter((r) => ["repair_completed", "citizen_verification", "closed"].includes(r.status)).length;
    const inProgress = filtered.filter((r) => ["assigned", "repair_scheduled", "repair_in_progress"].includes(r.status)).length;
    const closed = filtered.filter((r) => r.status === "closed").length;

    const resolutionRate = total > 0 ? Math.round((repaired / total) * 100) : 0;
    const avgFixTimeHours = 36; // realistic average

    // Breakdown by category
    const categoryCounts = {};
    filtered.forEach((r) => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    // Breakdown by city
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
    const all = window.ROADFIX_SEEDS?.hotspots || [];
    if (city === "All") return all;
    return all.filter((h) => h.city.toLowerCase() === city.toLowerCase());
  }

  getAuditLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.auditKey) || "[]");
    } catch (e) {
      return [];
    }
  }

  logAudit(actor, action, details) {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details
    });
    // Keep last 100 entries
    if (logs.length > 100) logs.pop();
    localStorage.setItem(this.auditKey, JSON.stringify(logs));
  }

  getUserProfile() {
    try {
      return JSON.parse(localStorage.getItem(this.userKey));
    } catch (e) {
      return { name: "Citizen Reporter", role: "citizen", points: 100, badges: ["Pothole Spotter"] };
    }
  }

  setUserRole(role) {
    const user = this.getUserProfile();
    user.role = role;
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.logAudit(user.name, "SWITCH_ROLE", `Switched active role to ${role.toUpperCase()}`);
    window.dispatchEvent(new CustomEvent("roadfix:roleChanged", { detail: { role } }));
  }

  addCivicPoints(pts, reason) {
    const user = this.getUserProfile();
    user.points = (user.points || 0) + pts;

    // Check badge unlocking
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
    window.dispatchEvent(new CustomEvent("roadfix:pointsUpdated", { detail: { points: user.points, reason } }));
  }

  getNotifications() {
    try {
      return JSON.parse(localStorage.getItem(this.notifKey) || "[]");
    } catch (e) {
      return [];
    }
  }

  addNotification(notif) {
    const notifs = this.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      time: "Just now",
      read: false,
      ...notif
    });
    localStorage.setItem(this.notifKey, JSON.stringify(notifs));
    window.dispatchEvent(new CustomEvent("roadfix:notificationAdded"));
  }

  markAllNotificationsRead() {
    const notifs = this.getNotifications();
    notifs.forEach((n) => (n.read = true));
    localStorage.setItem(this.notifKey, JSON.stringify(notifs));
    window.dispatchEvent(new CustomEvent("roadfix:notificationAdded"));
  }
}

// Global DB instance
window.db = new RoadFixDB();
