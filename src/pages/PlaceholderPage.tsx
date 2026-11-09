import { Link } from "react-router-dom";
import { ArrowRight, Building2, type LucideIcon } from "lucide-react";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";

export function PlaceholderPage({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  useBreadcrumbs([{ label: title }]);
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-56px)] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-background text-ink-3 shadow-card">
        <Icon className="size-5" />
      </div>
      <Badge tone="outline" className="mt-5">
        Planned module
      </Badge>
      <h1 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{description}</p>
      <p className="mt-1 text-[13px] text-ink-4">This module will be designed and built in a later iteration.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/buildings">
          <Building2 /> Go to Buildings <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
