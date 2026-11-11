// Packs every public package and stages it on npm for approval.
// Prereleases go to the "next" tag. Versions already on npm are skipped.
// The packed copy is staged, because pnpm rewrites workspace: dependencies
// when packing and npm does not.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const version = (args.find((a) => !a.startsWith("--")) ?? "").replace(/^v/, "");
const distTag = version.includes("-") ? "next" : "latest";
const out = mkdtempSync(join(tmpdir(), "release-"));

const run = (cmd, cmdArgs, options = {}) => execFileSync(cmd, cmdArgs, { encoding: "utf8", ...options });

for (const dir of readdirSync("packages")) {
  const cwd = join("packages", dir);
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  if (pkg.private) continue;

  const published = run("npm", ["view", pkg.name, "versions", "--json"]).trim();
  if (JSON.parse(published || "[]").includes(version)) {
    console.log(`${pkg.name}@${version} is already published`);
    continue;
  }

  run("pnpm", ["pack", "--pack-destination", out], { cwd, stdio: "inherit" });
  const unpacked = mkdtempSync(join(out, "pkg-"));
  run("tar", ["-xzf", join(out, `${pkg.name}-${version}.tgz`), "-C", unpacked, "--strip-components=1"]);
  run(
    "npm",
    [
      "stage",
      "publish",
      "--ignore-scripts",
      "--provenance",
      "--access",
      "public",
      "--tag",
      distTag,
      ...(dryRun ? ["--dry-run"] : []),
    ],
    { cwd: unpacked, stdio: "inherit" },
  );
}
