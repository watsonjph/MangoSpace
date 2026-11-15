import { createServer } from "node:http";

const nativeFetch = globalThis.fetch;
const port = Number(process.env.HUBAS_TEST_STOLEN_PORT);
let calls = 0;

globalThis.fetch = async (input, init) => {
  calls += 1;

  if (calls === 1) {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ region: "PH-07", windows: [] }));
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });
    const cleanup = setTimeout(() => {
      server.closeAllConnections();
      server.close();
    }, 1000);
    cleanup.unref();
    return { status: 0, text: async () => "" };
  }

  return nativeFetch(input, init);
};
