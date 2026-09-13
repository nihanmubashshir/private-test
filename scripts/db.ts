import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promptVisible } from "./lib/prompt";

/**
 * One entry point for every migration operation, against either database.
 *
 * The hosted project is addressed with `--db-url` rather than `supabase link`, so there is no
 * access token, no `supabase/.temp` link state, and no Docker in the hosted path — just
 * SUPABASE_DB_URL in .env.local. The local path uses `--local` and needs `supabase start`.
 *
 * Usage: pnpm db <command> [--local] [args]
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const TYPES_PATH = path.join("src", "lib", "supabase", "database.types.ts");

/** The CLI ships as a devDependency, so prefer the local binary over anything on PATH. */
const CLI = (() => {
  const local = path.join(process.cwd(), "node_modules", ".bin", "supabase");
  return existsSync(local) ? local : "supabase";
})();

type Target = { flags: string[]; label: string };

function resolveTarget(local: boolean): Target {
  if (local) return { flags: ["--local"], label: "local" };

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      [
        "Missing SUPABASE_DB_URL. Set it in .env.local, or pass --local to target the local stack.",
        "",
        "Get it from the Supabase dashboard: Project Settings -> Database -> Connection string ->",
        "URI, session pooler. Replace [YOUR-PASSWORD] with the database password.",
        "",
        "If the password contains a special character it must be percent-encoded (@ -> %40, etc.),",
        "otherwise the CLI will fail to parse the URL.",
      ].join("\n"),
    );
    process.exit(1);
  }

  return { flags: ["--db-url", dbUrl], label: hostOf(dbUrl) };
}

/** The host alone, so a connection string is never echoed to the terminal or a log. */
function hostOf(dbUrl: string): string {
  try {
    return new URL(dbUrl).host;
  } catch {
    return "remote";
  }
}

function supabase(args: string[]): number {
  const result = spawnSync(CLI, args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`Failed to run the Supabase CLI: ${result.error.message}`);
    process.exit(1);
  }
  return result.status ?? 1;
}

/** Migration versions on disk, oldest first. Filenames are `<version>_<name>.sql`. */
function localVersions(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.split("_")[0])
    .sort();
}

function usage(): never {
  console.log(
    [
      "Usage: pnpm db <command> [--local] [args]",
      "",
      "Commands:",
      "  status              List local migrations against those applied to the target database",
      "  new <name>          Create a new timestamped migration file in supabase/migrations/",
      "  push                Apply pending migrations to the target database",
      "  push --dry-run      Print what push would apply, without applying it",
      "  baseline            Mark every local migration as already applied, without running it",
      "  types               Regenerate src/lib/supabase/database.types.ts from the target database",
      "  reset               Drop and re-apply every migration (local only, destructive)",
      "",
      "Target: the hosted project via SUPABASE_DB_URL by default, or --local for the CLI stack.",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const local = argv.includes("--local");
  const rest = argv.filter((arg) => arg !== "--local");
  const command = rest[0];
  const args = rest.slice(1);

  if (!command || command === "help" || command === "--help") usage();

  // `new` writes a local file and touches no database, so it takes no target.
  if (command === "new") {
    const name = args[0];
    if (!name) {
      console.error("Usage: pnpm db new <name>   (e.g. pnpm db new weight_tracker)");
      process.exit(1);
    }
    process.exit(supabase(["migration", "new", name]));
  }

  if (command === "reset") {
    if (!local) {
      console.error(
        [
          "reset is local-only: it drops the database and re-applies every migration.",
          "Run `pnpm db reset --local`. To change the hosted database, write a migration and push it.",
        ].join("\n"),
      );
      process.exit(1);
    }
    process.exit(supabase(["db", "reset"]));
  }

  const target = resolveTarget(local);

  switch (command) {
    case "status":
      process.exit(supabase(["migration", "list", ...target.flags]));

    case "push": {
      const dryRun = args.includes("--dry-run");
      if (!dryRun && !local) {
        console.log(`About to apply pending migrations to ${target.label}.`);
        const answer = await promptVisible("Continue? [y/N] ");
        if (answer.trim().toLowerCase() !== "y") {
          console.log("Aborted.");
          process.exit(0);
        }
      }
      process.exit(supabase(["db", "push", ...(dryRun ? ["--dry-run"] : []), ...target.flags]));
    }

    case "baseline": {
      const versions = localVersions();
      if (versions.length === 0) {
        console.log("No migrations on disk. Nothing to baseline.");
        process.exit(0);
      }
      console.log(
        [
          `This marks ${versions.length} migration(s) as applied on ${target.label} WITHOUT running them:`,
          ...versions.map((version) => `  ${version}`),
          "",
          "Only do this when the schema is already present — e.g. it was applied by hand in the",
          "SQL Editor. Baselining a database that does not have these objects will make `push`",
          "skip them and leave the schema permanently out of date.",
        ].join("\n"),
      );
      const answer = await promptVisible("Continue? [y/N] ");
      if (answer.trim().toLowerCase() !== "y") {
        console.log("Aborted.");
        process.exit(0);
      }
      process.exit(supabase(["migration", "repair", "--status", "applied", ...versions, ...target.flags]));
    }

    case "types": {
      const result = spawnSync(CLI, ["gen", "types", "typescript", ...target.flags], {
        encoding: "utf8",
        shell: false,
      });
      if (result.error) {
        console.error(`Failed to run the Supabase CLI: ${result.error.message}`);
        process.exit(1);
      }
      if (result.status !== 0) {
        process.stderr.write(result.stderr ?? "");
        process.exit(result.status ?? 1);
      }
      // Only written once the CLI succeeds, so a failure can't truncate the committed types.
      writeFileSync(TYPES_PATH, result.stdout);
      console.log(`Wrote ${TYPES_PATH} from ${target.label}.`);
      process.exit(0);
    }

    default:
      console.error(`Unknown command: ${command}`);
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
