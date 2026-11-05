"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Shield,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  Trophy,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Award,
  X,
  Loader2,
  Volume2,
} from "lucide-react";

export default function UmpireScoreboardPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const matchId = params.id as string;

  // Swap sides visual state (allows umpire to flip left/right on screen to match actual court view)
  const [swappedVisualSides, setSwappedVisualSides] = useState(false);

  // Interval countdown timer (60s at 11 points)
  const [intervalTimer, setIntervalTimer] = useState<number | null>(null);

  // Walkover Modal state
  const [showWalkoverModal, setShowWalkoverModal] = useState(false);
  const [walkoverWinner, setWalkoverWinner] = useState<"TEAM_A" | "TEAM_B">("TEAM_A");
  const [walkoverReason, setWalkoverReason] = useState("Vận động viên chấn thương không thể tiếp tục");

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interval timer tick
  useEffect(() => {
    let interval: any = null;
    if (intervalTimer !== null && intervalTimer > 0) {
      interval = setInterval(() => {
        setIntervalTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [intervalTimer]);

  // Fetch Live Score
  const {
    data: scoreData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["match-live-score", matchId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/matches/${matchId}/score`);
      return res?.data;
    },
    enabled: !!matchId,
    refetchInterval: 3000, // Poll every 3 seconds for instant multi-device sync
  });

  // Start Match Mutation
  const startMatchMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/matches/${matchId}/start`, {
        initialServingTeam: "TEAM_A",
      });
    },
    onSuccess: () => {
      setToastMessage("Trận đấu đã chính thức bắt đầu!");
      queryClient.invalidateQueries({ queryKey: ["match-live-score", matchId] });
    },
    onError: (err: any) => {
      setToastMessage(err?.message || "Lỗi khi bắt đầu trận đấu");
    },
  });

  // Record Point Mutation
  const recordPointMutation = useMutation({
    mutationFn: async (team: "TEAM_A" | "TEAM_B") => {
      // Tactile haptic feedback on mobile if supported
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }

      const idempotencyKey = `pt-${matchId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`;

      return apiClient.post(`/matches/${matchId}/score/point`, {
        team,
        idempotencyKey,
      });
    },
    onSuccess: (res: any) => {
      const calc = res?.data?.calculation;
      if (calc?.isIntervalReached) {
        setIntervalTimer(60);
        setToastMessage(calc.intervalMessage || "Nghỉ giải lao 11 điểm (60 giây)");
      } else if (calc?.isMatchWon) {
        setToastMessage(`Trận đấu kết thúc! Đội ${calc.matchWinner === "TEAM_A" ? "A" : "B"} chiến thắng!`);
      } else if (calc?.isSetWon) {
        setToastMessage(`Set đấu kết thúc! Đội ${calc.setWinner === "TEAM_A" ? "A" : "B"} thắng set!`);
      }

      queryClient.invalidateQueries({ queryKey: ["match-live-score", matchId] });
    },
    onError: (err: any) => {
      setToastMessage(err?.message || "Lỗi ghi nhận điểm");
    },
  });

  // Undo Mutation
  const undoMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/matches/${matchId}/score/undo`, {});
    },
    onSuccess: () => {
      setToastMessage("Đã hoàn tác điểm số gần nhất");
      queryClient.invalidateQueries({ queryKey: ["match-live-score", matchId] });
    },
    onError: (err: any) => {
      setToastMessage(err?.message || "Không thể hoàn tác");
    },
  });

  // Walkover Mutation
  const walkoverMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/matches/${matchId}/score/walkover`, {
        winnerTeam: walkoverWinner,
        reason: walkoverReason,
      });
    },
    onSuccess: () => {
      setShowWalkoverModal(false);
      setToastMessage("Đã ghi nhận kết quả xử thua (Walkover)");
      queryClient.invalidateQueries({ queryKey: ["match-live-score", matchId] });
    },
    onError: (err: any) => {
      setToastMessage(err?.message || "Lỗi ghi nhận walkover");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <span className="ml-3 font-bold text-slate-300">Đang khởi tạo bảng điểm...</span>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Không tìm thấy thông tin trận đấu</h2>
        <Link
          href="/umpire"
          className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md"
        >
          Quay lại danh sách trận
        </Link>
      </div>
    );
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

  const isLive = status === "IN_PROGRESS";
  const isCompleted = status === "COMPLETED" || status === "WALKOVER";

  const currentScoreA = activeSet ? activeSet.scoreTeamA : 0;
  const currentScoreB = activeSet ? activeSet.scoreTeamB : 0;
  const currentSetNum = activeSet ? activeSet.setNumber : 1;
  const servingTeam = activeSet ? activeSet.servingTeam : "TEAM_A";

  // Check Deuce and Golden Point
  const isDeuce = currentScoreA >= 20 && currentScoreB >= 20 && currentScoreA === currentScoreB;
  const isSuddenDeath = currentScoreA === 29 && currentScoreB === 29;
  const isGamePointA = (currentScoreA >= 20 && currentScoreA - currentScoreB >= 1) || currentScoreA === 29;
  const isGamePointB = (currentScoreB >= 20 && currentScoreB - currentScoreA >= 1) || currentScoreB === 29;

  // Visual side swap helper
  const sideLeft = swappedVisualSides
    ? {
        key: "TEAM_B" as const,
        team: teamB,
        score: currentScoreB,
        setsWon: setsWonTeamB,
        isServing: servingTeam === "TEAM_B",
        isGamePoint: isGamePointB,
      }
    : {
        key: "TEAM_A" as const,
        team: teamA,
        score: currentScoreA,
        setsWon: setsWonTeamA,
        isServing: servingTeam === "TEAM_A",
        isGamePoint: isGamePointA,
      };

  const sideRight = swappedVisualSides
    ? {
        key: "TEAM_A" as const,
        team: teamA,
        score: currentScoreA,
        setsWon: setsWonTeamA,
        isServing: servingTeam === "TEAM_A",
        isGamePoint: isGamePointA,
      }
    : {
        key: "TEAM_B" as const,
        team: teamB,
        score: currentScoreB,
        setsWon: setsWonTeamB,
        isServing: servingTeam === "TEAM_B",
        isGamePoint: isGamePointB,
      };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/umpire"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs font-black text-brand-300 border border-brand-500/30">
                {matchCode}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {court?.name || "Sân TBD"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-md">
              {event?.name} • {event?.tournament?.name}
            </p>
          </div>
        </div>

        {/* Set & Sets Won Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">SET:</span>
            <span className="text-brand-400 font-black text-sm">{currentSetNum} / 3</span>
            <span className="text-slate-500 mx-1">|</span>
            <span className="text-emerald-400">{setsWonTeamA}</span>
            <span className="text-slate-500">-</span>
            <span className="text-cyan-400">{setsWonTeamB}</span>
          </div>

          <button
            onClick={() => setSwappedVisualSides(!swappedVisualSides)}
            title="Đổi bên hiển thị (phù hợp với góc nhìn của trọng tài trên sân)"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-brand-600 px-4 py-2 text-center text-xs font-black text-white shadow-md animate-in slide-in-from-top flex items-center justify-between">
          <span className="mx-auto">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-xs font-bold underline">
            ✕
          </button>
        </div>
      )}

      {/* Interval 60s Alert Banner */}
      {intervalTimer !== null && (
        <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-3 text-slate-950 font-black shadow-lg animate-bounce">
          <Clock className="h-5 w-5" />
          <span className="text-base tracking-wide">
            NGHỈ GIẢI LAO 11 ĐIỂM: {intervalTimer}s CÒN LẠI
          </span>
          <button
            onClick={() => setIntervalTimer(null)}
            className="ml-2 rounded-lg bg-slate-950 px-2.5 py-1 text-xs text-white"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Deuce or Sudden Death Banner */}
      {isDeuce && (
        <div className="flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md">
          <Flame className="h-4 w-4" />
          <span>DEUCE (20 - 20) — CÁCH BIỆT 2 ĐIỂM ĐỂ THẮNG SET</span>
        </div>
      )}
      {isSuddenDeath && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md">
          <Award className="h-4 w-4" />
          <span>SUDDEN DEATH (29 - 29) — CHẠM 30 ĐIỂM THẮNG NGAY!</span>
        </div>
      )}

      {/* Completed Sets Summary Chips */}
      {completedSets.length > 0 && (
        <div className="flex items-center justify-center gap-2 border-b border-slate-900 bg-slate-900/40 py-2 text-xs">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Đã đấu:</span>
          {completedSets.map((s: any) => (
            <span
              key={s.setNumber}
              className="rounded-md bg-slate-800 px-2.5 py-1 font-bold text-slate-300 border border-slate-700/60"
            >
              Set {s.setNumber}: {s.scoreTeamA} - {s.scoreTeamB} (
              {s.winner === "TEAM_A" ? "Đội A" : "Đội B"} thắng)
            </span>
          ))}
        </div>
      )}

      {/* Main Touch Scoreboard (Split Screen: Left vs Right) */}
      <main className="flex-1 grid grid-cols-2 gap-1 p-2 sm:p-4">
        {/* Left Team Panel */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-xl">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                {sideLeft.key === "TEAM_A" ? "Đội A" : "Đội B"}
              </span>
              {sideLeft.isServing && (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-black text-amber-300 border border-amber-400/40 animate-pulse">
                  🏸 GIAO CẦU
                </span>
              )}
            </div>

            <h2 className="mt-2 text-lg sm:text-2xl font-black text-white truncate">
              {sideLeft.team?.displayName || "TBD"}
            </h2>
            {sideLeft.team?.club && (
              <p className="text-xs text-slate-400 truncate">CLB {sideLeft.team.club.name}</p>
            )}

            {sideLeft.isGamePoint && (
              <span className="mt-2 inline-block rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-rose-400 border border-rose-500/30">
                SET POINT
              </span>
            )}
          </div>

          {/* Huge Score Number */}
          <div className="my-auto text-center py-4">
            <span className="text-7xl sm:text-9xl font-black tracking-tight text-white drop-shadow-2xl">
              {sideLeft.score}
            </span>
          </div>

          {/* Big Tactile Touch Button */}
          {isLive ? (
            <button
              disabled={recordPointMutation.isPending}
              onClick={() => recordPointMutation.mutate(sideLeft.key)}
              className="w-full rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 py-6 sm:py-8 text-xl sm:text-2xl font-black text-white shadow-lg shadow-brand-600/30 transition transform"
            >
              +1 ĐIỂM
            </button>
          ) : (
            <div className="py-4 text-center text-xs text-slate-600 font-bold uppercase">
              {isCompleted ? "ĐÃ HOÀN THÀNH" : "CHƯA BẮT ĐẦU"}
            </div>
          )}
        </div>

        {/* Right Team Panel */}
        <div className="relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-xl">
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                {sideRight.key === "TEAM_A" ? "Đội A" : "Đội B"}
              </span>
              {sideRight.isServing && (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-black text-amber-300 border border-amber-400/40 animate-pulse">
                  🏸 GIAO CẦU
                </span>
              )}
            </div>

            <h2 className="mt-2 text-lg sm:text-2xl font-black text-white truncate">
              {sideRight.team?.displayName || "TBD"}
            </h2>
            {sideRight.team?.club && (
              <p className="text-xs text-slate-400 truncate">CLB {sideRight.team.club.name}</p>
            )}

            {sideRight.isGamePoint && (
              <span className="mt-2 inline-block rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-rose-400 border border-rose-500/30">
                SET POINT
              </span>
            )}
          </div>

          {/* Huge Score Number */}
          <div className="my-auto text-center py-4">
            <span className="text-7xl sm:text-9xl font-black tracking-tight text-white drop-shadow-2xl">
              {sideRight.score}
            </span>
          </div>

          {/* Big Tactile Touch Button */}
          {isLive ? (
            <button
              disabled={recordPointMutation.isPending}
              onClick={() => recordPointMutation.mutate(sideRight.key)}
              className="w-full rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 py-6 sm:py-8 text-xl sm:text-2xl font-black text-white shadow-lg shadow-cyan-600/30 transition transform"
            >
              +1 ĐIỂM
            </button>
          ) : (
            <div className="py-4 text-center text-xs text-slate-600 font-bold uppercase">
              {isCompleted ? "ĐÃ HOÀN THÀNH" : "CHƯA BẮT ĐẦU"}
            </div>
          )}
        </div>
      </main>

      {/* Match Completed Banner */}
      {isCompleted && (
        <div className="border-t border-slate-800 bg-slate-900/90 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/40">
            <Trophy className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-white">TRẬN ĐẤU ĐÃ KẾT THÚC</h3>
          <p className="mt-1 text-sm font-semibold text-emerald-400">
            Chiến thắng thuộc về: {winner?.displayName || "Đội Thắng"}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => undoMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Hoàn Tác Điểm Cuối
            </button>
            <Link
              href="/umpire"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-500 transition"
            >
              Về Danh Sách Trận
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Umpire Utility Toolbar */}
      {!isCompleted && (
        <footer className="border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
            {/* Start Match Button if not yet in progress */}
            {!isLive ? (
              <button
                disabled={startMatchMutation.isPending}
                onClick={() => startMatchMutation.mutate()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
              >
                {startMatchMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
                BẮT ĐẦU TRẬN ĐẤU
              </button>
            ) : (
              <>
                {/* Instant Undo Button */}
                <button
                  disabled={undoMutation.isPending}
                  onClick={() => undoMutation.mutate()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/90 py-3.5 text-sm font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition"
                >
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <span>Hoàn Tác (-1)</span>
                </button>

                {/* 60s Interval Button */}
                <button
                  onClick={() => setIntervalTimer(60)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-700 transition"
                >
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>60s Nghỉ</span>
                </button>

                {/* Walkover / Abandon Button */}
                <button
                  onClick={() => setShowWalkoverModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-900/40 bg-rose-950/30 px-4 py-3.5 text-sm font-bold text-rose-400 hover:bg-rose-900/40 transition"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Xử Thua</span>
                </button>
              </>
            )}
          </div>
        </footer>
      )}

      {/* Walkover Confirmation Modal */}
      {showWalkoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-black text-white">Xử Thua / Bỏ Cuộc (Walkover)</h3>
              </div>
              <button
                onClick={() => setShowWalkoverModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Xác nhận đội bỏ cuộc do chấn thương hoặc vi phạm điều lệ. Kết quả chiến thắng sẽ được ghi
              nhận và tự động đưa đội thắng vào vòng tiếp theo.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Chọn Đội Giành Chiến Thắng</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWalkoverWinner("TEAM_A")}
                    className={`rounded-xl border p-3 text-xs font-bold transition text-left ${
                      walkoverWinner === "TEAM_A"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-800/60 text-slate-400"
                    }`}
                  >
                    Đội A ({teamA?.displayName || "Team A"})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkoverWinner("TEAM_B")}
                    className={`rounded-xl border p-3 text-xs font-bold transition text-left ${
                      walkoverWinner === "TEAM_B"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-800 bg-slate-800/60 text-slate-400"
                    }`}
                  >
                    Đội B ({teamB?.displayName || "Team B"})
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Lý Do Xử Thua</label>
                <input
                  type="text"
                  value={walkoverReason}
                  onChange={(e) => setWalkoverReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-brand-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWalkoverModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                disabled={walkoverMutation.isPending}
                onClick={() => walkoverMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500 disabled:opacity-50 transition"
              >
                {walkoverMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Xác Nhận Xử Thua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

