// backend/db.js
import mongoose from "mongoose";

export const connectDB = async (uri) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
};

export default mongoose;