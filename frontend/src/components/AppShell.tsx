import { Outlet } from "react-router-dom";

import { Nav } from "@/components/Nav";

export function AppShell() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
