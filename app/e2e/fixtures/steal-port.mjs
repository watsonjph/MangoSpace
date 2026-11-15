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
    // Hold the port until up exits; a timed close lets a slow child bind it and pass for real.
    server.unref();
    return { status: 0, text: async () => "" };
  }

  return nativeFetch(input, init);
};
