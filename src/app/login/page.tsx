import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { signInAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "sign in · gamesense.cloud" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <div className="auth-shell">
      <div className="rainbow" style={{ marginBottom: 8 }} />

      <Panel label="authentication">
        <ActionForm action={signInAction} submit="login">
          <div>
            <label htmlFor="identifier">username or email</label>
            <input
              id="identifier"
              name="identifier"
              className="field"
              autoComplete="username"
              spellCheck={false}
              required
            />
          </div>
          <div>
            <label htmlFor="password">password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              autoComplete="current-password"
              required
            />
          </div>
        </ActionForm>
      </Panel>

      <p className="note">
        one session per machine &nbsp;-&nbsp; hwid is bound on first login
        <br />
        no account? <Link href="/register">register</Link>
        <br />
        <Link href="/">back to the site</Link>
      </p>
    </div>
  );
}
