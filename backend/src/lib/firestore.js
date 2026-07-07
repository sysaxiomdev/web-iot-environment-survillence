const admin = require("firebase-admin");

function createFirestoreClient(env) {
  if (env.storageProvider !== "firestore") {
    return null;
  }

  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const hasServiceAccount =
    env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey;

  if (hasServiceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
      }),
    });
    return admin.firestore();
  }

  if (env.firebaseProjectId) {
    admin.initializeApp({
      projectId: env.firebaseProjectId,
    });
    return admin.firestore();
  }

  throw new Error("Firestore storage requested but Firebase credentials are not configured");
}

module.exports = { createFirestoreClient };
