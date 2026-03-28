// ============================================================
// CarTrust AI — Backend API (Node.js + Express)
// ============================================================
// Install:  npm install express @supabase/supabase-js cors dotenv
// Run:      node server.js  (or: nodemon server.js)
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());



// ── Supabase Client ──────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================================
// HELPERS — AI Logic (rule-based ML simulation)
// ============================================================

/**
 * Calculate trust score from multiple factors
 */
function calculateTrustScore({ rtoData, events, mileage, askingPrice, estimatedPrice }) {
  let historyScore = 100;
  let priceScore = 100;

  // History scoring
  for (const ev of events) {
    if (ev.event_type === 'accident' && ev.severity === 'danger') historyScore -= 30;
    if (ev.event_type === 'accident' && ev.severity === 'warning') historyScore -= 15;
    if (ev.event_type === 'insurance_claim') historyScore -= 8;
    if (ev.event_type === 'ownership') historyScore -= 5; // each extra owner
  }
  if (rtoData?.is_stolen) historyScore -= 60;
  if (rtoData?.has_loan) historyScore -= 15;
  if (mileage > 80000) historyScore -= 10;
  if (mileage > 120000) historyScore -= 15;
  historyScore = Math.max(0, Math.min(100, historyScore));

  // Price scoring
  if (estimatedPrice > 0) {
    const diff = ((askingPrice - estimatedPrice) / estimatedPrice) * 100;
    if (diff > 20) priceScore = 50;
    else if (diff > 10) priceScore = 70;
    else if (diff > 5) priceScore = 85;
    else if (diff < -5) priceScore = 100; // underpriced = great deal
    else priceScore = 95;
  }

  // Condition score default (without image upload: assume good)
  const conditionScore = 75;

  const trust = Math.round(historyScore * 0.45 + conditionScore * 0.3 + priceScore * 0.25);

  return {
    trust_score: Math.max(0, Math.min(100, trust)),
    history_score: historyScore,
    condition_score: conditionScore,
    price_score: priceScore,
    verdict: trust >= 80 ? 'safe' : trust >= 60 ? 'moderate' : 'risky'
  };
}

/**
 * Estimate fair market price using rule-based depreciation model
 */
function estimatePrice({ make, model, year, mileage, fuelType, transmission, condition }) {
  // Base prices (INR) for popular models in 2024
  const basePrices = {
    'Honda City': 1100000,
    'Maruti Suzuki Swift': 720000,
    'Maruti Suzuki Baleno': 760000,
    'Toyota Innova Crysta': 1950000,
    'Hyundai i20': 800000,
    'Ford EcoSport': 850000,
    'Tata Nexon': 940000,
    'BMW 3 Series': 5500000,
    'Hyundai Creta': 1100000,
    'Maruti Suzuki Dzire': 700000,
  };

  const modelKey = `${make} ${model}`;
  let base = basePrices[modelKey] || 800000;

  // Age depreciation: ~15% per year, capped at 70%
  const age = new Date().getFullYear() - year;
  const ageDep = Math.min(0.70, age * 0.15);
  base *= (1 - ageDep);

  // Mileage depreciation: ₹1 per km over 10k average/year
  const expectedMileage = age * 12000;
  const excessKm = Math.max(0, mileage - expectedMileage);
  base -= excessKm * 1.2;

  // Fuel/transmission premium
  if (fuelType === 'Diesel') base *= 1.05;
  if (transmission === 'Automatic' || transmission === 'CVT') base *= 1.04;

  // Condition adjustment
  const conditionMult = { excellent: 1.05, good: 1.0, fair: 0.90, poor: 0.78 };
  base *= (conditionMult[condition] || 1.0);

  base = Math.max(50000, Math.round(base / 1000) * 1000);
  return {
    estimated_price: base,
    range_low: Math.round(base * 0.93 / 1000) * 1000,
    range_high: Math.round(base * 1.07 / 1000) * 1000,
    breakdown: {
      base_value: Math.round(basePrices[modelKey] || 800000),
      age_depreciation: -Math.round((basePrices[modelKey] || 800000) * ageDep),
      mileage_depreciation: -Math.round(excessKm * 1.2),
      fuel_premium: fuelType === 'Diesel' ? Math.round(base * 0.05) : 0,
      transmission_premium: (transmission === 'Automatic' || transmission === 'CVT') ? Math.round(base * 0.04) : 0,
    }
  };
}

