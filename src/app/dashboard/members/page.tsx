import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { PageHead, Panel, ago, date, num } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "members · gamesense.cloud" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await currentUser())!;
  if (user.role !== "admin") redirect("/dashboard");

  const { q } = await searchParams;
  const users = await db.listUsers(q ?? "");

  return (
    <>
      <PageHead
        title="accounts"
        subtitle={`${num(users.length)} on this install.`}
        actions={
          <form>
            <input
              type="search"
              name="q"
              className="field"
              placeholder="find an account"
              aria-label="find an account"
              defaultValue={q ?? ""}
              style={{ width: 180 }}
            />
          </form>
        }
      />

      <Panel label="members" className="col-12" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>account</th><th>role</th><th>plan</th>
                <th>expires</th><th>hwid</th><th>last seen</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6}><span className="t-dim">nobody by that name</span></td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="strong">
                    <Link
                      href={`/dashboard/members/${u.username}`}
                      style={{ color: u.role === "admin" ? "var(--accent)" : "var(--text)" }}
                    >
                      {u.username}
                    </Link>
                    <div style={{ color: "var(--faint)", fontSize: 11 }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`tag ${u.role === "admin" ? "tag-pin" : ""}`}>{u.role}</span>
                  </td>
                  <td>{u.plan ?? "—"}</td>
                  <td>{u.expiresAt ? date(u.expiresAt) : u.plan === "lifetime" ? "never" : "—"}</td>
                  <td className="mono">{u.hwid ?? "—"}</td>
                  <td>{u.lastSeenAt ? `${ago(u.lastSeenAt)} ago` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
