// mongo-init.js — Runs inside the MongoDB container on first start
// Creates the htasker database user with readWrite access.
// Note: Replica set initialization is handled by the mongo-init-rs service.
// Credentials are passed via MONGO_INITDB_ROOT_USERNAME / MONGO_INITDB_ROOT_PASSWORD env vars.

db = db.getSiblingDB("htasker");

// Uses the root credentials set via environment variables — no hardcoded passwords.
db.createUser({
  user: process.env.MONGO_INITDB_ROOT_USERNAME,
  pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
  roles: [{ role: "readWrite", db: "htasker" }],
});

print("htasker database user created");
