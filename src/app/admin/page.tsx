import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { verifyAdminSessionCookie } from "@/lib/server/admin-session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!sessionCookie) {
    redirect("/admin/login");
  }

  const session = await verifyAdminSessionCookie(sessionCookie);
  if (!session) {
    redirect("/admin/login");
  }

  const label = session.email || session.name || session.uid;
  return <AdminDashboard adminLabel={label} />;
}
