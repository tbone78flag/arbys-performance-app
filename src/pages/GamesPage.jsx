// src/pages/GamesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function GamesPage({ profile }) {
  const navigate = useNavigate()
  const [openItem, setOpenItem] = useState(null)

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  const games = [
    {
      id: 'bingo',
      title: 'Cleaning Bingo',
      summary:
        'Bingo-style game to encourage completing different cleaning tasks during the shift.',
    },
    {
      id: 'speed-board',
      title: 'Speed Board Game',
      summary:
        'Move around a board by hitting speed and accuracy targets on the line.',
    },
    {
      id: 'trivia',
      title: 'Arby’s Trivia',
      summary:
        'Quick trivia rounds about menu knowledge, procedures, and safety.',
    },
  ]

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? null : id))
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Games Hub</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* Accessible to all team members */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Total Points</h2>
        <p>Team members can redeem points here:</p>
        {/* Later: form or button */}
      </div>

      {/* Accordion for mini games */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Mini Games</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tap a game to see how it works and use it during your shift.
        </p>

        <div className="space-y-2">
          {games.map((game) => {
            const isOpen = openItem === game.id
            return (
              <div
                key={game.id}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(game.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-expanded={isOpen}
                  aria-controls={`game-panel-${game.id}`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{game.title}</span>
                    <span className="text-xs text-gray-500">
                      {game.summary}
                    </span>
                  </div>
                  <span
                    className={`transform transition-transform ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`game-panel-${game.id}`}
                    className="px-4 pb-4 pt-2 bg-gray-50 border-t text-sm"
                  >
                    {game.id === 'bingo' && <CleaningBingoContent />}
                    {game.id === 'speed-board' && <SpeedBoardContent />}
                    {game.id === 'trivia' && <TriviaContent />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Manager-only section */}
      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-6">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Mini game inline content components ---------- */

function CleaningBingoContent() {
  const tasks = [
    'Sweep lobby',
    'Wipe sauce station',
    'Check trash cans',
    'Clean soda nozzles',
    'Sanitize door handles',
    'Restock napkins',
    'Wipe headset area',
    'Spot mop kitchen',
    'Clean drive-thru window',
  ]

  return (
    <div>
      <h3 className="font-semibold mb-1">How to Play</h3>
      <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">
        <li>Print or draw a 3×3 or 5×5 bingo card with cleaning tasks.</li>
        <li>Team member picks a card at the start of their shift.</li>
        <li>
          Each time they complete a task, they mark that square (manager can
          initial or verify).
        </li>
        <li>
          First to get a line (row, column, or diagonal) gets a small reward
          (points, candy, etc.).
        </li>
      </ol>

      <h4 className="font-semibold mb-1">Example 3×3 Card</h4>
      <div className="grid grid-cols-3 gap-1 max-w-xs text-center text-xs">
        {tasks.slice(0, 9).map((task, i) => (
          <div
            key={i}
            className="border border-gray-300 bg-white px-2 py-3 rounded"
          >
            {task}
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeedBoardContent() {
  return (
    <div>
      <h3 className="font-semibold mb-1">How to Play</h3>
      <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">
        <li>
          Draw a simple board with spaces 1–20 (or more) on a paper or whiteboard.
        </li>
        <li>
          Each time the team hits a speed or accuracy goal (e.g., drive-thru time
          under target, no order mistakes), move the marker 1–3 spaces.
        </li>
        <li>Land on special spaces for small rewards or fun bonuses.</li>
        <li>If goals are missed, you can pause movement or step back a space.</li>
      </ol>

      <h4 className="font-semibold mb-1">Example Board Layout</h4>
      <div className="grid grid-cols-5 gap-1 text-xs max-w-xs">
        {Array.from({ length: 20 }).map((_, i) => {
          const num = i + 1
          const isReward = [3, 7, 10, 15, 20].includes(num)
          return (
            <div
              key={num}
              className={`border px-2 py-2 rounded text-center ${
                isReward ? 'bg-yellow-100 border-yellow-400 font-semibold' : 'bg-white'
              }`}
            >
              {num}
              {isReward && <div className="mt-1 text-[0.6rem]">Reward</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TriviaContent() {
  return (
    <div>
      <h3 className="font-semibold mb-1">How to Play</h3>
      <ol className="list-decimal list-inside text-gray-700 mb-3 space-y-1">
        <li>Prepare a list of questions about menu items, procedures, and safety.</li>
        <li>Ask 3–5 questions at a time during slower moments.</li>
        <li>
          Each correct answer earns points or a mark toward a small end-of-shift prize.
        </li>
        <li>Rotate who answers so everyone gets a chance.</li>
      </ol>

      <h4 className="font-semibold mb-1">Sample Questions</h4>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>“What’s the holding time for curly fries?”</li>
        <li>“Which sandwich comes with Horsey Sauce by default?”</li>
        <li>“Name two critical handwashing moments during a shift.”</li>
      </ul>

      <p className="mt-3 text-xs text-gray-500">
        You can swap these for your own store-specific questions and even make
        teams compete.
      </p>
    </div>
  )
}
