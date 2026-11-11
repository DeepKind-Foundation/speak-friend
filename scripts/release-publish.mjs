// Packs and publishes every public package. Prereleases go to the "next" tag.
// Versions already on npm are skipped, so a failed run can be re-run.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const version = (process.argv[2] ?? "").replace(/^v/, "");
const distTag = version.includes("-") ? "next" : "latest";
const out = mkdtempSync(join(tmpdir(), "release-"));

const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: "utf8", ...options });

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
  const tarball = join(out, `${pkg.name}-${version}.tgz`);
  run("npm", ["publish", tarball, "--tag", distTag, "--access", "public", "--provenance"], { stdio: "inherit" });
}
