
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.rto_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number TEXT UNIQUE NOT NULL,
  vin TEXT UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  fuel_type TEXT DEFAULT 'Petrol',
  transmission TEXT DEFAULT 'Manual',
  color TEXT,
  engine_cc INTEGER,
  registered_at TEXT,  
  registered_state TEXT,
  owner_name TEXT,
  owner_count INTEGER DEFAULT 1,
  registration_date DATE,
  insurance_valid_until DATE,
  pollution_valid_until DATE,
  is_stolen BOOLEAN DEFAULT FALSE,
  has_loan BOOLEAN DEFAULT FALSE,
  loan_bank TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.car_history_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number TEXT NOT NULL,
  event_type TEXT NOT NULL,  
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cost_inr INTEGER,
  severity TEXT DEFAULT 'info', 
  odometer_km INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.car_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,  
  plate_number TEXT NOT NULL,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  mileage_km INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  asking_price_inr INTEGER,
  city TEXT,
 
  trust_score INTEGER,
  history_score INTEGER,
  condition_score INTEGER,
  price_score INTEGER,
  verdict TEXT,
  
  estimated_price_inr INTEGER,
  price_range_low INTEGER,
  price_range_high INTEGER,
 
  condition_issues JSONB DEFAULT '[]',
  repair_cost_inr INTEGER,
  
  annual_maint_cost INTEGER,
  next_service_km INTEGER,

  rto_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);



-- ============================================================
CREATE TABLE IF NOT EXISTS public.condition_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID REFERENCES public.car_verifications(id) ON DELETE CASCADE,
  plate_number TEXT,
  overall_score INTEGER,
  issues JSONB DEFAULT '[]',
  repair_estimate_inr INTEGER,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: maintenance_predictions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID REFERENCES public.car_verifications(id) ON DELETE CASCADE,
  plate_number TEXT,
  annual_cost_inr INTEGER,
  upcoming_services JSONB DEFAULT '[]',
  common_issues JSONB DEFAULT '[]',
  reliability_rating TEXT,
  five_year_cost_inr INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED: Mock RTO vehicle data (Indian cars)
-- ============================================================
INSERT INTO public.rto_vehicles (plate_number, vin, make, model, year, fuel_type, transmission, color, registered_at, registered_state, owner_name, owner_count, registration_date, insurance_valid_until, pollution_valid_until, is_stolen, has_loan)
VALUES
  ('MH12AB1234', 'MRHFB6550NP100001', 'Honda', 'City', 2021, 'Petrol', 'Automatic', 'Lunar Silver', 'Mumbai', 'Maharashtra', 'Rahul Sharma', 1, '2021-03-15', '2026-03-14', '2025-10-15', FALSE, FALSE),
  ('DL8CAB5678', 'MA3FJEB1S00200002', 'Maruti Suzuki', 'Swift', 2019, 'Petrol', 'Manual', 'Pearl Arctic White', 'Delhi', 'Delhi', 'Priya Verma', 2, '2019-07-22', '2025-07-21', '2025-04-20', FALSE, FALSE),
  ('KA01MN9012', 'MBJFK12G900300003', 'Toyota', 'Innova Crysta', 2020, 'Diesel', 'Manual', 'Super White', 'Bengaluru', 'Karnataka', 'Suresh Babu', 1, '2020-11-10', '2025-11-09', '2025-08-10', FALSE, FALSE),
  ('TN09XX3456', 'MALCA51ULHM400004', 'Hyundai', 'i20', 2018, 'Petrol', 'Manual', 'Fiery Red', 'Chennai', 'Tamil Nadu', 'Muthu Krishnan', 3, '2018-05-28', '2024-05-27', '2024-12-27', FALSE, TRUE),
  ('MH14ZZ7890', 'MAJ6S3GL0JCP500005', 'Ford', 'EcoSport', 2019, 'Petrol', 'Manual', 'Canyon Ridge', 'Pune', 'Maharashtra', 'Aniket Kulkarni', 2, '2019-08-14', '2025-08-13', '2025-05-13', FALSE, FALSE),
  ('GJ01XX2233', 'SALGA2BF5HA600006', 'Tata', 'Nexon', 2022, 'Petrol', 'Automatic', 'Calgary White', 'Ahmedabad', 'Gujarat', 'Kiran Patel', 1, '2022-01-20', '2027-01-19', '2025-12-20', FALSE, FALSE),
  ('MH01BJ9988', 'MB8PE9120LM700007', 'BMW', '3 Series', 2020, 'Petrol', 'Automatic', 'Alpine White', 'Mumbai', 'Maharashtra', 'Vikram Malhotra', 1, '2020-09-05', '2025-09-04', '2025-06-05', FALSE, FALSE),
  ('UP16CK4455', 'MA3EWDE1S00800008', 'Maruti Suzuki', 'Baleno', 2021, 'Petrol', 'CVT', 'Pearl Metallic Blue', 'Lucknow', 'Uttar Pradesh', 'Aditya Singh', 1, '2021-06-11', '2026-06-10', '2025-11-11', FALSE, FALSE)
