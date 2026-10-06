/**
 * RoadFix — Smart Priority Scoring & SLA Engine
 * Evaluates real-world civic road risk based on:
 * - AI Severity & Depth (0 - 40 pts)
 * - Road Classification & Traffic Volume (0 - 25 pts)
 * - Proximity to Schools, Hospitals, Metro Hubs (0 - 20 pts)
 * - Citizen Upvotes & Community Urgency (0 - 15 pts)
 */

class SmartPriorityEngine {
  /**
   * Calculates dynamic priority score out of 100
   * @param {Object} params
   * @returns {Object} Score breakdown, SLA hours, priority tier
   */
  calculatePriority(params = {}) {
    const {
      severity = "medium",
      category = "pothole",
      roadType = "arterial",
      sensitiveZones = [],
      upvotes = 0,
      isMonsoon = true
    } = params;

    let severityScore = 0;
    switch (severity.toLowerCase()) {
      case "critical":
        severityScore = 38;
        break;
      case "high":
        severityScore = 28;
        break;
      case "medium":
        severityScore = 18;
        break;
      case "low":
      default:
        severityScore = 10;
        break;
    }

    // Category risk modifier
    if (category === "open_manhole" || category === "road_cave_in") {
      severityScore = Math.min(40, severityScore + 5);
    }

    // Road Classification & Traffic Volume
    let roadScore = 15;
    const roadLower = (roadType || "").toLowerCase();
    if (roadLower.includes("highway") || roadLower.includes("expressway")) {
      roadScore = 25; // High speed fatal collision zone
    } else if (roadLower.includes("arterial") || roadLower.includes("ring road") || roadLower.includes("flyover")) {
      roadScore = 22;
    } else if (roadLower.includes("collector") || roadLower.includes("main")) {
      roadScore = 16;
    } else {
      roadScore = 10; // Residential colony lane
    }

    // Proximity to Vulnerable Infrastructure (Hospitals, Schools, Metro Stations)
    let zoneScore = 0;
    if (Array.isArray(sensitiveZones)) {
      sensitiveZones.forEach((zone) => {
        const zLower = zone.toLowerCase();
        if (zLower.includes("hospital")) zoneScore += 10;
        if (zLower.includes("school") || zLower.includes("college")) zoneScore += 8;
        if (zLower.includes("metro") || zLower.includes("bus") || zLower.includes("station")) zoneScore += 6;
      });
    }
    zoneScore = Math.min(20, zoneScore);

    // Citizen Upvotes / Community Urgency
    const upvoteScore = Math.min(15, Math.floor((upvotes || 0) * 1.5));

    // Environmental / Monsoon factor
    const monsoonBonus = isMonsoon ? 4 : 0;

    // Total raw score clamped between 10 and 99
    const totalScore = Math.min(99, Math.max(15, severityScore + roadScore + zoneScore + upvoteScore + monsoonBonus));

    // Determine SLA & Priority Tier
    let priorityTier = "Tier 3 — Standard Priority";
    let slaHours = 72;
    let badgeColor = "#F59E0B"; // Warning yellow

    if (totalScore >= 90) {
      priorityTier = "Tier 1 — Emergency Dispatch";
      slaHours = 24;
      badgeColor = "#D32F2F"; // Danger red
    } else if (totalScore >= 75) {
      priorityTier = "Tier 2 — Urgent Rectification";
      slaHours = 48;
      badgeColor = "#FF9933"; // Saffron
    } else if (totalScore >= 50) {
      priorityTier = "Tier 3 — Standard Repair";
      slaHours = 72;
      badgeColor = "#138808"; // Green
    } else {
      priorityTier = "Tier 4 — Routine Maintenance";
      slaHours = 120;
      badgeColor = "#64748B"; // Slate
    }

    return {
      score: totalScore,
      tier: priorityTier,
      slaHours: slaHours,
      badgeColor: badgeColor,
      breakdown: {
        severityWeight: severityScore,
        trafficWeight: roadScore,
        vulnerableZoneWeight: zoneScore,
        citizenUrgencyWeight: upvoteScore
      }
    };
  }
}

window.priorityEngine = new SmartPriorityEngine();
