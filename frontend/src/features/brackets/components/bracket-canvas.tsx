"use client";

import React from "react";
import { Trophy, Star, Shield, ArrowRight } from "lucide-react";

interface MatchTeam {
  id?: string;
  displayName?: string;
  club?: { name: string } | null;
  isSeeded?: boolean;
  seedNumber?: number | null;
}

interface MatchSet {
  setNumber: number;
  scoreTeamA: number;
  scoreTeamB: number;
}

interface BracketMatch {
  id: string;
  matchCode: string;
  roundNumber: number;
  bracketPosition: number;
  teamA?: MatchTeam | null;
  teamB?: MatchTeam | null;
  winnerId?: string | null;
  status: string;
  sets?: MatchSet[];
  court?: { name: string } | null;
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
}

interface BracketCanvasProps {
  rounds: BracketRound[];
}

export function BracketCanvas({ rounds }: BracketCanvasProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
        Chưa có dữ liệu nhánh đấu
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-inner">
      <div className="flex gap-12 min-w-max pb-4">
        {rounds.map((round, rIndex) => (
          <div key={round.roundNumber} className="flex flex-col w-72 shrink-0">
            {/* Round Title Header */}
            <div className="mb-6 text-center">
              <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                {round.roundName}
              </span>
              <p className="mt-1 text-[11px] text-slate-400">
                {round.matches.length} trận đấu
              </p>
            </div>

            {/* Matches in this round */}
            <div className="flex flex-col justify-around flex-1 gap-6">
              {round.matches.map((match) => {
                const isTeamAWinner = match.winnerId && match.teamA?.id === match.winnerId;
                const isTeamBWinner = match.winnerId && match.teamB?.id === match.winnerId;
                const isCompleted = match.status === "COMPLETED" || match.status === "WALKOVER";

                // Count sets won
                let setsWonA = 0;
                let setsWonB = 0;
                if (match.sets) {
                  for (const s of match.sets) {
                    if (s.scoreTeamA >= 21 && s.scoreTeamA - s.scoreTeamB >= 2) setsWonA++;
                    else if (s.scoreTeamB >= 21 && s.scoreTeamB - s.scoreTeamA >= 2) setsWonB++;
                  }
                }

                return (
                  <div
                    key={match.id}
                    className={`relative rounded-xl border bg-white p-3.5 shadow-sm transition hover:shadow-md ${
                      isCompleted ? "border-slate-300" : "border-slate-200"
                    }`}
                  >
                    {/* Match header */}
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 border-b border-slate-100 pb-1.5 mb-2">
                      <span>{match.matchCode}</span>
                      {match.court && <span className="text-brand-600">{match.court.name}</span>}
                    </div>

                    {/* Team A Slot */}
                    <div
                      className={`flex items-center justify-between rounded-lg p-2 transition ${
                        isTeamAWinner
                          ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200"
                          : "text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        {match.teamA?.isSeeded && match.teamA?.seedNumber && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-100 text-[9px] font-extrabold text-amber-800">
                            #{match.teamA.seedNumber}
                          </span>
                        )}
                        <span className="truncate text-xs font-semibold">
                          {match.teamA?.displayName || (
                            <span className="italic text-slate-400">Chờ VĐV</span>
                          )}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-extrabold shrink-0">
                        {setsWonA}
                      </span>
                    </div>

                    {/* Team B Slot */}
                    <div
                      className={`flex items-center justify-between rounded-lg p-2 mt-1.5 transition ${
                        isTeamBWinner
                          ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200"
                          : "text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        {match.teamB?.isSeeded && match.teamB?.seedNumber && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-100 text-[9px] font-extrabold text-amber-800">
                            #{match.teamB.seedNumber}
                          </span>
                        )}
                        <span className="truncate text-xs font-semibold">
                          {match.teamB?.displayName || (
                            <span className="italic text-slate-400">Chờ VĐV</span>
                          )}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-extrabold shrink-0">
                        {setsWonB}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

