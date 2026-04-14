/**
 * Legacy helper: case studies canonical source is src/data/cieden-case-studies.json
 * Managed by the team; edit JSON or re-export from internal CMS later.
 * This script only prints the current count for sanity checks.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "src/data/cieden-case-studies.json");
const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
console.log("cieden-case-studies.json:", Array.isArray(raw) ? raw.length : "invalid", "records");
