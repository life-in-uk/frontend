import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import {
  familyVisaDraftContentGuard,
  familyVisaDraftPreview,
  familyVisaPreviewBuildGuard,
  PREVIEW_MODE,
} from "./dev/familyVisaPreview.ts";

// Keep environment-specific routing out of the browser application.
export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "BANK_HOLIDAYS_");
  const backendTarget = env.BANK_HOLIDAYS_API_TARGET || "http://127.0.0.1:8080";
  // Local Family & Visa draft preview (`npm run dev:family-visa-preview`).
  // Dev server only; inert in every other mode and fails any build in it.
  const draftsDir =
    process.env.FAMILY_VISA_PREVIEW_DIR ||
    fileURLToPath(
      new URL(
        "../life-in-uk-backend/content/drafts/family-visa/",
        import.meta.url,
      ),
    );
  return {
    // Local-only Family & Visa DRAFT wording (dev/familyVisaDraftContent.ts,
    // gitignored) is loaded only when this is true: the explicit opt-in dev
    // server `npm run dev:family-visa-preview`. Plain `npm run dev`, builds
    // and `vite preview` never load it; in builds the import is dead code.
    define: {
      __FAMILY_VISA_DRAFT_CONTENT__: JSON.stringify(
        command === "serve" && !isPreview && mode === PREVIEW_MODE,
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      familyVisaDraftPreview({ draftsDir, backendTarget }),
      familyVisaDraftContentGuard(),
      familyVisaPreviewBuildGuard(),
    ],
    server: {
      proxy: {
        "/api/travel/underground": {
          target: backendTarget,
        },
        "/api/travel/roads": {
          target: backendTarget,
        },
        "/api/places/search": {
          target: backendTarget,
        },
        "/api/guides": {
          target: backendTarget,
        },
        "/api/bank-holidays": {
          target: backendTarget,
        },
      },
    },
  };
});
