/**
 * RoadFix — Geolocation & Proximity Road Safety Warning Radar
 * Captures GPS, supports Indian city presets, reverse-geocodes road names,
 * and monitors real-time proximity to critical road hazards.
 */

class RoadFixLocationService {
  constructor() {
    this.currentCity = localStorage.getItem("roadfix_city") || "Hyderabad";
    this.currentCoords = { lat: 17.4485, lng: 78.3772 };
    this.currentAddress = "Hitec City Cyber Towers Road, Madhapur, Hyderabad, Telangana";
    this.currentRoad = "Hitec City Cyber Towers Road";
    this.watchId = null;
    this.warningDistanceMeters = 350; // Alert if within 350 meters of high/critical hazard
  }

  getCityConfig(cityKey) {
    const key = (cityKey || this.currentCity).toLowerCase();
    return window.ROADFIX_SEEDS?.cities[key] || window.ROADFIX_SEEDS?.cities.hyderabad;
  }

  setCity(cityName) {
    const key = cityName.toLowerCase();
    if (window.ROADFIX_SEEDS?.cities[key]) {
      this.currentCity = window.ROADFIX_SEEDS.cities[key].name;
      localStorage.setItem("roadfix_city", this.currentCity);
      const conf = window.ROADFIX_SEEDS.cities[key];
      this.currentCoords = { lat: conf.center[0], lng: conf.center[1] };
      this.currentRoad = conf.roads[0];
      this.currentAddress = `${conf.roads[0]}, ${conf.name}, ${conf.state}`;
      window.dispatchEvent(new CustomEvent("roadfix:cityChanged", { detail: { city: this.currentCity } }));
      this.checkNearbyHazards();
    }
  }

  async getCurrentLocation() {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.currentCoords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            this.currentAddress = `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (GPS Active)`;
            this.checkNearbyHazards();
            resolve({
              lat: this.currentCoords.lat,
              lng: this.currentCoords.lng,
              address: this.currentAddress,
              road: this.currentRoad,
              city: this.currentCity,
              isRealGps: true
            });
          },
          (err) => {
            // Geolocation denied or unavailable: fallback to active Indian city center
            console.log("GPS prompt skipped or unavailable, using city coordinates:", err.message);
            const conf = this.getCityConfig(this.currentCity);
            this.currentCoords = { lat: conf.center[0], lng: conf.center[1] };
            this.currentRoad = conf.roads[0];
            this.currentAddress = `${conf.roads[0]}, ${conf.name}, ${conf.state}`;
            this.checkNearbyHazards();
            resolve({
              lat: this.currentCoords.lat,
              lng: this.currentCoords.lng,
              address: this.currentAddress,
              road: this.currentRoad,
              city: this.currentCity,
              isRealGps: false
            });
          },
          { timeout: 6000, enableHighAccuracy: true }
        );
      } else {
        const conf = this.getCityConfig(this.currentCity);
        this.currentCoords = { lat: conf.center[0], lng: conf.center[1] };
        resolve({
          lat: this.currentCoords.lat,
          lng: this.currentCoords.lng,
          address: this.currentAddress,
          road: this.currentRoad,
          city: this.currentCity,
          isRealGps: false
        });
      }
    });
  }

  /**
   * Proximity Radar: Checks for active critical/high potholes within threshold
   */
  checkNearbyHazards() {
    if (!window.db) return;
    const reports = window.db.getReports({ city: this.currentCity, status: "pending" });
    let closestHazard = null;
    let minDistance = Infinity;

    reports.forEach((r) => {
      if (r.location && r.location.lat && r.location.lng && ["critical", "high"].includes(r.severity)) {
        const d = this.calculateDistanceMeters(
          this.currentCoords.lat,
          this.currentCoords.lng,
          r.location.lat,
          r.location.lng
        );
        if (d < minDistance) {
          minDistance = d;
          closestHazard = { report: r, distanceM: Math.round(d) };
        }
      }
    });

    if (closestHazard && closestHazard.distanceM <= this.warningDistanceMeters) {
      this.triggerSafetyWarning(closestHazard);
    } else {
      this.dismissSafetyWarning();
    }
  }

  triggerSafetyWarning(hazardInfo) {
    const banner = document.getElementById("safety-warning-banner");
    const textEl = document.getElementById("safety-warning-text");
    if (!banner || !textEl) return;

    textEl.innerHTML = `<strong>⚠️ Caution:</strong> ${hazardInfo.report.severity.toUpperCase()} Hazard <strong>${hazardInfo.distanceM}m ahead</strong> on <em>${hazardInfo.report.road}</em>. Slow down!`;
    banner.classList.remove("hidden");
    banner.classList.add("banner-pulse");

    this.playSubtleAlertTone();
  }

  dismissSafetyWarning() {
    const banner = document.getElementById("safety-warning-banner");
    if (banner) {
      banner.classList.add("hidden");
      banner.classList.remove("banner-pulse");
    }
  }

  playSubtleAlertTone() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

window.locationService = new RoadFixLocationService();
