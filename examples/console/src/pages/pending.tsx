import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/console/states";
import { PageTitle } from "@/components/console/layout";


export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Not found" />
      <EmptyState title="No screen at this address.">
        <Button asChild variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
