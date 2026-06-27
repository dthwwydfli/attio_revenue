export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>;
}
