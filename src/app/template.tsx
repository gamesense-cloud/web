// Re-mounted on every navigation, so each page fades in like a menu tab switch.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="content page-enter">{children}</div>;
}
