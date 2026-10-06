/**
 * RoadFix — Interactive End-to-End Complaint Lifecycle Demo Tour
 * Guides judges and evaluators through the complete civic workflow:
 * Citizen reports -> AI analyzes -> appears on map -> Authority verifies & assigns
 * -> repair progress -> before/after proof -> citizen verifies -> closed!
 */

class RoadFixDemoTour {
  constructor() {
    this.currentStep = 0;
    this.demoTicketId = null;
    this.isRunning = false;
  }

  startTour() {
    this.isRunning = true;
    this.currentStep = 1;
    this.showTourModal();
  }

  showTourModal() {
    const modal = document.getElementById("demo-tour-modal");
    if (!modal) return;

    modal.classList.remove("hidden");
    this.renderStepContent();
  }

  closeTour() {
    const modal = document.getElementById("demo-tour-modal");
    if (modal) modal.classList.add("hidden");
    this.isRunning = false;
  }

  renderStepContent() {
    const titleEl = document.getElementById("tour-step-title");
    const descEl = document.getElementById("tour-step-desc");
    const actionBtn = document.getElementById("tour-step-action");
    const indicatorEl = document.getElementById("tour-step-indicator");

    if (!titleEl || !descEl || !actionBtn) return;

    indicatorEl.textContent = `Step ${this.currentStep} of 6`;

    switch (this.currentStep) {
      case 1:
        titleEl.textContent = "Step 1: Citizen Reports Pothole with GPS & Photo";
        descEl.innerHTML = `
          <p>A commuter on <strong>Hitec City Cyber Towers Road, Hyderabad</strong> encounters a deep hazardous crater. They snap a photo and RoadFix automatically records their exact GPS coordinates.</p>
          <div style="margin: 12px 0; border-radius: 8px; overflow: hidden; max-height: 140px;">
            <img src="assets/images/pothole_crater.jpg" style="width: 100%; height: 140px; object-fit: cover;" />
          </div>
          <p style="font-size: 12px; color: #666;">Simulating report submission with live coordinates...</p>
        `;
        actionBtn.textContent = "Simulate Citizen Report →";
        actionBtn.onclick = () => this.executeStep1();
        break;

      case 2:
        titleEl.textContent = "Step 2: RoadVision AI Diagnostic & Priority Scoring";
        descEl.innerHTML = `
          <p>The image is processed by the <strong>RoadVision AI Abstraction Layer</strong>:</p>
          <ul style="padding-left: 20px; font-size: 13px; margin: 8px 0; line-height: 1.6;">
            <li><strong>AI Detection:</strong> 96.4% Confidence (Deep Crater)</li>
            <li><strong>Est. Cavity Depth:</strong> 18 cm | Est. Diameter: 78 cm</li>
            <li><strong>Smart Priority Score:</strong> <span style="color:#D32F2F;font-weight:700;">94/100 (Tier 1 Emergency Dispatch)</span></li>
            <li><strong>Target SLA:</strong> 24 Hours (Near Metro & Tech Corridor)</li>
            <li><strong>Spatial Duplicate Check:</strong> 0 duplicates within 65m</li>
          </ul>
        `;
        actionBtn.textContent = "View Live Marker on Map →";
        actionBtn.onclick = () => this.executeStep2();
        break;

      case 3:
        titleEl.textContent = "Step 3: Pinned on Interactive Road Safety Map";
        descEl.innerHTML = `
          <p>The hazardous pothole is immediately visible on the public GIS map with an active pulsing red marker. Nearby motorists receive live proximity safety warnings.</p>
          <p>Now we switch to the <strong>Municipal Authority Officer</strong> perspective to triage and assign repair crews.</p>
        `;
        actionBtn.textContent = "Switch to Authority Dashboard →";
        actionBtn.onclick = () => this.executeStep3();
        break;

      case 4:
        titleEl.textContent = "Step 4: Authority Triage & Crew Assignment";
        descEl.innerHTML = `
          <p>The municipal officer reviews the AI hazard score and dispatches the rapid repair team:</p>
          <ul style="padding-left: 20px; font-size: 13px; margin: 8px 0; line-height: 1.6;">
            <li><strong>Department:</strong> GHMC Engineering Division</li>
            <li><strong>Assigned Crew:</strong> GHMC Rapid Patch Squad #4</li>
            <li><strong>Lead Engineer:</strong> Er. K. Srinivas Rao</li>
            <li><strong>Material:</strong> Dense Bituminous Macadam (DBM)</li>
          </ul>
        `;
        actionBtn.textContent = "Dispatch Crew & Start Repair →";
        actionBtn.onclick = () => this.executeStep4();
        break;

      case 5:
        titleEl.textContent = "Step 5: Repair Completed & Before/After Proof Uploaded";
        descEl.innerHTML = `
          <p>The repair squad milled the crater, laid hot mix asphalt, and compacted it flush with the road grade. They submit timestamped photographic proof of repair.</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0;">
            <div>
              <span style="font-size: 11px; font-weight: 700; color: #D32F2F;">BEFORE</span>
              <img src="assets/images/pothole_crater.jpg" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px;" />
            </div>
            <div>
              <span style="font-size: 11px; font-weight: 700; color: #138808;">AFTER REPAIR</span>
              <img src="assets/images/pothole_repaired.jpg" style="width: 100%; height: 90px; object-fit: cover; border-radius: 6px;" />
            </div>
          </div>
          <p style="font-size: 12px; color: #666;">Ticket now transitions to <strong>Citizen Verification</strong> stage.</p>
        `;
        actionBtn.textContent = "Switch to Citizen to Verify →";
        actionBtn.onclick = () => this.executeStep5();
        break;

      case 6:
        titleEl.textContent = "Step 6: Citizen Verification & Ticket Closure";
        descEl.innerHTML = `
          <p>The reporting citizen receives a push notification to inspect the repair quality before the ticket can be officially closed.</p>
          <div style="background: #F2F6FF; padding: 12px; border-radius: 8px; border-left: 4px solid #138808; margin: 8px 0;">
            <strong>Verification Result:</strong> Satisfactory (5/5 Stars)<br>
            <span style="font-size: 12px; color: #444;">"Confirmed smooth compaction and clean lane marking. No loose gravel."</span>
          </div>
          <p>🎉 <strong>Ticket Closed!</strong> Citizen earned <strong>+50 Civic Points</strong> and unlocked the <em>Master Verifier</em> badge.</p>
        `;
        actionBtn.textContent = "Finish Tour & Explore Freely 🎉";
        actionBtn.onclick = () => this.finishTour();
        break;
    }
  }

