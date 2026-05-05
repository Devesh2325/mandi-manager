import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin")({
  component: () => <Outlet />,
});
