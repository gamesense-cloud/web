import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import * as db from "@/lib/dashboard";
import { changePasswordAction, updateProfileAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Meta, PageHead, Panel, Status, date, num } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "settings · gamesense.cloud" };

const REGIONS = ["eu-central", "eu-west", "us-east", "us-west"];

export default async function SettingsPage() {
  const user = (await currentUser())!;

  const [{ data: row }, sub, hwid] = await Promise.all([
    supabaseAdmin().from("users").select("email").eq("id", user.id).maybeSingle(),
    db.getSubscription(user.id),
    db.activeHwid(user.id),
  ]);

  return (
    <>
      <PageHead
        title="account settings"
        subtitle="who you are on this install, and the machine bound to you."
      />

      <Panel label="account" className="col-5">
        <dl>
          <Meta label="username">{user.username}</Meta>
          <Meta label="email">{row?.email ?? "—"}</Meta>
          <Meta label="role">{user.role}</Meta>
          <Meta label="joined">{date(user.createdAt)}</Meta>
          <Meta label="hwid">
            <span className="mono" style={{ fontSize: 11 }}>{hwid?.hwid ?? "not bound"}</span>
          </Meta>
        </dl>
        {sub && (
          <>
            <div className="rule" />
            <dl>
              <Meta label="plan">{sub.plan}</Meta>
              <Meta label="status"><Status value={sub.status} /></Meta>
              <Meta label="expires">{sub.expiresAt ? date(sub.expiresAt) : "never"}</Meta>
              <Meta label="remaining">
                {sub.daysLeft === null ? "lifetime" : `${num(sub.daysLeft)} days`}
              </Meta>
            </dl>
          </>
        )}
      </Panel>

      <Panel label="profile" className="col-7">
        <ActionForm
          action={updateProfileAction}
          submit="save profile"
          hint="the region the loader prefers when it handshakes"
        >
          <div>
            <label htmlFor="displayName">display name</label>
            <input
              id="displayName"
              name="displayName"
              className="field"
              maxLength={40}
              defaultValue={user.displayName ?? ""}
            />
          </div>
          <div>
            <label htmlFor="region">preferred region</label>
            <select id="region" name="region" className="field" defaultValue={user.region}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </ActionForm>
      </Panel>

      <Panel label="password" className="col-12">
        <ActionForm
          action={changePasswordAction}
          submit="change password"
          hint="pick something you are not using anywhere else"
        >
          <div className="line">
            <div>
              <label htmlFor="current">current password</label>
              <input id="current" name="current" type="password" className="field"
                     autoComplete="current-password" required />
            </div>
            <div>
              <label htmlFor="next">new password</label>
              <input id="next" name="next" type="password" className="field"
                     autoComplete="new-password" required />
            </div>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
