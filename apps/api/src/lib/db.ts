import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDb = (uri: string): Promise<typeof mongoose> => {
  if (connectionPromise === null) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10_000,
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
};

export const isDbConnected = (): boolean =>
  mongoose.connection.readyState === 1;

export const disconnectDb = async (): Promise<void> => {
  if (connectionPromise !== null) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
};
