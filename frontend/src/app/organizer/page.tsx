"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Bản Nháp", color: "bg-slate-100 text-slate-700 border-slate-300" },
  PENDING_APPROVAL: { label: "Chờ Duyệt", color: "bg-amber-50 text-amber-700 border-amber-300" },
  REGISTRATION_OPEN: { label: "Đang Mở Đăng Ký", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  REGISTRATION_CLOSED: { label: "Đã Đóng Đăng Ký", color: "bg-blue-50 text-blue-700 border-blue-300" },
  DRAW_COMPLETED: { label: "Đã Bốc Thăm", color: "bg-indigo-50 text-indigo-700 border-indigo-300" },
  SCHEDULE_PUBLISHED: { label: "Đã Có Lịch", color: "bg-purple-50 text-purple-700 border-purple-300" },
  IN_PROGRESS: { label: "Đang Thi Đấu", color: "bg-rose-50 text-rose-700 border-rose-300 animate-pulse" },
  COMPLETED: { label: "Đã Hoàn Thành", color: "bg-slate-200 text-slate-800 border-slate-400" },
  CANCELLED: { label: "Đã Hủy", color: "bg-rose-100 text-rose-800 border-rose-300" },
};

export default function OrganizerDashboardPage() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const { data: tournamentsRes, isLoading } = useQuery({
    queryKey: ["organizer-tournaments"],
    queryFn: async () => {
      const res: any = await apiClient.get("/tournaments?limit=50");
      return res?.data || [];
    },
  });

  const tournaments = tournamentsRes || [];
  const filtered = filterStatus === "ALL"
    ? tournaments
    : tournaments.filter((t: any) => t.status === filterStatus);

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Tổng Số Giải</span>
            <Trophy className="h-5 w-5 text-brand-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{tournaments.length}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Đang Mở Đăng Ký</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {tournaments.filter((t: any) => t.status === "REGISTRATION_OPEN").length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Đang Thi Đấu</span>
            <Clock className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-rose-600">
            {tournaments.filter((t: any) => t.status === "IN_PROGRESS").length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Đã Hoàn Thành</span>
            <CheckCircle2 className="h-5 w-5 text-slate-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {tournaments.filter((t: any) => t.status === "COMPLETED").length}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "DRAFT", "REGISTRATION_OPEN", "SCHEDULE_PUBLISHED", "IN_PROGRESS", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === status
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {status === "ALL" ? "Tất Cả" : STATUS_MAP[status]?.label || status}
            </button>
          ))}
        </div>

        <Link
          href="/organizer/tournaments/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo Giải Đấu
        </Link>
      </div>

      {/* Tournament Cards List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
            <Trophy className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chưa có giải đấu nào</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            Bạn chưa tạo giải đấu nào hoặc không có giải đấu phù hợp với bộ lọc hiện tại.
          </p>
          <Link
            href="/organizer/tournaments/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Tạo Giải Đấu Đầu Tiên
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tourn: any) => {
            const statusInfo = STATUS_MAP[tourn.status] || {
              label: tourn.status,
              color: "bg-slate-100 text-slate-700 border-slate-200",
            };

            return (
              <div
                key={tourn.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {tourn.sport?.name || "Cầu Lông"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
                    {tourn.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        {new Date(tourn.tournamentStartAt).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(tourn.tournamentEndAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">
                        {tourn.venue?.name || "Chưa chọn địa điểm cụ thể"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <span>
                        <strong>{tourn._count?.events || 0}</strong> nội dung
                      </span>
                      <span>
                        <strong>{tourn._count?.courts || tourn.totalCourts || 0}</strong> sân
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <Link
                    href={`/organizer/tournaments/${tourn.id}`}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 hover:text-brand-800 transition"
                  >
                    Quản Trị Giải Đấu
                    <ChevronRight className="h-4 w-4" />
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

