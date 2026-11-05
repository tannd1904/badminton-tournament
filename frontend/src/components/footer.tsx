import Link from "next/link";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 font-bold text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Trophy className="h-4 w-4" />
            </div>
            <span className="text-lg tracking-tight">BadmintonPro Platform</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} BadmintonPro. Nền tảng quản lý giải đấu cầu lông chuyên nghiệp và realtime.
          </p>
        </div>
      </div>
    </footer>
  );
}

