import { build, context } from "esbuild";
import { resolve } from "path";

const isDev = process.env.NODE_ENV === "development";

const config = {
  entryPoints: {
    main: resolve("src/js/main.ts"),
    styles: resolve("src/css/main.css"),
  },
  bundle: true,
  outdir: "dist",
  format: "iife" as const,
  target: "es2022",
  platform: "browser" as const,
  minify: !isDev,
  sourcemap: isDev,
  splitting: false,
  chunkNames: "chunks/[name]-[hash]",
  assetNames: "assets/[name]-[hash]",
  tsconfig: "tsconfig.json",
  loader: {
    ".png": "file" as const,
    ".jpg": "file" as const,
    ".jpeg": "file" as const,
    ".svg": "file" as const,
    ".gif": "file" as const,
    ".woff": "file" as const,
    ".woff2": "file" as const,
    ".ttf": "file" as const,
    ".eot": "file" as const,
  },
  define: {
    "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
  },
  external: [],
  logLevel: "info" as const,
};

if (isDev) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(config);
  console.log("Build completed!");
}