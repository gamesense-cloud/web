import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { registerAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "register · gamesense.cloud" };

const FIELDS: [string, string, string, string, string][] = [
  ["username", "username", "text", "username", "lowercase letters, digits, . _ - · three to twenty-four characters"],
  ["email", "email", "email", "email", "where your key and invoices go"],
  ["password", "password", "password", "new-password", "at least eight characters"],
];

export default async function RegisterPage() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <div className="auth-shell">
      <div className="rainbow" style={{ marginBottom: 8 }} />

      <Panel label="create an account">
        <ActionForm action={registerAction} submit="register">
          {FIELDS.map(([id, label, type, autoComplete, hint]) => (
            <div key={id}>
              <label htmlFor={id}>{label}</label>
              <input
                id={id}
                name={id}
                type={type}
                className="field"
                autoComplete={autoComplete}
                spellCheck={false}
                required
              />
              <div className="t-dim" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </ActionForm>
      </Panel>

      <p className="note">
        new accounts start with no subscription — an admin grants one from the
        members page.
        <br />
        already registered? <Link href="/login">sign in</Link>
      </p>
    </div>
  );
}
