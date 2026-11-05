"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Calendar,
  Clock,
  MapPin,
  Lock,
  Unlock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Shuffle,
  RefreshCw,
  Send,
  Loader2,
  Edit2,
  X,
  Play,
  Users,
} from "lucide-react";

interface Court {
  id: string;
  name: string;
  courtOrder: number;
}

interface MatchConflict {
  type: string;
  severity: "ERROR" | "WARNING";
  matchIdA: string;
  matchIdB?: string;
  message: string;
}

interface Match {
  id: string;
  matchCode: string;
  roundNumber: number;
  bracketPosition: number;
  status: string;
  courtId: string | null;
  scheduledStartTime: string | null;
  estimatedDurationMinutes: number;
  isTimeLocked: boolean;
  court?: Court | null;
  teamA?: any | null;
  teamB?: any | null;
  winner?: any | null;
  event?: {
    id: string;
    name: string;
    playType: string;
  };
}

interface CourtTimelineProps {
  tournamentId: string;
  tournamentStatus: string;
  isOrganizer?: boolean;
}

export function CourtTimeline({
  tournamentId,
  tournamentStatus,
  isOrganizer = true,
}: CourtTimelineProps) {
  const queryClient = useQueryClient();

  // Selected date filter (default to first day with matches or today)
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Edit Match Schedule Modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editCourtId, setEditCourtId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(30);

  // Recalculate Overrun Modal
  const [showOverrunModal, setShowOverrunModal] = useState(false);
  const [delayedMatchId, setDelayedMatchId] = useState("");
  const [overrunMinutes, setOverrunMinutes] = useState(20);

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch schedule
  const {
    data: scheduleData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tournament-schedule", tournamentId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/tournaments/${tournamentId}/schedule`);
      return res?.data;
    },
    enabled: !!tournamentId,
  });

  const courts: Court[] = scheduleData?.courts || [];
  const matches: Match[] = scheduleData?.matches || [];
  const conflicts: MatchConflict[] = scheduleData?.conflicts || [];

  // Extract unique match days
  const availableDates = Array.from(
    new Set(
      matches
        .filter((m) => m.scheduledStartTime)
        .map((m) => new Date(m.scheduledStartTime!).toISOString().split("T")[0])
    )
  ).sort();

  const activeDate = selectedDate || availableDates[0] || new Date().toISOString().split("T")[0];

  // Auto Generate Schedule Mutation
  const autoScheduleMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/tournaments/${tournamentId}/schedule/generate`, {});
    },
    onSuccess: (res: any) => {
      setFeedback({
        type: "success",
        text: res?.message || "Tự động xếp lịch thành công!",
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-schedule", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        text: err?.message || "Lỗi khi tự động xếp lịch",
      });
    },
  });

  // Toggle Lock Time Mutation
  const toggleLockMutation = useMutation({
    mutationFn: async ({ matchId, isTimeLocked }: { matchId: string; isTimeLocked: boolean }) => {
      return apiClient.patch(`/matches/${matchId}/schedule/lock-time`, { isTimeLocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-schedule", tournamentId] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        text: err?.message || "Không thể cập nhật khóa giờ",
      });
    },
  });

  // Update Match Schedule Mutation
  const updateMatchScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!editingMatch) return;
      return apiClient.patch(`/matches/${editingMatch.id}/schedule`, {
        courtId: editCourtId,
        scheduledStartTime: editStartTime,
        estimatedDurationMinutes: Number(editDuration),
      });
    },
    onSuccess: () => {
      setEditingMatch(null);
      setFeedback({ type: "success", text: "Cập nhật giờ và sân đấu thành công" });
      queryClient.invalidateQueries({ queryKey: ["tournament-schedule", tournamentId] });
    },
    onError: (err: any) => {
      setFeedback({ type: "error", text: err?.message || "Lỗi cập nhật lịch trận đấu" });
    },
  });

  // Recalculate Overrun Mutation
  const overrunMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/tournaments/${tournamentId}/schedule/recalculate`, {
        delayedMatchId,
        delayMinutes: Number(overrunMinutes),
      });
    },
    onSuccess: (res: any) => {
      setShowOverrunModal(false);
      setFeedback({
        type: "success",
        text: res?.message || "Đã tự động tính toán và dịch chuyển các trận tiếp theo!",
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-schedule", tournamentId] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        text: err?.message || "Lỗi khi tính toán thời gian trễ",
      });
    },
  });

  // Publish Schedule Mutation
  const publishScheduleMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/tournaments/${tournamentId}/schedule/publish`, {});
    },
    onSuccess: () => {
      setFeedback({
        type: "success",
        text: "Lịch thi đấu đã được công bố chính thức tới VĐV và khán giả!",
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-schedule", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        text: err?.message || "Không thể công bố lịch",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 font-semibold text-slate-600">Đang tải lịch thi đấu...</span>
      </div>
    );
  }

  // Filter matches scheduled for active date
  const scheduledForDate = matches.filter((m) => {
    if (!m.scheduledStartTime) return false;
    const dateStr = new Date(m.scheduledStartTime).toISOString().split("T")[0];
    return dateStr === activeDate;
  });

  // Unscheduled matches
  const unscheduledMatches = matches.filter((m) => !m.scheduledStartTime || !m.courtId);

  // Time grid slots from 07:00 to 22:00 (every 30 mins)
  const timeSlots: string[] = [];
  for (let hour = 7; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  const getMatchConflicts = (matchId: string) => {
    return conflicts.filter((c) => c.matchIdA === matchId || c.matchIdB === matchId);
  };

  const criticalConflicts = conflicts.filter((c) => c.severity === "ERROR");
  const warningConflicts = conflicts.filter((c) => c.severity === "WARNING");

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-semibold shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Action Header & Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Lịch Thi Đấu & Điều Phối Đa Sân (Court Timeline)
          </h3>
          <p className="text-sm text-slate-500">
            Tổng số: <span className="font-semibold text-slate-700">{matches.length} trận</span> | Đã
            xếp:{" "}
            <span className="font-semibold text-brand-600">
              {matches.length - unscheduledMatches.length} trận
            </span>{" "}
            | Chưa xếp:{" "}
            <span className="font-semibold text-amber-600">
              {unscheduledMatches.length} trận
            </span>
          </p>
        </div>

        {isOrganizer && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              disabled={autoScheduleMutation.isPending || matches.length === 0}
              onClick={() => {
                if (
                  confirm(
                    "Hệ thống sẽ tự động xếp sân và giờ thi đấu tối ưu, phân bổ thời gian nghỉ 20 phút cho VĐV. Tiếp tục?"
                  )
                ) {
                  autoScheduleMutation.mutate();
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {autoScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="h-4 w-4" />
              )}
              Tự Động Xếp Lịch
            </button>

            <button
              onClick={() => setShowOverrunModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Xử Lý Quá Giờ (Overrun)
            </button>

            <button
              disabled={
                publishScheduleMutation.isPending ||
                tournamentStatus === "SCHEDULE_PUBLISHED" ||
                tournamentStatus === "IN_PROGRESS" ||
                tournamentStatus === "COMPLETED"
              }
              onClick={() => {
                if (criticalConflicts.length > 0) {
                  alert(
                    `Không thể công bố! Còn ${criticalConflicts.length} lỗi xung đột nghiêm trọng (trùng sân / trùng VĐV).`
                  );
                  return;
                }
                if (
                  confirm(
                    "Bạn có chắc muốn công bố lịch thi đấu chính thức? Khán giả và VĐV sẽ có thể theo dõi trên Public Portal."
                  )
                ) {
                  publishScheduleMutation.mutate();
                }
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                tournamentStatus === "SCHEDULE_PUBLISHED"
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {publishScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {tournamentStatus === "SCHEDULE_PUBLISHED"
                ? "Lịch Đã Công Bố"
                : "Công Bố Lịch Thi Đấu"}
            </button>
          </div>
        )}
      </div>

      {/* Conflict Notification Bar */}
      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <div className="flex items-center gap-2 mb-2 font-bold text-rose-900">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>Phát hiện {conflicts.length} xung đột lịch thi đấu:</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto pr-2">
            {conflicts.map((conf, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 rounded-lg p-2.5 text-xs font-semibold ${
                  conf.severity === "ERROR"
                    ? "bg-white text-rose-700 border border-rose-200 shadow-xs"
                    : "bg-white text-amber-700 border border-amber-200 shadow-xs"
                }`}
              >
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                    conf.severity === "ERROR"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {conf.severity}
                </span>
                <span>{conf.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Filter Bar */}
      {availableDates.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Chọn Ngày:
          </span>
          {availableDates.map((dateStr) => {
            const isCurrent = dateStr === activeDate;
            const parsed = new Date(dateStr);
            const formatted = parsed.toLocaleDateString("vi-VN", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            });
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isCurrent
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {formatted} ({dateStr})
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Gantt / Timeline Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        {courts.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Giải đấu chưa có sân thi đấu nào được thiết lập.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Courts as Rows */}
              <div className="space-y-4">
                {courts.map((court) => {
                  const courtMatches = scheduledForDate
                    .filter((m) => m.courtId === court.id)
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledStartTime!).getTime() -
                        new Date(b.scheduledStartTime!).getTime()
                    );

                  return (
                    <div
                      key={court.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      {/* Court Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-black text-white shadow-xs">
                            {court.courtOrder}
                          </span>
                          <span className="font-bold text-slate-800">{court.name}</span>
                          <span className="text-xs text-slate-500 font-medium">
                            ({courtMatches.length} trận đấu)
                          </span>
                        </div>
                      </div>

                      {/* Match Sequence Strip */}
                      {courtMatches.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs font-medium text-slate-400">
                          Chưa có trận đấu nào được xếp trên sân này trong ngày {activeDate}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {courtMatches.map((match) => {
                            const matchConf = getMatchConflicts(match.id);
                            const hasError = matchConf.some((c) => c.severity === "ERROR");
                            const hasWarning = matchConf.some((c) => c.severity === "WARNING");

                            const timeStr = new Date(match.scheduledStartTime!).toLocaleTimeString(
                              "vi-VN",
                              { hour: "2-digit", minute: "2-digit" }
                            );

                            return (
                              <div
                                key={match.id}
                                className={`relative rounded-xl border p-3.5 transition shadow-xs ${
                                  hasError
                                    ? "border-rose-300 bg-rose-50/70"
                                    : hasWarning
                                    ? "border-amber-300 bg-amber-50/50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                {/* Top Bar: Code, Time, Lock */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-700">
                                      {match.matchCode}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-brand-700">
                                      <Clock className="h-3 w-3" />
                                      {timeStr}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({match.estimatedDurationMinutes}p)
                                    </span>
                                  </div>

                                  {isOrganizer && (
                                    <div className="flex items-center gap-1">
                                      {/* Lock Button */}
                                      <button
                                        title={
                                          match.isTimeLocked
                                            ? "Khung giờ bị khóa cứng (không tự dịch chuyển)"
                                            : "Khóa khung giờ trận này"
                                        }
                                        onClick={() =>
                                          toggleLockMutation.mutate({
                                            matchId: match.id,
                                            isTimeLocked: !match.isTimeLocked,
                                          })
                                        }
                                        className={`rounded p-1 transition ${
                                          match.isTimeLocked
                                            ? "bg-amber-100 text-amber-800"
                                            : "text-slate-400 hover:text-slate-600"
                                        }`}
                                      >
                                        {match.isTimeLocked ? (
                                          <Lock className="h-3.5 w-3.5" />
                                        ) : (
                                          <Unlock className="h-3.5 w-3.5" />
                                        )}
                                      </button>

                                      {/* Edit Button */}
                                      <button
                                        title="Chỉnh sửa sân và giờ"
                                        onClick={() => {
                                          setEditingMatch(match);
                                          setEditCourtId(match.courtId || "");
                                          const localIso = new Date(match.scheduledStartTime!)
                                            .toISOString()
                                            .slice(0, 16);
                                          setEditStartTime(localIso);
                                          setEditDuration(match.estimatedDurationMinutes || 30);
                                        }}
                                        className="rounded p-1 text-slate-400 hover:text-slate-600"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Event & Teams */}
                                <div className="mt-2 text-xs">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {match.event?.name}
                                  </div>

                                  {/* Team A */}
                                  <div className="mt-1 flex items-center justify-between font-semibold text-slate-800">
                                    <span className="truncate">
                                      {match.teamA?.displayName || "TBD"}
                                    </span>
                                    {match.winner?.id === match.teamA?.id && (
                                      <span className="text-[10px] font-bold text-emerald-600">
                                        THẮNG
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-medium">vs</div>

                                  {/* Team B */}
                                  <div className="flex items-center justify-between font-semibold text-slate-800">
                                    <span className="truncate">
                                      {match.teamB?.displayName || "TBD"}
                                    </span>
                                    {match.winner?.id === match.teamB?.id && (
                                      <span className="text-[10px] font-bold text-emerald-600">
                                        THẮNG
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Conflict Badge */}
                                {matchConf.length > 0 && (
                                  <div className="mt-2.5 rounded bg-rose-100/80 px-2 py-1 text-[10px] font-bold text-rose-800">
                                    {matchConf[0].message}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unscheduled Matches Section */}
      {unscheduledMatches.length > 0 && isOrganizer && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h4 className="font-bold text-amber-900">
                Các Trận Chưa Được Xếp Lịch ({unscheduledMatches.length})
              </h4>
            </div>
            <button
              onClick={() => autoScheduleMutation.mutate()}
              className="text-xs font-bold text-brand-700 underline hover:text-brand-800"
            >
              Tự động xếp toàn bộ trận này
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {unscheduledMatches.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-amber-200 bg-white p-3 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{m.matchCode}</span>
                  <span className="text-[10px] text-slate-400">{m.event?.name}</span>
                </div>
                <div className="mt-1 truncate text-slate-600 font-medium">
                  {m.teamA?.displayName || "TBD"} vs {m.teamB?.displayName || "TBD"}
                </div>
                <button
                  onClick={() => {
                    setEditingMatch(m);
                    setEditCourtId(courts[0]?.id || "");
                    const nowIso = new Date().toISOString().slice(0, 16);
                    setEditStartTime(nowIso);
                    setEditDuration(30);
                  }}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  <Edit2 className="h-3 w-3" />
                  Xếp Sân & Giờ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Match Schedule Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Xếp Lịch Trận Đấu: {editingMatch.matchCode}
              </h3>
              <button
                onClick={() => setEditingMatch(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Chọn Sân Thi Đấu</label>
                <select
                  value={editCourtId}
                  onChange={(e) => setEditCourtId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800"
                >
                  <option value="">-- Chưa chọn sân --</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Giờ Bắt Đầu Dự Kiến</label>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Thời Lượng Ước Tính (Phút)
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                disabled={updateMatchScheduleMutation.isPending || !editCourtId || !editStartTime}
                onClick={() => updateMatchScheduleMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {updateMatchScheduleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recalculate Overrun Modal */}
      {showOverrunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Xử Lý Trận Đấu Kéo Dài Quá Giờ
                </h3>
              </div>
              <button
                onClick={() => setShowOverrunModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Khi một trận đấu trên sân kéo dài quá thời lượng dự kiến, hệ thống sẽ tự động tính toán
              dịch chuyển giờ của các trận kế tiếp trên cùng sân (trừ các trận đã được khóa giờ cố
              định).
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Chọn Trận Đang Bị Quá Giờ / Kéo Dài
                </label>
                <select
                  value={delayedMatchId}
                  onChange={(e) => setDelayedMatchId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800"
                >
                  <option value="">-- Chọn trận đấu --</option>
                  {matches
                    .filter((m) => m.scheduledStartTime && m.courtId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.matchCode} - {m.court?.name} (
                        {m.teamA?.displayName || "TBD"} vs {m.teamB?.displayName || "TBD"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Số Phút Kéo Dài Thêm (Delay Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={overrunMinutes}
                  onChange={(e) => setOverrunMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOverrunModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                disabled={overrunMutation.isPending || !delayedMatchId}
                onClick={() => overrunMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {overrunMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Tính Toán & Dịch Chuyển Lịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

