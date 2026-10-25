// Optional loopback-only services for machines without a running Docker engine.
// PostgreSQL is real; S3rver is an S3 protocol emulator for local development only.
import EmbeddedPostgres from "embedded-postgres";
import S3rver from "s3rver";
import { createRequire } from "node:module";
import {
  mkdir,
  access,
  readFile,
  cp,
  writeFile,
  unlink,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const { DUMMY_ACCOUNT } = require("s3rver/lib/models/account");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(path.join(root, ".local"), { recursive: true });
const envPath = path.join(root, "bd/.env");
const contents = await readFile(envPath, "utf8").catch(() => "");
const env = Object.fromEntries(
  contents
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const databaseUrl = new URL(
  env.DATABASE_URL ||
    "postgresql://blog:blog_local_password@localhost:5432/association_blog",
);
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname))
  throw new Error("Local services require a localhost DATABASE_URL.");
// initdb on Windows cannot bootstrap inside every non-ASCII workspace path.
const dbDir =
  process.platform === "win32"
    ? path.join(
        tmpdir(),
        `ecut-blog-pg-${createHash("sha256").update(root).digest("hex").slice(0, 10)}`,
      )
    : path.join(root, ".local/postgres");
const options = {
  databaseDir: dbDir,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  port: Number(databaseUrl.port || 5432),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: (message) => console.log(String(message).trim()),
  onError: (message) => console.error(String(message).trim()),
};
// Windows initdb embeds its library path in bootstrap SQL. Copy binaries as well
// as data to an ASCII path, so Chinese workspace names do not corrupt that SQL.
async function windowsPostgres() {
  const binaries = await import("@embedded-postgres/windows-x64");
  const native = path.dirname(path.dirname(binaries.postgres));
  const version = JSON.parse(
    await readFile(path.join(native, "../package.json"), "utf8"),
  ).version;
  const runtime = path.join(tmpdir(), `ecut-postgres-${version}`);
  try {
    await access(path.join(runtime, ".ready"));
  } catch {
    await cp(native, runtime, { recursive: true });
    await writeFile(path.join(runtime, ".ready"), version);
  }
  async function run(binary, args) {
    const child = spawn(path.join(runtime, "bin", `${binary}.exe`), args, {
      windowsHide: true,
      stdio: "inherit",
    });
    const [code] = await once(child, "exit");
    if (code !== 0) throw new Error(`${binary} exited with code ${code}`);
  }
  return {
    async initialise() {
      const passwordFile = path.join(dbDir + "-password");
      await writeFile(passwordFile, options.password + "\n", { mode: 0o600 });
      try {
        await run("initdb", [
          "-D",
          dbDir,
          `--username=${options.user}`,
          "--auth=scram-sha-256",
          `--pwfile=${passwordFile}`,
          ...options.initdbFlags,
        ]);
      } finally {
        await unlink(passwordFile);
      }
    },
    async start() {
      await run("pg_ctl", [
        "start",
        "-D",
        dbDir,
        "-l",
        path.join(dbDir, "server.log"),
        "-o",
        `-h 127.0.0.1 -p ${options.port}`,
        "-w",
      ]);
    },
    async stop() {
      await run("pg_ctl", ["stop", "-D", dbDir, "-m", "fast", "-w"]);
    },
  };
}
const pg =
  process.platform === "win32"
    ? await windowsPostgres()
    : new EmbeddedPostgres(options);
try {
  await access(path.join(dbDir, "PG_VERSION"));
} catch {
  await pg.initialise();
}
await pg.start();
const client = new Client({
  host: "127.0.0.1",
  port: options.port,
  user: options.user,
  password: options.password,
  database: "postgres",
});
await client.connect();
const name = databaseUrl.pathname.slice(1);
if (!/^[a-z_][a-z0-9_]*$/.test(name))
  throw new Error("Use a simple lowercase local database name.");
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
    .rowCount
)
  await client.query(`CREATE DATABASE "${name}"`);
await client.end();
const endpoint = new URL(env.S3_ENDPOINT || "http://127.0.0.1:9000");
if (!["localhost", "127.0.0.1"].includes(endpoint.hostname))
  throw new Error("Local S3 endpoint must use localhost.");
DUMMY_ACCOUNT.createKeyPair(
  env.S3_ACCESS_KEY || "blog_storage",
  env.S3_SECRET_KEY || "blog_storage_local_password",
);
const storageDir = path.join(root, ".local/media");
await mkdir(storageDir, { recursive: true });
const s3 = new S3rver({
  address: "127.0.0.1",
  port: Number(endpoint.port || 9000),
  directory: storageDir,
  silent: true,
  configureBuckets: [{ name: env.S3_BUCKET || "blog-media", configs: [] }],
});
await s3.run();
console.log(
  `Local PostgreSQL :${databaseUrl.port || 5432} (${dbDir}) and S3 emulator :${endpoint.port || 9000} (.local/media) ready. Development only.`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await s3.close();
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
