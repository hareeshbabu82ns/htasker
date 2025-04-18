// This script initializes the MongoDB replica set required for Prisma transactions
print("Starting replica set initialization...");

// Wait for the MongoDB instance to be ready
const timeout = 30000; // 30 seconds
const start = new Date().getTime();

while (true) {
  try {
    // Try to connect and check status
    print("Attempting to connect to MongoDB...");
    db.adminCommand({ ping: 1 });
    break;
  } catch (err) {
    if (new Date().getTime() - start > timeout) {
      print(`Timed out waiting for MongoDB to be ready: ${err}`);
      quit(1);
    }
    print("MongoDB not ready yet, retrying in 1 second...");
    sleep(1000);
  }
}

// Check if replica set is already initialized
try {
  const status = rs.status();
  print(`Replica set already initialized: ${JSON.stringify(status)}`);
} catch (err) {
  // If not initialized, initialize it
  print('Initializing replica set "rs0"...');
  const config = {
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017", priority: 1 }],
  };

  const result = rs.initiate(config);
  print(`Replica set initialization result: ${JSON.stringify(result)}`);

  if (result.ok !== 1) {
    print(`Failed to initialize replica set: ${JSON.stringify(result)}`);
    quit(1);
  }

  // Wait for the replica set to be ready
  let isPrimary = false;
  while (!isPrimary) {
    sleep(1000);
    const status = rs.status();
    if (status.members && status.members[0].stateStr === "PRIMARY") {
      isPrimary = true;
      print("Replica set is ready!");
    } else {
      print("Waiting for replica set to be ready...");
    }
  }
}

print("MongoDB replica set initialization completed successfully!");
