-- ============================================================================
-- RoadFix — Smart Pothole Reporting & Road Safety Platform (India)
-- Supabase PostgreSQL Production Schema with RLS, Auth Triggers, and Seed Data
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP EXISTING TABLES IF RE-INITIALIZING (Safely handles idempotency)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS supporters CASCADE;
-- DROP TABLE IF EXISTS comments CASCADE;
-- DROP TABLE IF EXISTS pothole_reports CASCADE;
-- DROP TABLE IF EXISTS hotspots CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- 3. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT 'Citizen Reporter',
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'citizen', -- 'citizen' | 'authority' | 'admin'
    city TEXT NOT NULL DEFAULT 'Hyderabad',
    state TEXT NOT NULL DEFAULT 'Telangana',
    municipal_dept TEXT DEFAULT 'GHMC Citizen Cell',
    civic_points INT DEFAULT 100,
    badges TEXT[] DEFAULT ARRAY['Pothole Spotter'],
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POTHOLE REPORTS TABLE (Primary Operational Entity)
CREATE TABLE IF NOT EXISTS pothole_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL, -- e.g. RF-HYD-2026-0842
    citizen_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    city TEXT NOT NULL DEFAULT 'Hyderabad',
    road TEXT NOT NULL DEFAULT 'Main Road',
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'pothole', -- 'pothole', 'deep_crater', 'waterlogged_pothole', etc.
    severity TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'reported',  -- 'reported', 'ai_verified', 'assigned', 'repair_in_progress', 'citizen_verification', 'closed'
    priority_score INT DEFAULT 50,
    sla_hours INT DEFAULT 48,
    upvotes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    is_hotspot BOOLEAN DEFAULT FALSE,
    location JSONB DEFAULT '{}'::jsonb, -- {lat, lng, address, landmark, ward, sensitiveZones}
    images JSONB DEFAULT '{}'::jsonb,   -- {before, after}
    ai_analysis JSONB DEFAULT '{}'::jsonb, -- {detected, confidence, depthCm, diameterCm, hazardLevel, boundingBox, insights}
    assignment JSONB DEFAULT NULL,     -- {contractor, engineer, contact, scheduledDate, estimatedCost, materials}
    repair JSONB DEFAULT NULL,         -- {completedAt, crewNotes, asphaltType, warrantyMonths}
    citizen_verification JSONB DEFAULT NULL, -- {verified, rating, comment, verifiedAt}
    citizen JSONB DEFAULT '{}'::jsonb, -- {name, role, badge}
    status_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES pothole_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Citizen',
    user_role TEXT DEFAULT 'citizen',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPORTERS / UPVOTES TABLE
