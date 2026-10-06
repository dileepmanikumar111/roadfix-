/**
 * RoadFix — Realistic Indian Cities Demo Dataset
 * Includes: Hyderabad, Visakhapatnam, Vijayawada, Bengaluru, Chennai, Mumbai, Delhi, Pune
 */

const SEED_CITIES = {
  hyderabad: {
    name: "Hyderabad",
    state: "Telangana",
    dept: "GHMC (Greater Hyderabad Municipal Corp)",
    center: [17.4485, 78.3772],
    zoom: 13,
    roads: [
      "Hitec City Cyber Towers Road",
      "Jubilee Hills Road No. 36",
      "Gachibowli Outer Ring Road Link",
      "Begumpet Main Road",
      "Secunderabad Station Road"
    ]
  },
  visakhapatnam: {
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    dept: "GVMC (Greater Visakhapatnam Municipal Corp)",
    center: [17.7164, 83.3150],
    zoom: 13,
    roads: [
      "Beach Road RK Beach Stretch",
      "MVP Colony Double Road",
      "Dwaraka Nagar 3rd Lane",
      "Siripuram Circle Road",
      "Gajuwaka Highway Junction"
    ]
  },
  vijayawada: {
    name: "Vijayawada",
    state: "Andhra Pradesh",
    dept: "VMC (Vijayawada Municipal Corp)",
    center: [16.5062, 80.6480],
    zoom: 13,
    roads: [
      "MG Road Benz Circle",
      "Governorpet Main Road",
      "BRTS Corridor Satyanarayanapuram",
      "Bandar Road Sub-collector Office",
      "Eluru Road Old Bus Stand"
    ]
  },
  bengaluru: {
    name: "Bengaluru",
    state: "Karnataka",
    dept: "BBMP (Bruhat Bengaluru Mahanagara Palike)",
    center: [12.9716, 77.5946],
    zoom: 13,
    roads: [
      "Outer Ring Road Marathahalli",
      "Indiranagar 100 Feet Road",
      "Whitefield ITPL Main Road",
      "Silk Board Junction Flyover Approach",
      "Hosur Road Bommanahalli"
    ]
  },
  chennai: {
    name: "Chennai",
    state: "Tamil Nadu",
    dept: "GCC (Greater Chennai Corporation)",
    center: [13.0827, 80.2707],
    zoom: 13,
    roads: [
      "Anna Salai Gemini Flyover",
      "OMR IT Corridor Sholinganallur",
      "Velachery Main Road",
      "Poonamallee High Road",
      "Pondy Bazaar T. Nagar"
    ]
  },
  mumbai: {
    name: "Mumbai",
    state: "Maharashtra",
    dept: "BMC (Brihanmumbai Municipal Corporation)",
    center: [19.0760, 72.8777],
    zoom: 13,
    roads: [
      "Western Express Highway Goregaon",
      "BKC Link Road Bandra East",
      "Andheri-Ghatkopar Link Road",
      "LBS Marg Kurla",
      "SV Road Santacruz"
    ]
  },
  delhi: {
    name: "Delhi",
    state: "Delhi NCR",
    dept: "MCD / Delhi PWD",
    center: [28.6139, 77.2090],
    zoom: 13,
    roads: [
      "Ring Road Ashram Underpass",
      "Outer Ring Road Nehru Place",
      "Connaught Place Outer Circle",
      "Vikas Marg Laxmi Nagar",
      "Aurobindo Marg IIT Gate"
    ]
  },
  pune: {
    name: "Pune",
    state: "Maharashtra",
    dept: "PMC (Pune Municipal Corporation)",
    center: [18.5204, 73.8567],
    zoom: 13,
    roads: [
      "Hinjewadi Phase 1 IT Park Road",
      "FC Road Deccan Gymkhana",
      "Nagar Road Viman Nagar",
      "Sinhagad Road Manik Baug",
      "Karve Road Kothrud"
    ]
  }
};

