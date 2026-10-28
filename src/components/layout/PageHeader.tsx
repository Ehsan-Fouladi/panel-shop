import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="workspace-page-header flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="workspace-page-copy min-w-0 flex-1 space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="مسیر صفحه"
            className="workspace-breadcrumbs mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Link to="/">داشبورد</Link>
            {breadcrumbs.map((item) => (
              <span
                className="workspace-breadcrumb-item inline-flex items-center gap-2"
                key={`${item.to ?? "current"}-${item.label}`}
              >
                <span aria-hidden="true">/</span>
                {item.to ? (
                  <Link to={item.to}>{item.label}</Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h2 className="workspace-page-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="workspace-page-description max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action && (
        <div className="workspace-page-actions flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
