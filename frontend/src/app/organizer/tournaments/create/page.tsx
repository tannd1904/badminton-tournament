"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Trophy,
  CheckCircle2,
  Calendar,
  MapPin,
  FileText,
  Users,
  Grid,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

interface InitialEvent {
  name: string;
  playType: string;
  format: string;
  entryFee: number;
  maxParticipants: number;
}

export default function CreateTournamentWizardPage() {
  const router = useRouter();

  // Current Step (1 - 5)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Step 2: Regulations & Dates
  const [registrationOpenAt, setRegistrationOpenAt] = useState("");
  const [registrationCloseAt, setRegistrationCloseAt] = useState("");
  const [tournamentStartAt, setTournamentStartAt] = useState("");
  const [tournamentEndAt, setTournamentEndAt] = useState("");
  const [ruleContent, setRuleContent] = useState("");
  const [maxEventsPerPlayer, setMaxEventsPerPlayer] = useState(2);

  // Step 3: Events
  const [events, setEvents] = useState<InitialEvent[]>([
    {
      name: "Đơn Nam Nâng Cao",
      playType: "SINGLE_MEN",
      format: "KNOCKOUT",
      entryFee: 200000,
      maxParticipants: 16,
    },
    {
      name: "Đôi Nam Nâng Cao",
      playType: "DOUBLE_MEN",
      format: "KNOCKOUT",
      entryFee: 350000,
      maxParticipants: 16,
    },
  ]);

  // Step 4: Courts
  const [totalCourts, setTotalCourts] = useState<number>(4);
  const [matchIntervalMinutes, setMatchIntervalMinutes] = useState<number>(15);
  const [defaultMatchDurationMinutes, setDefaultMatchDurationMinutes] = useState<number>(35);

  // Fetch Sports
  const { data: sportsRes } = useQuery({
    queryKey: ["sports-list"],
    queryFn: async () => {
      const res: any = await apiClient.get("/sports");
      return res?.data || [];
    },
  });
  const sports = sportsRes || [];

  // Fetch Venues
  const { data: venuesRes } = useQuery({
    queryKey: ["venues-list"],
    queryFn: async () => {
      const res: any = await apiClient.get("/venues");
      return res?.data || [];
    },
  });
  const venues = venuesRes || [];

  // Set default sport if loaded
  if (sports.length > 0 && !sportId) {
    setSportId(sports[0].id);
  }

  const addEvent = () => {
    setEvents([
      ...events,
      {
        name: `Nội Dung Mới ${events.length + 1}`,
        playType: "DOUBLE_MIXED",
        format: "KNOCKOUT",
        entryFee: 300000,
        maxParticipants: 16,
      },
    ]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEventField = (index: number, field: keyof InitialEvent, value: any) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Vui lòng nhập tên giải đấu");
        return false;
      }
      if (!sportId) {
        setError("Vui lòng chọn môn thể thao");
        return false;
      }
    } else if (step === 2) {
      if (!registrationOpenAt || !registrationCloseAt || !tournamentStartAt || !tournamentEndAt) {
        setError("Vui lòng điền đầy đủ các mốc thời gian đăng ký và tổ chức");
        return false;
      }
      if (new Date(registrationCloseAt) <= new Date(registrationOpenAt)) {
        setError("Ngày đóng đăng ký phải sau ngày mở đăng ký");
        return false;
      }
      if (new Date(tournamentStartAt) < new Date(registrationCloseAt)) {
        setError("Ngày thi đấu phải sau hoặc bằng ngày đóng đăng ký");
        return false;
      }
      if (new Date(tournamentEndAt) < new Date(tournamentStartAt)) {
        setError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu giải");
        return false;
      }
    } else if (step === 3) {
      if (events.length === 0) {
        setError("Vui lòng tạo ít nhất 1 nội dung thi đấu");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleFinish = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Tournament
      const tournPayload = {
        name,
        sportId,
        venueId: venueId || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        bannerUrl: bannerUrl || undefined,
        ruleContent: ruleContent || undefined,
        registrationOpenAt: new Date(registrationOpenAt).toISOString(),
        registrationCloseAt: new Date(registrationCloseAt).toISOString(),
        tournamentStartAt: new Date(tournamentStartAt).toISOString(),
        tournamentEndAt: new Date(tournamentEndAt).toISOString(),
        maxEventsPerPlayer: Number(maxEventsPerPlayer),
        totalCourts: Number(totalCourts),
        matchIntervalMinutes: Number(matchIntervalMinutes),
        defaultMatchDurationMinutes: Number(defaultMatchDurationMinutes),
      };

      const tournRes: any = await apiClient.post("/tournaments", tournPayload);
      const tournament = tournRes?.data;

      if (!tournament?.id) {
        throw new Error("Không thể khởi tạo giải đấu");
      }

      // 2. Create Initial Events for this Tournament
      for (const ev of events) {
        await apiClient.post("/events", {
          tournamentId: tournament.id,
          name: ev.name,
          playType: ev.playType,
          format: ev.format,
          entryFee: Number(ev.entryFee),
          maxParticipants: Number(ev.maxParticipants),
        });
      }

      // Navigate to Organizer Tournament Detail view
      router.push(`/organizer/tournaments/${tournament.id}`);
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi tạo giải đấu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Wizard Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: "Thông Tin Cơ Bản" },
            { step: 2, label: "Điều Lệ & Thời Gian" },
            { step: 3, label: "Nội Dung Thi Đấu" },
            { step: 4, label: "Sân Đấu & Vận Hành" },
            { step: 5, label: "Xác Nhận & Tạo Giải" },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center flex-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition ${
                  currentStep === item.step
                    ? "bg-brand-600 text-white shadow-md ring-4 ring-brand-100"
                    : currentStep > item.step
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {currentStep > item.step ? <CheckCircle2 className="h-5 w-5" /> : item.step}
              </div>
              <span className="hidden sm:block mt-2 text-xs font-semibold text-slate-600 text-center">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 border border-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bước 1: Thông Tin Cơ Bản</h2>
              <p className="text-sm text-slate-500">Nhập tên giải, môn thể thao và thông tin liên hệ chính thức.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Tên Giải Đấu *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Giải Cầu Lông Vô Địch Mùa Xuân 2027"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-brand-600 focus:ring-brand-600 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Môn Thể Thao *</label>
                  <select
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-brand-600 sm:text-sm"
                  >
                    {sports.map((sp: any) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} ({sp.code})
                      </option>
                    ))}
                    {sports.length === 0 && <option value="">Đang tải môn thể thao...</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Cụm Sân / Địa Điểm</label>
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-brand-600 sm:text-sm"
                  >
                    <option value="">-- Chọn cụm sân hoặc tự cấu hình sau --</option>
                    {venues.map((vn: any) => (
                      <option key={vn.id} value={vn.id}>
                        {vn.name} - {vn.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Số Điện Thoại Liên Hệ</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0987654321"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Email BTC</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="btc@badminton.vn"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">URL Banner / Ảnh Poster</label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bước 2: Điều Lệ & Thời Gian Tổ Chức</h2>
              <p className="text-sm text-slate-500">Cấu hình lịch trình đăng ký, ngày thi đấu và nội dung điều lệ.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Ngày Mở Đăng Ký *</label>
                  <input
                    type="datetime-local"
                    required
                    value={registrationOpenAt}
                    onChange={(e) => setRegistrationOpenAt(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Ngày Đóng Đăng Ký *</label>
                  <input
                    type="datetime-local"
                    required
                    value={registrationCloseAt}
                    onChange={(e) => setRegistrationCloseAt(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Ngày Bắt Đầu Thi Đấu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={tournamentStartAt}
                    onChange={(e) => setTournamentStartAt(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Ngày Bế Mạc / Kết Thúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={tournamentEndAt}
                    onChange={(e) => setTournamentEndAt(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Số Nội Dung Tối Đa Mỗi VĐV Được Đăng Ký
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxEventsPerPlayer}
                  onChange={(e) => setMaxEventsPerPlayer(Number(e.target.value))}
                  className="mt-1.5 block w-32 rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Nội Dung Điều Lệ Giải</label>
                <textarea
                  rows={5}
                  value={ruleContent}
                  onChange={(e) => setRuleContent(e.target.value)}
                  placeholder="Nhập quy định về đối tượng tham gia, thể thức, khen thưởng và kỷ luật..."
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bước 3: Cấu Hình Nội Dung Thi Đấu</h2>
                <p className="text-sm text-slate-500">Tạo các nội dung thi đấu ban đầu cho giải đấu.</p>
              </div>
              <button
                type="button"
                onClick={addEvent}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
              >
                <Plus className="h-4 w-4" />
                Thêm Nội Dung
              </button>
            </div>

            <div className="space-y-4">
              {events.map((ev, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 relative"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">Tên Nội Dung</label>
                      <input
                        type="text"
                        value={ev.name}
                        onChange={(e) => updateEventField(index, "name", e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Hình Thức</label>
                      <select
                        value={ev.playType}
                        onChange={(e) => updateEventField(index, "playType", e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                      >
                        <option value="SINGLE_MEN">Đơn Nam</option>
                        <option value="SINGLE_WOMEN">Đơn Nữ</option>
                        <option value="DOUBLE_MEN">Đôi Nam</option>
                        <option value="DOUBLE_WOMEN">Đôi Nữ</option>
                        <option value="DOUBLE_MIXED">Đôi Nam Nữ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Thể Thức</label>
                      <select
                        value={ev.format}
                        onChange={(e) => updateEventField(index, "format", e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                      >
                        <option value="KNOCKOUT">Loại Trực Tiếp</option>
                        <option value="ROUND_ROBIN">Vòng Tròn</option>
                        <option value="ROUND_ROBIN_THEN_KNOCKOUT">Vòng Bảng + Knockout</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-700">Lệ Phí (VNĐ)</label>
                        <input
                          type="number"
                          step={10000}
                          value={ev.entryFee}
                          onChange={(e) => updateEventField(index, "entryFee", Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                        />
                      </div>
                      {events.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEvent(index)}
                          className="mt-5 p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                          title="Xóa nội dung này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bước 4: Sân Đấu & Cấu Hình Vận Hành</h2>
              <p className="text-sm text-slate-500">Cấu hình số sân và thời lượng dự kiến để phục vụ xếp lịch tự động.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Số Lượng Sân Thi Đấu</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={totalCourts}
                  onChange={(e) => setTotalCourts(Number(e.target.value))}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Hệ thống sẽ tự động tạo từ Sân 1 đến Sân {totalCourts}
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Thời Lượng Dự Kiến / Trận (phút)</label>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={defaultMatchDurationMinutes}
                  onChange={(e) => setDefaultMatchDurationMinutes(Number(e.target.value))}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                />
                <span className="text-xs text-slate-400 mt-1 block">Mặc định: 35 phút / trận</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Khoảng Nghỉ Giữa Các Trận (phút)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={matchIntervalMinutes}
                  onChange={(e) => setMatchIntervalMinutes(Number(e.target.value))}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 sm:text-sm"
                />
                <span className="text-xs text-slate-400 mt-1 block">Khoảng nghỉ cho VĐV và dọn sân</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bước 5: Xem Lại & Xác Nhận Khởi Tạo</h2>
              <p className="text-sm text-slate-500">Kiểm tra lại toàn bộ thông tin trước khi hoàn tất tạo giải đấu.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-600">Tên giải đấu:</span>
                <span className="font-bold text-slate-900">{name}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-600">Thời gian đăng ký:</span>
                <span className="text-slate-800">
                  {new Date(registrationOpenAt).toLocaleString("vi-VN")} đến{" "}
                  {new Date(registrationCloseAt).toLocaleString("vi-VN")}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-600">Thời gian thi đấu:</span>
                <span className="text-slate-800">
                  {new Date(tournamentStartAt).toLocaleString("vi-VN")} đến{" "}
                  {new Date(tournamentEndAt).toLocaleString("vi-VN")}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-600">Quy mô cơ sở vật chất:</span>
                <span className="text-slate-800 font-semibold">{totalCourts} Sân thi đấu</span>
              </div>

              <div>
                <span className="font-semibold text-slate-600 block mb-2">
                  Danh sách nội dung khởi tạo ({events.length}):
                </span>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {events.map((ev, i) => (
                    <li key={i}>
                      <strong>{ev.name}</strong> — {ev.playType} ({ev.format}) —{" "}
                      {new Intl.NumberFormat("vi-VN").format(ev.entryFee)} VNĐ
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Quay Lại
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              Tiếp Tục
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo giải đấu...
                </>
              ) : (
                "Xác Nhận & Hoàn Tất Tạo Giải"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

