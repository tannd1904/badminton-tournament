"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useLiveTournament } from "@/lib/socket";
import {
  Radio,
  Trophy,
  MapPin,
  Clock,
  Eye,
  ExternalLink,
  Loader2,
  Tv,
} from "lucide-react";

export default function LiveScoresPage() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("ALL");

  // Fetch all matches currently in progress or recently completed
  const {
    data: matchesRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["live-matches-feed"],
    queryFn: async () => {
      const res: any = await apiClient.get("/matches", {
        params: { status: "IN_PROGRESS" },
      });
      return res?.data || [];
    },
    refetchInterval: 5000,
  });

  const matches = matchesRes || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Live Header */}
      <section className="border-b border-slate-800 bg-slate-900/60 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black uppercase text-rose-400 border border-rose-500/30 animate-pulse">
                <Radio className="h-4 w-4 text-rose-500" />
                Live Scores Hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Bảng Điểm Trực Tiếp
              </h1>
              <p className="text-sm text-slate-400 max-w-xl">
                Cập nhật điểm số thời gian thực từ các sân thi đấu theo luật BWF. Khán giả và streamer
                có thể theo dõi hoặc lấy link OBS Overlay.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-300">
                {matches.length} trận đang diễn ra
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <span className="ml-3 font-semibold text-slate-400">Đang đồng bộ tín hiệu trực tiếp...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-4">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Hiện chưa có trận nào đang diễn ra</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              Các trận đấu đang ở trạng thái chuẩn bị hoặc chưa bắt đầu. Vui lòng quay lại khi các trận
              đấu được trọng tài bắt đầu trên sân.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-500 transition"
            >
              Khám Phá Giải Đấu
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match: any) => {
              const activeSet = match.sets?.find((s: any) => s.completedAt === null) || match.sets?.[match.sets.length - 1];
              const scoreA = activeSet ? activeSet.scoreTeamA : 0;
              const scoreB = activeSet ? activeSet.scoreTeamB : 0;
              const servingTeam = activeSet ? activeSet.servingTeam : "TEAM_A";

              const setsWonA = match.sets?.filter((s: any) => s.completedAt && s.winningTeamId === match.teamAId).length || 0;
              const setsWonB = match.sets?.filter((s: any) => s.completedAt && s.winningTeamId === match.teamBId).length || 0;

              return (
                <div
                  key={match.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl hover:border-slate-700 transition"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-black text-brand-300 border border-slate-700">
                          {match.matchCode}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-300">
                          <MapPin className="h-3 w-3 text-brand-400" />
                          {match.court?.name || "Sân TBD"}
                        </span>
                      </div>

                      <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-rose-400 border border-rose-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                        SET {activeSet?.setNumber || 1}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-medium text-slate-400 truncate">
                      {match.event?.tournament?.name} • {match.event?.name}
                    </div>

                    {/* Competitors Scoreboard */}
                    <div className="mt-4 space-y-3 rounded-2xl bg-slate-950/70 p-4 border border-slate-800/80">
                      {/* Team A */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {servingTeam === "TEAM_A" && (
                            <span className="text-amber-400 text-sm animate-bounce" title="Giao cầu">
                              🏸
                            </span>
                          )}
                          <span className="text-base font-black text-white truncate">
                            {match.teamA?.displayName || "Đội A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-amber-400">
                            {setsWonA}
                          </span>
                          <span className="flex h-9 w-11 items-center justify-center rounded-xl bg-brand-600 text-xl font-black text-white shadow-sm">
                            {scoreA}
                          </span>
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {servingTeam === "TEAM_B" && (
                            <span className="text-amber-400 text-sm animate-bounce" title="Giao cầu">
                              🏸
                            </span>
                          )}
                          <span className="text-base font-black text-white truncate">
                            {match.teamB?.displayName || "Đội B"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-cyan-400">
                            {setsWonB}
                          </span>
                          <span className="flex h-9 w-11 items-center justify-center rounded-xl bg-cyan-600 text-xl font-black text-white shadow-sm">
                            {scoreB}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Links */}
                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                    <Link
                      href={`/tournaments/${match.event?.tournament?.slug}`}
                      className="text-slate-400 hover:text-white transition font-medium"
                    >
                      Xem Nhánh Đấu
                    </Link>

                    <Link
                      href={`/overlay/${match.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-bold text-amber-300 hover:bg-slate-700 transition"
                    >
                      <Tv className="h-3.5 w-3.5" />
                      OBS Overlay
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

