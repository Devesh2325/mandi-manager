import { Outlet, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { RouteLoader } from "@/components/RouteLoader";
import { SessionProvider, useAppSession } from "@/lib/session-context";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mandi ERP — Ledger Terminal" },
      { name: "description", content: "APMC Commission Agent Mandi ERP: Arrival, Sale, Ledger, Billing." },
      { property: "og:title", content: "Mandi ERP — Ledger Terminal" },
      { name: "twitter:title", content: "Mandi ERP — Ledger Terminal" },
      { property: "og:description", content: "APMC Commission Agent Mandi ERP: Arrival, Sale, Ledger, Billing." },
      { name: "twitter:description", content: "APMC Commission Agent Mandi ERP: Arrival, Sale, Ledger, Billing." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7bf56443-af4a-44f5-9ebe-ab800f6b8371" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7bf56443-af4a-44f5-9ebe-ab800f6b8371" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <TenantProvider>
      <SessionProvider>
        <RouteLoader />
        <ImpersonationBanner />
        <RouteGuard />
        <Outlet />
        <Toaster richColors position="top-right" />
      </SessionProvider>
    </TenantProvider>
  );
}

function ImpersonationBanner() {
  const { impersonating, activeTenant, setActiveTenant } = useTenant();
  if (!impersonating || !activeTenant) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200">
      <span>
        <span className="font-semibold">Super Admin:</span> impersonating tenant{" "}
        <span className="font-mono">{activeTenant.company_name}</span>
      </span>
      <button
        onClick={() => setActiveTenant(null)}
        className="rounded border border-amber-500/40 bg-background/40 px-2 py-0.5 text-[11px] hover:bg-background/70"
      >
        Stop impersonating
      </button>
    </div>
  );
}

/** Redirects: not logged in -> /login. Logged in but no company/year -> /select-context. */
function RouteGuard() {
  const { ready, session, company, year } = useAppSession();
  const router = useRouter();
  const path = router.state.location.pathname;

  useEffect(() => {
    if (!ready) return;
    const isLogin = path === "/login";
    const isSelect = path === "/select-context";
    const isApp = path === "/app" || path.startsWith("/app/");
    const isCloudAuth = path === "/auth" || path === "/super-admin";

    // Cloud-auth pages run independently of the local IndexedDB session.
    if (isCloudAuth) return;

    if (!session && !isLogin) {
      router.navigate({ to: "/login" });
      return;
    }
    if (session && (!company || !year) && isApp) {
      router.navigate({ to: "/select-context" });
      return;
    }
    if (session && company && year && (isLogin || isSelect)) {
      router.navigate({ to: "/app" });
      return;
    }
    if (path === "/" && session && company && year) {
      router.navigate({ to: "/app" });
    } else if (path === "/" && session) {
      router.navigate({ to: "/select-context" });
    } else if (path === "/" && !session) {
      router.navigate({ to: "/login" });
    }
  }, [ready, session, company, year, path, router]);

  return null;
}
