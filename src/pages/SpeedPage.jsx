import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const DAYPARTS = [
  { key: 'lunch',      label: 'Lunch (11a–2p)' },
  { key: 'afternoon',  label: 'Afternoon (2p–5p)' },
  { key: 'dinner',     label: 'Dinner (5p–8p)' },
  { key: 'late_night', label: 'Late Night (8p–close)' },
];
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// --- date helpers (local, Sunday-start) ---
function startOfWeekLocal(d = new Date()) {
    // Monday start: subtract (Mon=1 -> 0, Tue=2 -> 1, ..., Sun=0 -> 6)
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day + 6) % 7;
    const start = new Date(d);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() - diff);
    return start;
  }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function ymd(date) { return date.toISOString().slice(0,10); }

// Shape rows -> { daypart: [{dow, seconds|null}...] }
function toSeries(rows, weekStart) {
    // Build Monday→Sunday labels tied to this week
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const labelByYMD = Object.fromEntries(
      weekDays.map(d => [ymd(d), DOW[(d.getDay() + 6) % 7]]) // map to Mon-first labels
    );
    // Seed with zeros but mark as missing
    const seed = DOW.map(dow => ({ dow, seconds: 0, missing: true }));
    const by = {
      lunch: seed.map(x => ({ ...x })), afternoon: seed.map(x => ({ ...x })),
      dinner: seed.map(x => ({ ...x })), late_night: seed.map(x => ({ ...x })),
    };
    for (const r of rows) {
      const dow = labelByYMD[r.day];
      const arr = by[r.daypart];
      if (!dow || !arr) continue;
      const idx = arr.findIndex(x => x.dow === dow);
      if (idx >= 0) {
        arr[idx].seconds = r.avg_time_seconds ?? 0;
        arr[idx].missing = !(Number.isFinite(r.avg_time_seconds));
      }
    }
   return by;
  }

  const FULL_DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function toLocalDateFromYMD(ymd) {
    // Parse YYYY-MM-DD as local time (avoids UTC off-by-one)
    const [y,m,d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function fmtDayLabel(ymd) {
    if (!ymd) return '—';
    const d = toLocalDateFromYMD(ymd);
    return `${FULL_DOW[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }
  
function DaypartCard({ title, data, targetSeconds }) {
  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-red-700">{title}</h3>
        {Number.isFinite(targetSeconds) && (
          <span className="text-xs text-gray-600">Target: {targetSeconds}s</span>
        )}
      </div>
      <div className="h-56 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dow" />
            <YAxis unit="s" allowDecimals={false} domain={[0, 'auto']} />
            <Tooltip
            formatter={(v, _name, props) => {
              const miss = props?.payload?.missing;
              return [`${v} s${miss ? ' (no entry)' : ''}`, 'Avg time'];
            }}
            />
            {Number.isFinite(targetSeconds) && (
              <ReferenceLine y={targetSeconds} strokeDasharray="4 4" />
            )}
            <Line
              type="monotone"
              dataKey="seconds"
              dot={{ r: 3 }}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SpeedPage({ profile, targets = {} }) {
  const navigate = useNavigate();

  // keep your redirect behavior
  useEffect(() => {
    if (!profile) navigate('/');
  }, [profile, navigate]);

  const locationId = profile?.location_id ?? 'holladay-3900s';

  // week selector (Sunday–Saturday)
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor]);
  const weekEnd   = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from('speed_dayparts')
        .select('day, daypart, avg_time_seconds')
        .eq('location_id', locationId)
        .eq('service', 'drive_thru')
        .gte('day', ymd(weekStart))
        .lte('day', ymd(weekEnd));

      if (cancelled) return;
      if (error) { setErr(error.message); setRows([]); }
      else { setRows(Array.isArray(data) ? data : []); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [locationId, weekStart, weekEnd]);

  const [allTimeBest, setAllTimeBest] = useState(() =>
    Object.fromEntries(DAYPARTS.map(({ key }) => [key, null]))
  );
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const promises = DAYPARTS.map(({ key }) =>
        supabase
          .from('speed_dayparts')
          .select('day, avg_time_seconds')
          .eq('location_id', locationId)
          .eq('service', 'drive_thru')
          .eq('daypart', key)
          .order('avg_time_seconds', { ascending: true })
          .order('day', { ascending: true })
          .limit(1)
      );
      const results = await Promise.all(promises);
      if (cancelled) return;
      const next = {};
      results.forEach((res, i) => {
        const key = DAYPARTS[i].key;
        const row = Array.isArray(res.data) ? res.data[0] : undefined;
        next[key] = row ? { seconds: row.avg_time_seconds, day: row.day } : null;
      });
      setAllTimeBest(next);
    })();
   return () => { cancelled = true; };
  }, [locationId]);

  const seriesByPart = useMemo(() => toSeries(rows, weekStart), [rows, weekStart]);
  const weeklyStats = useMemo(() => {
    // Initialize result per daypart
    const out = Object.fromEntries(DAYPARTS.map(({ key }) => [key, { best: null, bestDay: null, worst: null, worstDay: null }]));
    for (const r of rows) {
      if (!Number.isFinite(r?.avg_time_seconds)) continue;
      const dp = r.daypart;
      const s  = r.avg_time_seconds;
      const cur = out[dp];
      if (!cur) continue;
      if (cur.best == null || s < cur.best)  { cur.best = s;  cur.bestDay  = r.day; }
      if (cur.worst == null || s > cur.worst){ cur.worst = s; cur.worstDay = r.day; }
    }
    return out;
  }, [rows]);
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="bg-white shadow rounded p-4 sm:p-6">
        {/* header + week nav */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-red-700">Speed — Drive-Thru</h1>
          <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
        </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border" onClick={() => setWeekAnchor(addDays(weekStart, -1))}>
              ← Prev
            </button>
            <div className="text-sm text-gray-700 min-w-[12ch] text-center">{weekLabel}</div>
            <button className="px-3 py-2 rounded border" onClick={() => setWeekAnchor(addDays(weekEnd, 1))}>
              Next →
            </button>
          </div>

        {err && <div className="text-amber-700 mb-2 text-sm">Error: {err}</div>}
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {DAYPARTS.map(({ key, label }) => (
              <DaypartCard
                key={key}
                title={label}
                data={seriesByPart[key] ?? DOW.map(dow => ({ dow, seconds: 0, missing: true }))}
                targetSeconds={targets[key]} // e.g., { lunch:220, afternoon:230, dinner:240, late_night:260 }
              />
            ))}
          </div>
        )}

        {/* Highlights */}
        {!loading && (
          <div className="mt-6 bg-white/50 rounded border p-4 sm:p-6">
            <h3 className="font-semibold mb-3">Week Highlights</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-600">
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3">Daypart</th>
                    <th className="text-left py-2 px-3">Best (Week)</th>
                    <th className="text-left py-2 px-3">Worst (Week)</th>
                    <th className="text-left py-2 pl-3">Best of All Time</th>
                  </tr>
                </thead>
            <tbody>
              {DAYPARTS.map(({ key, label }) => {
                const w = weeklyStats[key] || {};
                const bestW = Number.isFinite(w.best) ? `${w.best}s — ${fmtDayLabel(w.bestDay)}` : '—';
                const worstW = Number.isFinite(w.worst) ? `${w.worst}s — ${fmtDayLabel(w.worstDay)}` : '—';
                const at = allTimeBest[key];
                const bestAT = at ? `${at.seconds}s — ${fmtDayLabel(at.day)}` : '—';
                return (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 px-3">{bestW}</td>
                  <td className="py-2 px-3">{worstW}</td>
                  <td className="py-2 pl-3">{bestAT}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Week stats reflect only days with entries (zeros from “no entry” don’t count).
        </p>
        </div>
      )}

        {/* manager-only tools area remains available to extend */}
        {profile?.role === 'manager' && (
          <div className="border-t pt-4 mt-6">
            <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
            {/* add targets editor, overrides, etc. later */}
          </div>
        )}
      </div>
    </div>
  );
}
