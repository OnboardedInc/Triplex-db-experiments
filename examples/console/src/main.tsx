// [DX-CON1] Triplex Console: routes. Every screen has a URL, so every tool answer's consoleUrl opens it.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import "./index.css";
import { Shell } from "@/components/console/layout";
import { AboutPage } from "@/pages/about";
import { AccountPage } from "@/pages/account";
import { EntityPage } from "@/pages/entity";
import { HomePage } from "@/pages/home";
import { NotFoundPage } from "@/pages/pending";
import { ConfigurationPage } from "@/pages/configuration";
import { QueryPage } from "@/pages/query";
import { AssistantPage } from "@/pages/assistant";
import { JournalPage } from "@/pages/journal";
import { TypePage, TypesPage } from "@/pages/types/type-page";

const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/accounts/:account", element: <AccountPage /> },
      { path: "/accounts/:account/subjects/:n", element: <EntityPage /> },
      { path: "/entities/:entityId", element: <EntityPage /> },
      { path: "/types", element: <TypesPage /> },
      { path: "/types/:name", element: <TypePage /> },
      { path: "/query", element: <QueryPage /> },
      { path: "/journal", element: <JournalPage /> },
      { path: "/configuration", element: <ConfigurationPage /> },
      { path: "/assistant", element: <AssistantPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
