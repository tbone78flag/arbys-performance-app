// src/pages/GoalsPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const DAYPARTS = [
  { key: 'lunch',      label: 'Lunch (11a–2p)' },
  { key: 'afternoon',  label: 'Afternoon (2p–5p)' },
  { key: 'dinner',     label: 'Dinner (5p–8p)' },
  { key: 'late_night', label: 'Late Night (8p–close)' },
];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// --- date helpers (Sunday start, aligned with SpeedPage) ---
function startOfWeekLocal(d = new Date()) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const start = new Date(d);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate() - day);
  return start;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function ymd(date) { return date.toISOString().slice(0,10); }

export default function GoalsPage({ profile }) {
  const navigate = useNavigate();
  const isEditor = ['Assistant Manager', 'General Manager'].includes(profile?.title);

  // --- existing goals/avg check state ---
  const [averageCheck, setAverageCheck] = useState('');
  const [goalText, setGoalText] = useState('');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingAvg, setSavingAvg] = useState(false);

  // --- NEW: speed entry state ---
  const locationId = profile?.location_id ?? 'holladay-3900s';
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor]);
  const weekEnd   = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`;

  // form = { lunch:[7], afternoon:[7], dinner:[7], late_night:[7] } (strings)
  const emptyRow = useMemo(() => Array(7).fill(''), []);
  const emptyForm = useMemo(() => ({
    lunch: Array(7).fill(''),
    afternoon: Array(7).fill(''),
    dinner: Array(7).fill(''),
    late_night: Array(7).fill(''),
  }), []);

  const [form, setForm] = useState(emptyForm);
  const hasData = useMemo(
  () => DAYPARTS.some(({ key }) => form[key].some(v => v !== '')),
    [form]
   );
  const [loadingSpeed, setLoadingSpeed] = useState(false);
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [speedMsg, setSpeedMsg] = useState(null);

  // Load existing average check + your goals (unchanged)
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const { data: avgData } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', 'default')
        .eq('key', 'average_check')
        .single();
      if (avgData) setAverageCheck(Number(avgData.value).toFixed(2));

      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, goal_text, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (goalsData) setGoals(goalsData);
      setLoading(false);
    };
    load();
  }, [profile]);

  // Load current week of speed_dayparts → prefill the form
  useEffect(() => {
    let cancelled = false;
    const loadWeek = async () => {
      setLoadingSpeed(true); setSpeedMsg(null);
      const { data, error } = await supabase
        .from('speed_dayparts')
        .select('day, daypart, avg_time_seconds')
        .eq('location_id', locationId)
        .eq('service', 'drive_thru')
        .gte('day', ymd(weekStart))
        .lte('day', ymd(weekEnd));

      if (cancelled) return;
      if (error) {
      setSpeedMsg(`Load failed: ${error.message}`);
      } else {
        // Build label map YYYY-MM-DD -> dow index
        const dowIndexByYMD = {};
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i);
          dowIndexByYMD[ymd(d)] = d.getDay(); // 0..6
        }
        const next = {
          lunch: [...emptyRow],
          afternoon: [...emptyRow],
          dinner: [...emptyRow],
          late_night: [...emptyRow],
        };
        for (const r of (Array.isArray(data) ? data : [])) {
          const idx = dowIndexByYMD[r.day];
          if (idx == null || !next[r.daypart]) continue;
          next[r.daypart][idx] = String(r.avg_time_seconds ?? '');
        }
        setForm(next);
      }
      setLoadingSpeed(false);
    };
    loadWeek();
    return () => { cancelled = true; };
  }, [locationId, weekStart, weekEnd]);

  // --- handlers ---
  const handleChange = (partKey, dowIdx, value) => {
    setForm(prev => {
      const copy = { ...prev, [partKey]: [...prev[partKey]] };
      copy[partKey][dowIdx] = value.replace(/[^\d]/g, ''); // keep digits only
      return copy;
    });
  };

  const saveSpeedWeek = async () => {
    setSavingSpeed(true); setSpeedMsg(null);
    try {
      const payload = [];
      for (let i = 0; i < 7; i++) {
        const dayStr = ymd(addDays(weekStart, i));
        for (const { key } of DAYPARTS) {
          const raw = form[key][i];
          if (raw === '' || raw == null) continue;
          const seconds = parseInt(raw, 10);
          if (!Number.isFinite(seconds) || seconds < 0) continue;
          payload.push({
            location_id: locationId,
            service: 'drive_thru',
            day: dayStr,
            daypart: key,
            avg_time_seconds: seconds,
            sample_size: 0, // optional for now
          });
        }
      }
      if (payload.length === 0) {
        setSpeedMsg('Nothing to save.');
        setSavingSpeed(false);
        return;
      }
      const { error } = await supabase
        .from('speed_dayparts')
        .upsert(payload, { onConflict: ['location_id','day','daypart'] });
      if (error) throw error;
      setSpeedMsg('Saved this week’s speeds.');
    } catch (err) {
      setSpeedMsg(`Save failed: ${err.message || err}`);
    } finally {
      setSavingSpeed(false);
    }
  };

  useEffect(() => {
  if (!speedMsg) return;
  const t = setTimeout(() => setSpeedMsg(null), 4000);
  return () => clearTimeout(t);
}, [speedMsg]);

  const saveAverage = async () => {
    if (!isEditor) return;
    if (isNaN(Number(averageCheck)) || Number(averageCheck) < 0) return;
    setSavingAvg(true);
    const numeric = parseFloat(averageCheck);
    const { error } = await supabase.from('location_settings').upsert(
      {
        location_id: 'default',
        key: 'average_check',
        value: numeric,
        updated_by: profile.id,
      },
      { onConflict: ['location_id', 'key'] }
    );
    setSavingAvg(false);
    if (error) console.error('Failed to save average check', error);
  };

  const saveGoal = async () => {
    if (!goalText.trim()) return;
    setSavingGoal(true);
    const { error } = await supabase
      .from('goals')
      .insert({ user_id: profile.id, goal_text: goalText });
    setSavingGoal(false);
    if (error) {
      console.error('Failed to save goal', error);
      return;
    }
    setGoalText('');
    const { data: updatedGoals } = await supabase
      .from('goals')
      .select('id, goal_text, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (updatedGoals) setGoals(updatedGoals);
  };

  if (!profile) return <div className="p-6">Loading…</div>;
  if (loading) return <div className="p-6">Loading goals…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Goals & Settings</h1>
        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* NEW: Drive-Thru Speed Week Entry */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-red-700">Drive-Thru Speed — Week Entry</h2>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded border"
              onClick={() => setWeekAnchor(addDays(weekStart, -1))}
              aria-label="Previous week"
            >← Prev</button>
            <div className="text-sm text-gray-700 min-w-[12ch] text-center">{weekLabel}</div>
            <button
              className="px-3 py-1.5 rounded border"
              onClick={() => setWeekAnchor(addDays(weekEnd, 1))}
              aria-label="Next week"
            >Next →</button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Enter average seconds for each daypart</span>
      {loadingSpeed && <span className="text-xs text-gray-500" aria-live="polite">Syncing…</span>}
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" aria-busy={loadingSpeed ? 'true' : 'false'}>
            {DAYPARTS.map(({ key, label }) => (
              <fieldset key={key} className="border rounded p-3">
                <legend className="text-sm font-medium">{label}</legend>
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mt-2">
                  {DOW.map((d) => <div key={d} className="text-center">{d}</div>)}
                </div>
                {/* Inputs Sun..Sat */}
                <div className="grid grid-cols-7 gap-2 mt-1">
                  {DOW.map((_, i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={form[key][i]}
                      onChange={(e) => handleChange(key, i, e.target.value)}
                      className="border rounded px-2 py-1 text-center"
                      placeholder="sec"
                      aria-label={`${label} ${DOW[i]}`}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={saveSpeedWeek}
            disabled={savingSpeed || !hasData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {savingSpeed ? 'Saving…' : 'Save Week'}
          </button>
          {speedMsg && (
            <div
              aria-live="polite"
              className={`text-sm ${speedMsg.startsWith('Saved') ? 'text-green-700' : 'text-amber-700'}`}
            >
              {speedMsg}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: Enter whole-second averages. The Speed page reads this table by week and location and updates automatically after save.
        </p>
      </div>

      {/* Average Check Editor (existing) */}
      {isEditor && (
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Location Average Check</h2>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-sm">Average Check ($)</label>
              <input
                type="number"
                step="0.01"
                value={averageCheck}
                onChange={e => setAverageCheck(e.target.value)}
                className="border rounded px-2 py-1 w-32"
              />
            </div>
            <button
              onClick={saveAverage}
              disabled={savingAvg}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {savingAvg ? 'Saving…' : 'Save Average'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This value is used on the Sales page for the “what if” calculator.
          </p>
        </div>
      )}

      {/* Goal creator (existing) */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Your Goals</h2>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={goalText}
            onChange={e => setGoalText(e.target.value)}
            placeholder="Enter a sales goal..."
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={saveGoal}
            disabled={savingGoal}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {savingGoal ? 'Saving…' : 'Add Goal'}
          </button>
        </div>
        {goals.length > 0 && (
          <ul className="mt-3 list-disc list-inside space-y-1">
            {goals.map(g => (
              <li key={g.id} className="text-sm">
                {g.goal_text}{' '}
                <span className="text-xs text-gray-400">
                  ({new Date(g.created_at).toLocaleDateString()})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}