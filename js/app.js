/**
 * RoadFix — Main Application Controller
 * Handles mobile navigation, view rendering, role switching, reporting flow,
 * lifecycle state mutations, and interactive modal dialogs.
 */

class RoadFixApp {
  constructor() {
    this.activeTab = "home";
    this.activeReportId = null;
    this.capturedImageBase64 = null;
    this.selectedCategory = "pothole";
  }

  init() {
    this.setupEventListeners();
    this.updateRoleUI();
    this.renderActiveView();
    this.updateNotificationBadge();
    this.initCitySelector();

    // Check GPS and nearby hazards
    window.locationService.getCurrentLocation().then(() => {
      this.updateLocationDisplays();
    });

    console.log("RoadFix App initialized successfully.");
  }

  setupEventListeners() {
    // Bottom Navigation
    document.querySelectorAll(".bottom-nav-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = btn.getAttribute("data-tab");
        if (tab) this.switchTab(tab);
      });
    });

    // Role switcher pills
    document.querySelectorAll(".role-pill-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const role = btn.getAttribute("data-role");
        if (role) {
          window.db.setUserRole(role);
          this.updateRoleUI();
          this.renderActiveView();
        }
      });
    });

    // Language dropdown
    const langSelect = document.getElementById("lang-select");
    if (langSelect) {
      langSelect.addEventListener("change", (e) => {
        window.i18n.setLanguage(e.target.value);
        this.renderActiveView();
      });
    }

    // City Selector
    const citySelect = document.getElementById("header-city-select");
    if (citySelect) {
      citySelect.addEventListener("change", (e) => {
        window.locationService.setCity(e.target.value);
        this.renderActiveView();
      });
    }

    // Notification bell
    const notifBtn = document.getElementById("notif-toggle-btn");
    if (notifBtn) {
      notifBtn.addEventListener("click", () => this.toggleNotificationsModal());
    }

    // Interactive Demo Tour button
    const tourBtn = document.getElementById("btn-launch-demo-tour");
    if (tourBtn) {
      tourBtn.addEventListener("click", () => window.demoTour.startTour());
    }

    // Hero action buttons
    const heroReportBtn = document.getElementById("hero-report-btn");
    if (heroReportBtn) {
      heroReportBtn.addEventListener("click", () => this.switchTab("report"));
    }
    const heroMapBtn = document.getElementById("hero-map-btn");
    if (heroMapBtn) {
      heroMapBtn.addEventListener("click", () => this.switchTab("map"));
    }

    // Category selection pills in report form
    document.querySelectorAll(".category-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".category-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedCategory = pill.getAttribute("data-category");
      });
    });

    // Photo input in report form
    const photoInput = document.getElementById("report-photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", (e) => this.handlePhotoUpload(e));
    }

    // Submit Report Form
    const reportForm = document.getElementById("pothole-report-form");
    if (reportForm) {
      reportForm.addEventListener("submit", (e) => this.handleReportSubmit(e));
    }

    // Quick demo photo buttons in report form
    document.querySelectorAll(".sample-photo-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const src = btn.getAttribute("data-src");
        const cat = btn.getAttribute("data-category");
        this.loadSamplePhoto(src, cat);
      });
    });

    // Supabase Settings modal toggle
    const dbSettingsBtn = document.getElementById("btn-open-db-settings");
    if (dbSettingsBtn) {
      dbSettingsBtn.addEventListener("click", () => this.openSupabaseSettingsModal());
    }

    // Listen to global events
    window.addEventListener("roadfix:dataUpdated", () => this.renderActiveView());
    window.addEventListener("roadfix:notificationAdded", () => this.updateNotificationBadge());
    window.addEventListener("roadfix:pointsUpdated", (e) => this.showPointsToast(e.detail.points, e.detail.reason));
  }

  initCitySelector() {
    const citySelect = document.getElementById("header-city-select");
    if (!citySelect) return;

    citySelect.innerHTML = "";
    Object.keys(window.ROADFIX_SEEDS.cities).forEach((key) => {
      const city = window.ROADFIX_SEEDS.cities[key];
      const opt = document.createElement("option");
      opt.value = city.name;
      opt.textContent = `${city.name} (${city.state})`;
      if (city.name.toLowerCase() === window.locationService.currentCity.toLowerCase()) {
        opt.selected = true;
      }
      citySelect.appendChild(opt);
    });
  }

  updateLocationDisplays() {
    const locText = document.getElementById("current-loc-display");
    if (locText) {
      locText.textContent = window.locationService.currentAddress;
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update bottom nav bar active states
    document.querySelectorAll(".bottom-nav-item").forEach((btn) => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Hide all view containers, show active
    document.querySelectorAll(".view-container").forEach((vc) => {
      if (vc.id === `view-${tabName}`) {
        vc.classList.remove("hidden");
      } else {
        vc.classList.add("hidden");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    this.renderActiveView();

    // Trigger map resize if switching to map
    if (tabName === "map") {
      setTimeout(() => {
        window.mapService.initMap("map-container");
      }, 100);
    }
  }

  updateRoleUI() {
    const user = window.db.getUserProfile();
    const rolePills = document.querySelectorAll(".role-pill-btn");
    rolePills.forEach((btn) => {
      if (btn.getAttribute("data-role") === user.role) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Show/hide role-specific bottom nav item if authority/admin
    const authNav = document.getElementById("nav-authority");
    const adminNav = document.getElementById("nav-admin");
    if (authNav) authNav.classList.toggle("hidden", user.role !== "authority");
    if (adminNav) adminNav.classList.toggle("hidden", user.role !== "admin");
  }

  renderActiveView() {
    switch (this.activeTab) {
      case "home":
        this.renderHomeView();
        break;
      case "map":
        window.mapService.initMap("map-container");
        break;
      case "report":
        this.updateReportFormLocation();
        break;
      case "myreports":
        this.renderMyReportsView();
        break;
      case "profile":
        this.renderProfileView();
        break;
      case "authority":
        this.renderAuthorityView();
        break;
      case "admin":
        this.renderAdminView();
        break;
    }
    window.i18n.applyTranslations();
  }

  renderHomeView() {
    const city = window.locationService.currentCity;
    const analytics = window.db.getAnalytics(city);

    // Update KPI counters
    const totalEl = document.getElementById("home-stat-total");
    const critEl = document.getElementById("home-stat-critical");
    const repEl = document.getElementById("home-stat-repaired");
    const timeEl = document.getElementById("home-stat-time");

    if (totalEl) totalEl.textContent = analytics.total;
    if (critEl) critEl.textContent = analytics.critical;
    if (repEl) repEl.textContent = analytics.repaired;
    if (timeEl) timeEl.textContent = `${analytics.avgFixTimeHours}h`;

    // Render Recent Reports List
    const reportsList = document.getElementById("home-recent-reports");
    if (!reportsList) return;

    const reports = window.db.getReports({ city: city });
    reportsList.innerHTML = "";

    if (reports.length === 0) {
      reportsList.innerHTML = `
        <div class="empty-state">
          <p>No reports found in ${city}. Be the first citizen to report a hazard!</p>
        </div>
      `;
      return;
    }

    reports.slice(0, 6).forEach((rep) => {
      const card = this.createReportCardElement(rep);
      reportsList.appendChild(card);
    });
  }

  createReportCardElement(rep) {
    const card = document.createElement("div");
    card.className = "report-card";

    const severityClass = `badge-${rep.severity}`;
    const statusText = rep.status.replace(/_/g, " ").toUpperCase();

    card.innerHTML = `
      <div class="report-card-media" style="position: relative;">
        <img src="${rep.images.before || 'assets/images/pothole_crater.jpg'}" alt="${rep.title}" loading="lazy" />
        <span class="report-badge severity-badge ${severityClass}">${rep.severity.toUpperCase()}</span>
        <span class="report-badge priority-pill">Priority: ${rep.priorityScore}/100</span>
      </div>
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="ticket-id">${rep.ticketNumber}</span>
          <span class="status-pill status-${rep.status}">${statusText}</span>
        </div>
        <h3 class="report-card-title">${rep.title}</h3>
        <p class="report-card-road">📍 ${rep.road}</p>
        <p class="report-card-desc">${rep.description.substring(0, 95)}...</p>
        <div class="report-card-footer">
          <button class="action-btn upvote-btn ${rep.upvotedByMe ? 'active' : ''}" data-id="${rep.id}">
            👍 <span>${rep.upvotesCount || 0}</span>
          </button>
          <span class="comment-count-tag">💬 ${rep.commentsCount || 0}</span>
          <button class="btn-secondary view-details-btn" data-id="${rep.id}">
            View Details →
          </button>
        </div>
      </div>
    `;

    // Bind upvote
    const upBtn = card.querySelector(".upvote-btn");
    upBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.db.toggleUpvote(rep.id);
      this.renderActiveView();
    });

    // Bind details view
    card.querySelector(".view-details-btn").addEventListener("click", () => {
      this.openReportModal(rep.id);
    });
    card.addEventListener("click", () => {
      this.openReportModal(rep.id);
    });

    return card;
  }

  renderMyReportsView() {
    const container = document.getElementById("my-reports-list");
    if (!container) return;

    const reports = window.db.getReports();
    container.innerHTML = "";

    // Highlight reports requiring citizen verification
    const verificationNeeded = reports.filter((r) => r.status === "citizen_verification");
    if (verificationNeeded.length > 0) {
      const alertBox = document.createElement("div");
      alertBox.className = "verification-alert-banner";
      alertBox.innerHTML = `
        <div style="font-weight: 700; color: #000080; margin-bottom: 4px;">
          🔔 Action Required: ${verificationNeeded.length} Repaired Road(s) Awaiting Your Verification
        </div>
        <p style="font-size: 13px; margin: 0; color: #444;">Municipal repairs are completed. Please inspect and confirm quality to close the ticket and earn 50 civic points.</p>
      `;
      container.appendChild(alertBox);
    }

    if (reports.length === 0) {
      container.innerHTML += `<div class="empty-state"><p>No reports filed yet. Tap 'Report' below to log a road hazard.</p></div>`;
      return;
    }

    reports.forEach((rep) => {
      const card = this.createReportCardElement(rep);
      container.appendChild(card);
    });
  }

  renderProfileView() {
    const user = window.db.getUserProfile();

    const nameEl = document.getElementById("profile-name");
    const pointsEl = document.getElementById("profile-points");
    const badgesContainer = document.getElementById("profile-badges-container");

    if (nameEl) nameEl.textContent = user.name;
    if (pointsEl) pointsEl.textContent = user.points;

    if (badgesContainer) {
      badgesContainer.innerHTML = "";
      const availableBadges = [
        { name: "Pothole Spotter", desc: "Reported 1st road hazard", icon: "🔍", unlocked: user.badges.includes("Pothole Spotter") },
        { name: "Road Guardian", desc: "Earned 200+ civic points", icon: "🛡️", unlocked: user.badges.includes("Road Guardian") },
        { name: "Civic Champion", desc: "Supported 10+ community reports", icon: "🏆", unlocked: user.badges.includes("Civic Champion") },
        { name: "Master Verifier", desc: "Verified completed road repair", icon: "✅", unlocked: user.badges.includes("Master Verifier") }
      ];

      availableBadges.forEach((b) => {
        const badgeEl = document.createElement("div");
        badgeEl.className = `badge-item ${b.unlocked ? "unlocked" : "locked"}`;
        badgeEl.innerHTML = `
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-info">
            <strong>${b.name}</strong>
            <p>${b.desc}</p>
          </div>
          <span class="badge-status">${b.unlocked ? "Unlocked" : "Locked"}</span>
        `;
        badgesContainer.appendChild(badgeEl);
      });
    }
  }

  renderAuthorityView() {
    const listEl = document.getElementById("authority-triage-list");
    if (!listEl) return;

    const currentCity = window.locationService.currentCity;
    const reports = window.db.getReports({ city: currentCity });
    listEl.innerHTML = "";

    const activeHazards = reports.filter((r) => r.status !== "closed");

    document.getElementById("authority-queue-count").textContent = `${activeHazards.length} Active Complaints`;

    activeHazards.forEach((rep) => {
      const item = document.createElement("div");
      item.className = "authority-card";
      item.innerHTML = `
        <div class="auth-header">
          <div>
            <span class="ticket-id">${rep.ticketNumber}</span>
            <h4 style="margin: 4px 0;">${rep.title}</h4>
            <span class="report-card-road">📍 ${rep.road}</span>
          </div>
          <div style="text-align: right;">
            <div class="score-chip" style="background:#000080;color:#fff;padding:4px 8px;border-radius:4px;font-weight:700;">
              Priority: ${rep.priorityScore}/100
            </div>
            <div style="font-size: 11px; color:#D32F2F; margin-top: 4px; font-weight:700;">
              SLA: ${rep.slaHours} Hours
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin: 12px 0; align-items: center;">
          <img src="${rep.images.before}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px;" />
          <div style="font-size: 12px; line-height: 1.5; color: #444;">
            <div><strong>AI Depth:</strong> ${rep.aiAnalysis?.depthCm || 12} cm | <strong>Dia:</strong> ${rep.aiAnalysis?.diameterCm || 50} cm</div>
            <div><strong>Status:</strong> <span class="status-pill status-${rep.status}">${rep.status.toUpperCase()}</span></div>
            <div><strong>Assigned To:</strong> ${rep.assignment ? rep.assignment.contractor : 'None'}</div>
          </div>
        </div>

        <div class="auth-actions">
          ${rep.status === 'ai_verified' || rep.status === 'reported' || rep.status === 'authority_review' ? `
            <button class="btn-primary auth-btn-assign" data-id="${rep.id}">Assign Crew</button>
          ` : ''}

          ${rep.status === 'assigned' ? `
            <button class="btn-primary auth-btn-start" data-id="${rep.id}">Start Repair</button>
          ` : ''}

          ${rep.status === 'repair_in_progress' ? `
            <button class="btn-success auth-btn-complete" data-id="${rep.id}">Upload After Photo & Complete</button>
          ` : ''}

          <button class="btn-secondary auth-btn-inspect" data-id="${rep.id}">Inspect Full Report</button>
        </div>
      `;

      // Event listeners for actions
      const assignBtn = item.querySelector(".auth-btn-assign");
      if (assignBtn) {
        assignBtn.addEventListener("click", () => this.openAssignModal(rep.id));
      }

      const startBtn = item.querySelector(".auth-btn-start");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          window.db.startRepairWork(rep.id);
          this.renderAuthorityView();
        });
      }

      const compBtn = item.querySelector(".auth-btn-complete");
      if (compBtn) {
        compBtn.addEventListener("click", () => this.openCompleteRepairModal(rep.id));
      }

      const inspBtn = item.querySelector(".auth-btn-inspect");
      if (inspBtn) {
        inspBtn.addEventListener("click", () => this.openReportModal(rep.id));
      }

      listEl.appendChild(item);
    });
  }

  renderAdminView() {
    const analytics = window.db.getAnalytics("All");

    document.getElementById("admin-total-reports").textContent = analytics.total;
    document.getElementById("admin-critical-hazards").textContent = analytics.critical;
    document.getElementById("admin-repaired-hazards").textContent = analytics.repaired;
    document.getElementById("admin-resolution-rate").textContent = `${analytics.resolutionRate}%`;

    // Render audit log list
    const auditContainer = document.getElementById("admin-audit-logs");
    if (auditContainer) {
      const logs = window.db.getAuditLogs();
      auditContainer.innerHTML = "";
      logs.slice(0, 15).forEach((log) => {
        const row = document.createElement("div");
        row.className = "audit-log-row";
        row.innerHTML = `
          <span class="audit-time">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <strong class="audit-actor">${log.actor}</strong>
          <span class="audit-action">${log.action}</span>
          <span class="audit-details">${log.details}</span>
        `;
        auditContainer.appendChild(row);
      });
    }

    // Export buttons
    const exportBtn = document.getElementById("btn-export-data");
    if (exportBtn) {
      exportBtn.onclick = () => this.exportReportsData();
    }
  }

  exportReportsData() {
    const data = window.db.getReports();
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", jsonStr);
    dlAnchor.setAttribute("download", `roadfix_dataset_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  updateReportFormLocation() {
    const locInput = document.getElementById("report-location-input");
    if (locInput) {
      locInput.value = window.locationService.currentAddress;
    }
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.capturedImageBase64 = e.target.result;
      this.displayPhotoPreview(this.capturedImageBase64);
    };
    reader.readAsDataURL(file);
  }

  loadSamplePhoto(src, category) {
    this.capturedImageBase64 = src;
    this.selectedCategory = category;
    this.displayPhotoPreview(src);

    // Update active category pill
    document.querySelectorAll(".category-pill").forEach((p) => {
      if (p.getAttribute("data-category") === category) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });

    // Auto populate helpful title and description if blank
    const titleInput = document.getElementById("report-title-input");
    const descInput = document.getElementById("report-desc-input");
    if (titleInput && (!titleInput.value || titleInput.value.trim() === "")) {
      if (category === "deep_crater") {
        titleInput.value = "Hazardous Deep Crater near Intersection";
      } else if (category === "waterlogged_pothole") {
        titleInput.value = "Waterlogged Road Crater with Hidden Depth";
      } else {
        titleInput.value = "Dangerous Pothole on Commuter Corridor";
      }
    }
    if (descInput && (!descInput.value || descInput.value.trim() === "")) {
      descInput.value = "Deep road surface erosion with broken aggregate edges. Immediate skidding and rim damage hazard for vehicles.";
    }
  }

  displayPhotoPreview(src) {
    const previewContainer = document.getElementById("photo-preview-container");
    const previewImg = document.getElementById("photo-preview-img");
    if (previewContainer && previewImg) {
      previewImg.src = src;
      previewContainer.classList.remove("hidden");
    }
  }

  async handleReportSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("report-title-input")?.value || "Hazardous Road Surface Damage";
    const desc = document.getElementById("report-desc-input")?.value || "Damaged road causing severe vehicle risk.";
    const city = window.locationService.currentCity;
    const road = window.locationService.currentRoad;

    const submitBtn = document.getElementById("submit-report-btn");
    const statusText = document.getElementById("submit-status-text");

    if (submitBtn) submitBtn.disabled = true;
    if (statusText) statusText.textContent = window.i18n.t("submittingReport");

    // Show scanner overlay on photo preview
    const scannerOverlay = document.getElementById("scanner-overlay");
    if (scannerOverlay) scannerOverlay.classList.remove("hidden");

    // Run RoadVision AI
    const aiResult = await window.aiService.analyzeRoadHazard(this.capturedImageBase64 || "assets/images/pothole_crater.jpg", {
      category: this.selectedCategory,
      city: city,
      road: road,
      lat: window.locationService.currentCoords.lat,
      lng: window.locationService.currentCoords.lng
    });

    // Run Smart Priority Engine
    const priorityResult = window.priorityEngine.calculatePriority({
      severity: aiResult.severity,
      category: this.selectedCategory,
      roadType: road,
      sensitiveZones: ["Tech Corridor", "Metro Station"],
      upvotes: 1
    });

    // Save report to database
    const newReport = window.db.createReport({
      title: title,
      description: desc,
      city: city,
      road: road,
      category: this.selectedCategory,
      severity: aiResult.severity,
      priorityScore: priorityResult.score,
      slaHours: priorityResult.slaHours,
      imageBefore: this.capturedImageBase64 || "assets/images/pothole_crater.jpg",
      location: {
        lat: window.locationService.currentCoords.lat,
        lng: window.locationService.currentCoords.lng,
        address: window.locationService.currentAddress,
        landmark: "Nearby Main Signal",
        ward: "Central Ward"
      },
      aiAnalysis: aiResult,
      citizen: window.db.getUserProfile()
    });

    if (scannerOverlay) scannerOverlay.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = false;
    if (statusText) statusText.textContent = "";

    // Reset Form
    e.target.reset();
    document.getElementById("photo-preview-container")?.classList.add("hidden");
    this.capturedImageBase64 = null;

    // Switch to Map and open detail modal
    this.switchTab("map");
    setTimeout(() => {
      window.mapService.panToLocation(newReport.location.lat, newReport.location.lng, 16);
      this.openReportModal(newReport.id);
    }, 400);
  }

  openReportModal(reportId) {
    const report = window.db.getReportById(reportId);
    if (!report) return;

    this.activeReportId = reportId;
    const modal = document.getElementById("report-detail-modal");
    if (!modal) return;

    // Populate modal content
    document.getElementById("modal-ticket-id").textContent = report.ticketNumber;
    document.getElementById("modal-title").textContent = report.title;
    document.getElementById("modal-road").textContent = `📍 ${report.road}`;
    document.getElementById("modal-status").textContent = report.status.replace(/_/g, " ").toUpperCase();
    document.getElementById("modal-status").className = `status-pill status-${report.status}`;
    document.getElementById("modal-priority-score").textContent = `Priority: ${report.priorityScore}/100`;
    document.getElementById("modal-sla").textContent = `SLA: ${report.slaHours}h`;
    document.getElementById("modal-desc").textContent = report.description;

    // Image & Bounding Box
    const imgBefore = document.getElementById("modal-img-before");
    if (imgBefore) imgBefore.src = report.images.before;

    const bbox = document.getElementById("modal-bbox");
    if (bbox && report.aiAnalysis?.boundingBox) {
      const b = report.aiAnalysis.boundingBox;
      bbox.style.top = `${b.ymin}%`;
      bbox.style.left = `${b.xmin}%`;
      bbox.style.width = `${b.xmax - b.xmin}%`;
      bbox.style.height = `${b.ymax - b.ymin}%`;
      document.getElementById("modal-bbox-label").textContent = `${report.aiAnalysis.confidence}% ${b.label}`;
      bbox.classList.remove("hidden");
    } else if (bbox) {
      bbox.classList.add("hidden");
    }

    // AI Diagnostics Block
    document.getElementById("modal-ai-confidence").textContent = `${report.aiAnalysis?.confidence || 95}%`;
    document.getElementById("modal-ai-depth").textContent = `${report.aiAnalysis?.depthCm || 12} cm`;
    document.getElementById("modal-ai-diameter").textContent = `${report.aiAnalysis?.diameterCm || 50} cm`;
    document.getElementById("modal-ai-insights").textContent = report.aiAnalysis?.insights || "";

    // After repair image block if available
    const afterContainer = document.getElementById("modal-after-container");
    const imgAfter = document.getElementById("modal-img-after");
    if (afterContainer && imgAfter) {
      if (report.images.after) {
        imgAfter.src = report.images.after;
        afterContainer.classList.remove("hidden");
      } else {
        afterContainer.classList.add("hidden");
      }
    }

    // Lifecycle Stepper
    this.renderLifecycleStepper(report.status);

    // Contextual Action Buttons based on Role & Status
    this.renderModalActionButtons(report);

    // Comments
    this.renderModalComments(report);

    // Show modal
    modal.classList.remove("hidden");
  }

  renderLifecycleStepper(currentStatus) {
    const steps = [
      "reported",
      "ai_verified",
      "authority_review",
      "assigned",
      "repair_scheduled",
      "repair_in_progress",
      "repair_completed",
      "citizen_verification",
      "closed"
    ];

    const stepperEl = document.getElementById("modal-lifecycle-stepper");
    if (!stepperEl) return;

    const currentIndex = steps.indexOf(currentStatus);

    stepperEl.innerHTML = "";
    steps.forEach((step, idx) => {
      const isCompleted = idx < currentIndex;
      const isActive = idx === currentIndex;

      const stepEl = document.createElement("div");
      stepEl.className = `stepper-item ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`;
      stepEl.innerHTML = `
        <div class="stepper-dot">${isCompleted ? "✓" : idx + 1}</div>
        <div class="stepper-label">${step.replace(/_/g, " ")}</div>
      `;
      stepperEl.appendChild(stepEl);
    });
  }

  renderModalActionButtons(report) {
    const actionsContainer = document.getElementById("modal-actions-container");
    if (!actionsContainer) return;

    actionsContainer.innerHTML = "";
    const user = window.db.getUserProfile();

    // Upvote Button
    const upBtn = document.createElement("button");
    upBtn.className = `btn-secondary action-btn ${report.upvotedByMe ? "active" : ""}`;
    upBtn.innerHTML = `👍 ${report.upvotedByMe ? "Supported" : "Support"} (${report.upvotesCount || 0})`;
    upBtn.onclick = () => {
      window.db.toggleUpvote(report.id);
      this.openReportModal(report.id);
      this.renderActiveView();
    };
    actionsContainer.appendChild(upBtn);

    // Citizen Verification Action
    if (report.status === "citizen_verification") {
      const verifyBtn = document.createElement("button");
      verifyBtn.className = "btn-success";
      verifyBtn.innerHTML = "✅ Citizen Verify Repair (+50 Pts)";
      verifyBtn.onclick = () => this.openCitizenVerifyModal(report.id);
      actionsContainer.appendChild(verifyBtn);
    }

    // Authority Actions
    if (user.role === "authority" || user.role === "admin") {
      if (["reported", "ai_verified", "authority_review"].includes(report.status)) {
        const assignBtn = document.createElement("button");
        assignBtn.className = "btn-primary";
        assignBtn.innerHTML = "🛠️ Assign Repair Team";
        assignBtn.onclick = () => this.openAssignModal(report.id);
        actionsContainer.appendChild(assignBtn);
      }

      if (report.status === "assigned") {
        const startBtn = document.createElement("button");
        startBtn.className = "btn-primary";
        startBtn.innerHTML = "🚜 Mark Repair In Progress";
        startBtn.onclick = () => {
          window.db.startRepairWork(report.id);
          this.openReportModal(report.id);
          this.renderActiveView();
        };
        actionsContainer.appendChild(startBtn);
      }

      if (report.status === "repair_in_progress") {
        const compBtn = document.createElement("button");
        compBtn.className = "btn-success";
        compBtn.innerHTML = "📸 Upload Repair Proof & Complete";
        compBtn.onclick = () => this.openCompleteRepairModal(report.id);
        actionsContainer.appendChild(compBtn);
      }
    }
  }

  renderModalComments(report) {
    const listEl = document.getElementById("modal-comments-list");
    if (!listEl) return;

    listEl.innerHTML = "";
    const comments = report.commentsList || [];

    comments.forEach((c) => {
      const el = document.createElement("div");
      el.className = "comment-bubble";
      el.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #000080;">${c.author} <span style="font-size: 10px; color: #888;">(${c.role}) • ${c.time}</span></div>
        <div style="font-size: 13px; margin-top: 2px;">${c.text}</div>
      `;
      listEl.appendChild(el);
    });

    // Comment form binding
    const addBtn = document.getElementById("btn-add-comment");
    const inputEl = document.getElementById("comment-input-field");
    if (addBtn && inputEl) {
      addBtn.onclick = () => {
        if (!inputEl.value.trim()) return;
        const user = window.db.getUserProfile();
        window.db.addComment(report.id, inputEl.value.trim(), user.name, user.role);
        inputEl.value = "";
        this.openReportModal(report.id);
      };
    }
  }

  closeReportModal() {
    document.getElementById("report-detail-modal")?.classList.add("hidden");
    this.activeReportId = null;
  }

  openAssignModal(reportId) {
    const report = window.db.getReportById(reportId);
    if (!report) return;

    const modal = document.getElementById("assign-modal");
    if (!modal) return;

    document.getElementById("assign-ticket-tag").textContent = report.ticketNumber;

    const submitBtn = document.getElementById("btn-submit-assignment");
    submitBtn.onclick = () => {
      const crew = document.getElementById("assign-crew-select")?.value || "GHMC Rapid Patch Squad #4";
      const date = document.getElementById("assign-date-input")?.value || new Date().toISOString().split("T")[0];
      const cost = Number(document.getElementById("assign-cost-input")?.value || 5500);

      window.db.assignContractor(reportId, {
        contractor: crew,
        scheduledDate: date,
        estimatedCost: cost
      });

      modal.classList.add("hidden");
      this.openReportModal(reportId);
      this.renderActiveView();
    };

    modal.classList.remove("hidden");
  }

  openCompleteRepairModal(reportId) {
    const modal = document.getElementById("complete-repair-modal");
    if (!modal) return;

    const confirmBtn = document.getElementById("btn-confirm-repair-completed");
    confirmBtn.onclick = () => {
      const notes = document.getElementById("repair-crew-notes")?.value || "Asphalt rolled and leveled.";
      const asphalt = document.getElementById("repair-asphalt-type")?.value || "Hot Mix Bituminous Concrete (BC)";

      window.db.completeRepair(reportId, "assets/images/pothole_repaired.jpg", notes, asphalt);
      modal.classList.add("hidden");
      this.openReportModal(reportId);
      this.renderActiveView();
    };

    modal.classList.remove("hidden");
  }

  openCitizenVerifyModal(reportId) {
    const modal = document.getElementById("citizen-verify-modal");
    if (!modal) return;

    const approveBtn = document.getElementById("btn-verify-approve");
    const rejectBtn = document.getElementById("btn-verify-reject");

    approveBtn.onclick = () => {
      const comments = document.getElementById("verify-comments-input")?.value || "Confirmed smooth repair.";
      window.db.citizenVerify(reportId, true, 5, comments);
      modal.classList.add("hidden");
      this.openReportModal(reportId);
      this.renderActiveView();
    };

    rejectBtn.onclick = () => {
      const comments = document.getElementById("verify-comments-input")?.value || "Substandard repair.";
      window.db.citizenVerify(reportId, false, 2, comments);
      modal.classList.add("hidden");
      this.openReportModal(reportId);
      this.renderActiveView();
    };

    modal.classList.remove("hidden");
  }

  toggleNotificationsModal() {
    const modal = document.getElementById("notifications-modal");
    if (!modal) return;

    const listEl = document.getElementById("notif-list-container");
    const notifs = window.db.getNotifications();

    listEl.innerHTML = "";
    if (notifs.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>No notifications yet.</p></div>`;
    } else {
      notifs.forEach((n) => {
        const item = document.createElement("div");
        item.className = `notif-item ${n.read ? "read" : "unread"}`;
        item.innerHTML = `
          <strong>${n.title}</strong>
          <p>${n.message}</p>
          <span style="font-size: 10px; color: #888;">${n.time}</span>
        `;
        if (n.reportId) {
          item.onclick = () => {
            modal.classList.add("hidden");
            this.openReportModal(n.reportId);
          };
        }
        listEl.appendChild(item);
      });
    }

    modal.classList.remove("hidden");
    window.db.markAllNotificationsRead();
    this.updateNotificationBadge();
  }

  updateNotificationBadge() {
    const notifs = window.db.getNotifications();
    const unread = notifs.filter((n) => !n.read).length;
    const badge = document.getElementById("notif-unread-count");
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  }

  openSupabaseSettingsModal() {
    const modal = document.getElementById("supabase-modal");
    if (!modal) return;

    const config = window.db.getSupabaseConfig();
    document.getElementById("supabase-url-input").value = config.url || "";
    document.getElementById("supabase-key-input").value = config.anonKey || "";
    document.getElementById("supabase-enabled-checkbox").checked = config.enabled;

    const saveBtn = document.getElementById("btn-save-supabase");
    saveBtn.onclick = () => {
      const url = document.getElementById("supabase-url-input").value;
      const key = document.getElementById("supabase-key-input").value;
      const enabled = document.getElementById("supabase-enabled-checkbox").checked;
      window.db.saveSupabaseConfig(url, key, enabled);
      modal.classList.add("hidden");
      this.showPointsToast(0, "Supabase Configuration Saved");
    };

    modal.classList.remove("hidden");
  }

  showPointsToast(points, reason) {
    const toast = document.getElementById("points-toast");
    if (!toast) return;

    toast.innerHTML = points > 0 ? `🎉 +${points} Civic Points! <em>${reason}</em>` : `⚙️ <em>${reason}</em>`;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3200);
  }
}

window.app = new RoadFixApp();
window.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
