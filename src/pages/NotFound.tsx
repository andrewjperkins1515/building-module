import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { useBreadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/layout";
import { Button } from "@/components/ui/button";

export function NotFound({ title = "Page not found", description = "The page you’re looking for doesn’t exist or was removed." }: { title?: string; description?: string }) {
  useBreadcrumbs([{ label: "Not found" }]);
  return (
    <div className="mx-auto max-w-lg py-24">
      <EmptyState
        icon={SearchX}
        title={title}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link to="/buildings">Back to Buildings</Link>
          </Button>
        }
      />
    </div>
  );
}