const SEED_REPORTS = [
  // 1. HYDERABAD - Active Critical (Showcase Report for Demo)
  {
    id: "rep-hyd-001",
    ticketNumber: "RF-HYD-2026-0842",
    city: "Hyderabad",
    title: "Dangerous Pothole at Cyber Towers Signal Approach",
    description: "Deep jagged crater in the middle lane right before Cyber Towers signal. Heavy two-wheeler skidding risk during peak office hours and rains.",
    category: "deep_crater",
    severity: "critical",
    status: "repair_in_progress",
    priorityScore: 94,
    slaHours: 24,
    road: "Hitec City Cyber Towers Road",
    location: {
      lat: 17.4504,
      lng: 78.3808,
      address: "Opposite Cyber Towers, Madhapur, Hyderabad, Telangana 500081",
      landmark: "Cyber Towers Signal & Metro Pillar #124",
      ward: "Ward 104 - Kondapur",
      sensitiveZones: ["Cyber Towers Tech Hub (50m)", "Metro Station (110m)", "Medicover Hospital (400m)"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: "assets/images/pothole_repaired.jpg"
    },
    aiAnalysis: {
      detected: true,
      confidence: 96.4,
      depthCm: 18,
      diameterCm: 78,
      hazardLevel: "Critical Risk (Severe Vehicle/Spill Hazard)",
      boundingBox: { ymin: 42, xmin: 24, ymax: 82, xmax: 68 },
      duplicateRisk: 0.05,
      insights: "Immediate danger to two-wheelers. Sharp aggregate edges can cause tyre blowout."
    },
    assignment: {
      contractor: "GHMC Rapid Patch Squad #4",
      engineer: "Er. K. Srinivas Rao",
      contact: "+91 98490 12345",
      scheduledDate: "2026-10-07",
      estimatedCost: 8500,
      materials: "Dense Bituminous Macadam (DBM) + Cold Polymer Patch"
    },
    repair: {
      completedAt: null,
      crewNotes: "Surface milled, tack coat applied. Final asphalt layer being rolled.",
      asphaltType: "VG-30 Bitumen Grade",
      warrantyMonths: 18
    },
    upvotesCount: 42,
    upvotedByMe: false,
    commentsCount: 6,
    citizen: {
      name: "Rohit Varma",
      role: "citizen",
      badge: "Road Guardian"
    },
    createdAt: "2026-10-05T09:15:00Z",
    updatedAt: "2026-10-06T14:30:00Z"
  },

  // 2. HYDERABAD - Repaired (Awaiting Citizen Verification)
  {
    id: "rep-hyd-002",
    ticketNumber: "RF-HYD-2026-0819",
    city: "Hyderabad",
    title: "Large Pothole Repaired on Jubilee Hills Rd 36",
    description: "Substantial pothole repaired by GHMC. Need local citizen verification to confirm smooth compaction and no loose gravel.",
    category: "pothole",
    severity: "high",
    status: "citizen_verification",
    priorityScore: 78,
    slaHours: 48,
    road: "Jubilee Hills Road No. 36",
    location: {
      lat: 17.4326,
      lng: 78.4071,
      address: "Near Peddamma Temple Metro, Jubilee Hills, Hyderabad 500033",
      landmark: "Opp. Jubilee Checkpost",
      ward: "Ward 98 - Jubilee Hills",
      sensitiveZones: ["Peddamma Temple (150m)", "Metro Station (80m)"]
    },
    images: {
      before: "assets/images/pothole_waterlogged.jpg",
      after: "assets/images/pothole_repaired.jpg"
    },
    aiAnalysis: {
      detected: true,
      confidence: 93.8,
      depthCm: 14,
      diameterCm: 55,
      hazardLevel: "High Risk",
      boundingBox: { ymin: 45, xmin: 30, ymax: 80, xmax: 65 },
      duplicateRisk: 0.02,
      insights: "Cracked perimeter; water infiltration previously degraded sub-base."
    },
    assignment: {
      contractor: "L&T Urban Infra Maintenance",
      engineer: "P. Raghunath",
      contact: "+91 94401 56789",
      scheduledDate: "2026-10-05",
      estimatedCost: 6200,
      materials: "Bituminous Concrete"
    },
    repair: {
      completedAt: "2026-10-06T11:00:00Z",
      crewNotes: "Pothole squared off, base compacted, hot mix asphalt rolled to level.",
      asphaltType: "Hot Mix Bituminous Concrete (BC)",
      warrantyMonths: 12
    },
    upvotesCount: 29,
    upvotedByMe: true,
    commentsCount: 3,
    citizen: {
      name: "Sneha Reddy",
      role: "citizen",
      badge: "Civic Champion"
    },
    createdAt: "2026-10-04T11:30:00Z",
    updatedAt: "2026-10-06T11:20:00Z"
  },

  // 3. BENGALURU - Critical Hotspot
  {
    id: "rep-blr-001",
    ticketNumber: "RF-BLR-2026-1104",
    city: "Bengaluru",
    title: "Severe Road Cave-In on Outer Ring Road Marathahalli",
    description: "Deep trench cave-in after heavy rain near Marathahalli bridge. Buses and cars forced to swerve abruptly causing 2km traffic jam.",
    category: "road_cave_in",
    severity: "critical",
    status: "authority_review",
    priorityScore: 97,
    slaHours: 24,
    road: "Outer Ring Road Marathahalli",
    location: {
      lat: 12.9569,
      lng: 77.7011,
      address: "ORR Marathahalli, Near Innovative Multiplex, Bengaluru 560037",
      landmark: "Marathahalli Flyover descent",
      ward: "Ward 85 - Doddanekkundi",
      sensitiveZones: ["School Bus Route (100m)", "Tech Park Entrance (250m)"]
    },
    images: {
      before: "assets/images/pothole_waterlogged.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 98.1,
      depthCm: 22,
      diameterCm: 90,
      hazardLevel: "Critical Safety Emergency",
      boundingBox: { ymin: 40, xmin: 20, ymax: 85, xmax: 75 },
      duplicateRisk: 0.12,
      insights: "Severe sub-grade failure with water accumulation. High rollover risk for autos."
    },
    assignment: null,
    repair: null,
    upvotesCount: 68,
    upvotedByMe: false,
    commentsCount: 12,
    citizen: {
      name: "Arjun Nair",
      role: "citizen",
      badge: "Pothole Spotter"
    },
    createdAt: "2026-10-06T06:00:00Z",
    updatedAt: "2026-10-06T06:05:00Z"
  },

  // 4. BENGALURU - Closed & Verified
  {
    id: "rep-blr-002",
    ticketNumber: "RF-BLR-2026-0982",
    city: "Bengaluru",
    title: "100ft Road Indiranagar Edge Cracks Restored",
    description: "Edge breakdown near 12th Main junction completely repaved and leveled with curb.",
    category: "broken_edge",
    severity: "medium",
    status: "closed",
    priorityScore: 62,
    slaHours: 72,
    road: "Indiranagar 100 Feet Road",
    location: {
      lat: 12.9784,
      lng: 77.6408,
      address: "100ft Rd, HAL 2nd Stage, Indiranagar, Bengaluru 560038",
      landmark: "Near 12th Main Junction",
      ward: "Ward 112 - Domlur",
      sensitiveZones: ["Metro Station (300m)"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: "assets/images/pothole_repaired.jpg"
    },
    aiAnalysis: {
      detected: true,
      confidence: 91.2,
      depthCm: 9,
      diameterCm: 45,
      hazardLevel: "Moderate",
      boundingBox: { ymin: 50, xmin: 35, ymax: 75, xmax: 60 },
      duplicateRisk: 0.0,
      insights: "Edge erosion due to heavy vehicle parking."
    },
    assignment: {
      contractor: "BBMP Ward 112 Rapid Action Squad",
      engineer: "C. Manjunath",
      contact: "+91 99002 44321",
      scheduledDate: "2026-10-03",
      estimatedCost: 4000,
      materials: "Cold Bituminous Mix"
    },
    repair: {
      completedAt: "2026-10-04T15:00:00Z",
      crewNotes: "Compacted and edge sealed.",
      asphaltType: "Mastic Asphalt",
      warrantyMonths: 12
    },
    upvotesCount: 15,
    upvotedByMe: false,
    commentsCount: 2,
    citizen: {
      name: "Pooja Hegde",
      role: "citizen",
      badge: "Master Verifier"
    },
    createdAt: "2026-10-02T10:00:00Z",
    updatedAt: "2026-10-05T08:00:00Z"
  },

  // 5. MUMBAI - Western Express Highway
  {
    id: "rep-mum-001",
    ticketNumber: "RF-MUM-2026-0521",
    city: "Mumbai",
    title: "High-Speed Lane Pothole on Western Express Highway",
    description: "Dangerous pothole right after Goregaon flyover in the fast lane. Vehicles braking violently causing near-miss pileups.",
    category: "pothole",
    severity: "critical",
    status: "assigned",
    priorityScore: 92,
    slaHours: 24,
    road: "Western Express Highway Goregaon",
    location: {
      lat: 19.1646,
      lng: 72.8596,
      address: "WEH Southbound, Goregaon East, Mumbai 400063",
      landmark: "Near Hub Mall Flyover descent",
      ward: "BMC P/South Ward",
      sensitiveZones: ["Metro Line 7 Station (150m)", "Flyover Ramp (50m)"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 97.2,
      depthCm: 16,
      diameterCm: 70,
      hazardLevel: "Critical Express Hazard",
      boundingBox: { ymin: 42, xmin: 25, ymax: 82, xmax: 65 },
      duplicateRisk: 0.08,
      insights: "High speed segment (70 km/h speed limit). High vehicle damage index."
    },
    assignment: {
      contractor: "BMC Expressway Emergency Team",
      engineer: "S. Deshmukh",
      contact: "+91 98200 77112",
      scheduledDate: "2026-10-07",
      estimatedCost: 9200,
      materials: "Quick-setting Polymer Concrete & Bituminous Macadam"
    },
    repair: null,
    upvotesCount: 84,
    upvotedByMe: false,
    commentsCount: 9,
    citizen: {
      name: "Vikram Kulkarni",
      role: "citizen",
      badge: "Road Guardian"
    },
    createdAt: "2026-10-05T18:00:00Z",
    updatedAt: "2026-10-06T09:00:00Z"
  },

  // 6. CHENNAI - Anna Salai
  {
    id: "rep-chn-001",
    ticketNumber: "RF-CHN-2026-0418",
    city: "Chennai",
    title: "Waterlogged Crater near Gemini Flyover",
    description: "Monsoon rainwater filling deep pothole on left lane of Anna Salai. Motorcyclists unable to judge depth.",
    category: "waterlogged_pothole",
    severity: "high",
    status: "repair_scheduled",
    priorityScore: 86,
    slaHours: 48,
    road: "Anna Salai Gemini Flyover",
    location: {
      lat: 13.0524,
      lng: 80.2508,
      address: "Anna Salai, Thousand Lights, Chennai 600006",
      landmark: "Near US Consulate / Gemini Circle",
      ward: "Zone 9 - Teynampet",
      sensitiveZones: ["Hospital (200m)", "High Traffic Corridor"]
    },
    images: {
      before: "assets/images/pothole_waterlogged.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 94.6,
      depthCm: 15,
      diameterCm: 65,
      hazardLevel: "High Waterlogged Hazard",
      boundingBox: { ymin: 44, xmin: 22, ymax: 84, xmax: 70 },
      duplicateRisk: 0.04,
      insights: "Submerged cavity obscuring true depth. Significant hydroplaning hazard."
    },
    assignment: {
      contractor: "GCC Zone 9 Road Maintenance Cell",
      engineer: "M. Ramanathan",
      contact: "+91 94440 33221",
      scheduledDate: "2026-10-07",
      estimatedCost: 7100,
      materials: "Hydrophobic Polymer Asphalt"
    },
    repair: null,
    upvotesCount: 37,
    upvotedByMe: false,
    commentsCount: 4,
    citizen: {
      name: "Karthik Subramanian",
      role: "citizen",
      badge: "Civic Champion"
    },
    createdAt: "2026-10-05T14:20:00Z",
    updatedAt: "2026-10-06T08:15:00Z"
  },

  // 7. VISAKHAPATNAM - Beach Road
  {
    id: "rep-viz-001",
    ticketNumber: "RF-VIZ-2026-0294",
    city: "Visakhapatnam",
    title: "Pothole on RK Beach Promenade Road",
    description: "Coastal road asphalt erosion near Submarine Museum curve. Tourist rush and morning runners affected.",
    category: "pothole",
    severity: "medium",
    status: "ai_verified",
    priorityScore: 68,
    slaHours: 72,
    road: "Beach Road RK Beach Stretch",
    location: {
      lat: 17.7145,
      lng: 83.3320,
      address: "Beach Rd, Pandurangapuram, Visakhapatnam 530003",
      landmark: "Near Kursura Submarine Museum",
      ward: "Zone 3 - Ward 19",
      sensitiveZones: ["Tourist Promenade", "School Zone (350m)"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 92.5,
      depthCm: 10,
      diameterCm: 48,
      hazardLevel: "Medium",
      boundingBox: { ymin: 48, xmin: 28, ymax: 78, xmax: 62 },
      duplicateRisk: 0.01,
      insights: "Saline air and humidity degrading bitumen binder."
    },
    assignment: null,
    repair: null,
    upvotesCount: 21,
    upvotedByMe: false,
    commentsCount: 2,
    citizen: {
      name: "G. Varun",
      role: "citizen",
      badge: "Pothole Spotter"
    },
    createdAt: "2026-10-06T07:45:00Z",
    updatedAt: "2026-10-06T07:50:00Z"
  },

  // 8. VIJAYAWADA - MG Road Benz Circle
  {
    id: "rep-vij-001",
    ticketNumber: "RF-VIJ-2026-0311",
    city: "Vijayawada",
    title: "Crater on MG Road Near Benz Circle Flyover",
    description: "Deep cavity at the foot of Benz Circle flyover on MG Road. Auto rickshaws and two wheelers wobbling heavily.",
    category: "deep_crater",
    severity: "high",
    status: "authority_review",
    priorityScore: 82,
    slaHours: 48,
    road: "MG Road Benz Circle",
    location: {
      lat: 16.4998,
      lng: 80.6548,
      address: "MG Road, Benz Circle, Vijayawada 520010",
      landmark: "Benz Circle Junction",
      ward: "Circle 2 - Ward 32",
      sensitiveZones: ["Commercial Hub", "Bus Stop (60m)"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 95.1,
      depthCm: 13,
      diameterCm: 60,
      hazardLevel: "High Urban Hazard",
      boundingBox: { ymin: 46, xmin: 26, ymax: 82, xmax: 66 },
      duplicateRisk: 0.03,
      insights: "Heavy commercial traffic accelerating base subsidence."
    },
    assignment: null,
    repair: null,
    upvotesCount: 31,
    upvotedByMe: false,
    commentsCount: 5,
    citizen: {
      name: "V. Lakshmi",
      role: "citizen",
      badge: "Road Guardian"
    },
    createdAt: "2026-10-06T08:30:00Z",
    updatedAt: "2026-10-06T08:35:00Z"
  },

  // 9. DELHI - Ring Road Ashram
  {
    id: "rep-del-001",
    ticketNumber: "RF-DEL-2026-0744",
    city: "Delhi",
    title: "Hazardous Crater Near Ashram Flyover Descent",
    description: "Substantial crater in middle lane of Ring Road towards Ashram. High speed traffic causing severe sudden braking.",
    category: "pothole",
    severity: "critical",
    status: "assigned",
    priorityScore: 91,
    slaHours: 24,
    road: "Ring Road Ashram Underpass",
    location: {
      lat: 28.5714,
      lng: 77.2592,
      address: "Ring Road, Ashram Chowk, New Delhi 110014",
      landmark: "Ashram Flyover South Ramp",
      ward: "MCD South Zone",
      sensitiveZones: ["Metro Station (90m)", "Interstate Corridor"]
    },
    images: {
      before: "assets/images/pothole_crater.jpg",
      after: null
    },
    aiAnalysis: {
      detected: true,
      confidence: 96.8,
      depthCm: 17,
      diameterCm: 72,
      hazardLevel: "Critical Arterial Hazard",
      boundingBox: { ymin: 43, xmin: 24, ymax: 83, xmax: 67 },
      duplicateRisk: 0.06,
      insights: "Heavy truck and bus load corridor. Urgent hot mastic patch recommended."
    },
    assignment: {
      contractor: "Delhi PWD Road Maintenance Div #3",
      engineer: "Anil Sharma",
      contact: "+91 98110 99882",
      scheduledDate: "2026-10-07",
      estimatedCost: 7800,
      materials: "Bituminous Concrete + Tack Coat"
    },
    repair: null,
    upvotesCount: 53,
    upvotedByMe: false,
    commentsCount: 7,
    citizen: {
      name: "Rajesh Gupta",
      role: "citizen",
      badge: "Road Guardian"
    },
    createdAt: "2026-10-05T16:00:00Z",
    updatedAt: "2026-10-06T10:00:00Z"
  },

  // 10. PUNE - Hinjewadi IT Park
  {
    id: "rep-pun-001",
    ticketNumber: "RF-PUN-2026-0622",
    city: "Pune",
    title: "Waterlogged Trench on Hinjewadi Phase 1 Main Road",
    description: "Deep pothole filled with water near Infosys circle. IT commuters on two-wheelers facing daily skid hazards.",
    category: "waterlogged_pothole",
    severity: "high",
    status: "repair_in_progress",
    priorityScore: 88,
    slaHours: 48,
    road: "Hinjewadi Phase 1 IT Park Road",
    location: {
      lat: 18.5912,
      lng: 73.7389,
      address: "Hinjewadi Phase 1, Near Infosys Gate 1, Pune 411057",
      landmark: "Infosys Circle",
      ward: "PMRDA IT Corridor",
      sensitiveZones: ["Major IT Park Gate (40m)", "Metro Pillar (80m)"]
    },
    images: {
      before: "assets/images/pothole_waterlogged.jpg",
      after: "assets/images/pothole_repaired.jpg"
    },
    aiAnalysis: {
      detected: true,
      confidence: 95.3,
      depthCm: 16,
      diameterCm: 68,
      hazardLevel: "High Tech Park Hazard",
      boundingBox: { ymin: 44, xmin: 25, ymax: 84, xmax: 69 },
      duplicateRisk: 0.02,
      insights: "Drainage backflow exacerbating asphalt erosion."
    },
    assignment: {
      contractor: "PMRDA Quick Response Road Unit",
      engineer: "Sachin Patil",
      contact: "+91 97650 44119",
      scheduledDate: "2026-10-06",
      estimatedCost: 6900,
      materials: "Pre-mix Cold Asphalt & Geotextile underlay"
    },
    repair: {
      completedAt: null,
      crewNotes: "Water pumped out, crushed stone base laid and compacted.",
      asphaltType: "Cold Mix Bituminous",
      warrantyMonths: 12
    },
    upvotesCount: 47,
    upvotedByMe: true,
    commentsCount: 6,
    citizen: {
      name: "Amit Joshi",
      role: "citizen",
      badge: "Civic Champion"
    },
    createdAt: "2026-10-05T08:00:00Z",
    updatedAt: "2026-10-06T13:00:00Z"
  }
];

const SEED_HOTSPOTS = [
  {
    id: "hs-hyd-01",
    city: "Hyderabad",
    zone: "Cyber Towers & Madhapur IT Corridor",
    lat: 17.4504,
    lng: 78.3808,
    radius: 450,
    activeCount: 6,
    riskLevel: "Critical",
    description: "High traffic IT corridor with frequent heavy utility cuts and monsoon wear."
  },
  {
    id: "hs-blr-01",
    city: "Bengaluru",
    zone: "Outer Ring Road Marathahalli - Bellandur Stretch",
    lat: 12.9569,
    lng: 77.7011,
    radius: 600,
    activeCount: 11,
    riskLevel: "Critical",
    description: "Major tech commute route suffering sub-base degradation and water pooling."
  },
  {
    id: "hs-mum-01",
    city: "Mumbai",
    zone: "Western Express Highway Goregaon - Malad Junction",
    lat: 19.1646,
    lng: 72.8596,
    radius: 500,
    activeCount: 8,
    riskLevel: "Critical",
    description: "High-speed expressway segment with repeated monsoon pitting."
  },
  {
    id: "hs-chn-01",
    city: "Chennai",
    zone: "Anna Salai - Gemini Circle Junction",
    lat: 13.0524,
    lng: 80.2508,
    radius: 350,
    activeCount: 4,
    riskLevel: "High",
    description: "Arterial crossroads with frequent heavy bus deceleration wear."
  }
];

window.ROADFIX_SEEDS = {
  cities: SEED_CITIES,
  reports: SEED_REPORTS,
  hotspots: SEED_HOTSPOTS
};
