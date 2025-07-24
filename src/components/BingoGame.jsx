import React, { useState, useEffect, useCallback } from 'react';

// helper: generate one column of 5 unique numbers in [min…max]
const genCol = (min, max) => {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return nums
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
};

const generateCard = () => {
  const cols = [
    genCol( 1, 15),  // B
    genCol(16, 30),  // I
    genCol(31, 45),  // N (we’ll overwrite [2][2] to “FREE”)
    genCol(46, 60),  // G
    genCol(61, 75),  // O
  ];
  const grid = cols[0].map((_, row) =>
    cols.map((colNums, col) => colNums[row])
  );
  grid[2][2] = 'FREE';
  return grid;
};

export default function BingoGame() {
  const [card, setCard]     = useState(generateCard());
  const [marked, setMarked] = useState(
    Array.from({ length: 5 }, () => Array(5).fill(false))
  );
  const [score, setScore]   = useState(0);

  // toggle a cell, but never unmark the FREE center
  const toggle = (r, c) => {
    if (r === 2 && c === 2) return;
    setMarked(m =>
      m.map((rowArr, ri) =>
        rowArr.map((cell, ci) =>
          ri===r && ci===c ? !cell : cell
        )
      )
    );
  };

  // simple scoring: total marked cells
  const calcScore = useCallback(() =>
    marked.flat().filter(Boolean).length
  , [marked]);

  // recalc on every mark change
  useEffect(() => {
    setScore(calcScore());
  }, [marked, calcScore]);

  // reshuffle everything
  const newCard = () => {
    setCard(generateCard());
    setMarked(Array.from({ length: 5 }, () => Array(5).fill(false)));
  };

  return (
    <div className="my-6">
      <h2 className="text-xl font-bold mb-2">Team Sales Bingo</h2>
      <div className="grid grid-cols-5 gap-1 w-max mx-auto">
        {card.map((row, r) =>
          row.map((val, c) => {
            const isMarked = marked[r][c] || (r===2&&c===2);
            return (
              <div
                key={`${r}-${c}`}
                onClick={()=>toggle(r,c)}
                className={`
                  flex items-center justify-center 
                  h-12 w-12 border-2 cursor-pointer select-none
                  ${isMarked 
                    ? 'bg-green-400 text-white' 
                    : 'bg-white hover:bg-gray-100'}
                `}
              >
                {val}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 text-center">
        <span className="mr-4 text-lg">Score: <strong>{score}</strong></span>
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
