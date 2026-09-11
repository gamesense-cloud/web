import { redirect } from "next/navigation";
import DashNav from "@/components/DashNav";
import { currentUser } from "@/lib/auth";
import { listTickets, openTicketCount, pendingReset, pendingResetCount } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const admin = user.role === "admin";
  const [tickets, resets] = await Promise.all([
    admin
      ? openTicketCount()
      : listTickets({ userId: user.id, status: "open" }).then((t) => t.length),
    admin ? pendingResetCount() : pendingReset(user.id).then((r) => (r ? 1 : 0)),
  ]);

  return (
    <>
      <DashNav
        username={user.username}
        role={user.role}
        badges={{ tickets, resets }}
      />
      <div className="dash">{children}</div>
    </>
  );
}
