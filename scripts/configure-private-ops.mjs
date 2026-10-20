import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const cli = process.argv[2];
if (!cli) throw Error("Pass the installed official Vercel CLI entry path.");
for (const name of ["CRON_SECRET", "RATE_LIMIT_SECRET"]) {
  const result = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "env",
        "add",
        name,
        "production",
        "--sensitive",
        "--yes",
        "--scope",
        "rig-logi-x",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
    child.stdin.end(randomBytes(32).toString("base64url") + "\n");
  });
  if (!result)
    throw Error(
      `Could not configure ${name}. Check the project environment before retrying.`,
    );
  console.log(`Configured private ${name}.`);
}
