import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCard({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`workspace-card grid gap-4 p-4 sm:p-5 ${className}`.trim()}
    >
      <CardHeader className="workspace-card-header border-b border-border/70 pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="workspace-card-content grid min-w-0 gap-4">
        {children}
      </CardContent>
    </Card>
  );
}
