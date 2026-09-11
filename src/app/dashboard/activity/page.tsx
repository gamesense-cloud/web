import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { Empty, PageHead, Panel, date, stamp } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "activity · gamesense.cloud" };

export default async function ActivityPage() {
  const user = (await currentUser())!;
  const admin = user.role === "admin";
  const events = admin ? await db.allEvents(80) : await db.eventsForUser(user.id, 80);

  // grouped by day, so a long log stays readable
  const byDay: { day: string; events: typeof events }[] = [];
  for (const e of events) {
    const day = String(e.at).slice(0, 10);
    const last = byDay[byDay.length - 1];
    if (last?.day === day) last.events.push(e);
    else byDay.push({ day, events: [e] });
  }

  return (
    <>
      <PageHead
        title="activity"
        subtitle={
          admin
            ? "everything on the service, newest first."
            : "your account, plus anything service-wide."
        }
      />

      {byDay.length === 0 && (
        <Panel label="log" className="col-12"><Empty>nothing recorded yet</Empty></Panel>
      )}

      {byDay.map((group) => (
        <Panel key={group.day} label={date(group.day)} className="col-12" flush>
          <ul className="feed">
            {group.events.map((e) => (
              <li key={e.id}>
                <time>{stamp(e.at)}</time>
                <span>
                  {e.subject && <span className="who">{e.subject} </span>}
                  {e.message}
                  {e.scope === "service" && (
                    <span className="tag" style={{ marginLeft: 8 }}>service</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}
