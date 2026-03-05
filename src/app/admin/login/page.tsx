import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { verifyAdminSessionCookie } from "@/lib/server/admin-session";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (sessionCookie) {
    const session = await verifyAdminSessionCookie(sessionCookie);
    if (session) {
      redirect("/admin");
    }
  }

  return <AdminLoginForm />;
}
