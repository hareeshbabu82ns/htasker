import {
  PrismaClient,
  TrackerType,
  TrackerStatus,
} from "../app/generated/prisma";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding process...");

  // Skip deleting existing data as it requires transactions
  // Instead, we'll just add our sample data

  // Create sample users
  console.log("Creating users...");

  // Check if users already exist to avoid duplicate emails
  const existingJohn = await prisma.user.findUnique({
    where: { email: "john@example.com" },
  });
  const existingJane = await prisma.user.findUnique({
    where: { email: "jane@example.com" },
  });
  const existingAlex = await prisma.user.findUnique({
    where: { email: "alex@example.com" },
  });

  const users = await Promise.all([
    !existingJohn
      ? createUser("John Doe", "john@example.com", "password123")
      : existingJohn,
    !existingJane
      ? createUser("Jane Smith", "jane@example.com", "password456")
      : existingJane,
    !existingAlex
      ? createUser("Alex Johnson", "alex@example.com", "password789")
      : existingAlex,
  ]);

  console.log(`Prepared ${users.length} users`);

  // Create trackers for each user
  for (const user of users) {
    if (!user) continue; // Skip if user is null

    console.log(`Creating trackers for ${user.name || user.email}...`);

    // Check if user already has trackers
    const existingTrackers = await prisma.tracker.findMany({
      where: { userId: user.id },
    });
    if (existingTrackers.length > 0) {
      console.log(
        `User ${user.email} already has ${existingTrackers.length} trackers, skipping tracker creation`
      );
      continue;
    }

    const trackers = await Promise.all([
      // Timer tracker
      createTracker({
        name: "Work Hours",
        description: "Track daily work hours",
        type: TrackerType.TIMER,
        userId: user.id,
        tags: ["work", "productivity"],
        color: "#4f46e5", // indigo-600
        icon: "clock",
      }),

      // Counter tracker
      createTracker({
        name: "Coffee Cups",
        description: "Daily coffee consumption",
        type: TrackerType.COUNTER,
        userId: user.id,
        tags: ["health", "habits"],
        color: "#b45309", // amber-700
        icon: "cup",
      }),

      // Amount tracker
      createTracker({
        name: "Expenses",
        description: "Track daily expenses",
        type: TrackerType.AMOUNT,
        userId: user.id,
        tags: ["finance", "budget"],
        color: "#047857", // emerald-700
        icon: "dollar",
      }),

      // Occurrence tracker
      createTracker({
        name: "Gym Sessions",
        description: "Track gym workout sessions",
        type: TrackerType.OCCURRENCE,
        userId: user.id,
        tags: ["fitness", "health"],
        color: "#dc2626", // red-600
        icon: "dumbbell",
      }),

      // Custom tracker
      createTracker({
        name: "Mood Tracker",
        description: "Track daily mood",
        type: TrackerType.CUSTOM,
        userId: user.id,
        tags: ["mental-health", "wellness"],
        color: "#8b5cf6", // violet-500
        icon: "smile",
      }),

      // Inactive tracker
      createTracker({
        name: "Books Read",
        description: "Track books completed",
        type: TrackerType.COUNTER,
        userId: user.id,
        tags: ["education", "hobby"],
        color: "#0369a1", // sky-700
        icon: "book",
        status: TrackerStatus.INACTIVE,
      }),

      // Archived tracker
      createTracker({
        name: "Project Hours",
        description: "Hours spent on abandoned project",
        type: TrackerType.TIMER,
        userId: user.id,
        tags: ["work", "project"],
        color: "#78350f", // yellow-900
        icon: "project",
        status: TrackerStatus.ARCHIVED,
      }),
    ]);

    console.log(
      `Created ${trackers.length} trackers for ${user.name || user.email}`
    );

    // Create entries for each tracker
    for (const tracker of trackers) {
      if (tracker.status === TrackerStatus.ARCHIVED) continue;

      console.log(`Creating entries for tracker: ${tracker.name}`);

      // Check if tracker already has entries
      const existingEntries = await prisma.trackerEntry.findMany({
        where: { trackerId: tracker.id },
        take: 1,
      });

      if (existingEntries.length > 0) {
        console.log(
          `Tracker ${tracker.name} already has entries, skipping entry creation`
        );
        continue;
      }

      // Generate entries for the past 30 days
      const entries = await createEntriesForTracker(tracker);
      console.log(
        `Created ${entries.length} entries for tracker: ${tracker.name}`
      );
    }
  }

  console.log("Seeding complete!");
}

async function createUser(name: string, email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });
}

async function createTracker({
  name,
  description,
  type,
  userId,
  tags,
  color,
  icon,
  status = TrackerStatus.ACTIVE,
}: {
  name: string;
  description: string;
  type: TrackerType;
  userId: string;
  tags: string[];
  color: string;
  icon: string;
  status?: TrackerStatus;
}) {
  return prisma.tracker.create({
    data: {
      name,
      description,
      type,
      status,
      tags,
      color,
      icon,
      userId,
    },
  });
}

async function createEntriesForTracker(tracker: any) {
  const now = new Date();
  const entries = [];

  // Generate entries for past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Skip some days randomly to make data more realistic
    if (Math.random() > 0.7) continue;

    let entryData: any = {
      trackerId: tracker.id,
      date: date,
      tags: [],
      note: i % 5 === 0 ? `Sample note for day ${i}` : undefined,
    };

    // Add random tag occasionally
    if (Math.random() > 0.6) {
      entryData.tags = [
        tracker.tags[Math.floor(Math.random() * tracker.tags.length)],
      ];
    }

    switch (tracker.type) {
      case TrackerType.TIMER:
        // Create timer entry with random duration between 30 minutes and 4 hours
        const startTime = new Date(date);
        startTime.setHours(9, 0, 0, 0); // 9 AM
        const durationMs =
          Math.floor(Math.random() * (4 * 60 - 30) + 30) * 60 * 1000;
        const endTime = new Date(startTime.getTime() + durationMs);
        entryData.startTime = startTime;
        entryData.endTime = endTime;
        break;

      case TrackerType.COUNTER:
        // Random counter value between 1 and 10
        entryData.value = Math.floor(Math.random() * 10) + 1;
        break;

      case TrackerType.AMOUNT:
        // Random amount between 5 and 100 with decimals
        entryData.value = +(Math.random() * 95 + 5).toFixed(2);
        break;

      case TrackerType.OCCURRENCE:
        // Just the date is sufficient
        break;

      case TrackerType.CUSTOM:
        // Random value between 1 and 5 (e.g., for mood rating)
        entryData.value = Math.floor(Math.random() * 5) + 1;
        break;
    }

    try {
      const entry = await prisma.trackerEntry.create({
        data: entryData,
      });
      entries.push(entry);
    } catch (error) {
      console.error(`Error creating entry for tracker ${tracker.name}:`, error);
    }
  }

  return entries;
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
