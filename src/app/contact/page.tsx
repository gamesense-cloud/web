export const metadata = { title: "Contact — gamesense.cloud" };

const contacts: { name: string; discord: string; email: string }[] = [
  // { name: "Name", discord: "username", email: "email@example.com" },
  // Add more team members here
  // { name: "Name", discord: "username", email: "email@example.com" },
];

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="text-text-muted mt-2">Reach out via Discord or email.</p>

      <div className="mt-8 space-y-4">
        {contacts.map((c) => (
          <div key={c.name} className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-semibold text-lg">{c.name}</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-muted w-16">Discord</span>
                <span className="text-accent font-mono">{c.discord}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted w-16">Email</span>
                <a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
