import { server } from "./server.js";

async function main(): Promise<void> {
  await server.start({
    transportType: "stdio",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
