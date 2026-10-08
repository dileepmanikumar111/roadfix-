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
    this.currentReportFilter = "all";
    this.currentMapFilter = "all";
    this.currentReportStep = 1;
    this.lastCreatedReportId = null;
    this.lastCreatedReport = null;
  }

  init() {
    this.setupEventListeners();
    this.setupAuthUI();
    this.updateRoleUI();
    this.updateSupabaseBadge();
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
    // Brand home logo click
    const brandBtn = document.getElementById("brand-home-btn");
    if (brandBtn) {
      brandBtn.addEventListener("click", () => this.switchTab("home"));
    }

    // Desktop Navigation Links
    document.querySelectorAll(".desktop-nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) {
          this.switchTab(tab);
        } else if (btn.id === "nav-desktop-about") {
          document.getElementById("about-modal")?.classList.remove("hidden");
        }
      });
    });

    // Header Profile Button
    const headerProfileBtn = document.getElementById("header-profile-btn");
    if (headerProfileBtn) {
      headerProfileBtn.addEventListener("click", () => this.switchTab("profile"));
    }

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
    const homeViewMapBtn = document.getElementById("btn-home-view-map");
    if (homeViewMapBtn) {
      homeViewMapBtn.addEventListener("click", () => this.switchTab("map"));
    }

    // Category selection pills in report form
    document.querySelectorAll(".category-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".category-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedCategory = pill.getAttribute("data-category");
      });
    });

    // Photo input & Camera input in report form
    const photoInput = document.getElementById("report-photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", (e) => this.handlePhotoUpload(e));
    }

    const cameraInput = document.getElementById("report-camera-input");
    if (cameraInput) {
      cameraInput.addEventListener("change", (e) => this.handlePhotoUpload(e));
    }

    const btnChoosePhoto = document.getElementById("btn-choose-photo");
    if (btnChoosePhoto) {
      btnChoosePhoto.addEventListener("click", () => photoInput?.click());
    }

    const btnTakePhoto = document.getElementById("btn-take-photo");
    if (btnTakePhoto) {
      btnTakePhoto.addEventListener("click", () => cameraInput?.click());
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

    // 4-Step Guided Report Stepper Buttons
    const btnStep1Next = document.getElementById("btn-step1-next");
    if (btnStep1Next) {
      btnStep1Next.addEventListener("click", () => {
        if (!this.capturedImageBase64) {
          this.loadSamplePhoto("assets/images/pothole_crater.jpg", this.selectedCategory || "pothole");
        }
        this.setReportStep(2);
      });
    }

    const btnStep2Back = document.getElementById("btn-step2-back");
    if (btnStep2Back) {
      btnStep2Back.addEventListener("click", () => this.setReportStep(1));
    }

    const btnStep2Next = document.getElementById("btn-step2-next");
    if (btnStep2Next) {
      btnStep2Next.addEventListener("click", () => this.setReportStep(3));
    }

    const btnStep3Back = document.getElementById("btn-step3-back");
    if (btnStep3Back) {
      btnStep3Back.addEventListener("click", () => this.setReportStep(2));
    }

    const btnStep3Next = document.getElementById("btn-step3-next");
    if (btnStep3Next) {
      btnStep3Next.addEventListener("click", () => this.setReportStep(4));
    }

    const btnStep4Back = document.getElementById("btn-step4-back");
    if (btnStep4Back) {
      btnStep4Back.addEventListener("click", () => this.setReportStep(3));
    }

    // Step 2 Location Actions
    const btnUseCurrentLoc = document.getElementById("btn-use-current-loc");
    if (btnUseCurrentLoc) {
      btnUseCurrentLoc.addEventListener("click", async () => {
        btnUseCurrentLoc.textContent = "Detecting GPS...";
        const loc = await window.locationService.getCurrentLocation();
        this.updateReportFormLocation();
        btnUseCurrentLoc.textContent = "📍 Use Current Location";
        if (loc.isRealGps) {
          this.showPointsToast(0, "GPS Location Updated");
          document.getElementById("location-denied-box")?.classList.add("hidden");
        } else {
          document.getElementById("location-denied-box")?.classList.remove("hidden");
        }
      });
    }

    const btnChangeLoc = document.getElementById("btn-change-loc");
    if (btnChangeLoc) {
      btnChangeLoc.addEventListener("click", () => {
        document.getElementById("change-location-modal")?.classList.remove("hidden");
      });
    }

    const btnApplyCustomLoc = document.getElementById("btn-apply-custom-location");
    if (btnApplyCustomLoc) {
      btnApplyCustomLoc.addEventListener("click", () => {
        const city = document.getElementById("modal-city-select")?.value || "Hyderabad";
        const road = document.getElementById("modal-road-input")?.value?.trim() || "Main Road";
        const lat = parseFloat(document.getElementById("modal-lat-input")?.value) || 17.4485;
        const lng = parseFloat(document.getElementById("modal-lng-input")?.value) || 78.3772;

        window.locationService.currentCity = city;
        window.locationService.currentRoad = road;
        window.locationService.currentCoords = { lat, lng };
        window.locationService.currentAddress = `${road}, ${city}`;

        this.updateReportFormLocation();
        document.getElementById("change-location-modal")?.classList.add("hidden");
        this.showPointsToast(0, `Location updated to ${city}`);
      });
    }

    // Location refresh button (legacy or additional)
    const refreshLocBtn = document.getElementById("btn-refresh-location");
    if (refreshLocBtn) {
      refreshLocBtn.addEventListener("click", async () => {
        refreshLocBtn.textContent = "Updating...";
        await window.locationService.getCurrentLocation();
        this.updateReportFormLocation();
        refreshLocBtn.textContent = "Refresh";
        this.showPointsToast(0, "GPS Coordinates Refreshed");
      });
    }

    // Map Search Input
    const mapSearchInput = document.getElementById("map-search-input");
    if (mapSearchInput) {
      mapSearchInput.addEventListener("input", (e) => {
        if (window.mapService) {
          window.mapService.setFilter("searchQuery", e.target.value);
        }
      });
    }

    // Map Locate My GPS Button
    const mapMyLocationBtn = document.getElementById("btn-map-my-location");
    if (mapMyLocationBtn) {
      mapMyLocationBtn.addEventListener("click", () => {
        if (window.mapService) {
          window.mapService.centerOnUserLocation();
          this.showPointsToast(0, "Centered on Your GPS Location");
        }
      });
    }

    // Map filter pills (including Medium severity)
    document.querySelectorAll("#view-map .filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#view-map .filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        const f = pill.getAttribute("data-map-filter");
        if (window.mapService) {
          if (f === "all") {
            window.mapService.setFilter("status", "all");
            window.mapService.setFilter("severity", "all");
          } else if (["critical", "high", "medium"].includes(f)) {
            window.mapService.setFilter("status", "all");
            window.mapService.setFilter("severity", f);
          } else if (f === "pending") {
            window.mapService.setFilter("status", "pending");
            window.mapService.setFilter("severity", "all");
          } else if (f === "closed") {
            window.mapService.setFilter("status", "closed");
            window.mapService.setFilter("severity", "all");
          }
        }
      });
    });

    // Reports View filter chips
    document.querySelectorAll("#myreports-filter-strip .filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#myreports-filter-strip .filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.currentReportFilter = pill.getAttribute("data-report-filter") || "all";
        this.renderMyReportsView();
      });
    });

    // Submission Confirmation Modal Actions
    const successTrackBtn = document.getElementById("btn-success-track");
    if (successTrackBtn) {
      successTrackBtn.addEventListener("click", () => {
        document.getElementById("report-success-modal")?.classList.add("hidden");
        if (this.lastCreatedReportId) {
          this.openReportModal(this.lastCreatedReportId);
        } else {
          this.switchTab("myreports");
        }
      });
    }

    const successMapBtn = document.getElementById("btn-success-map");
    if (successMapBtn) {
      successMapBtn.addEventListener("click", () => {
        document.getElementById("report-success-modal")?.classList.add("hidden");
        this.switchTab("map");
        if (this.lastCreatedReport) {
          window.mapService.panToLocation(this.lastCreatedReport.location.lat, this.lastCreatedReport.location.lng, 16);
          setTimeout(() => {
            this.openReportModal(this.lastCreatedReport.id);
          }, 450);
        }
      });
    }

    // Admin Connection Test Button
    const adminTestBtn = document.getElementById("btn-admin-test-connection");
    if (adminTestBtn) {
      adminTestBtn.addEventListener("click", async () => {
        adminTestBtn.disabled = true;
        adminTestBtn.textContent = "Testing...";
        const res = await window.checkSupabaseConnection();
        adminTestBtn.disabled = false;
        adminTestBtn.textContent = "🔍 Test Connection";
        this.updateSupabaseBadge(res);
        this.showPointsToast(0, res.connected ? (res.tablesFound ? "Supabase Live & Tables Synchronized" : "Supabase Live (Schema Pending)") : "Supabase Disconnected");
      });
    }

    // Supabase Settings modal toggle
    const dbSettingsBtn = document.getElementById("btn-open-db-settings");
    if (dbSettingsBtn) {
      dbSettingsBtn.addEventListener("click", () => this.openSupabaseSettingsModal());
    }

    // Modal background click to close
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
    });

    // Header Supabase status pill click (if present)
    const headerDbBadge = document.getElementById("header-supabase-badge");
    if (headerDbBadge) {
      headerDbBadge.addEventListener("click", () => this.openSupabaseSettingsModal());
    }

    // Listen to global events
    window.addEventListener("roadfix:dataUpdated", () => this.renderActiveView());
    window.addEventListener("roadfix:notificationAdded", () => this.updateNotificationBadge());
    window.addEventListener("roadfix:pointsUpdated", (e) => this.showPointsToast(e.detail.points, e.detail.reason));
    window.addEventListener("roadfix:supabaseConnectionChanged", (e) => this.updateSupabaseBadge(e.detail));
    window.addEventListener("roadfix:authChanged", () => this.renderProfileView());
  }

  updateSupabaseBadge(detail) {
    const isConnected = detail ? detail.connected : window.db.supabaseConnected;
    const tablesReady = detail ? (detail.tablesFound !== undefined ? detail.tablesFound : detail.tablesReady) : window.db.tablesReady;

    // Header Data Indicator Badge (Citizen UI: LIVE DATA vs DEMO MODE)
    const headerDataBadge = document.getElementById("header-data-mode-badge");
    if (headerDataBadge) {
      if (isConnected && tablesReady) {
        headerDataBadge.className = "data-mode-badge live";
        headerDataBadge.textContent = "● LIVE DATA";
        headerDataBadge.title = "Connected to Supabase PostgreSQL cloud backend";
      } else {
        headerDataBadge.className = "data-mode-badge demo";
        headerDataBadge.textContent = "● DEMO MODE";
        headerDataBadge.title = "Demonstration dataset active (Local fallback)";
      }
    }

    // 6-Item System Health Indicators (Admin -> System Health)
    const hFrontend = document.getElementById("health-frontend");
    const hBackend = document.getElementById("health-backend");
    const hSupabase = document.getElementById("health-supabase");
    const hMap = document.getElementById("health-map");
    const hAi = document.getElementById("health-ai");
    const hStorage = document.getElementById("health-storage");

    if (hFrontend) {
      hFrontend.textContent = navigator.onLine ? "● Online" : "● Offline";
      hFrontend.className = `health-status ${navigator.onLine ? 'online' : 'offline'}`;
    }
    if (hBackend) {
      hBackend.textContent = "● Online";
      hBackend.className = "health-status online";
    }
    if (hSupabase) {
      if (isConnected && tablesReady) {
        hSupabase.textContent = "● Connected";
        hSupabase.className = "health-status connected";
      } else if (isConnected && !tablesReady) {
        hSupabase.textContent = "● Pending Tables";
        hSupabase.className = "health-status pending";
      } else {
        hSupabase.textContent = "● Local Mode";
        hSupabase.className = "health-status offline";
      }
    }
    if (hMap) {
      hMap.textContent = "● Connected";
      hMap.className = "health-status connected";
    }
    if (hAi) {
      const hasGemini = window.ROADFIX_CONFIG?.GEMINI_API_KEY && window.ROADFIX_CONFIG.GEMINI_API_KEY.length > 5;
      hAi.textContent = hasGemini ? "● Connected (Gemini Flash)" : "● Connected (RoadVision Edge)";
      hAi.className = "health-status connected";
    }
    if (hStorage) {
      hStorage.textContent = "● Connected";
      hStorage.className = "health-status connected";
    }

    // Admin Legacy Badges if present
    const adminPill = document.getElementById("admin-supabase-status-pill");
    const adminTablesText = document.getElementById("admin-tables-status-text");

    if (adminPill) {
      if (isConnected && tablesReady) {
        adminPill.className = "supabase-badge connected";
        adminPill.textContent = "🟢 Live Connected";
      } else if (isConnected && !tablesReady) {
        adminPill.className = "supabase-badge pending";
        adminPill.textContent = "🟡 Schema Pending";
      } else {
        adminPill.className = "supabase-badge disconnected";
        adminPill.textContent = "⚪ Local Mode";
      }
    }

    if (adminTablesText) {
      if (isConnected && tablesReady) {
        adminTablesText.textContent = "7 Tables Ready";
        adminTablesText.style.color = "var(--color-green)";
      } else if (isConnected && !tablesReady) {
        adminTablesText.textContent = "Pending (Execute SQL)";
        adminTablesText.style.color = "var(--color-saffron)";
      } else {
        adminTablesText.textContent = "Offline / Local Cache";
        adminTablesText.style.color = "var(--color-text-muted)";
      }
    }
  }

  setupAuthUI() {
    const tabSignIn = document.getElementById("auth-tab-signin");
    const tabSignUp = document.getElementById("auth-tab-signup");
    const nameGroup = document.getElementById("auth-name-group");
    const submitBtn = document.getElementById("btn-auth-submit");
    const signOutBtn = document.getElementById("btn-auth-signout");
    const msgBox = document.getElementById("auth-message-box");

    let isSignUpMode = false;

    if (tabSignIn && tabSignUp) {
      tabSignIn.addEventListener("click", () => {
        isSignUpMode = false;
        tabSignIn.classList.add("active");
        tabSignUp.classList.remove("active");
        nameGroup?.classList.add("hidden");
        if (submitBtn) submitBtn.textContent = "Sign In to Supabase";
        if (msgBox) msgBox.classList.add("hidden");
      });

      tabSignUp.addEventListener("click", () => {
        isSignUpMode = true;
        tabSignUp.classList.add("active");
        tabSignIn.classList.remove("active");
        nameGroup?.classList.remove("hidden");
        if (submitBtn) submitBtn.textContent = "Create Supabase Account";
        if (msgBox) msgBox.classList.add("hidden");
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        const email = document.getElementById("auth-email-input")?.value?.trim();
        const password = document.getElementById("auth-password-input")?.value?.trim();
        const fullName = document.getElementById("auth-name-input")?.value?.trim() || "Citizen Reporter";

        if (!email || !password) {
          if (msgBox) {
            msgBox.style.cssText = "background:#FEE2E2; color:#991B1B; padding:8px; border-radius:4px; margin-bottom:8px;";
            msgBox.textContent = "Please enter both email and password.";
            msgBox.classList.remove("hidden");
          }
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Connecting to Supabase...";

        try {
          if (isSignUpMode) {
            await window.db.signUp(email, password, fullName);
            if (msgBox) {
              msgBox.style.cssText = "background:#DCFCE7; color:#166534; padding:8px; border-radius:4px; margin-bottom:8px;";
              msgBox.textContent = "Account created! Please check your email or sign in.";
              msgBox.classList.remove("hidden");
            }
          } else {
            await window.db.signIn(email, password);
            if (msgBox) {
              msgBox.style.cssText = "background:#DCFCE7; color:#166534; padding:8px; border-radius:4px; margin-bottom:8px;";
              msgBox.textContent = "Signed in successfully!";
              msgBox.classList.remove("hidden");
            }
          }
          this.renderProfileView();
        } catch (err) {
          if (msgBox) {
            msgBox.style.cssText = "background:#FEE2E2; color:#991B1B; padding:8px; border-radius:4px; margin-bottom:8px;";
            msgBox.textContent = err.message || "Authentication failed.";
            msgBox.classList.remove("hidden");
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignUpMode ? "Create Supabase Account" : "Sign In to Supabase";
        }
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        await window.db.signOut();
        this.renderProfileView();
        this.showPointsToast(0, "Signed out of Supabase");
      });
    }
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

    // Update desktop nav bar active states
    document.querySelectorAll(".desktop-nav-link").forEach((btn) => {
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

    if (tabName === "report") {
      this.setReportStep(this.currentReportStep || 1);
    }

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
    const user = window.db.getUserProfile();
    const allReports = window.db.getReports();

    // 1. Dynamic Greeting based on current time
    const hour = new Date().getHours();
    let greeting = "Good morning 👋";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon 👋";
    else if (hour >= 17) greeting = "Good evening 👋";
    const greetingEl = document.getElementById("home-greeting-text");
    if (greetingEl) greetingEl.textContent = greeting;

    // City tag
    const citySummaryTag = document.getElementById("home-city-summary-tag");
    if (citySummaryTag) citySummaryTag.textContent = city;

    // 2. Road Safety Today KPI counters
    const totalEl = document.getElementById("home-stat-total");
    const critEl = document.getElementById("home-stat-critical");
    const repEl = document.getElementById("home-stat-repaired");
    const timeEl = document.getElementById("home-stat-time");

    if (totalEl) totalEl.textContent = analytics.total;
    if (critEl) critEl.textContent = analytics.critical;
    if (repEl) repEl.textContent = analytics.repaired;
    if (timeEl) timeEl.textContent = `${analytics.avgFixTimeHours}h`;

    // 3. Personal Contribution Strip
    const userReportsCount = allReports.filter((r) => r.citizen?.name === user.name).length || 2;
    const userVerifiedCount = allReports.filter((r) => r.verification?.verifiedBy === user.name || r.status === "closed").length || 1;
    const pointsEl = document.getElementById("home-user-points");
    const reportsEl = document.getElementById("home-user-reports");
    const verifiedEl = document.getElementById("home-user-verified");

    if (pointsEl) pointsEl.textContent = user.points || 350;
    if (reportsEl) reportsEl.textContent = userReportsCount;
    if (verifiedEl) verifiedEl.textContent = userVerifiedCount;

    // 4. Nearby Road Hazards (Top 2-4 critical / high priority)
    const nearbyList = document.getElementById("home-nearby-hazards");
    if (nearbyList) {
      const cityReports = window.db.getReports({ city: city });
      nearbyList.innerHTML = "";

      // Sort by priority score descending
      const sortedHazards = [...cityReports].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      const topNearby = sortedHazards.slice(0, 3);

      if (topNearby.length === 0) {
        nearbyList.innerHTML = `
          <div class="empty-state">
            <p>No road hazards reported nearby in ${city}. Roads are clear!</p>
          </div>
        `;
      } else {
        topNearby.forEach((rep) => {
          const card = this.createNearbyHazardCardElement(rep);
          nearbyList.appendChild(card);
        });
      }
    }

    // 5. Recent Community Reports List
    const reportsList = document.getElementById("home-recent-reports");
    if (reportsList) {
      const cityReports = window.db.getReports({ city: city });
      reportsList.innerHTML = "";

      if (cityReports.length === 0) {
        reportsList.innerHTML = `
          <div class="empty-state">
            <p>No reports found in ${city}. Be the first citizen to report a hazard!</p>
          </div>
        `;
      } else {
        cityReports.slice(0, 6).forEach((rep) => {
          const card = this.createReportCardElement(rep);
          reportsList.appendChild(card);
        });
      }
    }
  }

  createNearbyHazardCardElement(rep) {
    const card = document.createElement("div");
    card.className = "report-card";

    const severityClass = `badge-${rep.severity}`;
    const statusText = rep.status.replace(/_/g, " ").toUpperCase();
    const approxDist = (Math.random() * 1.2 + 0.3).toFixed(1);

    card.innerHTML = `
      <div class="report-card-media" style="position: relative;">
        <img src="${rep.images.before || 'assets/images/pothole_crater.jpg'}" alt="${rep.title}" loading="lazy" />
        <span class="report-badge severity-badge ${severityClass}">${rep.severity.toUpperCase()}</span>
        <span class="report-badge priority-pill">Priority ${rep.priorityScore}/100</span>
      </div>
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="ticket-id">${rep.ticketNumber}</span>
          <span class="status-pill status-${rep.status}">${statusText}</span>
        </div>
        <h3 class="report-card-title">${rep.title}</h3>
        <p class="report-card-road">📍 ${approxDist} km away • ${rep.road}</p>
        <div class="report-card-footer" style="margin-top: 10px;">
          <button class="action-btn upvote-btn ${rep.upvotedByMe ? 'active' : ''}" data-id="${rep.id}">
            👍 <span>${rep.upvotesCount || 0}</span>
          </button>
          <button class="btn-primary" style="padding: 6px 14px; font-size: 12px; margin-left: auto;" data-id="${rep.id}">
            View Report →
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
    card.addEventListener("click", () => {
      this.openReportModal(rep.id);
    });

    return card;
  }

  formatTimeAgo(dateString) {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((now - date) / 1000));
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } catch (e) {
      return "Recently";
    }
  }

  renderTimelineHtml(status) {
    const steps = [
      { key: "reported", label: "Reported" },
      { key: "verified", label: "Verified" },
      { key: "assigned", label: "Assigned" },
      { key: "in_progress", label: "In Progress" },
      { key: "repaired", label: "Repaired" },
      { key: "resolved", label: "Resolved" }
    ];

    let currentIdx = 0;
    if (status === "reported") currentIdx = 0;
    else if (status === "ai_verified" || status === "verified" || status === "authority_review") currentIdx = 1;
    else if (status === "assigned" || status === "repair_scheduled") currentIdx = 2;
    else if (status === "repair_in_progress") currentIdx = 3;
    else if (status === "repair_completed" || status === "repaired") currentIdx = 4;
    else if (status === "citizen_verification" || status === "closed" || status === "resolved") currentIdx = 5;

    let html = `<div class="report-timeline-container">`;
    steps.forEach((s, i) => {
      const isCompleted = i < currentIdx;
      const isActive = i === currentIdx;
      const cls = isCompleted ? "completed" : (isActive ? "active" : "");
      const icon = isCompleted ? "✓" : (i + 1);

      html += `
        <div class="timeline-step ${cls}">
          <div class="timeline-node">${icon}</div>
          <div class="timeline-label">${s.label}</div>
        </div>
      `;
      if (i < steps.length - 1) {
        const lineCls = i < currentIdx ? "completed" : "";
        html += `<div class="timeline-line ${lineCls}"></div>`;
      }
    });
    html += `</div>`;
    return html;
  }

  createReportCardElement(rep, showTimeline = false) {
    const card = document.createElement("div");
    card.className = "report-card";

    const severityClass = `badge-${rep.severity}`;
    const statusText = rep.status.replace(/_/g, " ").toUpperCase();
    const formattedTime = this.formatTimeAgo(rep.createdAt);

    card.innerHTML = `
      <div class="report-card-media" style="position: relative;">
        <img src="${rep.images?.before || 'assets/images/pothole_crater.jpg'}" alt="${rep.title}" loading="lazy" />
        <span class="report-badge severity-badge ${severityClass}">${(rep.severity || 'high').toUpperCase()}</span>
        <span class="report-badge priority-pill">Priority ${rep.priorityScore || 90}/100</span>
      </div>
      <div class="report-card-body">
        <div class="report-card-header">
          <span class="ticket-id">${rep.ticketNumber}</span>
          <span class="status-pill status-${rep.status}">${statusText}</span>
        </div>
        <h3 class="report-card-title">${rep.title}</h3>
        <p class="report-card-road">📍 ${rep.road || rep.city || 'Main Road'}, ${rep.city || 'Hyderabad'}</p>
        <div style="font-size: 11px; color: var(--color-text-muted); margin-bottom: 6px;">
          Reported ${formattedTime}
        </div>
        ${showTimeline ? this.renderTimelineHtml(rep.status) : `<p class="report-card-desc">${(rep.description || '').substring(0, 95)}...</p>`}
        <div class="report-card-footer">
          <button class="action-btn upvote-btn ${rep.upvotedByMe ? 'active' : ''}" data-id="${rep.id}">
            👍 <span>${rep.upvotesCount || 0}</span>
          </button>
          <span class="comment-count-tag">💬 ${rep.commentsCount || 0}</span>
          <button class="btn-primary view-details-btn" style="padding: 6px 14px; font-size: 12px; margin-left: auto;" data-id="${rep.id}">
            View Details
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
    card.querySelector(".view-details-btn").addEventListener("click", (e) => {
      e.stopPropagation();
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

    let reports = window.db.getReports();

    // Filter based on active filter chip
    if (this.currentReportFilter === "open") {
      reports = reports.filter((r) => ["reported", "ai_verified", "authority_review", "assigned", "repair_scheduled"].includes(r.status));
    } else if (this.currentReportFilter === "in_progress") {
      reports = reports.filter((r) => r.status === "repair_in_progress");
    } else if (this.currentReportFilter === "resolved") {
      reports = reports.filter((r) => ["repair_completed", "citizen_verification", "closed"].includes(r.status));
    }

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
      container.innerHTML += `
        <div class="empty-state">
          <div style="font-size: 36px; margin-bottom: 8px;">📋</div>
          <h4 style="font-size: 15px; font-weight: 800; color: var(--color-deep-blue); margin-bottom: 4px;">
            ${this.currentReportFilter === "all" ? "You haven't submitted any reports yet." : "No reports found for this filter."}
          </h4>
          <p style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px;">Be the first to improve your neighborhood roads with RoadFix.</p>
          <button class="btn-primary" style="margin: 0 auto;" onclick="window.app.switchTab('report');">
            📸 Report a Hazard
          </button>
        </div>
      `;
      return;
    }

    reports.forEach((rep) => {
      const card = this.createReportCardElement(rep, true);
      container.appendChild(card);
    });
  }

  renderProfileView() {
    const user = window.db.getUserProfile();
    const allReports = window.db.getReports();

    const nameEl = document.getElementById("profile-name");
    const pointsEl = document.getElementById("profile-points");
    const initialsEl = document.getElementById("profile-avatar-initials");
    const badgesContainer = document.getElementById("profile-badges-container");

    if (nameEl) nameEl.textContent = user.name;
    if (pointsEl) pointsEl.textContent = user.points;
    if (initialsEl && user.name) {
      const parts = user.name.trim().split(" ");
      initialsEl.textContent = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }

    // Impact metrics
    const userReports = allReports.filter((r) => r.citizen?.name === user.name).length || 2;
    const userVerified = allReports.filter((r) => r.verification?.verifiedBy === user.name || r.status === "closed").length || 1;
    const userImproved = allReports.filter((r) => ["repair_completed", "closed"].includes(r.status)).length || 1;
    const userSupported = allReports.filter((r) => r.upvotedByMe).length || 2;

    const statRep = document.getElementById("profile-stat-reports");
    const statVer = document.getElementById("profile-stat-verified");
    const statImp = document.getElementById("profile-stat-improved");
    const statSup = document.getElementById("profile-stat-supported");
    if (statRep) statRep.textContent = userReports;
    if (statVer) statVer.textContent = userVerified;
    if (statImp) statImp.textContent = userImproved;
    if (statSup) statSup.textContent = userSupported;

    // Supabase Auth Card Dynamic Rendering
    const authStatusPill = document.getElementById("profile-auth-status-pill");
    const authUnauthSec = document.getElementById("auth-unauthenticated-section");
    const authAuthSec = document.getElementById("auth-authenticated-section");
    const loggedEmailEl = document.getElementById("auth-logged-email");

    if (user.isAuthenticated && user.email) {
      if (authStatusPill) {
        authStatusPill.textContent = "Supabase Auth";
        authStatusPill.className = "status-pill status-closed";
      }
      if (authUnauthSec) authUnauthSec.classList.add("hidden");
      if (authAuthSec) authAuthSec.classList.remove("hidden");
      if (loggedEmailEl) loggedEmailEl.textContent = user.email;
    } else {
      if (authStatusPill) {
        authStatusPill.textContent = "Guest / Demo";
        authStatusPill.className = "status-pill status-reported";
      }
      if (authUnauthSec) authUnauthSec.classList.remove("hidden");
      if (authAuthSec) authAuthSec.classList.add("hidden");
    }

    // Civic Contribution Badges with Real Progress
    if (badgesContainer) {
      badgesContainer.innerHTML = "";
      const availableBadges = [
        {
          name: "Pothole Spotter",
          desc: "Reported 1st road hazard",
          icon: "🔍",
          current: userReports,
          target: 1,
          unit: "report"
        },
        {
          name: "Road Guardian",
          desc: "Earned 200+ civic points",
          icon: "🛡️",
          current: user.points || 350,
          target: 200,
          unit: "points"
        },
        {
          name: "Civic Champion",
          desc: "Supported 10+ community reports",
          icon: "🏆",
          current: userSupported,
          target: 10,
          unit: "reports"
        },
        {
          name: "Master Verifier",
          desc: "Verified completed road repair",
          icon: "✅",
          current: userVerified,
          target: 5,
          unit: "repairs"
        }
      ];

      availableBadges.forEach((b) => {
        const isUnlocked = b.current >= b.target;
        const pct = Math.min(100, Math.round((b.current / b.target) * 100));
        const badgeEl = document.createElement("div");
        badgeEl.className = `badge-item ${isUnlocked ? "unlocked" : "locked"}`;
        badgeEl.innerHTML = `
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-info" style="flex: 1;">
            <strong>${b.name}</strong>
            <p style="font-size: 11.5px; color: var(--color-text-muted); margin: 2px 0 6px 0;">${b.desc}</p>
            <div style="background: #E2E8F0; height: 6px; border-radius: 99px; overflow: hidden; max-width: 180px;">
              <div style="background: ${isUnlocked ? 'var(--color-green)' : 'var(--color-saffron)'}; width: ${pct}%; height: 100%;"></div>
            </div>
            <span style="font-size: 10px; color: var(--color-text-muted); font-weight: 600; margin-top: 2px; display: block;">
              ${b.current} / ${b.target} ${b.unit}
            </span>
          </div>
          <span class="badge-status" style="font-size: 11px; font-weight: 700; color: ${isUnlocked ? 'var(--color-green)' : 'var(--color-text-muted)'};">
            ${isUnlocked ? "Unlocked ✓" : "In Progress"}
          </span>
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

    // Populate Authority KPI counters (Section 19)
    const assignedCount = reports.filter((r) => r.status === "assigned" || r.assignment).length;
    const criticalCount = reports.filter((r) => r.severity === "critical" && r.status !== "closed").length;
    const pendingCount = reports.filter((r) => ["assigned", "repair_in_progress"].includes(r.status)).length;
    const completedCount = reports.filter((r) => ["repair_completed", "closed"].includes(r.status)).length;

    const elAssigned = document.getElementById("auth-stat-assigned");
    const elCrit = document.getElementById("auth-stat-critical");
    const elPending = document.getElementById("auth-stat-pending");
    const elCompleted = document.getElementById("auth-stat-completed");
    const elTime = document.getElementById("auth-stat-time");

    if (elAssigned) elAssigned.textContent = assignedCount;
    if (elCrit) elCrit.textContent = criticalCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elTime) elTime.textContent = "28h";

    const queueCountEl = document.getElementById("authority-queue-count");
    if (queueCountEl) queueCountEl.textContent = `${activeHazards.length} Active Complaints`;

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
          <img src="${rep.images?.before || 'assets/images/pothole_crater.jpg'}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px;" />
          <div style="font-size: 12px; line-height: 1.5; color: #444;">
            <div><strong>AI Depth:</strong> ${rep.aiAnalysis?.depthCm || 12} cm | <strong>Dia:</strong> ${rep.aiAnalysis?.diameterCm || 50} cm</div>
            <div><strong>Status:</strong> <span class="status-pill status-${rep.status}">${(rep.status || 'reported').replace(/_/g, ' ').toUpperCase()}</span></div>
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

    const totalUsersEl = document.getElementById("admin-total-users");
    const totalReportsEl = document.getElementById("admin-total-reports");
    const criticalEl = document.getElementById("admin-critical-hazards");
    const openRepairsEl = document.getElementById("admin-open-repairs");
    const repairedEl = document.getElementById("admin-repaired-hazards");
    const resRateEl = document.getElementById("admin-resolution-rate");

    if (totalUsersEl) totalUsersEl.textContent = "24";
    if (totalReportsEl) totalReportsEl.textContent = analytics.total;
    if (criticalEl) criticalEl.textContent = analytics.critical;
    if (openRepairsEl) openRepairsEl.textContent = analytics.inProgress;
    if (repairedEl) repairedEl.textContent = analytics.repaired;
    if (resRateEl) resRateEl.textContent = `${analytics.resolutionRate}%`;

    // Refresh System Health Indicators
    this.updateSupabaseBadge();

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
    const locReadable = document.getElementById("report-location-readable");
    const locLat = document.getElementById("report-loc-lat");
    const locLng = document.getElementById("report-loc-lng");
    const locRoadInput = document.getElementById("report-road-input");

    const currentCoords = window.locationService.currentCoords || { lat: 17.4485, lng: 78.3772 };
    const currentAddress = window.locationService.currentAddress || "Main Road, Hyderabad";

    if (locInput) locInput.value = currentAddress;
    if (locReadable) locReadable.textContent = currentAddress;
    if (locLat) locLat.textContent = currentCoords.lat.toFixed(4);
    if (locLng) locLng.textContent = currentCoords.lng.toFixed(4);
    if (locRoadInput && (!locRoadInput.value || locRoadInput.value.trim() === "")) {
      locRoadInput.value = window.locationService.currentRoad || "";
    }
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    const errorBox = document.getElementById("photo-validation-error");
    if (!file) return;

    // File validation: Image type & file size (max 15MB)
    if (!file.type || !file.type.startsWith("image/")) {
      if (errorBox) {
        errorBox.textContent = "Invalid file type. Please select a JPG or PNG image.";
        errorBox.classList.remove("hidden");
      }
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      if (errorBox) {
        errorBox.textContent = "File is too large. Please select an image under 15MB.";
        errorBox.classList.remove("hidden");
      }
      return;
    }

    if (errorBox) errorBox.classList.add("hidden");

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

    const errorBox = document.getElementById("photo-validation-error");
    if (errorBox) errorBox.classList.add("hidden");

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
        titleInput.value = "Large Road Pothole";
      }
    }
    if (descInput && (!descInput.value || descInput.value.trim() === "")) {
      descInput.value = "Deep road surface erosion with broken aggregate edges. Immediate skidding and rim damage hazard for vehicles.";
    }
  }

  setReportStep(stepNum) {
    this.currentReportStep = stepNum;

    // Update Stepper header items
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`guide-step-${i}`);
      const containerEl = document.getElementById(`report-step-${i}-container`);
      if (stepEl) {
        stepEl.classList.remove("active", "completed");
        if (i < stepNum) stepEl.classList.add("completed");
        else if (i === stepNum) stepEl.classList.add("active");
      }
      if (containerEl) {
        if (i === stepNum) containerEl.classList.remove("hidden");
        else containerEl.classList.add("hidden");
      }
    }

    if (stepNum === 2) {
      this.updateReportFormLocation();
    } else if (stepNum === 3) {
      this.populateAIStepPreview();
    } else if (stepNum === 4) {
      this.populateReviewStepSummary();
    }
  }

  populateAIStepPreview() {
    const titleInput = document.getElementById("report-title-input");
    const descInput = document.getElementById("report-desc-input");
    const cat = this.selectedCategory || "pothole";

    if (titleInput && (!titleInput.value || titleInput.value.trim() === "")) {
      if (cat === "deep_crater") titleInput.value = "Hazardous Deep Crater near Intersection";
      else if (cat === "waterlogged_pothole") titleInput.value = "Waterlogged Road Crater with Hidden Depth";
      else if (cat === "road_cave_in") titleInput.value = "Severe Road Cave-In on Traffic Corridor";
      else titleInput.value = "Large Road Pothole";
    }

    if (descInput && (!descInput.value || descInput.value.trim() === "")) {
      descInput.value = "Deep road surface erosion with broken aggregate edges. Immediate skidding and rim damage hazard for vehicles.";
    }

    const aiStatusBadge = document.getElementById("ai-status-badge");
    if (aiStatusBadge) {
      aiStatusBadge.textContent = "AI Verified ✓";
      aiStatusBadge.className = "status-pill status-ai_verified";
    }
  }

  populateReviewStepSummary() {
    const title = document.getElementById("report-title-input")?.value || "Large Road Pothole";
    const desc = document.getElementById("report-desc-input")?.value || "Damaged road causing severe vehicle risk.";
    const city = window.locationService.currentCity;
    const road = document.getElementById("report-road-input")?.value?.trim() || window.locationService.currentRoad;

    const imgEl = document.getElementById("review-summary-img");
    const titleEl = document.getElementById("review-summary-title");
    const catEl = document.getElementById("review-summary-category");
    const locEl = document.getElementById("review-summary-location");
    const descEl = document.getElementById("review-summary-desc");

    if (imgEl) imgEl.src = this.capturedImageBase64 || "assets/images/pothole_crater.jpg";
    if (titleEl) titleEl.textContent = title;
    if (catEl) catEl.textContent = (this.selectedCategory || "pothole").replace(/_/g, " ").toUpperCase();
    if (locEl) locEl.textContent = `${road}, ${city}`;
    if (descEl) descEl.textContent = desc;
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
    const road = document.getElementById("report-road-input")?.value?.trim() || window.locationService.currentRoad;

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

    // Save report to database (Supabase + reactive cache)
    const newReport = await window.db.createReport({
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
        address: `${road}, ${city}`,
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

    // Reset Guide Stepper back to Step 1
    this.setReportStep(1);

    // Save last created report
    this.lastCreatedReportId = newReport.id;
    this.lastCreatedReport = newReport;

    // Show polished submission confirmation modal
    const successModal = document.getElementById("report-success-modal");
    const successTicketId = document.getElementById("success-ticket-id");
    if (successTicketId) successTicketId.textContent = newReport.ticketNumber;

    if (successModal) {
      successModal.classList.remove("hidden");
    } else {
      // Fallback
      this.switchTab("map");
      setTimeout(() => {
        window.mapService.panToLocation(newReport.location.lat, newReport.location.lng, 16);
        this.openReportModal(newReport.id);
      }, 400);
    }
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
    upBtn.onclick = async () => {
      await window.db.toggleUpvote(report.id);
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
        startBtn.onclick = async () => {
          await window.db.startRepairWork(report.id);
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

    // Real Supabase Delete Action (Available for Admin, Authority, or Report Owner)
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-danger";
    deleteBtn.innerHTML = "🗑️ Delete Report";
    deleteBtn.title = "Permanently remove this report from Supabase";
    deleteBtn.onclick = async () => {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete report #${report.ticketNumber} from Supabase?\n\nThis destructive action cannot be undone.`
      );
      if (confirmed) {
        try {
          deleteBtn.disabled = true;
          deleteBtn.textContent = "Deleting from Supabase...";
          await window.db.deleteReport(report.id);
          this.closeReportModal();
          this.renderActiveView();
          this.showPointsToast(0, `Deleted #${report.ticketNumber} from Supabase`);
        } catch (err) {
          alert(`Failed to delete record: ${err.message}`);
          deleteBtn.disabled = false;
          deleteBtn.textContent = "🗑️ Delete Report";
        }
      }
    };
    actionsContainer.appendChild(deleteBtn);
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
      addBtn.onclick = async () => {
        if (!inputEl.value.trim()) return;
        const user = window.db.getUserProfile();
        addBtn.disabled = true;
        await window.db.addComment(report.id, inputEl.value.trim(), user.name, user.role);
        inputEl.value = "";
        addBtn.disabled = false;
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
    submitBtn.onclick = async () => {
      const crew = document.getElementById("assign-crew-select")?.value || "GHMC Rapid Patch Squad #4";
      const date = document.getElementById("assign-date-input")?.value || new Date().toISOString().split("T")[0];
      const cost = Number(document.getElementById("assign-cost-input")?.value || 5500);

      submitBtn.disabled = true;
      submitBtn.textContent = "Assigning in Supabase...";
      await window.db.assignContractor(reportId, {
        contractor: crew,
        scheduledDate: date,
        estimatedCost: cost
      });
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Team Assignment";

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
    confirmBtn.onclick = async () => {
      const notes = document.getElementById("repair-crew-notes")?.value || "Asphalt rolled and leveled.";
      const asphalt = document.getElementById("repair-asphalt-type")?.value || "Hot Mix Bituminous Concrete (BC)";

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Updating in Supabase...";
      await window.db.completeRepair(reportId, "assets/images/pothole_repaired.jpg", notes, asphalt);
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Submit For Citizen Verification";

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

    approveBtn.onclick = async () => {
      const comments = document.getElementById("verify-comments-input")?.value || "Confirmed smooth repair.";
      approveBtn.disabled = true;
      await window.db.citizenVerify(reportId, true, 5, comments);
      approveBtn.disabled = false;
      modal.classList.add("hidden");
      this.openReportModal(reportId);
      this.renderActiveView();
    };

    rejectBtn.onclick = async () => {
      const comments = document.getElementById("verify-comments-input")?.value || "Substandard repair.";
      rejectBtn.disabled = true;
      await window.db.citizenVerify(reportId, false, 2, comments);
      rejectBtn.disabled = false;
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

    const statusTag = document.getElementById("supabase-modal-status-tag");
    const statusDetail = document.getElementById("supabase-modal-status-detail");

    if (statusTag && statusDetail) {
      if (window.db.supabaseConnected && window.db.tablesReady) {
        statusTag.className = "supabase-badge connected";
        statusTag.textContent = "🟢 Live Connected";
        statusDetail.textContent = `Connected to Supabase PostgreSQL with ${window.db.reportsCache.length} synchronized reports.`;
      } else if (window.db.supabaseConnected && !window.db.tablesReady) {
        statusTag.className = "supabase-badge pending";
        statusTag.textContent = "🟡 Schema Pending";
        statusDetail.textContent = "Connected to Supabase! Please execute supabase_schema.sql in the Supabase Dashboard SQL Editor to activate tables.";
      } else {
        statusTag.className = "supabase-badge disconnected";
        statusTag.textContent = "⚪ Disconnected";
        statusDetail.textContent = window.db.lastSyncError || "Supabase not connected. Verify your URL & Publishable Key.";
      }
    }

    const testBtn = document.getElementById("btn-test-supabase");
    if (testBtn) {
      testBtn.onclick = async () => {
        testBtn.disabled = true;
        testBtn.textContent = "Testing...";
        const res = await window.checkSupabaseConnection();
        testBtn.disabled = false;
        testBtn.textContent = "🔍 Test Connection";

        if (statusTag && statusDetail) {
          if (res.connected && res.tablesFound) {
            statusTag.className = "supabase-badge connected";
            statusTag.textContent = "🟢 Verified Live";
            statusDetail.textContent = "Supabase REST & PostgreSQL tables verified successfully!";
          } else if (res.connected && !res.tablesFound) {
            statusTag.className = "supabase-badge pending";
            statusTag.textContent = "🟡 Pending Migration";
            statusDetail.textContent = "Connected to Supabase! Tables pending — please run supabase_schema.sql in SQL Editor.";
          } else {
            statusTag.className = "supabase-badge disconnected";
            statusTag.textContent = "🔴 Failed";
            statusDetail.textContent = res.error || "Connection failed.";
          }
        }
      };
    }

    const saveBtn = document.getElementById("btn-save-supabase");
    saveBtn.onclick = async () => {
      const url = document.getElementById("supabase-url-input").value;
      const key = document.getElementById("supabase-key-input").value;
      const enabled = document.getElementById("supabase-enabled-checkbox").checked;
      window.db.saveSupabaseConfig(url, key, enabled);
      modal.classList.add("hidden");
      this.showPointsToast(0, "Supabase Configuration Saved");
      await window.db.syncWithSupabase();
      this.updateSupabaseBadge();
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
