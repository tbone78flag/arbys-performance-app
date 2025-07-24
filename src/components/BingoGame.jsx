import React, { useState, useEffect, useCallback } from 'react';

// === YOUR WORD LIST HERE ===
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

export default function BingoGame() {
  // 1) determine grid size N
  const totalWords = SPACE_VALUES.length;
  // add 1 for FREE cell only if grid will be odd
  const tentativeSize = Math.ceil(Math.sqrt(totalWords + 1));
  const gridSize = tentativeSize % 2 === 1
    ? tentativeSize
    : Math.ceil(Math.sqrt(totalWords)); // even case: no FREE
  const hasFree = gridSize % 2 === 1;

  // 2) generate the card data
  function generateCard() {
    const cellsNeeded = gridSize * gridSize - (hasFree ? 1 : 0);
    let pool = shuffle(SPACE_VALUES);

    // trim or pad to exactly cellsNeeded
    if (pool.length > cellsNeeded) {
      pool = pool.slice(0, cellsNeeded);
    } else {
      while (pool.length < cellsNeeded) pool.push("");
    }

    let idx = 0;
    return Array.from({ length: gridSize }, (_, r) =>
      Array.from({ length: gridSize }, (_, c) =>
        hasFree && r === Math.floor(gridSize / 2) && c === Math.floor(gridSize / 2)
          ? "FREE"
          : pool[idx++]
      )
    );
  }

  // 3) state for card & marks
  const makeEmptyMarks = () => {
    const m = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    if (hasFree) m[Math.floor(gridSize / 2)][Math.floor(gridSize / 2)] = true;
    return m;
  };

  const [card, setCard]     = useState(generateCard);
  const [marked, setMarked] = useState(makeEmptyMarks);

  // 4) scoring: 1pt per mark + 5pt per line
  const calcScore = useCallback(() => {
    let base = marked.flat().filter(Boolean).length;
    let lines = 0;

    // rows
    for (let r = 0; r < gridSize; r++)
      if (marked[r].every(Boolean)) lines++;

    // cols
    for (let c = 0; c < gridSize; c++)
      if (marked.every(row => row[c])) lines++;

    // diags (only if square)
    if ([...Array(gridSize)].every((_, i) => marked[i][i]))     lines++;
    if ([...Array(gridSize)].every((_, i) => marked[i][gridSize - 1 - i])) lines++;

    return base + lines * 5;
  }, [marked, gridSize]);

  const [score, setScore] = useState(calcScore);
  useEffect(() => setScore(calcScore()), [marked, calcScore]);

  // toggle marks (never unmark FREE)
  const toggle = (r, c) => {
    if (hasFree && r === Math.floor(gridSize/2) && c === Math.floor(gridSize/2))
      return;
    setMarked(m =>
      m.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? !cell : cell))
      )
    );
  };

  // reshuffle
  const newCard = () => {
    setCard(generateCard());
    setMarked(makeEmptyMarks());
  };

  return (
    <div className="my-6">
      <h2 className="text-xl font-bold mb-2">Team Sales Bingo</h2>

      <div
        className="grid gap-1 mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 4rem)` }}
      >
        {card.map((row, r) =>
          row.map((val, c) => {
            const isMarked = marked[r][c];
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => toggle(r, c)}
                className={`
                  flex items-center justify-center
                  h-12 border-2 cursor-pointer select-none px-1 text-center break-words
                  ${isMarked
                    ? "bg-green-400 text-white"
                    : "bg-white hover:bg-gray-100"}
                `}
              >
                {val}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 text-center">
        <span className="mr-4 text-lg">
          Score: <strong>{score}</strong>
        </span>
        <button
          onClick={newCard}
          className="px-3 py-1 border rounded hover:bg-gray-100"
        >
          New Card
        </button>
      </div>
    </div>
  );
}
