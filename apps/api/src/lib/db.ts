import mongoose from 'mongoose';
import type { Model } from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDb = (uri: string): Promise<typeof mongoose> => {
  if (connectionPromise === null) {
    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        autoIndex: false,
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
};

export type IndexSyncResult = {
  modelName: string;
  droppedIndexes: string[];
};

export const syncAllIndexes = async (
  models: readonly Model<unknown>[],
): Promise<IndexSyncResult[]> => {
  const results: IndexSyncResult[] = [];
  for (const model of models) {
    const dropped = await model.syncIndexes();
    results.push({ modelName: model.modelName, droppedIndexes: dropped });
  }
  return results;
};

export const isDbConnected = (): boolean =>
  mongoose.connection.readyState === 1;

export const disconnectDb = async (): Promise<void> => {
  if (connectionPromise !== null) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
};
