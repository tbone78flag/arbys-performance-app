// src/pages/FoodPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function FoodPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  const locationId = profile?.location_id ?? 'holladay-3900s';

// Monday-start week helpers (local date math)
function startOfWeekLocal(d = new Date()) {
  const day = d.getDay();                // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7;            // Mon=0
  const s = new Date(d);
  s.setHours(0,0,0,0);
  s.setDate(s.getDate() - diff);
  return s;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function ymdLocal(date) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function money(n){ return Number.isFinite(n) ? n.toLocaleString(undefined,{style:'currency',currency:'USD'}) : '—'; }

const [weekAnchor, setWeekAnchor] = useState(() => new Date());
const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor]);
const weekEnd   = useMemo(() => addDays(weekStart, 6), [weekStart]);

const [variance, setVariance] = useState(null); // { lbs_delta, pct_delta }
const [pricing, setPricing]   = useState({ cost: 0, pClassic:0, pDouble:0, pHalf:0 });

useEffect(() => {
  let cancelled = false;
  (async () => {
    // 1) weekly variance
    const { data: v } = await supabase
      .from('beef_variance_weekly')
      .select('lbs_delta, pct_delta')
      .eq('location_id', locationId)
      .eq('week_start', ymdLocal(weekStart))
      .maybeSingle();

    // 2) pricing keys
    const { data: ks } = await supabase
      .from('location_settings')
      .select('key, value')
      .eq('location_id','default')
      .in('key',['beef_cost_per_lb','profit_rb_classic','profit_rb_double','profit_rb_half']);

    if (cancelled) return;

    setVariance(v ?? null);
    const map = Object.fromEntries((ks ?? []).map(r => [r.key, Number(r.value)]));
    setPricing({
      cost: map.beef_cost_per_lb || 0,
      pClassic: map.profit_rb_classic || 0,
      pDouble:  map.profit_rb_double  || 0,
      pHalf:    map.profit_rb_half    || 0,
    });
  })();
  return () => { cancelled = true; };
}, [locationId, weekStart]);


  return (
      <div className="w-full max-w-3xl bg-white shadow p-6 rounded">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Food Dashboard</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="text-sm text-gray-700">
    Week: {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
  </div>
  <div className="flex items-center gap-2">
    <button className="px-3 py-1.5 rounded border" onClick={() => setWeekAnchor(addDays(weekStart, -1))}>← Prev</button>
    <button className="px-3 py-1.5 rounded border" onClick={() => setWeekAnchor(addDays(weekEnd, 1))}>Next →</button>
  </div>
</div>

{/* Beef usage summary */}
<div className="bg-white/50 rounded border p-4 sm:p-6">
  <h2 className="text-lg font-semibold mb-2">Beef Usage (Variance)</h2>
  {!variance ? (
    <p className="text-sm text-gray-600">No beef variance saved for this week yet (enter it on the Goals page).</p>
  ) : (
    (() => {
      const lbs = Math.abs(Number(variance.lbs_delta || 0));
      const sign = Number(variance.lbs_delta || 0) < 0 ? 'short' : (Number(variance.lbs_delta || 0) > 0 ? 'over' : 'even');
      const pct = variance.pct_delta == null ? '—' : `${Number(variance.pct_delta).toFixed(1)}%`;

      const roasts = lbs / 10;
      const ounces = lbs * 16;

      const classicCount = ounces / 3;
      const doubleCount  = ounces / 6;
      const halfCount    = ounces / 8;

      const costLost = lbs * (pricing.cost || 0);
      const revClassic = classicCount * (pricing.pClassic || 0);
      const revDouble  = doubleCount  * (pricing.pDouble  || 0);
      const revHalf    = halfCount    * (pricing.pHalf    || 0);

      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-600">Variance (lbs)</div>
              <div className="font-semibold">{variance.lbs_delta} lbs ({sign})</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-600">Variance (%)</div>
              <div className="font-semibold">{pct}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-600">Roasts (10 lb)</div>
              <div className="font-semibold">{roasts.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="text-gray-600">Ounces</div>
              <div className="font-semibold">{ounces.toFixed(1)} oz</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-white rounded border p-2">
              <div className="font-semibold">Classic RB (3 oz)</div>
              <div>Count: {classicCount.toFixed(0)}</div>
              <div>Potential profit: {money(revClassic)}</div>
            </div>
            <div className="bg-white rounded border p-2">
              <div className="font-semibold">Double RB (6 oz)</div>
              <div>Count: {doubleCount.toFixed(0)}</div>
              <div>Potential profit: {money(revDouble)}</div>
            </div>
            <div className="bg-white rounded border p-2">
              <div className="font-semibold">Half-Pound RB (8 oz)</div>
              <div>Count: {halfCount.toFixed(0)}</div>
              <div>Potential profit: {money(revHalf)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-red-50 rounded p-2">
              <div className="text-gray-700">Product cost lost</div>
              <div className="font-semibold">{money(costLost)}</div>
              <div className="text-xs text-gray-500">Based on beef cost ${pricing.cost?.toFixed?.(2) ?? pricing.cost}/lb</div>
            </div>
            <div className="bg-green-50 rounded p-2">
              <div className="text-gray-700">Max potential profit (by item)</div>
              <div className="text-xs text-gray-600">See totals above per sandwich type.</div>
            </div>
          </div>
        </div>
      );
    })()
  )}
</div>

      {/* Manager-only section */}
      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>
        </div>
      )}
    </div>
  )
}
