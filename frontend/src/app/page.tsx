import Link from "next/link";
import {
  Trophy,
  Calendar,
  Shield,
  Activity,
  ChevronRight,
  MapPin,
  Clock,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
              Nền Tảng Quản Lý Giải Đấu Cầu Lông Thế Hệ Mới
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Vận hành giải đấu cầu lông{" "}
              <span className="text-brand-600">chuyên nghiệp</span> và{" "}
              <span className="text-emerald-600">real-time</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              Giải pháp toàn diện cho Ban Tổ Chức, Trọng Tài và Vận Động Viên: Tự động
              bốc thăm chia bảng, xếp lịch thông minh đa sân, chấm điểm theo luật BWF
              trực tiếp trên thiết bị di động.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition"
              >
                Khám Phá Giải Đấu
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/organizer/tournaments/create"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Tổ Chức Giải Đấu Mới
              </Link>
            </div>

            {/* Core Metrics Banner */}
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 w-full max-w-4xl border-t border-slate-200 pt-10">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900">100%</span>
                <span className="mt-1 text-sm text-slate-500">Chuẩn Luật BWF Rally</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-brand-600">&lt; 100ms</span>
                <span className="mt-1 text-sm text-slate-500">Đồng Bộ Real-time</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-emerald-600">0 Xung Đột</span>
                <span className="mt-1 text-sm text-slate-500">Xếp Lịch Thông Minh</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-900">4 Phân Hệ</span>
                <span className="mt-1 text-sm text-slate-500">BTC, Trọng Tài, VĐV, OBS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Navigation Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Tournament Engine</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tự động phân bổ hạt giống, xử lý Byes, tạo nhánh Knockout và bảng vòng tròn
              (Berger). Thuật toán Same-Club Avoidance hạn chế đối đầu nội bộ.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Smart Scheduling</h3>
            <p className="mt-2 text-sm text-slate-600">
              Điều phối đa sân, bảo toàn thời gian nghỉ của VĐV, hỗ trợ Lock Time mốc giờ cố
              định và tự động lan truyền dời lịch khi trận đấu kéo dài.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-4">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Umpire Scoreboard (PWA)</h3>
            <p className="mt-2 text-sm text-slate-600">
              Giao diện chấm điểm tối ưu cho trọng tài trên điện thoại, nút bấm lớn, xoay vòng
              giao cầu đôi, xử lý deuce 30 điểm và tính năng Undo tức thì.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

