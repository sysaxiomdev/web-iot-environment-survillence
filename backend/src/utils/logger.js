function formatMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(metadata)}`;
}

function createLogger(scope) {
  function log(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const suffix = formatMetadata(metadata);
    console.log(`[${timestamp}] [${scope}] [${level}] ${message}${suffix}`);
  }

  return {
    info(message, metadata) {
      log("INFO", message, metadata);
    },
    warn(message, metadata) {
      log("WARN", message, metadata);
    },
    error(message, metadata) {
      log("ERROR", message, metadata);
    },
  };
}

module.exports = { createLogger };
