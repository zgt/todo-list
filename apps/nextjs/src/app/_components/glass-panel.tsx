import { cn } from "@acme/ui";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "sidebar" | "main" | "card";
}

export function GlassPanel({
  children,
  className,
  variant = "main",
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl transition-all duration-300",
        variant === "sidebar" && "flex h-full w-64 flex-col p-4",
        variant === "main" && "flex flex-1 flex-col p-8",
        variant === "card" && "glass-card rounded-xl p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