ON CONFLICT (plate_number) DO NOTHING;

-- ============================================================
-- SEED: Car history events
-- ============================================================
INSERT INTO public.car_history_events (plate_number, event_type, event_date, title, description, cost_inr, severity, odometer_km)
VALUES
  -- Honda City
  ('MH12AB1234', 'ownership', '2021-03-15', 'Original Purchase', 'Purchased new from Honda dealer, Andheri Mumbai. Full warranty active.', 1050000, 'info', 0),
  ('MH12AB1234', 'service', '2021-11-20', 'Scheduled Service – 10,000 km', 'Oil change, filter replacement, brake inspection. All cleared.', 3200, 'info', 10000),
  ('MH12AB1234', 'service', '2022-08-14', 'Scheduled Service – 20,000 km', 'Honda authorized. Tires rotated, AC serviced.', 4500, 'info', 20000),
  ('MH12AB1234', 'insurance_claim', '2023-01-09', 'Minor Insurance Claim', 'Left rear bumper replaced after minor parking incident. No structural damage.', 12000, 'warning', 28500),
  ('MH12AB1234', 'service', '2023-05-22', 'Scheduled Service – 30,000 km', 'Full 30k service. Spark plugs, air filter, timing check completed.', 7800, 'info', 30000),
  -- Hyundai i20 (risky)
  ('TN09XX3456', 'accident', '2020-04-11', 'Major Accident – Front Collision', 'Front airbags deployed. Bonnet, bumper, radiator replaced. Third party claim.', 95000, 'danger', 15000),
  ('TN09XX3456', 'ownership', '2021-02-28', 'Ownership Transfer', 'Second owner purchase. Title transferred.', 0, 'warning', 32000),
  ('TN09XX3456', 'ownership', '2022-11-14', 'Ownership Transfer', 'Third owner purchase.', 0, 'warning', 51000),
  ('TN09XX3456', 'service', '2023-03-07', 'Overdue Service', 'Service 8 months overdue. Engine oil very dark, filter clogged.', 6200, 'danger', 58000),
  -- Maruti Swift
  ('DL8CAB5678', 'ownership', '2019-07-22', 'Original Purchase', 'Purchased new from Maruti dealer, Lajpat Nagar Delhi.', 680000, 'info', 0),
  ('DL8CAB5678', 'insurance_claim', '2021-03-17', 'Side Scratch Claim', 'Left door scratched in parking. Repainted.', 8500, 'warning', 24000),
  ('DL8CAB5678', 'ownership', '2022-08-30', 'Ownership Transfer', 'Second owner purchase.', 0, 'warning', 41000),
  -- Tata Nexon
  ('GJ01XX2233', 'ownership', '2022-01-20', 'Original Purchase', 'Purchased new from Tata dealer, Ahmedabad. Extended warranty added.', 920000, 'info', 0),
  ('GJ01XX2233', 'service', '2022-10-11', 'Scheduled Service – 7,500 km', 'First free service. All OK.', 0, 'info', 7500),
  ('GJ01XX2233', 'service', '2023-07-05', 'Scheduled Service – 15,000 km', 'Oil, filter, brake check. Minor AC gas top-up.', 4200, 'info', 15000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rto_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_history_events ENABLE ROW LEVEL SECURITY;

-- Public read for RTO (simulated public data)
CREATE POLICY "Public can read RTO vehicles" ON public.rto_vehicles FOR SELECT USING (TRUE);
CREATE POLICY "Public can read car history" ON public.car_history_events FOR SELECT USING (TRUE);

-- Verifications: anyone can insert (anonymous too via session_id), owners can read
CREATE POLICY "Anyone can create verification" ON public.car_verifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can read own verifications" ON public.car_verifications FOR SELECT USING (
  auth.uid() = user_id OR user_id IS NULL
);

-- Condition & maintenance: open insert, owner read
CREATE POLICY "Anyone can insert condition" ON public.condition_analyses FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read condition" ON public.condition_analyses FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert maintenance" ON public.maintenance_predictions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read maintenance" ON public.maintenance_predictions FOR SELECT USING (TRUE);

-- Users table
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rto_plate ON public.rto_vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_rto_vin ON public.rto_vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_history_plate ON public.car_history_events(plate_number);
CREATE INDEX IF NOT EXISTS idx_verifications_plate ON public.car_verifications(plate_number);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON public.car_verifications(user_id);