/**
 * Generate maintenance prediction
 */
function predictMaintenance({ make, model, year, mileage, fuelType }) {
  const age = new Date().getFullYear() - year;
  const isLuxury = ['BMW', 'Mercedes', 'Audi', 'Volvo'].includes(make);
  const isDiesel = fuelType === 'Diesel';
  const highMileage = mileage > 80000;

  let annualCost = isLuxury ? 45000 : isDiesel ? 22000 : 16000;
  if (highMileage) annualCost *= 1.4;
  if (age > 7) annualCost *= 1.2;

  // Next service interval (every 10k km rounded)
  const nextService = Math.ceil(mileage / 10000) * 10000;
  const kmToService = nextService - mileage;

  const upcoming = [
    { service: `${nextService >= 40000 ? 'Major' : 'Minor'} ${nextService / 1000}k Service`, km: nextService, cost: nextService % 40000 === 0 ? 9000 : 4500, urgency: kmToService < 2000 ? 'urgent' : 'moderate' },
    { service: 'Engine Oil & Filter', km: nextService, cost: 2800, urgency: kmToService < 1000 ? 'urgent' : 'moderate' },
    { service: 'Tire Rotation / Check', km: mileage + 5000, cost: 500, urgency: 'low' },
    { service: 'Brake Fluid Change', km: mileage + 15000, cost: 1200, urgency: 'low' },
    { service: 'Battery Check', km: mileage + 20000, cost: isLuxury ? 12000 : 5000, urgency: 'low' },
  ];

  const reliability = isLuxury ? 'moderate' : highMileage ? 'moderate' : 'high';

  return {
    annual_cost: Math.round(annualCost),
    next_service_km: nextService,
    km_to_service: kmToService,
    upcoming_services: upcoming,
    reliability,
    five_year_cost: Math.round(annualCost * 5),
    common_issues: getCommonIssues(make, model),
  };
}

function getCommonIssues(make, model) {
  const issues = {
    'Honda City': [
      { issue: 'CVT Transmission Fluid', note: 'Needs replacement at 40k km. Often missed.', severity: 'warning' },
      { issue: 'AC Condenser', note: 'Known minor issue on 2020-22 batch. Check cooling.', severity: 'warning' },
      { issue: 'Engine Reliability', note: '1.5L VTEC is highly reliable up to 2 lakh km.', severity: 'info' },
    ],
    'Maruti Suzuki Swift': [
      { issue: 'Gear Shift Knob Wobble', note: 'Common cosmetic issue after 40k km.', severity: 'info' },
      { issue: 'Clutch Wear', note: 'Manual variants may need clutch at 70-80k km.', severity: 'warning' },
    ],
    'Hyundai i20': [
      { issue: 'Turbo Lag (diesel)', note: 'Diesel variants show turbo issues after 80k km.', severity: 'warning' },
      { issue: 'Electrical Issues', note: 'Some units have dashboard sensor faults.', severity: 'warning' },
    ],
    'Tata Nexon': [
      { issue: 'AMT Gearbox Jerk', note: 'AMT variants can jerk at low speeds. Normal behavior.', severity: 'info' },
      { issue: 'Strong Build Quality', note: 'One of the safest cars in its segment (5-star NCAP).', severity: 'info' },
    ],
  };
  const key = `${make} ${model}`;
  return issues[key] || [
    { issue: 'Regular Oil Changes', note: 'Most critical maintenance item. Every 5-10k km.', severity: 'info' },
    { issue: 'Tire Pressure', note: 'Check monthly. Uneven wear indicates alignment issues.', severity: 'info' },
  ];
}

// ============================================================
// ROUTES
// ============================================================

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CarTrust AI Backend', timestamp: new Date().toISOString() });
});

