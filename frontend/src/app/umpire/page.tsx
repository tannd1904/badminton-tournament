"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  Shield,
  Play,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  Trophy,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "Tất Cả" },
  { id: "IN_PROGRESS", label: "Đang Chấm Điểm" },
  { id: "READY", label: "Sẵn Sàng" },
  { id: "SCHEDULED", label: "Sắp Tới" },
  { id: "COMPLETED", label: "Đã Hoàn Thành" },
];

export default function UmpireDashboardPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: matchesRes, isLoading } = useQuery({
    queryKey: ["umpire-matches", user?.id, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const res: any = await apiClient.get("/matches", { params });
      return res?.data || [];
    },
  });

  const matches = matchesRes || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Mobile-First App Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white">
                Bảng Điều Khiển Trọng Tài
              </h1>
              <p className="text-xs text-slate-400">
                {user?.fullName || "Trọng tài BWF"} • {user?.role || "REFEREE"}
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            Trang Chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng Trận</span>
            <p className="mt-1 text-2xl font-black text-white">{matches.length}</p>
          </div>
          <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 shadow-sm">
            <span className="text-xs font-bold text-rose-400 uppercase">Đang Đấu</span>
            <p className="mt-1 text-2xl font-black text-rose-400">
              {matches.filter((m: any) => m.status === "IN_PROGRESS").length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 shadow-sm">
            <span className="text-xs font-bold text-amber-400 uppercase">Sẵn Sàng</span>
            <p className="mt-1 text-2xl font-black text-amber-400">
              {matches.filter((m: any) => m.status === "READY").length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 shadow-sm">
            <span className="text-xs font-bold text-emerald-400 uppercase">Hoàn Thành</span>
            <p className="mt-1 text-2xl font-black text-emerald-400">
              {matches.filter((m: any) => m.status === "COMPLETED" || m.status === "WALKOVER").length}
            </p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                statusFilter === f.id
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Matches List */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/30">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <span className="ml-3 font-semibold text-slate-400">Đang tải danh sách trận...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-800/20 p-12 text-center">
            <Trophy className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white">Chưa có trận đấu nào</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Không có trận đấu nào khớp với bộ lọc hiện tại. Vui lòng kiểm tra lại sau khi BTC phân công sân và lịch thi đấu.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {matches.map((match: any) => {
              const isLive = match.status === "IN_PROGRESS";
              const isReady = match.status === "READY";
              const isDone = match.status === "COMPLETED" || match.status === "WALKOVER";

              const timeStr = match.scheduledStartTime
                ? new Date(match.scheduledStartTime).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Chưa xếp giờ";

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border p-5 transition shadow-sm ${
                    isLive
                      ? "border-rose-500/80 bg-rose-950/20"
                      : "border-slate-800 bg-slate-800/60 hover:border-slate-700"
                  }`}
                >
                  {/* Top Bar: Match Code, Court, Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-700/80 px-2 py-1 text-xs font-black text-brand-300">
                        {match.matchCode}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-brand-400" />
                        {match.court?.name || "Chưa gán sân"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-rose-400 animate-pulse border border-rose-500/30">
                          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                          Đang Đấu
                        </span>
                      )}
                      {isReady && (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-amber-400 border border-amber-500/30">
                          Sẵn Sàng
                        </span>
                      )}
                      {isDone && (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                          Hoàn Thành
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <Clock className="h-3 w-3" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  {/* Tournament & Event Title */}
                  <div className="mt-2 text-xs font-semibold text-slate-400">
                    {match.event?.tournament?.name} • {match.event?.name} ({match.roundName})
                  </div>

                  {/* Teams vs Display */}
                  <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-900/60 p-4 border border-slate-800/80">
                    {/* Team A */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Đội A (Team A)
                      </span>
                      <p className="text-base font-bold text-white truncate">
                        {match.teamA?.displayName || "Đang chờ đối thủ"}
                      </p>
                      {match.teamA?.club && (
                        <p className="text-xs text-slate-400 truncate">CLB {match.teamA.club.name}</p>
                      )}
                    </div>

                    {/* Team B */}
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Đội B (Team B)
                      </span>
                      <p className="text-base font-bold text-white truncate">
                        {match.teamB?.displayName || "Đang chờ đối thủ"}
                      </p>
                      {match.teamB?.club && (
                        <p className="text-xs text-slate-400 truncate">CLB {match.teamB.club.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Sets Summary (if any) */}
                  {match.sets?.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-bold text-slate-500">Tỉ số các set:</span>
                      {match.sets.map((s: any) => (
                        <span
                          key={s.id}
                          className="rounded bg-slate-800 px-2 py-0.5 font-bold text-slate-300 border border-slate-700"
                        >
                          S{s.setNumber}: {s.scoreTeamA} - {s.scoreTeamB}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Link to Tactile Scoreboard */}
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/umpire/match/${match.id}`}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition ${
                        isLive
                          ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/30"
                          : "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/30"
                      }`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      {isLive
                        ? "Tiếp Tục Chấm Điểm"
                        : isDone
                        ? "Xem Lại Điểm Số"
                        : "Bắt Đầu Trận Đấu"}
                      <ChevronRight className="h-4 w-4" />
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

