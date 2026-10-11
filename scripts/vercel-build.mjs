import { spawnSync } from "node:child_process";
import { migrationUrl } from "./migration-url.mjs";
import { ensureQStashSchedule } from "./qstash-schedule.mjs";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, shell: false, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function runOrExit(command, args, env = process.env) {
  const status = run(command, args, env);
  if (status !== 0) process.exit(status);
}

function runMigrationWithRetry(command, args, env) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const status = run(command, args, env);
    if (status === 0) return;
    if (attempt === attempts) process.exit(status);

    const delayMs = attempt * 5000;
    console.warn(`Database migration attempt ${attempt} failed; retrying in ${delayMs / 1000}s.`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
  }
}

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    console.error("Production build stopped: DATABASE_URL is not configured.");
    process.exit(1);
  }
  const migrationEnv = {
    ...process.env,
    DATABASE_URL: migrationUrl(process.env),
  };
  runMigrationWithRetry(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "migrate", "deploy"],
    migrationEnv
  );
}

runOrExit(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);

try {
  console.log(`QStash scheduler: ${await ensureQStashSchedule()}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
