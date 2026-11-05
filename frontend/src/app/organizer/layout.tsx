"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Trophy, PlusCircle, LayoutDashboard, Calendar, Users, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=" + encodeURIComponent(pathname));
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Subheader */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 font-bold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Organizer Dashboard
              </h1>
              <p className="text-xs text-slate-500">
                Cổng Quản Trị & Vận Hành Giải Đấu Cầu Lông
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/organizer"
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                pathname === "/organizer"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Danh Sách Giải
            </Link>
            <Link
              href="/organizer/tournaments/create"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <PlusCircle className="h-4 w-4" />
              Tạo Giải Mới
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

