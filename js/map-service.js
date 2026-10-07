/**
 * RoadFix — Interactive Leaflet Pothole Map & Hotspot Clustering
 * Color-coded severity pins, pulsing critical markers, hotspot radius circles,
 * and quick-filter integration.
 */

class RoadFixMapService {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.hotspotsLayer = null;
    this.userLocationMarker = null;
    this.activeFilter = { status: "all", severity: "all", showHotspots: true, searchQuery: "" };
    this.isInitialized = false;
  }

  initMap(containerId = "map-container") {
    if (this.isInitialized && this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    const cityConfig = window.locationService?.getCityConfig() || { center: [17.4485, 78.3772], zoom: 13 };

    // Initialize Leaflet map
    this.map = L.map(containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView(cityConfig.center, cityConfig.zoom);

    // High performance CartoDB Positron / OSM tiles with clean aesthetic
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.hotspotsLayer = L.layerGroup().addTo(this.map);

    this.isInitialized = true;
    this.renderReportsAndHotspots();

    // Listen to data and city updates
    window.addEventListener("roadfix:dataUpdated", () => this.renderReportsAndHotspots());
    window.addEventListener("roadfix:cityChanged", (e) => {
      const conf = window.locationService.getCityConfig(e.detail.city);
      if (conf && this.map) {
        this.map.setView(conf.center, conf.zoom);
        this.renderReportsAndHotspots();
      }
    });

    // Invalidate size on resize
    window.addEventListener("resize", () => {
      if (this.map) this.map.invalidateSize();
    });
  }

  renderReportsAndHotspots() {
    if (!this.map || !this.markersLayer || !window.db) return;

    this.markersLayer.clearLayers();
    this.hotspotsLayer.clearLayers();

    const currentCity = window.locationService?.currentCity || "Hyderabad";
    let reports = window.db.getReports({
      city: currentCity,
      status: this.activeFilter.status,
      severity: this.activeFilter.severity
    });

    // Apply search query filter if set
    const query = (this.activeFilter.searchQuery || "").trim().toLowerCase();
    if (query) {
      reports = reports.filter((rep) => {
        return (
          (rep.title && rep.title.toLowerCase().includes(query)) ||
          (rep.road && rep.road.toLowerCase().includes(query)) ||
          (rep.ticketNumber && rep.ticketNumber.toLowerCase().includes(query)) ||
          (rep.category && rep.category.toLowerCase().includes(query))
        );
      });
    }

    // 1. Plot Report Markers
    reports.forEach((rep, idx) => {
      if (!rep.location || !rep.location.lat || !rep.location.lng) return;

      const markerIcon = this.createSeverityIcon(rep.severity, rep.status);
      const marker = L.marker([rep.location.lat, rep.location.lng], { icon: markerIcon });

      // Click to open detailed bottom sheet
      marker.on("click", () => {
        if (window.app && window.app.openReportModal) {
          window.app.openReportModal(rep.id);
        }
      });

      marker.bindTooltip(
        `<strong>${rep.ticketNumber}</strong><br>${rep.title}<br><span style="color:#D32F2F;font-weight:700;">Priority: ${rep.priorityScore}/100</span>`,
        { direction: "top", offset: [0, -14] }
      );

      this.markersLayer.addLayer(marker);

      // Pan to first search result if active query
      if (query && idx === 0) {
        this.map.panTo([rep.location.lat, rep.location.lng]);
      }
    });

    // 2. Plot Hotspot Zones if enabled
    if (this.activeFilter.showHotspots && !query) {
      const hotspots = window.db.getHotspots(currentCity);
      hotspots.forEach((hs) => {
        const circle = L.circle([hs.lat, hs.lng], {
          radius: hs.radius,
          color: "#D32F2F",
          fillColor: "#FF9933",
          fillOpacity: 0.18,
          weight: 2,
          dashArray: "6, 6"
        });

        circle.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <strong style="color: #000080; font-size: 14px;">⚠️ Recurring Hotspot Zone</strong><br>
            <strong>${hs.zone}</strong><br>
            <span style="color: #D32F2F; font-weight: 700;">Risk: ${hs.riskLevel} (${hs.activeCount} Active Hazards)</span><br>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">${hs.description}</p>
          </div>
        `);

        this.hotspotsLayer.addLayer(circle);
      });
    }
  }

  createSeverityIcon(severity, status) {
    let color = "#138808"; // green
    let isPulse = false;
    let iconChar = "!";

    if (status === "closed" || status === "repair_completed") {
      color = "#138808";
      iconChar = "✓";
    } else if (severity === "critical") {
      color = "#D32F2F";
      isPulse = true;
      iconChar = "⚠️";
    } else if (severity === "high") {
      color = "#FF9933";
      iconChar = "!";
    } else if (severity === "medium") {
      color = "#F59E0B";
      iconChar = "•";
    } else {
      color = "#10B981";
      iconChar = "•";
    }

    const html = `
      <div class="custom-map-marker ${isPulse ? "marker-pulse" : ""}" style="background-color: ${color};">
        <span class="marker-symbol">${iconChar}</span>
      </div>
    `;

    return L.divIcon({
      className: "leaflet-custom-div-icon",
      html: html,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  panToLocation(lat, lng, zoom = 16) {
    if (this.map) {
      this.map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    }
  }

  setFilter(filterKey, value) {
    this.activeFilter[filterKey] = value;
    this.renderReportsAndHotspots();
  }
}

window.mapService = new RoadFixMapService();
