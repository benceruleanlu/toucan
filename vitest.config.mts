import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { coverageConfigDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    watch: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // excluded for simplicity, may need reenabling later
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/app/layout.tsx",
        "src/app/page.tsx",
      ],
    },
  },
})
