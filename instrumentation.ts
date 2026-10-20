import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = (
  _error,
  _request,
  context,
) => {
  console.error(
    JSON.stringify({
      level: "error",
      operation: "next.request",
      route: context.routePath,
      routeType: context.routeType,
      reference: crypto.randomUUID(),
      at: new Date().toISOString(),
    }),
  );
};
