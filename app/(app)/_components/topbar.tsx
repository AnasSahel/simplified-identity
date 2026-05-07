import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Topbar({ title }: { title?: string }) {
  return (
    <header className="flex h-14 items-center gap-3 border-b px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      {title && (
        <span className="text-sm font-medium text-foreground">{title}</span>
      )}
    </header>
  );
}
