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

/** The CLI stack's fixed local connection string (supabase/config.toml, [db] port). */
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

type Target = {
  /** Flags for migration list / db push / migration repair. */
  flags: string[];
  /** Flags for `gen types`, which spells the project flag `--project-id`. */
  typeFlags: string[];
  label: string;
  /** A direct connection string for psql, when one is available. */
  dbUrl: string | null;
};

/**
 * Two ways to reach the hosted project, in priority order:
 *
 * 1. SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF — the CLI asks the Management API how to connect
 *    and picks a route that works. Use this when the direct database host is IPv6-only and the
 *    machine has no IPv6, which is the default for a Supabase project without the IPv4 add-on.
 * 2. SUPABASE_DB_URL — a connection string used as given. Must be the session pooler URI on an
 *    IPv4-only machine, since the direct `db.<ref>.supabase.co` host resolves to IPv6 only.
 */
function resolveTarget(local: boolean): Target {
  if (local) {
    return { flags: ["--local"], typeFlags: ["--local"], label: "local", dbUrl: LOCAL_DB_URL };
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl = process.env.SUPABASE_DB_URL ?? null;

  if (token && ref) {
    const auth = password ? ["--password", password] : [];
    return {
      flags: ["--project-ref", ref, ...auth],
      typeFlags: ["--project-id", ref],
      label: ref,
      dbUrl,
    };
  }

  if (dbUrl) {
    return { flags: ["--db-url", dbUrl], typeFlags: ["--db-url", dbUrl], label: hostOf(dbUrl), dbUrl };
  }

  console.error(
    [
      "No hosted target configured. Set one of these in .env.local, or pass --local.",
      "",
      "  A) SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF   (recommended)",
      "     Token: https://supabase.com/dashboard/account/tokens  (starts sbp_)",
      "     Ref:   the subdomain of your project URL, https://<ref>.supabase.co",
      "     Optionally SUPABASE_DB_PASSWORD to avoid being prompted.",
      "     The CLI resolves a working connection itself, so this works without IPv6.",
      "",
      "  B) SUPABASE_DB_URL",
      "     Dashboard -> Project Settings -> Database -> Connection string -> URI.",
      "     Use the SESSION POOLER tab, not the direct connection: db.<ref>.supabase.co is",
      "     IPv6-only unless the project has the IPv4 add-on. Percent-encode special",
      "     characters in the password (@ -> %40).",
    ].join("\n"),
  );
  process.exit(1);
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

/** Runs one query through psql and returns its rows as `|`-separated fields. */
function query(dbUrl: string, sql: string): string[][] {
  const result = spawnSync("psql", [dbUrl, "-At", "-F", "|", "-c", sql], {
    encoding: "utf8",
    shell: false,
  });
  if (result.error) {
    console.error(
      [
        `Could not run psql: ${result.error.message}`,
        "verify shells out to psql, which is not bundled with this project. Install the postgresql",
        "client package, or run the checks by hand against the SQL in scripts/db.ts.",
      ].join("\n"),
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  return result.stdout
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("|"));
}

/**
 * Enforces the table template in overview §6: RLS on, an owner policy, a restrictive aal2 policy,
 * and nothing granted to anon. Cheap to run, and the failure mode it catches — a table shipped
 * without its aal2 policy — is invisible until it is exploited.
 */
function verify(target: Target): number {
  const { dbUrl } = target;
  if (!dbUrl) {
    console.error(
      [
        "verify needs a direct connection string, which project-ref mode does not provide.",
        "Set SUPABASE_DB_URL as well (session pooler URI) and run it again.",
      ].join("\n"),
    );
    return 1;
  }

  const tables = query(
    dbUrl,
    `select t.tablename,
            c.relrowsecurity,
            coalesce(bool_or(p.permissive = 'PERMISSIVE'), false),
            coalesce(bool_or(p.permissive = 'RESTRICTIVE' and p.qual ilike '%aal2%'), false)
     from pg_tables t
     join pg_namespace n on n.nspname = t.schemaname
     join pg_class c on c.relname = t.tablename and c.relnamespace = n.oid
     left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
     where t.schemaname = 'public'
     group by t.tablename, c.relrowsecurity
     order by t.tablename;`,
  );

  const anonGrants = query(
    dbUrl,
    `select distinct table_name from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' order by table_name;`,
  );

  if (tables.length === 0) {
    console.log("No tables in the public schema yet. Nothing to verify.");
    return 0;
  }

  const problems: string[] = [];
  for (const [name, rls, owner, aal2] of tables) {
    const missing: string[] = [];
    if (rls !== "t") missing.push("RLS not enabled");
    if (owner !== "t") missing.push("no owner policy");
    if (aal2 !== "t") missing.push("no restrictive aal2 policy");
    const status = missing.length === 0 ? "ok" : missing.join(", ");
    console.log(`  ${missing.length === 0 ? "✓" : "✗"} ${name.padEnd(28)} ${status}`);
    if (missing.length > 0) problems.push(`${name}: ${missing.join(", ")}`);
  }

  for (const [name] of anonGrants) {
    console.log(`  ✗ ${name.padEnd(28)} granted to anon`);
    problems.push(`${name}: granted to anon`);
  }

  console.log("");
  if (problems.length > 0) {
    console.error(
      `${problems.length} problem(s). Every table needs the template in docs/spec/00-overview.md §6.`,
    );
    return 1;
  }
  console.log(`${tables.length} table(s) verified.`);
  return 0;
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
      "  verify              Check every public table has RLS, an owner policy and an aal2 policy",
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

    case "verify":
      process.exit(verify(target));

    case "types": {
      const result = spawnSync(CLI, ["gen", "types", "typescript", ...target.typeFlags], {
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
