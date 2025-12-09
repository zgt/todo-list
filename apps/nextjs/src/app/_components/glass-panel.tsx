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
        variant === "sidebar" && "h-full w-64 flex flex-col p-4",
        variant === "main" && "flex-1 flex flex-col p-8",
        variant === "card" && "glass-card p-4 rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
