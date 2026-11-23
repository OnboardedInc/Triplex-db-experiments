import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/console/states";
import { PageTitle } from "@/components/console/layout";

export function PendingPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title={title} />
      <EmptyState title="This screen is being built." />
    </div>
  );
}

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
