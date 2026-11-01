import mongoose from "mongoose";
import PendingRegistration from "../models/PendingRegistration.js";

const migratePendingRegistrationExpiry = async () => {
  const collection = PendingRegistration.collection;
  let indexes = [];

  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  const legacyExpiryIndex = indexes.find(
    (index) => index.key?.expiresAt === 1 && index.expireAfterSeconds !== undefined
  );
  if (legacyExpiryIndex) {
    await collection.updateMany(
      { purgeAt: { $exists: false }, expiresAt: { $type: "date" } },
      [{ $set: { purgeAt: { $add: ["$expiresAt", 24 * 60 * 60 * 1000] } } }]
    );
    await collection.dropIndex(legacyExpiryIndex.name);
  }

  await collection.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined. Please set MONGO_URI or MONGODB_URI in your environment variables.");
    }

    const conn = await mongoose.connect(mongoUri);
    await migratePendingRegistrationExpiry();

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;