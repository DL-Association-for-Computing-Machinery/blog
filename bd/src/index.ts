import { app, prisma } from "./app.js";
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Blog API listening on http://localhost:${port}`),
);
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
