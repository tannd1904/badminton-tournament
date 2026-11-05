"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
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
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Shuffle,
  Loader2,
  X,
} from "lucide-react";

export default function PublicTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  const { user, isAuthenticated } = useAuthStore();

  const [activeMainTab, setActiveMainTab] = useState<"events" | "bracket" | "schedule" | "rules">("events");
  const [selectedPublicEventId, setSelectedPublicEventId] = useState<string>("");

  const [registeringEvent, setRegisteringEvent] = useState<any | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Tournament by Slug
  const { data: tournament, isLoading } = useQuery({
    queryKey: ["public-tournament", slug],
    queryFn: async () => {
      const res: any = await apiClient.get(`/tournaments/${slug}`);
      return res?.data;
    },
    enabled: !!slug,
  });

  if (tournament?.events?.length > 0 && !selectedPublicEventId) {
    setSelectedPublicEventId(tournament.events[0].id);
  }

  // Fetch Bracket for selected public event
  const { data: publicBracketData, isLoading: isLoadingPublicBracket } = useQuery({
    queryKey: ["public-event-bracket", selectedPublicEventId],
    queryFn: async () => {
      const res: any = await apiClient.get(`/events/${selectedPublicEventId}/bracket`);
      return res?.data;
    },
    enabled: !!selectedPublicEventId,
  });

  // Fetch Clubs
  const { data: clubsRes } = useQuery({
    queryKey: ["clubs-list"],
    queryFn: async () => {
      const res: any = await apiClient.get("/clubs");
      return res?.data || [];
    },
  });
  const clubs = clubsRes || [];

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/registrations", {
        eventId: registeringEvent.id,
        clubId: selectedClubId || undefined,
        partnerName: partnerName || undefined,
        partnerPhone: partnerPhone || undefined,
      });
    },
    onSuccess: () => {
      setSuccessMessage(
        `Đăng ký thành công nội dung "${registeringEvent.name}"! Hồ sơ của bạn đang ở trạng thái Chờ Duyệt (PENDING). Vui lòng hoàn tất nộp lệ phí theo điều lệ giải.`,
      );
      setRegisteringEvent(null);
      setPartnerName("");
      setPartnerPhone("");
      queryClient.invalidateQueries({ queryKey: ["public-tournament", slug] });
    },
    onError: (err: any) => {
      setModalError(err?.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
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
      <div className="mx-auto max-w-4xl py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Không tìm thấy giải đấu</h2>
        <p className="mt-2 text-slate-500">Đường dẫn giải đấu không tồn tại hoặc đã bị ẩn.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-brand-600 hover:underline">
          Quay về trang chủ
        </Link>
      </div>
    );
  }

  const isRegistrationOpen = tournament.status === "REGISTRATION_OPEN";
  const currentPublicEvent = tournament.events?.find((e: any) => e.id === selectedPublicEventId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Banner & Hero */}
      <div className="relative bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur mb-4">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {tournament.status === "REGISTRATION_OPEN"
              ? "Đang Mở Đăng Ký"
              : tournament.status === "IN_PROGRESS"
              ? "Đang Diễn Ra"
              : tournament.status}
          </div>

          <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">{tournament.name}</h1>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-400" />
              <span>
                Thi đấu: {new Date(tournament.tournamentStartAt).toLocaleDateString("vi-VN")} -{" "}
                {new Date(tournament.tournamentEndAt).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-400" />
              <span>{tournament.venue?.name || "Nhà thi đấu"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>
                Hạn đăng ký: {new Date(tournament.registrationCloseAt).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        {successMessage && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 border border-emerald-200 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold underline">
              Đóng
            </button>
          </div>
        )}

        {/* Tab Header */}
        <div className="mb-6 flex gap-4 border-b border-slate-200 bg-white px-6 py-2 rounded-2xl shadow-sm">
          {[
            { id: "events", label: "Nội Dung & Đăng Ký", icon: Grid },
            { id: "bracket", label: "Nhánh Đấu / Bracket", icon: Shuffle },
            { id: "schedule", label: "Lịch Thi Đấu", icon: Calendar },
            { id: "rules", label: "Điều Lệ Giải Đấu", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-2 text-sm font-bold transition ${
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: EVENTS */}
        {activeMainTab === "events" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Nội Dung Thi Đấu</h2>

                <div className="space-y-4">
                  {tournament.events?.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{ev.name}</h3>
                          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            {ev.playType}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Thể thức: <strong>{ev.format}</strong></span>
                          <span>
                            Lệ phí:{" "}
                            <strong className="text-emerald-600 font-bold">
                              {new Intl.NumberFormat("vi-VN").format(ev.entryFee)} VNĐ
                            </strong>
                          </span>
                          <span>
                            Đã đăng ký: <strong>{ev._count?.participants || 0} / {ev.maxParticipants}</strong>
                          </span>
                        </div>
                      </div>

                      {isRegistrationOpen ? (
                        <button
                          onClick={() => {
                            if (!isAuthenticated) {
                              router.push("/login?redirect=" + encodeURIComponent(`/tournaments/${slug}`));
                              return;
                            }
                            setRegisteringEvent(ev);
                            setModalError(null);
                          }}
                          className="shrink-0 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
                        >
                          Đăng Ký Ngay
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-slate-400 bg-slate-200 px-3 py-1.5 rounded-lg">
                          Chưa Mở / Đã Đóng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">Ban Tổ Chức Giải</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold block text-slate-700">Điện thoại liên hệ:</span>
                    <span>{tournament.contactPhone || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Email:</span>
                    <span>{tournament.contactEmail || "Chưa cập nhật"}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-700">Quy định tham gia:</span>
                    <span>Tối đa {tournament.maxEventsPerPlayer} nội dung / VĐV</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRACKET CANVAS */}
        {activeMainTab === "bracket" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Chọn Nội Dung:</span>
                <select
                  value={selectedPublicEventId}
                  onChange={(e) => setSelectedPublicEventId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
                >
                  {tournament.events?.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.playType} - {ev.format})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoadingPublicBracket ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
              </div>
            ) : publicBracketData?.rounds?.length > 0 ? (
              currentPublicEvent?.format === "KNOCKOUT" ? (
                <BracketCanvas rounds={publicBracketData.rounds} />
              ) : (
                <RoundRobinTable rounds={publicBracketData.rounds} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <Shuffle className="h-8 w-8 text-slate-400 mb-3" />
                <h4 className="text-base font-bold text-slate-900">Chưa có kết quả bốc thăm</h4>
                <p className="mt-1 text-sm text-slate-500 max-w-sm">
                  Ban Tổ Chức chưa công bố nhánh đấu cho nội dung này. Vui lòng quay lại sau khi kết thúc thời hạn đăng ký.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeMainTab === "schedule" && (
          <div>
            <CourtTimeline
              tournamentId={tournament.id}
              tournamentStatus={tournament.status}
              isOrganizer={false}
            />
          </div>
        )}

        {/* TAB 4: RULES */}
        {activeMainTab === "rules" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Điều Lệ Giải Đấu</h2>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap bg-slate-50 p-5 rounded-xl border border-slate-200">
              {tournament.ruleContent || "Ban Tổ Chức chưa cập nhật nội dung điều lệ chi tiết."}
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {registeringEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Đăng Ký Tham Gia</h3>
                <p className="text-xs text-slate-500">Nội dung: {registeringEvent.name}</p>
              </div>
              <button
                onClick={() => setRegisteringEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Vận Động Viên 1 (Chính Bạn)
                </span>
                <p className="text-sm font-bold text-slate-900">{user?.fullName}</p>
                <p className="text-xs text-slate-500">{user?.email} • {user?.phone || "Chưa có SĐT"}</p>
              </div>

              {[
                "DOUBLE_MEN",
                "DOUBLE_WOMEN",
                "DOUBLE_MIXED",
              ].includes(registeringEvent.playType) && (
                <div className="space-y-3 rounded-xl bg-brand-50/50 p-4 border border-brand-200">
                  <span className="text-xs font-bold text-brand-900 block">
                    Thông Tin Bạn Đánh Cặp (VĐV 2) *
                  </span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Họ và tên bạn đánh cặp *</label>
                    <input
                      type="text"
                      required
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="Nguyễn Văn B"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Số điện thoại liên hệ (tùy chọn)</label>
                    <input
                      type="tel"
                      value={partnerPhone}
                      onChange={(e) => setPartnerPhone(e.target.value)}
                      placeholder="0987654321"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Câu Lạc Bộ Đại Diện</label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">-- Vận động viên tự do (Không có CLB) --</option>
                  {clubs.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 flex justify-between items-center">
                <span>Lệ phí tham gia:</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {new Intl.NumberFormat("vi-VN").format(registeringEvent.entryFee)} VNĐ
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegisteringEvent(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={registerMutation.isPending}
                onClick={() => registerMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác Nhận Nộp Hồ Sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
