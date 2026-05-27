import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/index.css";
import "@/lib/i18n";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { AuthProvider } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
