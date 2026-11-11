// Fails unless the tag matches the version of every published package.
import { readFileSync, readdirSync } from "node:fs";

const tag = process.argv[2] ?? "";
const version = tag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Tag "${tag}" is not vX.Y.Z or vX.Y.Z-prerelease`);
  process.exit(1);
}

let failed = false;
for (const dir of readdirSync("packages")) {
  const pkg = JSON.parse(readFileSync(`packages/${dir}/package.json`, "utf8"));
  if (pkg.private) continue;
  if (pkg.version !== version) {
    console.error(`${pkg.name} is ${pkg.version}, tag is ${version}`);
    failed = true;
  }
}
if (failed) process.exit(1);
