import { WorkspaceLayoutClient } from "@/components/workspace/WorkspaceLayoutClient";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-57px)] overflow-hidden">
      <WorkspaceLayoutClient>{children}</WorkspaceLayoutClient>
    </div>
  );
}