  executeStep1() {
    // Locate or create the showcase report
    this.demoTicketId = "rep-hyd-001";
    this.currentStep = 2;
    this.renderStepContent();
  }

  executeStep2() {
    this.currentStep = 3;
    // Switch to map view
    if (window.app) {
      window.app.switchTab("map");
      setTimeout(() => {
        window.mapService.panToLocation(17.4504, 78.3808, 16);
      }, 300);
    }
    this.renderStepContent();
  }

  executeStep3() {
    this.currentStep = 4;
    // Switch role to Authority
    if (window.db) {
      window.db.setUserRole("authority");
    }
    if (window.app) {
      window.app.switchTab("authority");
    }
    this.renderStepContent();
  }

  executeStep4() {
    this.currentStep = 5;
    // Assign contractor & advance status
    if (window.db) {
      window.db.assignContractor("rep-hyd-001", {
        contractor: "GHMC Rapid Patch Squad #4",
        engineer: "Er. K. Srinivas Rao",
        scheduledDate: "2026-10-07",
        estimatedCost: 8500
      });
      window.db.startRepairWork("rep-hyd-001");
      window.db.completeRepair(
        "rep-hyd-001",
        "assets/images/pothole_repaired.jpg",
        "Compacted with 10-ton vibratory roller. Bituminous concrete level with grade.",
        "Hot Mix Bituminous Concrete (BC)"
      );
    }
    this.renderStepContent();
  }

  executeStep5() {
    this.currentStep = 6;
    // Switch role to Citizen
    if (window.db) {
      window.db.setUserRole("citizen");
    }
    if (window.app) {
      window.app.switchTab("myreports");
    }
    this.renderStepContent();
  }

  finishTour() {
    // Complete verification
    if (window.db) {
      window.db.citizenVerify("rep-hyd-001", true, 5, "Verified smooth compaction and clean lane marking.");
    }
    this.closeTour();
    if (window.app && window.app.openReportModal) {
      window.app.openReportModal("rep-hyd-001");
    }
  }
}

window.demoTour = new RoadFixDemoTour();
