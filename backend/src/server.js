const crypto = require("crypto");
const http = require("http");
const { env, handleRequest, logger } = require("./app");

const server = http.createServer(handleRequest);

server.listen(env.port, () => {
  logger.info("Backend listening", {
    port: env.port,
    requestedStorageProvider: env.storageProvider,
    storageProvider: env.effectiveStorageProvider,
  });
});