// ── RTO Lookup ───────────────────────────────────────────────
// GET /api/rto/:plate
app.get('/api/rto/:plate', async (req, res) => {
  try {
    const plate = req.params.plate.toUpperCase().replace(/\s/g, '');

    const { data: vehicle, error } = await supabase
      .from('rto_vehicles')
      .select('*')
      .eq('plate_number', plate)
      .single();

    if (error || !vehicle) {
      return res.status(404).json({
        found: false,
        message: 'Vehicle not found in RTO database. Please verify the plate number.',
        plate_number: plate
      });
    }

    // Fetch history events
    const { data: events } = await supabase
      .from('car_history_events')
      .select('*')
      .eq('plate_number', plate)
      .order('event_date', { ascending: false });

    // Check document validity
    const today = new Date();
    const insuranceExpiry = vehicle.insurance_valid_until ? new Date(vehicle.insurance_valid_until) : null;
    const pollutionExpiry = vehicle.pollution_valid_until ? new Date(vehicle.pollution_valid_until) : null;

    return res.json({
      found: true,
      vehicle,
      events: events || [],
      flags: {
        insurance_expired: insuranceExpiry && insuranceExpiry < today,
        pollution_expired: pollutionExpiry && pollutionExpiry < today,
        is_stolen: vehicle.is_stolen,
        has_loan: vehicle.has_loan,
        multiple_owners: vehicle.owner_count > 1,
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── Car History ──────────────────────────────────────────────
// GET /api/history/:plate
app.get('/api/history/:plate', async (req, res) => {
  try {
    const plate = req.params.plate.toUpperCase().replace(/\s/g, '');
    const { data: events, error } = await supabase
      .from('car_history_events')
      .select('*')
      .eq('plate_number', plate)
      .order('event_date', { ascending: true });

    if (error) throw error;
    res.json({ plate_number: plate, events: events || [], count: events?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Price Estimation ─────────────────────────────────────────
// POST /api/predict-price
app.post('/api/predict-price', async (req, res) => {
  try {
    const { make, model, year, mileage, fuel_type, transmission, condition, city } = req.body;
    if (!make || !model || !year) {
      return res.status(400).json({ error: 'make, model, year are required' });
    }
    const result = estimatePrice({
      make, model,
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      fuelType: fuel_type,
      transmission,
      condition: condition || 'good',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Maintenance Prediction ───────────────────────────────────
// POST /api/predict-maintenance
app.post('/api/predict-maintenance', async (req, res) => {
  try {
    const { make, model, year, mileage, fuel_type } = req.body;
    if (!make || !model || !year) {
      return res.status(400).json({ error: 'make, model, year are required' });
    }
    const result = predictMaintenance({
      make, model,
      year: parseInt(year),
      mileage: parseInt(mileage) || 0,
      fuelType: fuel_type,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Full Car Verification (main endpoint) ────────────────────
// POST /api/analyze-car
app.post('/api/analyze-car', async (req, res) => {
  try {
    const {
      plate_number, vin, make, model, year, mileage_km,
      fuel_type, transmission, asking_price, city,
      user_id, session_id, condition
    } = req.body;

    if (!plate_number && !vin) {
      return res.status(400).json({ error: 'plate_number or vin is required' });
    }

    const plate = plate_number?.toUpperCase().replace(/\s/g, '');

    // 1. RTO Lookup
    let rtoData = null;
    let events = [];
    let flags = {};

    if (plate) {
      const { data: vehicle } = await supabase
        .from('rto_vehicles')
        .select('*')
        .eq('plate_number', plate)
        .maybeSingle();

      rtoData = vehicle;

      const { data: historyEvents } = await supabase
        .from('car_history_events')
        .select('*')
        .eq('plate_number', plate)
        .order('event_date', { ascending: false });

      events = historyEvents || [];

      if (rtoData) {
        const today = new Date();
        flags = {
          insurance_expired: rtoData.insurance_valid_until && new Date(rtoData.insurance_valid_until) < today,
          pollution_expired: rtoData.pollution_valid_until && new Date(rtoData.pollution_valid_until) < today,
          is_stolen: rtoData.is_stolen,
          has_loan: rtoData.has_loan,
          multiple_owners: rtoData.owner_count > 1,
        };
      }
    }

    // Use RTO data if available, else fall back to user input
    const carMake = rtoData?.make || make;
    const carModel = rtoData?.model || model;
    const carYear = rtoData?.year || parseInt(year);
    const carFuel = rtoData?.fuel_type || fuel_type;
    const carTransmission = rtoData?.transmission || transmission;
    const mileage = parseInt(mileage_km) || 0;
    const askingPrice = parseInt(asking_price) || 0;

    // 2. Price Estimation
    const priceResult = estimatePrice({
      make: carMake, model: carModel,
      year: carYear, mileage, fuelType: carFuel,
      transmission: carTransmission, condition: condition || 'good',
    });

    // 3. Trust Score
    const scores = calculateTrustScore({
      rtoData, events, mileage, askingPrice, estimatedPrice: priceResult.estimated_price
    });

    // 4. Maintenance
    const maintResult = predictMaintenance({
      make: carMake, model: carModel,
      year: carYear, mileage, fuelType: carFuel,
    });

    // 5. Condition issues (rule-based since no image)
    const conditionIssues = [];
    if (mileage > 50000) conditionIssues.push({ issue: 'High Mileage', severity: 'warning', repair_cost: 0 });
    if (carYear < 2017) conditionIssues.push({ issue: 'Aging Vehicle (7+ years)', severity: 'warning', repair_cost: 0 });
    if (flags.pollution_expired) conditionIssues.push({ issue: 'Pollution Certificate Expired', severity: 'danger', repair_cost: 500 });
    if (flags.insurance_expired) conditionIssues.push({ issue: 'Insurance Expired', severity: 'danger', repair_cost: 0 });

    const repairCostTotal = conditionIssues.reduce((s, i) => s + (i.repair_cost || 0), 0);

    // 6. Save to Supabase
    const { data: savedVerification, error: saveError } = await supabase
      .from('car_verifications')
      .insert([{
        user_id: user_id || null,
        session_id: session_id || null,
        plate_number: plate,
        vin: vin || rtoData?.vin,
        make: carMake,
        model: carModel,
        year: carYear,
        mileage_km: mileage,
        fuel_type: carFuel,
        transmission: carTransmission,
        asking_price_inr: askingPrice,
        city: city || rtoData?.registered_at,
        trust_score: scores.trust_score,
        history_score: scores.history_score,
        condition_score: scores.condition_score,
        price_score: scores.price_score,
        verdict: scores.verdict,
        estimated_price_inr: priceResult.estimated_price,
        price_range_low: priceResult.range_low,
        price_range_high: priceResult.range_high,
        condition_issues: conditionIssues,
        repair_cost_inr: repairCostTotal,
        annual_maint_cost: maintResult.annual_cost,
        next_service_km: maintResult.next_service_km,
        rto_data: rtoData || null,
      }])
      .select()
      .single();

    if (saveError) console.error('Save error:', saveError);

    // 7. Return full result
    res.json({
      verification_id: savedVerification?.id,
      rto: {
        found: !!rtoData,
        data: rtoData,
        flags,
        events,
      },
      scores,
      price: {
        ...priceResult,
        asking_price: askingPrice,
        overpriced_by: askingPrice - priceResult.estimated_price,
        price_verdict: askingPrice > priceResult.range_high ? 'overpriced' : askingPrice < priceResult.range_low ? 'underpriced' : 'fair',
      },
      condition: {
        score: scores.condition_score,
        issues: conditionIssues,
        repair_cost_total: repairCostTotal,
      },
      maintenance: maintResult,
      summary: {
        car: `${carMake} ${carModel} ${carYear}`,
        trust_score: scores.trust_score,
        verdict: scores.verdict,
        verdict_label: scores.verdict === 'safe' ? '✅ Safe to Buy' : scores.verdict === 'moderate' ? '⚠️ Moderate Risk' : '🚨 Risky — Avoid',
        recommendation: scores.verdict === 'safe'
          ? 'This car looks like a solid purchase. Proceed with confidence.'
          : scores.verdict === 'moderate'
          ? 'Some concerns found. Negotiate on price and get a mechanic inspection.'
          : 'Significant issues detected. We recommend avoiding this car or deep-inspecting before purchase.',
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── Get user verification history ────────────────────────────
// GET /api/verifications?session_id=xxx  or  ?user_id=xxx
app.get('/api/verifications', async (req, res) => {
  try {
    const { user_id, session_id } = req.query;
    let query = supabase.from('car_verifications').select('*').order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    else if (session_id) query = query.eq('session_id', session_id);
    else return res.status(400).json({ error: 'user_id or session_id required' });

    const { data, error } = await query;
    if (error) throw error;
    res.json({ verifications: data || [], count: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single verification ──────────────────────────────────
// GET /api/verifications/:id
app.get('/api/verifications/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('car_verifications')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Verification not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚗 CarTrust AI Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/rto/:plate`);
  console.log(`   GET  /api/history/:plate`);
  console.log(`   POST /api/analyze-car`);
  console.log(`   POST /api/predict-price`);
  console.log(`   POST /api/predict-maintenance`);
  console.log(`   GET  /api/verifications?session_id=xxx`);
  console.log(`   GET  /api/verifications/:id\n`);
});
