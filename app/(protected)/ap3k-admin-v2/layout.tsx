import { requireOwnerAdmin } from "@/lib/admin";
import { AdminV2Nav } from "@/components/admin-v2/nav";

export default async function AdminV2Layout({ children }: { children: React.ReactNode }) {
  const admin = await requireOwnerAdmin();

  return (
    <div dir="ltr" lang="en" className="min-h-screen bg-white dark:bg-[#050816] text-slate-50">
      <AdminV2Nav email={admin.email} />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-[264px] lg:px-8">
        {children}
      </main>
    </div>
  );
}
