"use client";

import React from "react";
import { Trophy, Calendar } from "lucide-react";

interface RoundRobinProps {
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: any[];
  }[];
}

export function RoundRobinTable({ rounds }: RoundRobinProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
        Chưa có dữ liệu bảng đấu vòng tròn
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <div key={round.roundNumber} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="h-4 w-4 text-brand-600" />
            <h4 className="text-base font-bold text-slate-900">{round.roundName}</h4>
            <span className="text-xs text-slate-400">({round.matches.length} trận đấu)</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {round.matches.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">{m.matchCode}</span>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-900 truncate pr-2">{m.teamA?.displayName || "TBD"}</span>
                  <span className="font-mono text-brand-700 font-extrabold">VS</span>
                  <span className="text-slate-900 truncate pl-2 text-right">{m.teamB?.displayName || "TBD"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

