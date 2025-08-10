import { useMemo, useState } from 'react';

const DENOMS = {
  rolls: [
    { key: 'roll_pennies',  label: 'Pennies (roll $0.50)', cents: 50 },
    { key: 'roll_nickels',  label: 'Nickels (roll $2)',    cents: 200 },
    { key: 'roll_dimes',    label: 'Dimes (roll $5)',      cents: 500 },
    { key: 'roll_quarters', label: 'Quarters (roll $10)',  cents: 1000 },
    { key: 'roll_halves',   label: 'Half Dollars ($10)',   cents: 1000 },
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

function formatMoney(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DenomInputs({ title, state, setState }) {
  const sum = useMemo(() => {
    const all = [...DENOMS.rolls, ...DENOMS.bills];
    return all.reduce((acc, d) => {
      const n = parseInt(state[d.key] ?? '', 10);
      return acc + (Number.isFinite(n) && n > 0 ? n * d.cents : 0);
    }, 0);
  }, [state]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <fieldset>
          <legend className="text-sm text-gray-600 mb-2">Coin rolls (enter # of rolls)</legend>
          <div className="space-y-2">
            {DENOMS.rolls.map((d) => (
              <div key={d.key} className="grid grid-cols-[minmax(8rem,auto),1fr] items-center gap-2">
                <label className="text-sm whitespace-nowrap">{d.label}</label>
                <input
                type="number"
                min="0"
                value={state[d.key] ?? ''}
                onChange={(e) =>
                    setState((s) => ({ ...s, [d.key]: e.target.value.replace(/[^\d]/g, '') }))
                }
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full min-w-0 border px-3 py-2 rounded"
                placeholder="0"
                />
            </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm text-gray-600 mb-2">Bills (enter # of bills)</legend>
          <div className="space-y-2">
            {DENOMS.bills.map((d) => (
              <div key={d.key} className="grid grid-cols-[minmax(8rem,auto),1fr] items-center gap-2">
                <label className="text-sm whitespace-nowrap">{d.label}</label>
                <input
                type="number"
                min="0"
                value={state[d.key] ?? ''}
                onChange={(e) =>
                    setState((s) => ({ ...s, [d.key]: e.target.value.replace(/[^\d]/g, '') }))
                }
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full min-w-0 border px-3 py-2 rounded"
                placeholder="0"
                />
            </div>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 text-right font-semibold">Section Total: {formatMoney(sum)}</div>
    </div>
  );
}

export default function CashControl() {
  const [drop, setDrop] = useState({});
  const [vault, setVault] = useState({});
  const [tills, setTills] = useState(['', '', '', '', '']); // 5 tills ($ strings)
  const [changeOrder, setChangeOrder] = useState('');        // $ string

  const sumDenoms = (map) => {
    const all = [...DENOMS.rolls, ...DENOMS.bills];
    return all.reduce((acc, d) => {
      const n = parseInt(map[d.key] ?? '', 10);
      return acc + (Number.isFinite(n) && n > 0 ? n * d.cents : 0);
    }, 0);
  };

  const dropTotal = useMemo(() => sumDenoms(drop), [drop]);
  const vaultTotal = useMemo(() => sumDenoms(vault), [vault]);
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
