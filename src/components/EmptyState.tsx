import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  hint?: string;
  cta?: { label: string; to?: string; onClick?: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, subtitle, hint, cta, className }: EmptyStateProps) {
  const ctaClass =
    "mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pebble-sm hover:bg-primary/90";
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
        {hint && <div className="mt-0.5 text-xs text-muted-foreground/80">{hint}</div>}
      </div>
      {cta && (cta.to ? (
        <Link to={cta.to} className={ctaClass}>{cta.label}</Link>
      ) : (
        <button type="button" onClick={cta.onClick} className={ctaClass}>{cta.label}</button>
      ))}
    </div>
  );
}
