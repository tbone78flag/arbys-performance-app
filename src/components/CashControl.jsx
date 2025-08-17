import { supabase } from '../supabaseClient';
import { useMemo, useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'cash_control_log_v1';

function toLocalDatetimeValue(dateLike) {
  const d = new Date(dateLike);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

const csvEscape = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

const toCSV = (rows) => {
  const header = ['When','Drop','Vault','Tills','ChangeOrder','Grand','Notes'];
  const body = rows.map(e => [
    new Date(e.atISO).toISOString(),
    (e.drop/100).toFixed(2),
    (e.vault/100).toFixed(2),
    (e.tills/100).toFixed(2),
    (e.changeOrder/100).toFixed(2),
    (e.grand/100).toFixed(2),
    e.notes ?? ''
  ].map(csvEscape).join(','));
  return [header.join(','), ...body].join('\n');
};

const downloadCSV = (logEntries) => {
  const blob = new Blob([toCSV(logEntries)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ymd = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `cash_control_log_${ymd}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const DENOMS = {
  // value is in cents
  rolls: [
    { key: 'roll_pennies',  label: 'Pennies (roll $0.50)', cents: 50 },
    { key: 'roll_nickels',  label: 'Nickels (roll $2)',    cents: 200 },
    { key: 'roll_dimes',    label: 'Dimes (roll $5)',      cents: 500 },
    { key: 'roll_quarters', label: 'Quarters (roll $10)',  cents: 1000 },
    { key: 'roll_halves',   label: 'Half Dollars (roll $10)', cents: 1000 },
    { key: 'roll_dollars',  label: '$1 Coins (roll $25)',  cents: 2500 },
  ],
  bills: [
    { key: 'bill_1',   label: '$1',   cents: 100 },
    { key: 'bill_2',   label: '$2',   cents: 200 }, // remove if unused
    { key: 'bill_5',   label: '$5',   cents: 500 },
    { key: 'bill_10',  label: '$10',  cents: 1000 },
    { key: 'bill_20',  label: '$20',  cents: 2000 },
    { key: 'bill_50',  label: '$50',  cents: 5000 },
    { key: 'bill_100', label: '$100', cents: 10000 },
  ],
};

// Wrap configurations (all cents)
const WRAPS = {
  // Bills: wraps for $1 (25 ones = $25), $5 (20 fives = $100)
  bills: {
    bill_1:  2500,  // $25 per wrap of ones
    bill_5: 10000,  // $100 per wrap of fives
  },
  // Coin rolls: 10-roll bricks by convention
  rolls: {
    roll_pennies:  500,   // $5  (10 × $0.50)
    roll_nickels:  2000,  // $20 (10 × $2)
    roll_dimes:    5000,  // $50 (10 × $5)
    roll_quarters: 10000, // $100 (10 × $10)
    // halves/dollars: not specified, leave unwrapped
  }
};

function formatMoney(cents) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// ---- Compute a section (safe) total in cents from its state map
function computeSectionCents(map, { allowCoinWraps = true, allowBillWraps = true } = {}) {
  let total = 0;

  // Slip amount ($)
  const slip = parseFloat(map.slip || '');
  if (!Number.isNaN(slip) && slip !== 0) {
    total += Math.round(slip * 100);
  }

  // Loose coin rolls
  for (const d of DENOMS.rolls) {
    const n = parseInt(map[d.key] ?? '', 10);
    if (Number.isFinite(n) && n > 0) total += n * d.cents;
  }

  // Coin roll wraps
  if (allowCoinWraps) {
    for (const key of Object.keys(WRAPS.rolls)) {
        const wrapCount = parseInt(map[`wrap_${key}`] ?? '', 10);
        if (Number.isFinite(wrapCount) && wrapCount > 0) {
            total += wrapCount * WRAPS.rolls[key];
        }
    }
}

  // Loose bills (always count)
    for (const d of DENOMS.bills) {
        const n = parseInt(map[d.key] ?? '', 10);
        if (Number.isFinite(n) && n > 0) total += n * d.cents;
     }
     
     // Bill wraps ($1 and $5) (optional)
  if (allowBillWraps) {
    for (const key of Object.keys(WRAPS.bills)) {
        const wrapCount = parseInt(map[`wrap_${key}`] ?? '', 10);
        if (Number.isFinite(wrapCount) && wrapCount > 0) {
            total += wrapCount * WRAPS.bills[key];
        }
    }
}

  return total;
}

function RowWrapInputs({
  label,
  wrapKey,
  wrapValueLabel,
  state,
  setState,
  looseKey,
  loosePlaceholder = '0',
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(8rem,auto),minmax(7rem,1fr),minmax(7rem,1fr)] items-center gap-2">
      <label className="text-sm whitespace-nowrap">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={state[`wrap_${wrapKey}`] ?? ''}
          onChange={(e) =>
            setState((s) => ({ ...s, [`wrap_${wrapKey}`]: e.target.value.replace(/[^\d]/g, '') }))
          }
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          className="w-full min-w-0 border px-3 py-2 rounded"
          placeholder="wraps"
          aria-label={`${label} - wraps`}
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">{wrapValueLabel}</span>
      </div>
      <input
        type="number"
        min="0"
        value={state[looseKey] ?? ''}
        onChange={(e) =>
          setState((s) => ({ ...s, [looseKey]: e.target.value.replace(/[^\d]/g, '') }))
        }
        onFocus={(e) => e.target.select()}
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-full min-w-0 border px-3 py-2 rounded"
        placeholder={loosePlaceholder}
        aria-label={`${label} - loose`}
      />
    </div>
  );
}

function RowSingleInput({
  label,
  state,
  setState,
  keyName,
  placeholder = '0'
}) {
  return (
    <div className="grid grid-cols-[minmax(8rem,auto),1fr] items-center gap-2">
      <label className="text-sm whitespace-nowrap">{label}</label>
      <input
        type="number"
        min="0"
        value={state[keyName] ?? ''}
        onChange={(e) =>
          setState((s) => ({ ...s, [keyName]: e.target.value.replace(/[^\d]/g, '') }))
        }
        onFocus={(e) => e.target.select()}
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-full min-w-0 border px-3 py-2 rounded"
        placeholder={placeholder}
      />
    </div>
  );
}

function DenomInputs({ title, state, setState, coinWraps = true }) {
  const sum = useMemo(
    () => computeSectionCents(state, { allowCoinWraps: coinWraps, allowBillWraps: true }),
    [state, coinWraps]
);

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">{title}</h4>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setState({})}
          aria-label={`Clear ${title}`}
        >
          Clear
        </button>
      </div>

      {/* Slip */}
      <fieldset className="mb-4">
        <legend className="text-sm text-gray-600 mb-2">Slip amount (exact $)</legend>
        <div className="grid grid-cols-[minmax(8rem,auto),1fr] items-center gap-2">
          <label className="text-sm whitespace-nowrap">Slip ($)</label>
          <input
            type="number"
            step="0.01"
            value={state.slip ?? ''}
            onChange={(e) => setState((s) => ({ ...s, slip: e.target.value.replace(/[^\d.]/g, '') }))}
            onFocus={(e) => e.target.select()}
            inputMode="decimal"
            className="w-full min-w-0 border px-3 py-2 rounded"
            placeholder="0.00"
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Coin rolls */}
        <fieldset>
  <legend className="text-sm text-gray-600 mb-2">Coin rolls</legend>
  {!coinWraps && (
    <p className="text-xs text-gray-500 mb-2">
      Coin wraps disabled in this section — enter loose roll counts only.
    </p>
  )}
  <div className="space-y-2">
    {/* Pennies */}
    {coinWraps ? (
      <RowWrapInputs
        label="Pennies (roll $0.50)"
        wrapKey="roll_pennies"
        wrapValueLabel="($5 per wrap)"
        state={state}
        setState={setState}
        looseKey="roll_pennies"
      />
    ) : (
      <RowSingleInput
        label="Pennies (roll $0.50)"
        state={state}
        setState={setState}
        keyName="roll_pennies"
      />
    )}

    {/* Nickels */}
    {coinWraps ? (
      <RowWrapInputs
        label="Nickels (roll $2)"
        wrapKey="roll_nickels"
        wrapValueLabel="($20 per wrap)"
        state={state}
        setState={setState}
        looseKey="roll_nickels"
      />
    ) : (
      <RowSingleInput
        label="Nickels (roll $2)"
        state={state}
        setState={setState}
        keyName="roll_nickels"
      />
    )}

    {/* Dimes */}
    {coinWraps ? (
      <RowWrapInputs
        label="Dimes (roll $5)"
        wrapKey="roll_dimes"
        wrapValueLabel="($50 per wrap)"
        state={state}
        setState={setState}
        looseKey="roll_dimes"
        />
        ) : (
      <RowSingleInput
        label="Dimes (roll $5)"
        state={state}
        setState={setState}
        keyName="roll_dimes"
        />
        )}

        {/* Quarters */}
        {coinWraps ? (
        <RowWrapInputs
            label="Quarters (roll $10)"
            wrapKey="roll_quarters"
            wrapValueLabel="($100 per wrap)"
            state={state}
            setState={setState}
            looseKey="roll_quarters"
        />
        ) : (
            <RowSingleInput
            label="Quarters (roll $10)"
            state={state}
            setState={setState}
            keyName="roll_quarters"
            />
            )}

            {/* Rolls without wraps (unchanged) */}
            <RowSingleInput
            label="Half Dollars (roll $10)"
            state={state}
            setState={setState}
            keyName="roll_halves"
            />
            <RowSingleInput
            label="$1 Coins (roll $25)"
            state={state}
            setState={setState}
            keyName="roll_dollars"
            />
        </div>
        </fieldset>


        {/* Bills */}
        <fieldset>
          <legend className="text-sm text-gray-600 mb-2">Bills</legend>
          <div className="space-y-2">
            {/* $1 and $5 with wraps */}
            <RowWrapInputs
              label="$1 bills"
              wrapKey="bill_1"
              wrapValueLabel="($25 per wrap)"
              state={state}
              setState={setState}
              looseKey="bill_1"
            />
            <RowWrapInputs
              label="$5 bills"
              wrapKey="bill_5"
              wrapValueLabel="($100 per wrap)"
              state={state}
              setState={setState}
              looseKey="bill_5"
            />
            {/* Other bills - loose only */}
            <RowSingleInput label="$2 bills"   state={state} setState={setState} keyName="bill_2" />
            <RowSingleInput label="$10 bills"  state={state} setState={setState} keyName="bill_10" />
            <RowSingleInput label="$20 bills"  state={state} setState={setState} keyName="bill_20" />
            <RowSingleInput label="$50 bills"  state={state} setState={setState} keyName="bill_50" />
            <RowSingleInput label="$100 bills" state={state} setState={setState} keyName="bill_100" />
          </div>
        </fieldset>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Tip: Enter <em>wraps</em> as the number of completed bundles (e.g., 3 wraps of $1s = $75), and put remaining loose bills/rolls in the rightmost box.
      </p>

      <div className="mt-4 text-right font-semibold">Section Total: {formatMoney(sum)}</div>
    </div>
  );
}

export default function CashControl({ locationId = 'holladay-3900s' }) {
    const logRef = useRef(null);
  const [drop, setDrop] = useState({});
  const [vault, setVault] = useState({});
  const [tills, setTills] = useState(['', '', '', '', '']); // 5 tills ($ strings)
  const [changeOrder, setChangeOrder] = useState('');
  const [notes, setNotes] = useState('');      // $ string
  const [snapshotAt, setSnapshotAt] = useState(toLocalDatetimeValue(Date.now()));
  const [logEntries, setLogEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    if (!saveMsg) return;
    const t = setTimeout(() => setSaveMsg(null), 4000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const dropTotal  = useMemo(() => computeSectionCents(drop,  { allowCoinWraps: true }),  [drop]);
  const vaultTotal = useMemo(() => computeSectionCents(vault, { allowCoinWraps: false }), [vault]);
  const tillsTotal = useMemo(
    () => tills.reduce((acc, s) => acc + Math.round((parseFloat(s) || 0) * 100), 0),
    [tills]
  );
  const changeOrderTotal = useMemo(
    () => Math.round((parseFloat(changeOrder) || 0) * 100),
    [changeOrder]
  );

  const grandTotal = dropTotal + vaultTotal + tillsTotal + changeOrderTotal;
  const nothingToSave = grandTotal === 0;
  const isFuture = new Date(snapshotAt) > new Date();

  // Load/save log to localStorage
     useEffect(() => {
     try {
     const raw = localStorage.getItem(STORAGE_KEY);
     if (raw) {
     const parsed = JSON.parse(raw);
     if (Array.isArray(parsed)) setLogEntries(parsed);
    }
     } catch { /* ignore */ }
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logEntries));
        } catch { /* ignore */ }
    }, [logEntries]);

    const saveSnapshot = async () => {
    const at = snapshotAt ? new Date(snapshotAt) : new Date();
    const entry = {
        id: Date.now(), // simple unique id
        atISO: at.toISOString(),
        drop: dropTotal,
        vault: vaultTotal,
        tills: tillsTotal,
        changeOrder: changeOrderTotal,
        grand: grandTotal,
        notes: notes.trim(),
    };
    // Local first (always)
    setLogEntries((prev) => [entry, ...prev].slice(0, 500));
    setNotes('');
    // keep the newest row in view
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));

    // Then Supabase (best-effort)
    try {
    setSaving(true); setSaveMsg(null);
    const { error } = await supabase.from('cash_snapshots').insert({
        location_id: locationId,
        at: entry.atISO,
        drop_cents: entry.drop,
        vault_cents: entry.vault,
        tills_cents: entry.tills,
        change_order_cents: entry.changeOrder,
        grand_cents: entry.grand,
        notes: entry.notes,
    });
    if (error) throw error;
        setSaveMsg('Saved to Supabase.');
    } catch (err) {
        setSaveMsg(`Saved locally. Supabase failed: ${err.message || err}`);
    } finally {
        setSaving(false);
    }
    };
    const removeEntry = (id) => {
    if (!window.confirm('Delete this snapshot?')) return;
        setLogEntries((prev) => prev.filter((e) => e.id !== id));
    };
    const clearLog = () => {
        if (!window.confirm('Clear all snapshots? This cannot be undone.')) return;
        setLogEntries([]);
    };
    const fmtWhen = (e) =>
    new Date(e.atISO).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mt-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-red-600 mb-4">Cash Control</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <DenomInputs title="Drop / Lock Safe" state={drop} setState={setDrop} />
        <DenomInputs title="Storage Vault" state={vault} setState={setVault} coinWraps={false} />
      </div>

      <div className="bg-white shadow rounded p-4 sm:p-6 mt-4">
        <h4 className="font-semibold mb-3">Registers / Tills (enter $ amount per till)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {tills.map((val, i) => (
            <div key={i}>
              <label className="block text-sm text-gray-600 mb-1">Till {i + 1}</label>
              <input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => {
                  const v = e.target.value;
                  setTills((prev) => prev.map((x, idx) => (idx === i ? v : x)));
                }}
                onFocus={(e) => e.target.select()}
                inputMode="decimal"
                className="w-full border px-3 py-2 rounded"
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 text-right font-semibold">
          Tills Total: {formatMoney(tillsTotal)}
        </div>
      </div>

      <div className="bg-white shadow rounded p-4 sm:p-6 mt-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="grow">
            <label className="block text-sm text-gray-600 mb-1">Change Order Amount</label>
            <input
              type="number"
              step="0.01"
              value={changeOrder}
              onChange={(e) => setChangeOrder(e.target.value)}
              onFocus={(e) => e.target.select()}
              inputMode="decimal"
              className="w-full border px-3 py-2 rounded"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a positive number to add; enter a negative number to subtract (e.g., outgoing order).
            </p>
          </div>

          <button
            type="button"
            className="bg-gray-100 px-3 py-2 rounded border"
            onClick={() => setChangeOrder('')}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Drop / Lock Safe</div>
          <div className="text-lg font-semibold">{formatMoney(dropTotal)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Storage Vault</div>
          <div className="text-lg font-semibold">{formatMoney(vaultTotal)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Tills</div>
          <div className="text-lg font-semibold">{formatMoney(tillsTotal)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Change Order</div>
          <div className="text-lg font-semibold">{formatMoney(changeOrderTotal)}</div>
        </div>
        <div className="border-2 rounded p-3 bg-red-50">
          <div className="text-sm font-medium">Grand Total (All Sections)</div>
          <div className="text-xl font-extrabold">{formatMoney(grandTotal)}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          onClick={() => {
            setDrop({});
            setVault({});
            setTills(['', '', '', '', '']);
            setChangeOrder('');
            setNotes('');
          }}
        >
          Reset All
        </button>
      </div>
      {/* Snapshot + Log */}
<div className="bg-white shadow rounded p-4 sm:p-6 mt-6">
  <h4 className="font-semibold mb-3">Cash Control Log</h4>

  {/* Save controls */}
  <div className="flex flex-wrap items-end gap-3">
    <div className="grow">
      <label className="block text-sm text-gray-600 mb-1">Snapshot date & time</label>
      <input
        type="datetime-local"
        value={snapshotAt}
        onChange={(e) => setSnapshotAt(e.target.value)}
        className="w-full border px-3 py-2 rounded"
      />
      {isFuture && (
    <p className="text-xs text-amber-700 mt-1" aria-live="polite">
        Snapshot time is in the future.
    </p>
    )}
      <p className="text-xs text-gray-500 mt-1">
        Adjust if recording a past count. Click <button
          type="button"
          className="underline"
          onClick={() => setSnapshotAt(toLocalDatetimeValue(Date.now()))}
        >Now</button> to reset.
      </p>
    </div>

    <div className="grow min-w-[16rem]">
  <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
  <textarea
    rows={2}
    maxLength={250}
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="w-full border px-3 py-2 rounded"
    placeholder="e.g., Pre-EOD count, change order placed, variance note…"
  />
  <div className="text-xs text-gray-500 mt-1">
    {notes.length}/250
    </div>
    </div>

    <button
      type="button"
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      onClick={saveSnapshot}
      disabled={saving || nothingToSave || isFuture}
      aria-label="Save totals to log"
    >
      {saving ? 'Saving…' : 'Save to log'}
    </button>
    
    {saveMsg && (
        <div aria-live="polite"
        className={`text-sm ${saveMsg.startsWith('Saved to Supabase') ? 'text-green-700' : 'text-amber-700'}`}>
            {saveMsg}
        </div>
    )}
  </div>

  {/* Entries */}
  <div className="mt-4 flex items-center justify-between">
   <div className="text-sm text-gray-600">
     Saved snapshots: <span className="font-medium">{logEntries.length}</span>
   </div>
   {logEntries.length > 0 && (
     <div className="flex items-center gap-4">
       <button type="button" className="text-sm underline" onClick={() => logEntries.length && downloadCSV(logEntries)}>
         Download CSV
       </button>
    <button type="button" className="text-sm underline" onClick={clearLog}>
        Clear all
    </button>
    </div>
    )}
    </div>

  {logEntries.length === 0 ? (
    <p className="text-sm text-gray-500 mt-3">No snapshots yet.</p>
) : (
    <div className="mt-3 overflow-x-auto">
        {/* This div creates a vertical scroll area just for the log */}
        <div
        ref={logRef}
        className="max-h-[50vh] overflow-y-auto border rounded"
        aria-label="Cash control snapshots"
        >
        <table className="min-w-full text-sm">
        <thead className="text-gray-600">
          <tr className="border-b sticky top-0 bg-white z-10">
            <th className="text-left py-2 pr-3">When</th>
            <th className="text-right py-2 px-3">Drop / Lock</th>
            <th className="text-right py-2 px-3">Storage Vault</th>
            <th className="text-right py-2 px-3">Tills</th>
            <th className="text-right py-2 px-3">Change Order</th>
            <th className="text-right py-2 pl-3">Grand Total</th>
            <th className="text-left py-2 px-3">Notes</th>
            <th className="py-2 pl-3"></th>
          </tr>
        </thead>
        <tbody>
          {[...logEntries]
          .sort((a, b) => new Date(b.atISO) - new Date(a.atISO))
          .map((e) => (
            <tr key={e.id} className="border-b last:border-0">
              <td className="py-2 pr-3">{fmtWhen(e)}</td>
              <td className="py-2 px-3 text-right">{formatMoney(e.drop)}</td>
              <td className="py-2 px-3 text-right">{formatMoney(e.vault)}</td>
              <td className="py-2 px-3 text-right">{formatMoney(e.tills)}</td>
              <td className="py-2 px-3 text-right">{formatMoney(e.changeOrder)}</td>
              <td className="py-2 pl-3 text-right font-semibold">{formatMoney(e.grand)}</td>
              <td className="py-2 px-3 align-top">
                <div className="max-w-[16rem] truncate" title={e.notes || ''}>
                    {e.notes || ''}
                </div>
            </td>
              <td className="py-2 pl-3 text-right">
                <button
                type="button"
                className="text-xs underline"
                aria-label={`Delete snapshot from ${fmtWhen(e)}`}
                onClick={() => removeEntry(e.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
       </table>
      </div>
    </div>
  )}
  </div>
    </div>
  );
}
