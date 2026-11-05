"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  ShieldAlert,
  Trophy,
  Users,
  Grid,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Search,
  Eye,
  FileText,
  Clock,
  Loader2,
  Settings,
  UserCheck,
  UserX,
} from "lucide-react";

export default function SuperAdminPortalPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"analytics" | "tournaments" | "users" | "audit">("analytics");

  // Moderation filter
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState("ALL");

  // Users filter & search
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Feedback Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Analytics
  const { data: analyticsRes, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res: any = await apiClient.get("/admin/analytics");
      return res?.data;
    },
  });

  // Fetch Tournaments for Moderation
  const { data: tournamentsRes, isLoading: isLoadingTournaments } = useQuery({
    queryKey: ["admin-tournaments", tournamentStatusFilter],
    queryFn: async () => {
      const params: any = {};
      if (tournamentStatusFilter !== "ALL") {
        params.status = tournamentStatusFilter;
      }
      const res: any = await apiClient.get("/admin/tournaments", { params });
      return res?.data || [];
    },
  });

  // Fetch Users
  const { data: usersRes, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin-users", userRoleFilter, userSearchTerm],
    queryFn: async () => {
      const params: any = {};
      if (userRoleFilter !== "ALL") params.role = userRoleFilter;
      if (userSearchTerm) params.search = userSearchTerm;
      const res: any = await apiClient.get("/admin/users", { params });
      return res?.data || [];
    },
  });

  // Fetch Audit Logs
  const { data: auditRes, isLoading: isLoadingAudit } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res: any = await apiClient.get("/admin/audit-logs", {
        params: { limit: 50 },
      });
      return res?.data;
    },
  });

  // Moderate Tournament Mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      return apiClient.patch(`/admin/tournaments/${id}/moderate`, { status, reason });
    },
    onSuccess: () => {
      setToast({ type: "success", text: "Kiểm duyệt trạng thái giải đấu thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (err: any) => {
      setToast({ type: "error", text: err?.message || "Lỗi kiểm duyệt giải đấu" });
    },
  });

  // Update User Status Mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient.patch(`/admin/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      setToast({ type: "success", text: "Cập nhật trạng thái người dùng thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (err: any) => {
      setToast({ type: "error", text: err?.message || "Lỗi cập nhật trạng thái người dùng" });
    },
  });

  // Update User Role Mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return apiClient.patch(`/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      setToast({ type: "success", text: "Cập nhật vai trò người dùng thành công" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      setToast({ type: "error", text: err?.message || "Lỗi cập nhật vai trò" });
    },
  });

  const analytics = analyticsRes || {};
  const tournaments = tournamentsRes || [];
  const users = usersRes || [];
  const auditLogs = auditRes?.logs || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">System Admin Portal</h1>
              <p className="text-xs text-slate-400">
                Quản trị toàn bộ nền tảng • {user?.fullName} ({user?.role})
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
          >
            Về Trang Chủ
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Toast Feedback */}
        {toast && (
          <div
            className={`flex items-center justify-between rounded-xl p-4 text-sm font-semibold shadow-sm ${
              toast.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800"
                : "bg-rose-950/40 text-rose-300 border border-rose-800"
            }`}
          >
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="text-xs underline font-bold">
              Đóng
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-800 pb-3">
          {[
            { id: "analytics", label: "Tổng Quan & Thống Kê", icon: Activity },
            { id: "tournaments", label: `Kiểm Duyệt Giải Đấu (${tournaments.length})`, icon: Trophy },
            { id: "users", label: `Quản Trị Người Dùng (${users.length})`, icon: Users },
            { id: "audit", label: `Lịch Sử Audit Logs (${auditLogs.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Giải Đấu</span>
                <p className="mt-2 text-3xl font-black text-white">{analytics.totalTournaments || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Thành Viên</span>
                <p className="mt-2 text-3xl font-black text-emerald-400">{analytics.totalUsers || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Trận Đấu</span>
                <p className="mt-2 text-3xl font-black text-brand-400">{analytics.totalMatches || 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-800/50 p-5 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Câu Lạc Bộ</span>
                <p className="mt-2 text-3xl font-black text-purple-400">{analytics.totalClubs || 0}</p>
              </div>
            </div>

            {/* Tournaments By Status Breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 shadow-sm">
              <h3 className="text-base font-bold text-white mb-4">Trạng Thái Các Giải Đấu</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(analytics.statusCounts || {}).map(([st, cnt]) => (
                  <div key={st} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{st}</span>
                    <p className="mt-1 text-xl font-black text-white">{cnt as number}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOURNAMENTS MODERATION */}
        {activeTab === "tournaments" && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["ALL", "PENDING_APPROVAL", "DRAFT", "REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setTournamentStatusFilter(st)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                      tournamentStatusFilter === st
                        ? "bg-amber-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>

            {/* Tournaments Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-800/40 shadow-sm">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Tên Giải & Slug</th>
                    <th className="px-5 py-3.5">Ban Tổ Chức</th>
                    <th className="px-5 py-3.5">Quy Mô</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Hành Động Kiểm Duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tournaments.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-800/50">
                      <td className="px-5 py-4 font-bold text-white">
                        <Link href={`/tournaments/${t.slug}`} className="hover:underline text-brand-300">
                          {t.name}
                        </Link>
                        <p className="text-[10px] text-slate-500 font-normal">/{t.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-medium">
                        {t.creator?.fullName}
                        <p className="text-[10px] text-slate-500">{t.creator?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {t.events?.length || 0} nội dung • {t.courts?.length || 0} sân
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-bold text-amber-300 border border-slate-700">
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        {t.status === "PENDING_APPROVAL" && (
                          <button
                            onClick={() =>
                              moderateMutation.mutate({
                                id: t.id,
                                status: "REGISTRATION_OPEN",
                              })
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500 transition"
                          >
                            Phê Duyệt
                          </button>
                        )}
                        {t.status !== "CANCELLED" && (
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn đình chỉ giải đấu "${t.name}"?`)) {
                                moderateMutation.mutate({
                                  id: t.id,
                                  status: "CANCELLED",
                                  reason: "Vi phạm quy chế bởi Quản Trị Viên",
                                });
                              }
                            }}
                            className="rounded-lg bg-rose-600/80 px-3 py-1 font-bold text-white hover:bg-rose-500 transition"
                          >
                            Đình Chỉ
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: USERS GOVERNANCE */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Role Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, số điện thoại..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2 text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2">
                {["ALL", "SUPER_ADMIN", "ORGANIZER", "REFEREE", "PLAYER"].map((role) => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      userRoleFilter === role
                        ? "bg-amber-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-800/40 shadow-sm">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Họ và tên</th>
                    <th className="px-5 py-3.5">Email & SĐT</th>
                    <th className="px-5 py-3.5">Vai Trò Hệ Thống</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-800/50">
                      <td className="px-5 py-4 font-bold text-white">{u.fullName}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {u.email}
                        {u.phone && <p className="text-[10px] text-slate-500">{u.phone}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateUserRoleMutation.mutate({
                              id: u.id,
                              role: e.target.value,
                            })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-amber-300"
                        >
                          <option value="PLAYER">PLAYER</option>
                          <option value="REFEREE">REFEREE</option>
                          <option value="ORGANIZER">ORGANIZER</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                            <UserCheck className="h-3 w-3" /> Hoạt Động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">
                            <UserX className="h-3 w-3" /> Đã Khóa
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            toggleUserStatusMutation.mutate({
                              id: u.id,
                              isActive: !u.isActive,
                            })
                          }
                          className={`rounded-lg px-3 py-1 font-bold text-xs transition ${
                            u.isActive
                              ? "bg-rose-900/40 text-rose-300 hover:bg-rose-800"
                              : "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800"
                          }`}
                        >
                          {u.isActive ? "Khóa Tài Khoản" : "Mở Khóa"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-800/40 shadow-sm">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/60 font-semibold text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Thời Gian</th>
                    <th className="px-5 py-3.5">Người Thực Hiện</th>
                    <th className="px-5 py-3.5">Hành Động</th>
                    <th className="px-5 py-3.5">Đối Tượng</th>
                    <th className="px-5 py-3.5">Chi Tiết Thay Đổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/50">
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-200">
                        {log.user?.fullName || "System"} ({log.user?.role || "SYSTEM"})
                      </td>
                      <td className="px-5 py-3 font-bold text-amber-300">{log.action}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {log.entityType} ({log.entityId?.substring(0, 8)}...)
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-xs truncate">
                        {log.newValue ? JSON.stringify(log.newValue) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

