"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_BASE_URL } from "@/lib/api";
import { BracketCanvas } from "@/features/brackets/components/bracket-canvas";
import { RoundRobinTable } from "@/features/brackets/components/round-robin-table";
import { CourtTimeline } from "@/features/scheduling/components/court-timeline";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Grid,
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  Lock,
  Unlock,
  Settings,
  Mail,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Download,
  DollarSign,
  Star,
  Shuffle,
  Eye,
  Loader2,
  X,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Bản Nháp", color: "bg-slate-100 text-slate-700 border-slate-300" },
  PENDING_APPROVAL: { label: "Chờ Phê Duyệt", color: "bg-amber-50 text-amber-700 border-amber-300" },
  REGISTRATION_OPEN: { label: "Đang Mở Đăng Ký", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  REGISTRATION_CLOSED: { label: "Đã Đóng Đăng Ký", color: "bg-blue-50 text-blue-700 border-blue-300" },
  DRAW_COMPLETED: { label: "Đã Bốc Thăm", color: "bg-indigo-50 text-indigo-700 border-indigo-300" },
  SCHEDULE_PUBLISHED: { label: "Đã Công Bố Lịch", color: "bg-purple-50 text-purple-700 border-purple-300" },
  IN_PROGRESS: { label: "Đang Thi Đấu", color: "bg-rose-50 text-rose-700 border-rose-300" },
  COMPLETED: { label: "Đã Hoàn Thành", color: "bg-slate-200 text-slate-800 border-slate-400" },
  CANCELLED: { label: "Đã Hủy", color: "bg-rose-100 text-rose-800 border-rose-300" },
};

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tournamentId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "events" | "registrations" | "draw" | "schedule" | "courts" | "staff">("overview");

  // Draw Management State
  const [selectedDrawEventId, setSelectedDrawEventId] = useState<string>("");
  const [drawPreviewData, setDrawPreviewData] = useState<any | null>(null);

  // New Event Form State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventPlayType, setNewEventPlayType] = useState("DOUBLE_MEN");
  const [newEventFormat, setNewEventFormat] = useState("KNOCKOUT");
  const [newEventFee, setNewEventFee] = useState(250000);
  const [newEventMax, setNewEventMax] = useState(16);

  // New Staff Form State
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"ORGANIZER" | "REFEREE">("REFEREE");

  // Registration Filter & Reject State
  const [regFilterStatus, setRegFilterStatus] = useState<string>("ALL");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("ALL");
  const [rejectingRegId, setRejectingRegId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Seed Modal State
  const [seedingParticipant, setSeedingParticipant] = useState<any | null>(null);
  const [seedNumberInput, setSeedNumberInput] = useState<number>(1);

  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Tournament Data
  const { data: tournament, isLoading } = useQuery({
    queryKey: ["organizer-tournament", tournamentId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/tournaments/${tournamentId}`);
      return res?.data;
    },
    enabled: !!tournamentId,
  });

  // Default selected draw event
  if (tournament?.events?.length > 0 && !selectedDrawEventId) {
    setSelectedDrawEventId(tournament.events[0].id);
  }

  // Fetch Bracket Data for Selected Draw Event
  const { data: bracketData, isLoading: isLoadingBracket } = useQuery({
    queryKey: ["event-bracket", selectedDrawEventId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/events/${selectedDrawEventId}/bracket`);
      return res?.data;
    },
    enabled: !!selectedDrawEventId,
  });

  // Fetch Registrations Data
  const { data: registrationsRes } = useQuery({
    queryKey: ["organizer-registrations", tournamentId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/tournaments/${tournamentId}/registrations`);
      return res?.data || [];
    },
    enabled: !!tournamentId,
  });
  const registrations = registrationsRes || [];

  // State Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      return apiClient.post(`/tournaments/${tournamentId}/${endpoint}`, {});
    },
    onSuccess: (data: any) => {
      setActionMessage({ type: "success", text: data?.message || "Cập nhật trạng thái thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Thao tác không thành công" });
    },
  });

  // Draw Preview Mutation
  const previewDrawMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiClient.post(`/events/${eventId}/draw/preview`, {});
    },
    onSuccess: (res: any) => {
      setDrawPreviewData(res?.data);
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể tạo bản xem trước bốc thăm" });
    },
  });

  // Draw Confirm Mutation
  const confirmDrawMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiClient.post(`/events/${eventId}/draw/confirm`, {});
    },
    onSuccess: () => {
      setDrawPreviewData(null);
      setActionMessage({ type: "success", text: "Xác nhận và lưu nhánh đấu thành công!" });
      queryClient.invalidateQueries({ queryKey: ["event-bracket", selectedDrawEventId] });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể xác nhận bốc thăm" });
    },
  });

  // Add Event Mutation
  const addEventMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/events", {
        tournamentId,
        name: newEventName,
        playType: newEventPlayType,
        format: newEventFormat,
        entryFee: Number(newEventFee),
        maxParticipants: Number(newEventMax),
      });
    },
    onSuccess: () => {
      setShowAddEvent(false);
      setNewEventName("");
      setActionMessage({ type: "success", text: "Thêm nội dung thi đấu thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Lỗi khi thêm nội dung" });
    },
  });

  // Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiClient.delete(`/events/${eventId}`);
    },
    onSuccess: () => {
      setActionMessage({ type: "success", text: "Xóa nội dung thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể xóa nội dung" });
    },
  });

  // Approve Registration Mutation
  const approveRegMutation = useMutation({
    mutationFn: async (regId: string) => {
      return apiClient.patch(`/registrations/${regId}/approve`, {});
    },
    onSuccess: () => {
      setActionMessage({ type: "success", text: "Duyệt hồ sơ VĐV thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-registrations", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể duyệt hồ sơ" });
    },
  });

  // Reject Registration Mutation
  const rejectRegMutation = useMutation({
    mutationFn: async ({ regId, reason }: { regId: string; reason: string }) => {
      return apiClient.patch(`/registrations/${regId}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      setRejectingRegId(null);
      setRejectionReason("");
      setActionMessage({ type: "success", text: "Từ chối hồ sơ đăng ký thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-registrations", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể từ chối hồ sơ" });
    },
  });

  // Toggle Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: async (participantId: string) => {
      return apiClient.patch(`/registrations/participants/${participantId}/check-in`, {});
    },
    onSuccess: () => {
      setActionMessage({ type: "success", text: "Cập nhật điểm danh thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-registrations", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể cập nhật điểm danh" });
    },
  });

  // Toggle Payment Status Mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) => {
      return apiClient.patch(`/registrations/payments/${paymentId}`, { status });
    },
    onSuccess: () => {
      setActionMessage({ type: "success", text: "Cập nhật trạng thái thanh toán thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-registrations", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Lỗi cập nhật thanh toán" });
    },
  });

  // Update Seed Mutation
  const updateSeedMutation = useMutation({
    mutationFn: async ({ participantId, isSeeded, seedNumber }: { participantId: string; isSeeded: boolean; seedNumber: number | null }) => {
      return apiClient.patch(`/participants/${participantId}/seed`, { isSeeded, seedNumber });
    },
    onSuccess: () => {
      setSeedingParticipant(null);
      setActionMessage({ type: "success", text: "Cập nhật hạt giống thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-registrations", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể cập nhật hạt giống" });
    },
  });

  // Invite Staff Mutation
  const inviteStaffMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/tournaments/${tournamentId}/staff`, {
        email: staffEmail,
        role: staffRole,
      });
    },
    onSuccess: () => {
      setShowAddStaff(false);
      setStaffEmail("");
      setActionMessage({ type: "success", text: "Thêm nhân sự thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể thêm nhân sự" });
    },
  });

  // Revoke Staff Mutation
  const revokeStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiClient.delete(`/tournaments/${tournamentId}/staff/${staffId}`);
    },
    onSuccess: () => {
      setActionMessage({ type: "success", text: "Thu hồi quyền nhân sự thành công" });
      queryClient.invalidateQueries({ queryKey: ["organizer-tournament", tournamentId] });
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err?.message || "Không thể thu hồi quyền" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        Không tìm thấy giải đấu.
      </div>
    );
  }

  const statusInfo = STATUS_MAP[tournament.status] || {
    label: tournament.status,
    color: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const filteredRegs = registrations.filter((r: any) => {
    const matchesStatus = regFilterStatus === "ALL" || r.status === regFilterStatus;
    const matchesEvent = selectedEventFilter === "ALL" || r.participant?.eventId === selectedEventFilter;
    return matchesStatus && matchesEvent;
  });

  const handleExportCsv = () => {
    window.open(`${API_BASE_URL}/tournaments/${tournamentId}/registrations/export`, "_blank");
  };

  const currentDrawEvent = tournament.events?.find((e: any) => e.id === selectedDrawEventId);
  const hasBracketMatches = bracketData?.rounds && bracketData.rounds.length > 0;

  return (
    <div className="space-y-6">
      {/* Tournament Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-sm font-medium text-slate-500">
                {tournament.sport?.name}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{tournament.name}</h1>
            <p className="mt-1 text-sm text-slate-500">Mã giải / Slug: /{tournament.slug}</p>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {tournament.status === "DRAFT" && (
              <button
                onClick={() => transitionMutation.mutate("open-registration")}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Unlock className="h-4 w-4" />
                Mở Cổng Đăng Ký
              </button>
            )}

            {tournament.status === "REGISTRATION_OPEN" && (
              <button
                onClick={() => transitionMutation.mutate("close-registration")}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                <Lock className="h-4 w-4" />
                Đóng Cổng Đăng Ký
              </button>
            )}

            {tournament.status === "DRAW_COMPLETED" && (
              <button
                onClick={() => transitionMutation.mutate("publish-schedule")}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Công Bố Lịch Thi Đấu (Publish)
              </button>
            )}

            {tournament.status === "SCHEDULE_PUBLISHED" && (
              <button
                onClick={() => transitionMutation.mutate("start")}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition animate-pulse"
              >
                <Play className="h-4 w-4" />
                Khai Mạc Giải Đấu (Start)
              </button>
            )}

            {tournament.status === "IN_PROGRESS" && (
              <button
                onClick={() => transitionMutation.mutate("complete")}
                disabled={transitionMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-900 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Hoàn Tất & Kết Thúc Giải
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mt-4 flex items-center justify-between rounded-xl p-3.5 text-sm font-medium border ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline">
              Đóng
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap border-b border-slate-200 gap-6 sm:gap-8">
          {[
            { id: "overview", label: "Tổng Quan & Điều Lệ", icon: Trophy },
            { id: "events", label: `Nội Dung Thi Đấu (${tournament.events?.length || 0})`, icon: Grid },
            { id: "registrations", label: `Đăng Ký & VĐV (${registrations.length})`, icon: Users },
            { id: "draw", label: "Bốc Thăm & Nhánh Đấu", icon: Shuffle },
            { id: "schedule", label: "Lịch Thi Đấu & Sân", icon: Calendar },
            { id: "courts", label: `Sân Thi Đấu (${tournament.courts?.length || 0})`, icon: MapPin },
            { id: "staff", label: `BTC & Trọng Tài (${tournament.staff?.length || 0})`, icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: SCHEDULING (PHASE 6 CORE) */}
      {activeTab === "schedule" && (
        <CourtTimeline
          tournamentId={tournamentId}
          tournamentStatus={tournament.status}
          isOrganizer={true}
        />
      )}

      {/* TAB CONTENT: DRAW & BRACKETS (PHASE 5 CORE) */}
      {activeTab === "draw" && (
        <div className="space-y-6">
          {/* Event Picker Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">Chọn Nội Dung Bốc Thăm:</span>
              <select
                value={selectedDrawEventId}
                onChange={(e) => setSelectedDrawEventId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
              >
                {tournament.events?.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.playType} - {ev.format})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={previewDrawMutation.isPending || !selectedDrawEventId}
                onClick={() => previewDrawMutation.mutate(selectedDrawEventId)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {previewDrawMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                Tự Động Bốc Thăm (Auto Draw)
              </button>
            </div>
          </div>

          {/* Modal Preview Draw */}
          {drawPreviewData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Xem Trước Kết Quả Bốc Thăm</h3>
                    <p className="text-xs text-slate-500">
                      Nội dung: {currentDrawEvent?.name} ({currentDrawEvent?.format})
                    </p>
                  </div>
                  <button onClick={() => setDrawPreviewData(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Số VĐV tham gia:</span>
                    <strong className="text-slate-900 text-base">{drawPreviewData.totalParticipants}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quy mô nhánh (K):</span>
                    <strong className="text-brand-600 text-base">{drawPreviewData.bracketSize || drawPreviewData.totalMatches}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Số suất Bye:</span>
                    <strong className="text-amber-600 text-base">{drawPreviewData.totalByes || 0}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Xung đột cùng CLB:</span>
                    <strong className={`text-base ${drawPreviewData.sameClubConflictsCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {drawPreviewData.sameClubConflictsCount ?? 0}
                    </strong>
                  </div>
                </div>

                {drawPreviewData.warnings?.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                    {drawPreviewData.warnings.map((w: string, idx: number) => (
                      <p key={idx}>{w}</p>
                    ))}
                  </div>
                )}

                {/* First round matches preview */}
                {drawPreviewData.firstRoundMatches && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">
                      Danh Sách Các Cặp Đấu Vòng 1:
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                      {drawPreviewData.firstRoundMatches.map((m: any) => (
                        <div key={m.matchIndex} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
                          <span className="font-bold text-slate-500">{m.matchCode}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {m.slotA.isBye ? "[BYE]" : m.slotA.participant?.displayName}
                            </span>
                            <span className="text-brand-600 font-extrabold">VS</span>
                            <span className="font-semibold text-slate-900">
                              {m.slotB.isBye ? "[BYE]" : m.slotB.participant?.displayName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setDrawPreviewData(null)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={confirmDrawMutation.isPending}
                    onClick={() => confirmDrawMutation.mutate(selectedDrawEventId)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmDrawMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Xác Nhận & Lưu Nhánh Đấu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Bracket / Round Robin Canvas */}
          {isLoadingBracket ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : hasBracketMatches ? (
            currentDrawEvent?.format === "KNOCKOUT" ? (
              <BracketCanvas rounds={bracketData.rounds} />
            ) : (
              <RoundRobinTable rounds={bracketData.rounds} />
            )
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Shuffle className="h-8 w-8 text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-900">Chưa bốc thăm nội dung này</h4>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                Hãy nhấn nút <strong>"Tự Động Bốc Thăm (Auto Draw)"</strong> ở trên để phân nhánh, phân bổ hạt giống và tránh các cặp cùng CLB.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: REGISTRATIONS */}
      {activeTab === "registrations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-slate-500">Tổng Số Đăng Ký</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{registrations.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-amber-600">Hồ Sơ Chờ Duyệt</span>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {registrations.filter((r: any) => r.status === "PENDING").length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-emerald-600">Đã Phê Duyệt</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {registrations.filter((r: any) => r.status === "APPROVED").length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-medium text-brand-600">Đã Điểm Danh (Check-in)</span>
              <p className="mt-1 text-2xl font-bold text-brand-600">
                {registrations.filter((r: any) => r.participant?.checkInStatus === "CHECKED_IN").length}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRegFilterStatus(st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      regFilterStatus === st
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {st === "ALL" ? "Tất Cả" : st === "PENDING" ? "Chờ Duyệt" : st === "APPROVED" ? "Đã Duyệt" : "Từ Chối"}
                  </button>
                ))}
              </div>

              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
              >
                <option value="ALL">Tất cả nội dung</option>
                {tournament.events?.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Xuất File Excel/CSV
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">VĐV / Cặp Đôi</th>
                  <th className="px-5 py-3.5">Nội Dung</th>
                  <th className="px-5 py-3.5">CLB</th>
                  <th className="px-5 py-3.5">Lệ Phí</th>
                  <th className="px-5 py-3.5">Điểm Danh</th>
                  <th className="px-5 py-3.5">Hồ Sơ</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      Chưa có hồ sơ đăng ký nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredRegs.map((reg: any) => {
                    const p = reg.participant;
                    const payment = p?.payments?.[0];
                    const isPaid = payment?.status === "PAID";
                    const isCheckedIn = p?.checkInStatus === "CHECKED_IN";
                    const isApproved = reg.status === "APPROVED";

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p?.displayName}</span>
                            {p?.isSeeded && p?.seedNumber && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-extrabold text-amber-800">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                #{p.seedNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Người nộp: {reg.submitter?.fullName}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                            {p?.event?.name}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          {p?.club?.name || "Tự do"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-800">
                            {new Intl.NumberFormat("vi-VN").format(payment?.amount || 0)} VNĐ
                          </div>
                          {payment && (
                            <button
                              onClick={() =>
                                paymentMutation.mutate({
                                  paymentId: payment.id,
                                  status: isPaid ? "PENDING" : "PAID",
                                })
                              }
                              className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }`}
                            >
                              {isPaid ? "✓ Đã Thu Lệ Phí" : "Chưa Thu"}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => checkInMutation.mutate(p.id)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isCheckedIn
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {isCheckedIn ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                            {isCheckedIn ? "Đã Check-in" : "Chưa Điểm Danh"}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              reg.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : reg.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {reg.status === "APPROVED"
                              ? "Đã Duyệt"
                              : reg.status === "REJECTED"
                              ? "Từ Chối"
                              : "Chờ Duyệt"}
                          </span>
                          {reg.rejectionReason && (
                            <div className="text-[11px] text-rose-600 mt-1 max-w-xs">
                              {reg.rejectionReason}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right space-x-2">
                          {reg.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => approveRegMutation.mutate(reg.id)}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => setRejectingRegId(reg.id)}
                                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                              >
                                Từ Chối
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => {
                                setSeedingParticipant(p);
                                setSeedNumberInput(p.seedNumber || 1);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              Hạt Giống
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Reject Registration */}
          {rejectingRegId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-slate-900">Từ Chối Hồ Sơ Đăng Ký</h4>
                <p className="text-sm text-slate-500">
                  Vui lòng nhập lý do từ chối để thông báo tới vận động viên.
                </p>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: VĐV chưa đóng lệ phí / Vượt quá độ tuổi điều lệ..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-600"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setRejectingRegId(null);
                      setRejectionReason("");
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    disabled={!rejectionReason.trim()}
                    onClick={() =>
                      rejectRegMutation.mutate({
                        regId: rejectingRegId,
                        reason: rejectionReason,
                      })
                    }
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Xác Nhận Từ Chối
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Set Seed */}
          {seedingParticipant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
                <h4 className="text-base font-bold text-slate-900">Cấu Hình Hạt Giống</h4>
                <p className="text-sm text-slate-500 font-semibold">{seedingParticipant.displayName}</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Thứ Hạng Hạt Giống (Seed Number)</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={seedNumberInput}
                    onChange={(e) => setSeedNumberInput(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                  />
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <button
                    onClick={() =>
                      updateSeedMutation.mutate({
                        participantId: seedingParticipant.id,
                        isSeeded: false,
                        seedNumber: null,
                      })
                    }
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Xóa Hạt Giống
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSeedingParticipant(null)}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() =>
                        updateSeedMutation.mutate({
                          participantId: seedingParticipant.id,
                          isSeeded: true,
                          seedNumber: seedNumberInput,
                        })
                      }
                      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-700"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">Điều Lệ Giải Đấu</h3>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
                {tournament.ruleContent || "Chưa cập nhật nội dung điều lệ chi tiết."}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Mốc Thời Gian</h3>
              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="font-semibold block text-slate-700">Mở đăng ký:</span>
                  <span>{new Date(tournament.registrationOpenAt).toLocaleString("vi-VN")}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-700">Đóng đăng ký:</span>
                  <span>{new Date(tournament.registrationCloseAt).toLocaleString("vi-VN")}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-700">Thi đấu chính thức:</span>
                  <span>
                    {new Date(tournament.tournamentStartAt).toLocaleDateString("vi-VN")} -{" "}
                    {new Date(tournament.tournamentEndAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Thông Số Kỹ Thuật</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Số sân thi đấu:</span>
                  <span className="font-semibold text-slate-900">{tournament.courts?.length || tournament.totalCourts} Sân</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời lượng/trận:</span>
                  <span className="font-semibold text-slate-900">{tournament.defaultMatchDurationMinutes} phút</span>
                </div>
                <div className="flex justify-between">
                  <span>Khoảng nghỉ:</span>
                  <span className="font-semibold text-slate-900">{tournament.matchIntervalMinutes} phút</span>
                </div>
                <div className="flex justify-between">
                  <span>Giới hạn nội dung:</span>
                  <span className="font-semibold text-slate-900">{tournament.maxEventsPerPlayer} nội dung / VĐV</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EVENTS */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Danh Sách Nội Dung Thi Đấu</h3>
            <button
              onClick={() => setShowAddEvent(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Plus className="h-4 w-4" />
              Thêm Nội Dung
            </button>
          </div>

          {showAddEvent && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-6 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-brand-900">Tạo Nội Dung Thi Đấu Mới</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Tên Nội Dung *</label>
                  <input
                    type="text"
                    required
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="Ví dụ: Đôi Nam Phong Trào"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Hình Thức *</label>
                  <select
                    value={newEventPlayType}
                    onChange={(e) => setNewEventPlayType(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="SINGLE_MEN">Đơn Nam</option>
                    <option value="SINGLE_WOMEN">Đơn Nữ</option>
                    <option value="DOUBLE_MEN">Đôi Nam</option>
                    <option value="DOUBLE_WOMEN">Đôi Nữ</option>
                    <option value="DOUBLE_MIXED">Đôi Nam Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Thể Thức *</label>
                  <select
                    value={newEventFormat}
                    onChange={(e) => setNewEventFormat(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="KNOCKOUT">Loại Trực Tiếp (Knockout)</option>
                    <option value="ROUND_ROBIN">Vòng Tròn (Round Robin)</option>
                    <option value="ROUND_ROBIN_THEN_KNOCKOUT">Vòng Bảng + Knockout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Lệ Phí (VNĐ)</label>
                  <input
                    type="number"
                    step={10000}
                    value={newEventFee}
                    onChange={(e) => setNewEventFee(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Giới Hạn Số Đội/VĐV</label>
                  <input
                    type="number"
                    min={2}
                    value={newEventMax}
                    onChange={(e) => setNewEventMax(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEvent(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={addEventMutation.isPending || !newEventName.trim()}
                  onClick={() => addEventMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                >
                  {addEventMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu Nội Dung
                </button>
              </div>
            </div>
          )}

          {/* Events List Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.events?.map((ev: any) => (
              <div key={ev.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{ev.name}</h4>
                    <span className="text-xs font-semibold text-brand-600">{ev.playType}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc chắn muốn xóa nội dung "${ev.name}"?`)) {
                        deleteEventMutation.mutate(ev.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                    title="Xóa nội dung"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>Thể thức:</span>
                    <span className="font-semibold text-slate-700">{ev.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lệ phí:</span>
                    <span className="font-semibold text-slate-700">
                      {new Intl.NumberFormat("vi-VN").format(ev.entryFee)} VNĐ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số lượng đăng ký:</span>
                    <span className="font-semibold text-slate-700">
                      {ev._count?.participants || 0} / {ev.maxParticipants}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: COURTS */}
      {activeTab === "courts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Danh Sách Sân Thi Đấu</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tournament.courts?.map((court: any) => (
              <div key={court.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-lg">{court.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      court.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {court.status === "AVAILABLE" ? "Sẵn Sàng" : court.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Thứ tự ưu tiên xếp lịch: Sân {court.courtOrder}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: STAFF */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Nhân Sự & Trọng Tài Điều Hành</h3>
            <button
              onClick={() => setShowAddStaff(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Users className="h-4 w-4" />
              Thêm Nhân Sự
            </button>
          </div>

          {showAddStaff && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-6 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-brand-900">Phân Quyền Thành Viên Mới</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Email Người Dùng *</label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="referee@example.com"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">Người dùng phải có tài khoản trên hệ thống</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Vai Trò</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as any)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="REFEREE">Trọng Tài (REFEREE)</option>
                    <option value="ORGANIZER">Ban Tổ Chức (ORGANIZER)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={inviteStaffMutation.isPending || !staffEmail.trim()}
                  onClick={() => inviteStaffMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                >
                  {inviteStaffMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Phân Quyền
                </button>
              </div>
            </div>
          )}

          {/* Staff List Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Họ và tên</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Vai trò</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tournament.staff?.map((member: any) => (
                  <tr key={member.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {member.user?.fullName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{member.user?.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                          member.role === "ORGANIZER"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {member.role === "ORGANIZER" ? "Ban Tổ Chức" : "Trọng Tài"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <UserCheck className="h-3.5 w-3.5" />
                        Đã Chấp Nhận
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn thu hồi quyền của ${member.user?.fullName}?`)) {
                            revokeStaffMutation.mutate(member.id);
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                      >
                        Thu hồi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
