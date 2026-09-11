import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { replyToTicketAction, setTicketStatusAction } from "@/app/actions";
import { ActionButton, ActionForm } from "@/components/forms";
import { PageHead, Panel, Status, ago, date } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await currentUser())!;
  const admin = user.role === "admin";

  const ticket = await db.getTicket(id, admin ? null : user.id);
  if (!ticket) notFound();

  return (
    <>
      <PageHead
        title={ticket.subject}
        subtitle={`opened by ${ticket.username} ${ago(ticket.createdAt)} ago · ${date(ticket.createdAt)} · priority ${ticket.priority}`}
        actions={
          <>
            <Status value={ticket.status} />
            {ticket.status !== "closed" && (
              <ActionButton
                run={setTicketStatusAction.bind(null, ticket.id, "closed")}
                className="btn btn-ghost btn-sm"
              >
                close ticket
              </ActionButton>
            )}
            {admin && ticket.status === "closed" && (
              <ActionButton
                run={setTicketStatusAction.bind(null, ticket.id, "open")}
                className="btn btn-ghost btn-sm"
              >
                reopen
              </ActionButton>
            )}
          </>
        }
      />

      <div className="col-12">
        <Link href="/dashboard/tickets" style={{ color: "var(--dim)", fontSize: 12 }}>
          ← all tickets
        </Link>
      </div>

      <Panel label="conversation" className="col-12" flush>
        <div>
          {(ticket.messages ?? []).map((m) => (
            <div key={m.id} className={`message ${m.authorRole === "admin" ? "is-staff" : ""}`}>
              <span className={`avatar g-${m.authorRole}`} aria-hidden="true">
                {m.author.charAt(0)}
              </span>
              <div className="body">
                <div className="head">
                  <b className={m.authorRole === "admin" ? "t-accent" : undefined}
                     style={m.authorRole === "admin" ? { color: "var(--accent)" } : undefined}>
                    {m.author}
                  </b>
                  {m.authorRole === "admin" && <span className="tag tag-pin">staff</span>}
                  <time>{ago(m.createdAt)} ago</time>
                </div>
                <p>{m.body}</p>
              </div>
            </div>
          ))}
        </div>

        {ticket.status === "closed" ? (
          <div style={{
            padding: "var(--sp-3)", borderTop: "1px solid var(--border)",
            color: "var(--faint)", fontSize: 12, display: "flex", gap: 8, alignItems: "center",
          }}>
            <span className="tag tag-lock">closed</span>
            this ticket is closed to new replies.
          </div>
        ) : (
          <div style={{ padding: "var(--sp-3)", borderTop: "1px solid var(--border)" }}>
            <ActionForm
              action={replyToTicketAction}
              submit="send reply"
              hint={admin ? "the member is notified in their activity log" : "staff are notified"}
            >
              <input type="hidden" name="ticketId" value={ticket.id} />
              <div>
                <label htmlFor="body">reply as {user.username}</label>
                <textarea
                  id="body"
                  name="body"
                  className="field"
                  style={{ minHeight: 90 }}
                  placeholder={admin ? "answering marks this ticket answered" : "add anything that helps"}
                  required
                />
              </div>
            </ActionForm>
          </div>
        )}
      </Panel>
    </>
  );
}
