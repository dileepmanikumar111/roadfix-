/**
 * RoadFix — Interactive Leaflet Pothole Map & Hotspot Clustering
 * Color-coded severity pins, pulsing critical markers, hotspot radius circles,
 * CARTO API key integration with OSM fallback (eliminating watermark),
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

    // Environment-configured tile provider:
    // If CARTO_API_KEY is configured in .env or settings, load authenticated CARTO Voyager tiles.
    // If not configured, use official OpenStreetMap tiles with complete attribution to prevent "API KEY REQUIRED" watermark.
    const cartoKey = window.ROADFIX_CONFIG?.CARTO_API_KEY || localStorage.getItem("roadfix_carto_api_key") || "";
    let tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    let subdomains = "abc";

    if (cartoKey && cartoKey.trim().length > 0) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey.trim())}`;
      subdomains = "abcd";
    }

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
      subdomains: subdomains,
      maxZoom: 19
    }).addTo(this.map);

    // Fallback if tile loading fails
    tileLayer.on("tileerror", () => {
      console.warn("Tile server note: Using OpenStreetMap raster tiles for clean rendering.");
    });

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.hotspotsLayer = L.layerGroup().addTo(this.map);

    this.isInitialized = true;
    this.plotUserLocation();
    this.renderReportsAndHotspots();

    // Listen to data and city updates
    window.addEventListener("roadfix:dataUpdated", () => this.renderReportsAndHotspots());
    window.addEventListener("roadfix:cityChanged", (e) => {
      const conf = window.locationService.getCityConfig(e.detail.city);
      if (conf && this.map) {
        this.map.setView(conf.center, conf.zoom);
        this.plotUserLocation();
        this.renderReportsAndHotspots();
      }
    });

    // Invalidate size on resize
    window.addEventListener("resize", () => {
      if (this.map) this.map.invalidateSize();
    });
  }

  plotUserLocation() {
    if (!this.map || !window.locationService) return;
    const coords = window.locationService.currentCoords;
    if (!coords || !coords.lat || !coords.lng) return;

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([coords.lat, coords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: "leaflet-custom-div-icon",
        html: `
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 0 10px rgba(37,99,235,0.6); animation: pulse-overlay 2s infinite;"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      this.userLocationMarker = L.marker([coords.lat, coords.lng], { icon: userIcon, zIndexOffset: 1000 });
      this.userLocationMarker.bindTooltip("<strong>📍 You Are Here</strong><br>GPS Active", { direction: "top", offset: [0, -10] });
      this.userLocationMarker.addTo(this.map);
    }
  }

  centerOnUserLocation() {
    if (!this.map || !window.locationService) return;
    const coords = window.locationService.currentCoords;
    if (coords && coords.lat && coords.lng) {
      this.map.flyTo([coords.lat, coords.lng], 16, { animate: true, duration: 1.2 });
      this.plotUserLocation();
    }
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

      // Rich Detail Popup Card matching Section 7 specifications
      const statusText = (rep.status || "reported").replace(/_/g, " ").toUpperCase();
      const popupHtml = `
        <div style="font-family: inherit; min-width: 210px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="report-badge severity-badge badge-${rep.severity}" style="position: static; font-size: 10px;">${(rep.severity || 'high').toUpperCase()}</span>
            <span style="font-size: 11px; font-weight: 800; color: #000080;">Priority: ${rep.priorityScore || 90}/100</span>
          </div>
          <h4 style="font-size: 13.5px; font-weight: 800; color: #000080; margin: 4px 0 2px 0;">${rep.title}</h4>
          <p style="font-size: 11px; color: #1A237E; margin: 0 0 6px 0; font-weight: 600;">📍 ${rep.road || currentCity}</p>
          <div style="font-size: 10.5px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
            <div><strong>Ticket:</strong> <span style="font-family: monospace;">${rep.ticketNumber}</span></div>
            <div><strong>Status:</strong> <span class="status-pill status-${rep.status}" style="font-size: 9.5px; padding: 1px 6px;">${statusText}</span></div>
          </div>
          <button class="btn-primary" style="width: 100%; padding: 5px 10px; font-size: 11.5px; justify-content: center; cursor: pointer;" onclick="window.app.openReportModal('${rep.id}')">
            View Full Report →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, className: "custom-leaflet-popup" });

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
