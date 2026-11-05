"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Trophy,
  Calendar,
  MapPin,
  Search,
  Filter,
  Users,
  ChevronRight,
  Shield,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function TournamentsDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments-list"],
    queryFn: async () => {
      const res: any = await apiClient.get("/tournaments");
      return res?.data || [];
    },
  });

  const statusFilters = [
    { key: "ALL", label: "Tất cả" },
    { key: "REGISTRATION_OPEN", label: "Đang mở đăng ký" },
    { key: "IN_PROGRESS", label: "Đang diễn ra" },
    { key: "SCHEDULE_PUBLISHED", label: "Đã có lịch thi đấu" },
    { key: "COMPLETED", label: "Đã kết thúc" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REGISTRATION_OPEN":
        return { label: "Mở Đăng Ký", color: "bg-emerald-500/10 text-emerald-600 border-emerald-300" };
      case "IN_PROGRESS":
        return { label: "Đang Diễn Ra", color: "bg-red-500/10 text-red-600 border-red-300 animate-pulse" };
      case "SCHEDULE_PUBLISHED":
        return { label: "Đã Xếp Lịch", color: "bg-blue-500/10 text-blue-600 border-blue-300" };
      case "COMPLETED":
        return { label: "Hoàn Thành", color: "bg-slate-500/10 text-slate-600 border-slate-300" };
      default:
        return { label: status, color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const filteredTournaments = tournaments.filter((t: any) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.venueAddress && t.venueAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      selectedStatus === "ALL" || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            Hệ Thống Giải Đấu Toàn Quốc
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Khám Phá Các Giải Đấu Cầu Lông
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Theo dõi thông tin điều lệ, đăng ký trực tuyến, tra cứu lịch thi đấu, nhánh đấu và xem tỷ số trực tiếp (Live Score).
          </p>
        </div>

        <Link
          href="/organizer/tournaments/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-700 transition self-start md:self-auto"
        >
          <Trophy className="h-4 w-4" />
          Tạo Giải Đấu Mới
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên giải đấu, địa điểm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedStatus(f.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedStatus === f.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <span className="mt-3 text-sm text-slate-500">Đang tải danh sách giải đấu...</span>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">Không tìm thấy giải đấu phù hợp</h3>
          <p className="mt-1 text-sm text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((t: any) => {
            const badge = getStatusBadge(t.status);
            return (
              <div
                key={t.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-300 hover:shadow-md transition duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {t.events?.length || 0} nội dung
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition">
                    {t.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{t.venueAddress || "Địa điểm đang cập nhật"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        {new Date(t.tournamentStartAt).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(t.tournamentEndAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    {t.organizer && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">BTC: {t.organizer.fullName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {t.courts?.length || 0} sân thi đấu
                  </span>

                  <Link
                    href={`/tournaments/${t.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white group-hover:bg-brand-600 transition"
                  >
                    Xem Chi Tiết
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

