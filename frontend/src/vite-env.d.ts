/// <reference types="vite/client" />

// fontsource packages ship CSS but no .d.ts for their bare entry import.
declare module "@fontsource-variable/*";
declare module "@fontsource/*";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
