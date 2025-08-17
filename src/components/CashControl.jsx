import { useMemo, useState } from 'react';

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
function computeSectionCents(map) {
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
  for (const key of Object.keys(WRAPS.rolls)) {
    const wrapCount = parseInt(map[`wrap_${key}`] ?? '', 10);
    if (Number.isFinite(wrapCount) && wrapCount > 0) {
      total += wrapCount * WRAPS.rolls[key];
    }
  }

  // Loose bills
  for (const d of DENOMS.bills) {
    const n = parseInt(map[d.key] ?? '', 10);
    if (Number.isFinite(n) && n > 0) total += n * d.cents;
  }

  // Bill wraps ($1 and $5)
  for (const key of Object.keys(WRAPS.bills)) {
    const wrapCount = parseInt(map[`wrap_${key}`] ?? '', 10);
    if (Number.isFinite(wrapCount) && wrapCount > 0) {
      total += wrapCount * WRAPS.bills[key];
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

function DenomInputs({ title, state, setState }) {
  const sum = useMemo(() => computeSectionCents(state), [state]);

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
          <div className="space-y-2">
            {/* Rolls with wraps */}
            <RowWrapInputs
              label="Pennies (roll $0.50)"
              wrapKey="roll_pennies"
              wrapValueLabel="($5 per wrap)"
              state={state}
              setState={setState}
              looseKey="roll_pennies"
            />
            <RowWrapInputs
              label="Nickels (roll $2)"
              wrapKey="roll_nickels"
              wrapValueLabel="($20 per wrap)"
              state={state}
              setState={setState}
              looseKey="roll_nickels"
            />
            <RowWrapInputs
              label="Dimes (roll $5)"
              wrapKey="roll_dimes"
              wrapValueLabel="($50 per wrap)"
              state={state}
              setState={setState}
              looseKey="roll_dimes"
            />
            <RowWrapInputs
              label="Quarters (roll $10)"
              wrapKey="roll_quarters"
              wrapValueLabel="($100 per wrap)"
              state={state}
              setState={setState}
              looseKey="roll_quarters"
            />
            {/* Rolls without wraps */}
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

export default function CashControl() {
  const [drop, setDrop] = useState({});
  const [vault, setVault] = useState({});
  const [tills, setTills] = useState(['', '', '', '', '']); // 5 tills ($ strings)
  const [changeOrder, setChangeOrder] = useState('');        // $ string

  const dropTotal = useMemo(() => computeSectionCents(drop), [drop]);
  const vaultTotal = useMemo(() => computeSectionCents(vault), [vault]);
  const tillsTotal = useMemo(
    () => tills.reduce((acc, s) => acc + Math.round((parseFloat(s) || 0) * 100), 0),
    [tills]
  );
  const changeOrderTotal = useMemo(
    () => Math.round((parseFloat(changeOrder) || 0) * 100),
    [changeOrder]
  );

  const grandTotal = dropTotal + vaultTotal + tillsTotal + changeOrderTotal;

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mt-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-red-600 mb-4">Cash Control</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <DenomInputs title="Drop / Lock Safe" state={drop} setState={setDrop} />
        <DenomInputs title="Storage Vault" state={vault} setState={setVault} />
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
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
