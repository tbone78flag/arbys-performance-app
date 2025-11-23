// src/pages/GamesPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BingoGame from '../components/BingoGame'
"use client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";


"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function GamesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Games & Activities</h1>
        <p className="text-sm text-muted-foreground">
          Use these games to make cleaning, speed, and training more fun for the team.
        </p>
      </header>

      {/* Example: Major game buttons */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Major Games</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <button className="border rounded-lg p-4 shadow-sm text-left">
            <h3 className="font-semibold mb-1">Cleaning Board Game</h3>
            <p className="text-xs text-muted-foreground">
              Full shift game with a board, cards, and progress.
            </p>
          </button>

          <button className="border rounded-lg p-4 shadow-sm text-left">
            <h3 className="font-semibold mb-1">Shift Challenge Mode</h3>
            <p className="text-xs text-muted-foreground">
              Set goals for a shift and track points.
            </p>
          </button>
        </div>
      </section>

      {/* Quick tools in an accordion */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Tools</h2>

        <Accordion type="multiple" className="w-full">
          {/* Bingo Tools */}
          <AccordionItem value="bingo">
            <AccordionTrigger>Bingo Tools</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Use these for quick bingo shifts without setting up a full game.
                </p>

                <button className="px-3 py-2 border rounded-md text-xs">
                  Start Daily Bingo
                </button>

                <button className="px-3 py-2 border rounded-md text-xs">
                  Call Random Bingo Item
                </button>

                <p className="text-xs text-muted-foreground">
                  Example: complete a row for a small reward, blackout for a bigger reward.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Cleaning Task Cards */}
          <AccordionItem value="task-cards">
            <AccordionTrigger>Cleaning Task Cards</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Draw random cleaning tasks for team members during slower times.
                </p>

                <button className="px-3 py-2 border rounded-md text-xs">
                  Draw Cleaning Task
                </button>

                <button className="px-3 py-2 border rounded-md text-xs">
                  Draw Deep-Clean Task
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Randomizers & Mini Games */}
          <AccordionItem value="randomizers">
            <AccordionTrigger>Randomizers & Mini Games</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <button className="px-3 py-2 border rounded-md text-xs">
                  Spin Reward Wheel
                </button>

                <button className="px-3 py-2 border rounded-md text-xs">
                  Pick Random Team Member
                </button>

                <p className="text-xs text-muted-foreground">
                  Use these when you want quick engagement without explaining a full game.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}

