import Link from "next/link";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { createTicketAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Empty, PageHead, Panel, Status, ago } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "tickets · gamesense.cloud" };

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = (await currentUser())!;
  const admin = user.role === "admin";
  const { status } = await searchParams;

  const tickets = await db.listTickets({
    userId: admin ? null : user.id,
    status: status || null,
  });

  const filters = ["", "open", "answered", "closed"];

  return (
    <>
      <PageHead
        title={admin ? "support queue" : "your tickets"}
        subtitle={
          admin
            ? "every ticket on the service. replying marks one answered."
            : "anything account-bound goes here rather than a public thread."
        }
        actions={filters.map((f) => (
          <Link
            key={f || "all"}
            href={f ? `/dashboard/tickets?status=${f}` : "/dashboard/tickets"}
            className={`btn btn-ghost btn-sm ${(status ?? "") === f ? "is-on" : ""}`}
          >
            {f || "all"}
          </Link>
        ))}
      />

      <Panel
        label={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
        className={admin ? "col-12" : "col-7"}
        flush
      >
        <div className="rows">
          {tickets.length === 0 && <Empty>nothing here</Empty>}
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tickets/${t.id}`}
              className={`row is-clickable ${t.status === "open" ? "is-flagged" : ""}`}
              style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="primary strong">{t.subject}</div>
                <div className="sub">
                  {admin && <>{t.username} · </>}
                  {t.messageCount} messages · opened {ago(t.createdAt)} ago
                </div>
              </div>
              <Status value={t.status} />
              <div className="when">{ago(t.updatedAt)} ago</div>
            </Link>
          ))}
        </div>
      </Panel>

      {!admin && (
        <Panel label="open a ticket" className="col-5">
          <ActionForm
            action={createTicketAction}
            submit="open ticket"
            hint="tickets are private to you and staff"
          >
            <div className="line">
              <div>
                <label htmlFor="subject">subject</label>
                <input id="subject" name="subject" className="field"
                       placeholder="what is wrong, in a few words" maxLength={140} required />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <label htmlFor="priority">priority</label>
                <select id="priority" name="priority" className="field" defaultValue="normal">
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="body">what happened</label>
              <textarea id="body" name="body" className="field"
                        placeholder="include your build number, and what you already tried" required />
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
