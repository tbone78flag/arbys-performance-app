import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { pointsKeys } from '../hooks/usePointsData';

// === CONFIGURE YOUR SPACE VALUES HERE ===
// Must have at least 24 entries (center is "FREE")
const SPACE_VALUES = [
  "Apple Turnover","Cherry Turnover","Mozzarella Sticks","Upsize Meal","Add drink",
  "Add fries","Jalapeno Bites","Shake","LTO Sandwich","LTO Side",
  "Strawberry Lemonade","Classic Lemonade","Cookie","Upsize Side Item","Upsize Drink",
  "Cheddar Cup","Upgrade to Meal","2x Sandwich","Apple Turnover","Cherry Turnover",
  "Upgrade to Meal","Upsize Meal","Shake","Add fries","Add drink",
  "Any Lemonade"
];

// Fisher–Yates shuffle
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateCard() {
  if (SPACE_VALUES.length < 24) {
    throw new Error("Need at least 24 space values for the Bingo card.");
  }
  const pool = shuffle(SPACE_VALUES).slice(0, 24);
  let idx = 0;

  // build a 5×5 grid, placing "FREE" in center [2][2]
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) =>
      r === 2 && c === 2
        ? "FREE"
        : pool[idx++]
    )
  );
}

export default function BingoGame({ profile }) {
  // initialize marked grid with free center marked
  const makeEmpty = () => {
    const m = Array.from({ length: 5 }, () => Array(5).fill(false));
    m[2][2] = true;
    return m;
  };

  // Use fallback for location_id like other pages do
  const locationId = profile?.location_id || 'holladay-3900';

  const [card,   setCard]   = useState(generateCard);
  const [marked, setMarked] = useState(makeEmpty);

  // Save points modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Query client for invalidating points cache
  const queryClient = useQueryClient();

  // Count base marks + 5 pts per completed line
  const calcScore = useCallback(() => {
    // base = all true marks
    let base = marked.flat().filter(Boolean).length;

    // count full rows
    let lines = 0;
    for (let r = 0; r < 5; r++) {
      if (marked[r].every(Boolean)) lines++;
    }
    // count full columns
    for (let c = 0; c < 5; c++) {
      if (marked.every(row => row[c])) lines++;
    }
    // two diagonals
    if ([0,1,2,3,4].every(i => marked[i][i]))       lines++;
    if ([0,1,2,3,4].every(i => marked[i][4 - i]))   lines++;

    return base + lines * 5;
  }, [marked]);

  const [score, setScore] = useState(calcScore);

  useEffect(() => {
    setScore(calcScore());
  }, [marked, calcScore]);

  // toggle—but never unmark FREE
  const toggle = (r, c) => {
    if (r === 2 && c === 2) return;
    setMarked(m =>
      m.map((row, ri) =>
        row.map((cell, ci) =>
          ri === r && ci === c ? !cell : cell
        )
      )
    );
  };

  // reshuffle card & reset marks
  const newCard = () => {
    setCard(generateCard());
    setMarked(makeEmpty());
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Save points and reset game
  const handleSavePoints = async () => {
    if (!profile?.id) {
      setSaveError('Unable to save points. Please try logging in again.');
      return;
    }

    if (score < 2) {
      setSaveError('You need at least 2 points to save (the FREE space alone doesn\'t count).');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // Direct insert with source 'bingo' for game points
      const { error } = await supabase.from('points_log').insert({
        employee_id: profile.id,
        location_id: locationId,
        points_amount: score,
        source: 'bingo',
        source_detail: 'Bingo Game',
      });

      if (error) {
        console.error('Supabase error:', error);
        // Show more detailed error for debugging
        if (error.code === '23503') {
          setSaveError('Your account is not set up for points. Please contact a manager.');
        } else {
          setSaveError(`Database error: ${error.message}`);
        }
        return;
      }

      // Invalidate points queries to refresh data
      queryClient.invalidateQueries({ queryKey: pointsKeys.all });

      setSaveSuccess(`${score} points saved successfully!`);
      setSaveModalOpen(false);
      // Reset the game
      setCard(generateCard());
      setMarked(makeEmpty());
    } catch (err) {
      console.error('Error saving bingo points:', err);
      setSaveError(err?.message || 'Failed to save points. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-6">
      <h2 className="text-xl font-bold mb-2">Team Sales Bingo</h2>

      <div className="w-full">
        <div
        className="mx-auto grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 max-w-[clamp(320px,88vw,640px)]">
        {card.map((row, r) =>
          row.map((val, c) => {
            const isMarked = marked[r][c];
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => toggle(r, c)}
                className={`
                    flex items-center justify-center
                    aspect-square w-full min-w-0 border-2 cursor-pointer select-none
                    p-1 sm:p-2 md:p-3 text-center break-words
                    text-[10px] sm:text-xs md:text-sm lg:text-base
                    leading-snug
                    ${isMarked ? "bg-red-600 text-white" : "bg-white hover:bg-gray-100"}
                    `}
              >
                {val}
              </div>
            );
          })
        )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className="mr-4 text-lg">
          Score: <strong>{score}</strong>
        </span>
        <button
          type="button"
          onClick={() => setSaveModalOpen(true)}
          disabled={score < 2}
          className="px-3 py-1 border rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
        >
          Save Points
        </button>
        <button
          type="button"
          onClick={newCard}
          className="px-3 py-1 border rounded hover:bg-gray-100"
        >
          New Card
        </button>
      </div>

      {saveSuccess && (
        <div className="mt-2 text-center text-green-700 bg-green-50 p-2 rounded border border-green-200">
          {saveSuccess}
        </div>
      )}

      {/* Save Points Confirmation Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Save Bingo Points</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to save <strong>{score} points</strong> from your Bingo game.
            </p>
            <p className="text-sm text-amber-600 mb-4">
              This will reset your score to 1 and deal a new card. Are you sure?
            </p>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{saveError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaveModalOpen(false);
                  setSaveError(null);
                }}
                className="flex-1 px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePoints}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Yes, Save Points'}
              </button>
            </div>
          </div>
        </div>
      )}
      <br/>
      <h3 className="text-lg font-bold">Rules:</h3>
      <ul style={{ listStyleType: 'disc' }}>
        <li>Everytime you are able to ask a guest to add or change something about their meal that they didn't say on their own then click the related square.</li>
        <li>Every square is 1 point. Getting 5 in a row will add an addidtiona; 5 points on top of the points awarded for each square.</li>
        <li>If there are two of the same square then choose one and click that one. Click the other square of that type the next time you get that same upsell</li>
        <li>You can unclick squares if you click the incorrect one.</li>
        <li>Click new card (up to 3x per day) to wipe out all clicked squares (FREE will remain red) and to shuffle the BINGO card.</li>
        <br/>
        <dl>
            <dt className="text-lg italic">*2x Sandwich refers to adding an additional of the same sandwich in a way that increases the total cost of the order.
                <dd>Valid: Getting someone a 2 for $7 ham melt if they originally asked only for one ham melt. </dd>
                <dd>Not applicable: Getting someone to order the 4 for $12 instead of three roast beefs as this decreases the total cost of the order.</dd>
            </dt>
        </dl>
      </ul>
    </div>
  );
}
