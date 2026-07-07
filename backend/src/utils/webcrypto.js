const { webcrypto } = require("crypto");

function ensureWebCrypto() {
  if (!globalThis.crypto && webcrypto) {
    globalThis.crypto = webcrypto;
  }
}

module.exports = { ensureWebCrypto };
