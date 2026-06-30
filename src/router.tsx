import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { formatErrorForUser, reportError } from "@/lib/errors";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportError(error, { scope: "query", queryKey: query.queryKey });
        // Only surface a toast when a component actually depends on the data
        // (avoids noisy toasts for background refetches with no observers).
        if (query.state.data !== undefined) {
          toast.error(formatErrorForUser(error, "We couldn't refresh that data."));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        reportError(error, { scope: "mutation", mutationKey: mutation.options.mutationKey });
        // Skip the global toast if the mutation defines its own onError.
        if (mutation.options.onError) return;
        toast.error(formatErrorForUser(error));
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: RouteErrorFallback,
  });

  return routerWithQueryClient(router, queryClient);
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
