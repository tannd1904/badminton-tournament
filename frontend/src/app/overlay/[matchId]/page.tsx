"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useLiveMatch } from "@/lib/socket";
import { Trophy, Radio, Flame, Award } from "lucide-react";

export default function ObsLivestreamOverlayPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const matchId = params.matchId as string;

  // Real-time socket subscription
  const { isConnected } = useLiveMatch(matchId, (payload) => {
    queryClient.invalidateQueries({ queryKey: ["overlay-match-score", matchId] });
  });

  // Fetch initial/fallback match score
  const { data: scoreData } = useQuery({
    queryKey: ["overlay-match-score", matchId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/matches/${matchId}/score`);
      return res?.data;
    },
    enabled: !!matchId,
    refetchInterval: 3000,
  });

  if (!scoreData) {
    return <div className="min-h-screen bg-transparent" />;
  }

  const {
    matchCode,
    status,
    event,
    court,
    teamA,
    teamB,
    winner,
    setsWonTeamA,
    setsWonTeamB,
    completedSets,
    activeSet,
  } = scoreData;

  const currentScoreA = activeSet ? activeSet.scoreTeamA : 0;
  const currentScoreB = activeSet ? activeSet.scoreTeamB : 0;
  const currentSetNum = activeSet ? activeSet.setNumber : 1;
  const servingTeam = activeSet ? activeSet.servingTeam : "TEAM_A";

  const isDeuce = currentScoreA >= 20 && currentScoreB >= 20 && currentScoreA === currentScoreB;
  const isSuddenDeath = currentScoreA === 29 && currentScoreB === 29;
  const isGamePointA = (currentScoreA >= 20 && currentScoreA - currentScoreB >= 1) || currentScoreA === 29;
  const isGamePointB = (currentScoreB >= 20 && currentScoreB - currentScoreA >= 1) || currentScoreB === 29;

  return (
    <div className="min-h-screen w-screen bg-transparent p-6 flex flex-col justify-end select-none font-sans">
      {/* Broadcast Scoreboard Lower-Third Banner */}
      <div className="w-full max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/95 backdrop-blur-md text-white animate-in slide-in-from-bottom duration-500">
        {/* Tournament & Match Header Strip */}
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 px-5 py-2 text-xs font-black tracking-wide text-white uppercase shadow-inner">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className="font-extrabold">{event?.tournament?.name}</span>
            <span className="text-white/60">•</span>
            <span>{event?.name}</span>
            <span className="text-white/60">•</span>
            <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] text-amber-300">
              {matchCode}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-rose-300 font-bold">
              <Radio className="h-3.5 w-3.5 animate-pulse text-rose-400" />
              LIVE {court?.name ? `• ${court.name}` : ""}
            </span>
            <span className="rounded bg-black/40 px-2 py-0.5 text-white font-black">
              SET {currentSetNum} / 3
            </span>
          </div>
        </div>

        {/* Competitors Rows */}
        <div className="divide-y divide-slate-800">
          {/* Team A Row */}
          <div
            className={`flex items-center justify-between px-6 py-3 transition ${
              servingTeam === "TEAM_A" ? "bg-slate-900/90" : "bg-slate-950/90"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Serving Indicator */}
              <div className="w-6 flex justify-center">
                {servingTeam === "TEAM_A" ? (
                  <span className="text-amber-400 text-lg animate-bounce" title="Giao cầu">
                    🏸
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                )}
              </div>

              {/* Team Name */}
              <div className="min-w-0">
                <span className="text-xl sm:text-2xl font-black text-white truncate block">
                  {teamA?.displayName || "Đội A"}
                </span>
                {teamA?.club && (
                  <span className="text-xs font-semibold text-slate-400 truncate block">
                    {teamA.club.name}
                  </span>
                )}
              </div>

              {isGamePointA && (
                <span className="ml-3 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs animate-pulse">
                  GAME POINT
                </span>
              )}
            </div>

            {/* Scores (Sets Won + Current Points) */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Completed sets history */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                {completedSets.map((s: any) => (
                  <span
                    key={s.setNumber}
                    className="rounded bg-slate-900 px-2 py-1 text-slate-400 border border-slate-800"
                  >
                    {s.scoreTeamA}
                  </span>
                ))}
              </div>

              {/* Sets Won Box */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-base font-black text-amber-400 border border-slate-700">
                {setsWonTeamA}
              </div>

              {/* Current Set Score Digits */}
              <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-brand-600 text-3xl font-black text-white shadow-lg shadow-brand-600/30">
                {currentScoreA}
              </div>
            </div>
          </div>

          {/* Team B Row */}
          <div
            className={`flex items-center justify-between px-6 py-3 transition ${
              servingTeam === "TEAM_B" ? "bg-slate-900/90" : "bg-slate-950/90"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Serving Indicator */}
              <div className="w-6 flex justify-center">
                {servingTeam === "TEAM_B" ? (
                  <span className="text-amber-400 text-lg animate-bounce" title="Giao cầu">
                    🏸
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                )}
              </div>

              {/* Team Name */}
              <div className="min-w-0">
                <span className="text-xl sm:text-2xl font-black text-white truncate block">
                  {teamB?.displayName || "Đội B"}
                </span>
                {teamB?.club && (
                  <span className="text-xs font-semibold text-slate-400 truncate block">
                    {teamB.club.name}
                  </span>
                )}
              </div>

              {isGamePointB && (
                <span className="ml-3 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs animate-pulse">
                  GAME POINT
                </span>
              )}
            </div>

            {/* Scores (Sets Won + Current Points) */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Completed sets history */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                {completedSets.map((s: any) => (
                  <span
                    key={s.setNumber}
                    className="rounded bg-slate-900 px-2 py-1 text-slate-400 border border-slate-800"
                  >
                    {s.scoreTeamB}
                  </span>
                ))}
              </div>

              {/* Sets Won Box */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-base font-black text-amber-400 border border-slate-700">
                {setsWonTeamB}
              </div>

              {/* Current Set Score Digits */}
              <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-cyan-600 text-3xl font-black text-white shadow-lg shadow-cyan-600/30">
                {currentScoreB}
              </div>
            </div>
          </div>
        </div>

        {/* Deuce or Sudden Death Notification Bar */}
        {(isDeuce || isSuddenDeath) && (
          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-rose-600 py-1.5 text-xs font-black uppercase text-white tracking-widest shadow-md">
            {isSuddenDeath ? (
              <>
                <Award className="h-4 w-4" />
                <span>GOLDEN POINT (29 - 29) — CHẠM 30 ĐIỂM THẮNG NGAY!</span>
              </>
            ) : (
              <>
                <Flame className="h-4 w-4" />
                <span>DEUCE (20 - 20) — CÁCH BIỆT 2 ĐIỂM ĐỂ THẮNG SET</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

