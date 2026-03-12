import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/cli.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
