import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  cta?: { label: string; to: string };
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, cta, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-primary">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <div className="text-base font-semibold text-foreground">{title}</div>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pebble-sm hover:bg-primary/90"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
