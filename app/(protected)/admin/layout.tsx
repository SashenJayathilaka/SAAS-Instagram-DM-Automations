import type { Metadata } from "next";
import { requireOwnerAdmin } from "@/lib/admin";
import { adminEnvironmentLabel } from "@/lib/admin-control-center";
import { AdminV2Nav } from "@/components/admin-v2/nav";
import "./admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AP3K Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireOwnerAdmin();

  return (
    <div dir="ltr" lang="en" className="admin-shell relative isolate min-h-screen bg-background dark:bg-[#0b0e16] text-slate-800 dark:text-slate-100">

      <AdminV2Nav email={admin.email} environment={adminEnvironmentLabel()} />

      <main id="admin-main" className="admin-main relative min-w-0 lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