CREATE TABLE IF NOT EXISTS supporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES pothole_reports(id) ON DELETE CASCADE,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, user_id)
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES pothole_reports(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'status_update',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HOTSPOTS TABLE (Road Safety GIS Intelligence)
CREATE TABLE IF NOT EXISTS hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_meters INT DEFAULT 400,
    active_potholes_count INT DEFAULT 1,
    risk_level TEXT DEFAULT 'High',
    road_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pothole_reports_city ON pothole_reports(city);
CREATE INDEX IF NOT EXISTS idx_pothole_reports_status ON pothole_reports(status);
CREATE INDEX IF NOT EXISTS idx_pothole_reports_severity ON pothole_reports(severity);
CREATE INDEX IF NOT EXISTS idx_pothole_reports_priority ON pothole_reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_pothole_reports_created ON pothole_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_city ON hotspots(city);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pothole_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
END $$;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Pothole Reports Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view pothole reports" ON pothole_reports;
    DROP POLICY IF EXISTS "Anyone can create reports" ON pothole_reports;
    DROP POLICY IF EXISTS "Anyone can update reports" ON pothole_reports;
    DROP POLICY IF EXISTS "Anyone can delete reports" ON pothole_reports;
END $$;
CREATE POLICY "Anyone can view pothole reports" ON pothole_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can create reports" ON pothole_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reports" ON pothole_reports FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reports" ON pothole_reports FOR DELETE USING (true);

-- 3. Comments Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
    DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
END $$;
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON comments FOR INSERT WITH CHECK (true);

-- 4. Supporters Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view supporters" ON supporters;
    DROP POLICY IF EXISTS "Anyone can upvote" ON supporters;
    DROP POLICY IF EXISTS "Anyone can remove upvote" ON supporters;
END $$;
CREATE POLICY "Anyone can view supporters" ON supporters FOR SELECT USING (true);
CREATE POLICY "Anyone can upvote" ON supporters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can remove upvote" ON supporters FOR DELETE USING (true);

-- 5. Notifications Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
    DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
    DROP POLICY IF EXISTS "Anyone can update notifications" ON notifications;
END $$;
CREATE POLICY "Anyone can view notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE USING (true);

-- 6. Hotspots Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view hotspots" ON hotspots;
    DROP POLICY IF EXISTS "Anyone can insert hotspots" ON hotspots;
END $$;
CREATE POLICY "Anyone can view hotspots" ON hotspots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hotspots" ON hotspots FOR INSERT WITH CHECK (true);

-- 7. Audit Logs Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
END $$;
CREATE POLICY "Anyone can view audit logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, city, civic_points)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen Reporter'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
        COALESCE(NEW.raw_user_meta_data->>'city', 'Hyderabad'),
        100
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INITIAL SEED DATA INSERTION (Indian Metro Demonstration Hazards)
-- ============================================================================
INSERT INTO pothole_reports (
    ticket_number, city, road, title, description, category, severity, status, priority_score, sla_hours,
    upvotes_count, comments_count, is_hotspot,
    location, images, ai_analysis, assignment, repair, citizen
)
VALUES
(
    'RF-HYD-2026-0842', 'Hyderabad', 'Hitec City Cyber Towers Road',
    'Dangerous Pothole at Cyber Towers Signal Approach',
    'Deep jagged crater in the middle lane right before Cyber Towers signal. Heavy two-wheeler skidding risk during peak office hours and rains.',
    'deep_crater', 'critical', 'repair_in_progress', 94, 24, 42, 6, true,
    '{"lat": 17.4504, "lng": 78.3808, "address": "Opposite Cyber Towers, Madhapur, Hyderabad, Telangana 500081", "landmark": "Cyber Towers Signal & Metro Pillar #124", "ward": "Ward 104 - Kondapur", "sensitiveZones": ["Cyber Towers Tech Hub (50m)", "Metro Station (110m)"]}'::jsonb,
    '{"before": "assets/images/pothole_crater.jpg", "after": "assets/images/pothole_repaired.jpg"}'::jsonb,
    '{"detected": true, "confidence": 96.4, "depthCm": 18, "diameterCm": 78, "hazardLevel": "Critical Risk", "boundingBox": {"ymin": 42, "xmin": 24, "ymax": 82, "xmax": 68}, "duplicateRisk": 0.05, "insights": "Immediate danger to two-wheelers. Sharp aggregate edges."}'::jsonb,
    '{"contractor": "GHMC Rapid Patch Squad #4", "engineer": "Er. K. Srinivas Rao", "contact": "+91 98490 12345", "scheduledDate": "2026-10-07", "estimatedCost": 8500, "materials": "Dense Bituminous Macadam (DBM)"}'::jsonb,
    '{"completedAt": null, "crewNotes": "Surface milled, tack coat applied. Final asphalt layer being rolled.", "asphaltType": "VG-30 Bitumen Grade", "warrantyMonths": 18}'::jsonb,
    '{"name": "Rohit Varma", "role": "citizen", "badge": "Road Guardian"}'::jsonb
),
(
    'RF-HYD-2026-0819', 'Hyderabad', 'Jubilee Hills Road No. 36',
    'Large Pothole Repaired on Jubilee Hills Rd 36',
    'Substantial pothole repaired by GHMC. Need local citizen verification to confirm smooth compaction and no loose gravel.',
    'pothole', 'high', 'citizen_verification', 78, 48, 28, 4, false,
    '{"lat": 17.4326, "lng": 78.4071, "address": "Near Peddamma Temple Metro, Jubilee Hills, Hyderabad 500033", "landmark": "Opp. Jubilee Checkpost", "ward": "Ward 95 - Jubilee Hills", "sensitiveZones": ["Metro Station (80m)"]}'::jsonb,
    '{"before": "assets/images/pothole_waterlogged.jpg", "after": "assets/images/pothole_repaired.jpg"}'::jsonb,
    '{"detected": true, "confidence": 93.8, "depthCm": 14, "diameterCm": 62, "hazardLevel": "High Risk", "boundingBox": {"ymin": 40, "xmin": 30, "ymax": 78, "xmax": 70}, "duplicateRisk": 0.0, "insights": "Severe edge breakdown observed on high speed corridor."}'::jsonb,
    '{"contractor": "GHMC Zone 3 Maintenance Crew", "engineer": "Er. P. Venkatesh", "contact": "+91 98490 54321", "scheduledDate": "2026-10-06", "estimatedCost": 6200, "materials": "Hot Mix Asphalt + Bitumen Emulsion"}'::jsonb,
    '{"completedAt": "2026-10-07T08:30:00Z", "crewNotes": "Cleaned cavity, primed with SS-1 emulsion, filled with 40mm Bituminous Concrete and compacted.", "asphaltType": "Hot Mix Bituminous Concrete (BC)", "warrantyMonths": 12}'::jsonb,
    '{"name": "Ananya Reddy", "role": "citizen", "badge": "Pothole Spotter"}'::jsonb
),
(
    'RF-BLR-2026-1102', 'Bengaluru', 'Outer Ring Road Marathahalli',
    'Crater Cluster on Bus Priority Lane near Innovative Multiplex',
    'Cluster of 3 consecutive potholes in the bus lane causing traffic bottle necks and severe bike shocks.',
    'deep_crater', 'critical', 'assigned', 91, 24, 38, 5, true,
    '{"lat": 12.9553, "lng": 77.7011, "address": "Outer Ring Road, Marathahalli Bridge, Bengaluru, Karnataka 560037", "landmark": "Near Innovative Multiplex & Kalamandir", "ward": "Ward 85 - Doddanekkundi"}'::jsonb,
    '{"before": "assets/images/pothole_crater.jpg", "after": null}'::jsonb,
    '{"detected": true, "confidence": 95.1, "depthCm": 16, "diameterCm": 85, "hazardLevel": "Critical Risk", "boundingBox": {"ymin": 35, "xmin": 20, "ymax": 85, "xmax": 75}, "insights": "Cluster potholes on heavy bus corridor."}'::jsonb,
    '{"contractor": "BBMP Mahadevapura Quick Response Team", "engineer": "Er. Manjunath Swamy", "contact": "+91 94806 88123", "scheduledDate": "2026-10-08", "estimatedCost": 12000, "materials": "Polymer Modified Bitumen (PMB)"}'::jsonb,
    null,
    '{"name": "Praveen Kumar", "role": "citizen", "badge": "Civic Champion"}'::jsonb
),
(
    'RF-DEL-2026-0312', 'Delhi', 'Ring Road Ashram Underpass',
    'Waterlogged Crater at Ashram Flyover Descent',
    'Hidden underwater pothole causing severe vehicle underbody strikes and rim bends.',
    'waterlogged_pothole', 'critical', 'ai_verified', 89, 24, 54, 8, true,
    '{"lat": 28.5714, "lng": 77.2588, "address": "Ring Road, Ashram Chowk Underpass Approach, New Delhi 110014", "landmark": "Ashram Metro Station Exit 2", "ward": "Ward 142 - Ashram"}'::jsonb,
    '{"before": "assets/images/pothole_waterlogged.jpg", "after": null}'::jsonb,
    '{"detected": true, "confidence": 91.8, "depthCm": 19, "diameterCm": 90, "hazardLevel": "Critical Hazard", "boundingBox": {"ymin": 38, "xmin": 22, "ymax": 82, "xmax": 72}, "insights": "Standing water obscures deep crater edges."}'::jsonb,
    null, null,
    '{"name": "Vikram Malhotra", "role": "citizen", "badge": "Road Guardian"}'::jsonb
)
ON CONFLICT (ticket_number) DO NOTHING;

-- HOTSPOTS SEED DATA
INSERT INTO hotspots (city, zone_name, center_lat, center_lng, radius_meters, active_potholes_count, risk_level, road_type)
VALUES
('Hyderabad', 'Hitec City IT Corridor High-Risk Cluster', 17.4490, 78.3790, 450, 4, 'Critical', 'Major Arterial Road'),
('Hyderabad', 'Begumpet Railway Bridge Descent', 17.4440, 78.4680, 300, 2, 'Medium', 'City Collector'),
('Bengaluru', 'Silk Board & Outer Ring Road Interchange', 12.9175, 77.6235, 500, 5, 'Critical', 'National Highway Link'),
('Bengaluru', 'Marathahalli Multiplex Stretch', 12.9560, 77.7015, 350, 3, 'High', 'Major Arterial Road'),
('Delhi', 'Ashram Flyover & Mathura Road Junction', 28.5720, 77.2590, 400, 4, 'Critical', 'Ring Road Arterial'),
('Mumbai', 'Western Express Highway Goregaon East', 19.1620, 72.8580, 500, 5, 'Critical', 'Expressway'),
('Chennai', 'OMR Sholinganallur Tech Corridor', 12.9015, 80.2280, 450, 3, 'High', 'State Highway')
ON CONFLICT DO NOTHING;

-- INITIAL AUDIT LOG
INSERT INTO audit_logs (actor, action, details)
VALUES
('System Engine', 'SUPABASE_INITIALIZED', 'RoadFix PostgreSQL production database initialized with RLS and metro seed data.')
ON CONFLICT DO NOTHING;
