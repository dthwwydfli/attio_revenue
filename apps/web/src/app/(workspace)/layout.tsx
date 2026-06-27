export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-57px)] overflow-hidden">{children}</div>
  );
}
