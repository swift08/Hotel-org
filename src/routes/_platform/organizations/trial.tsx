import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listOrganizations } from "@/lib/platform.functions";
import { OrganizationsTable, ORG_FILTERS } from "./index";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/organizations/trial")({
  component: TrialOrganizationsPage,
});

function TrialOrganizationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "organizations", "trial"],
    queryFn: () => listOrganizations({ data: { status: "trial" } }),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {ORG_FILTERS.map((f) => (
          <Link
            key={f.to}
            to={f.to}
            activeOptions={{ exact: true }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              "data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <OrganizationsTable rows={data ?? []} isLoading={isLoading} />
    </div>
  );
}
