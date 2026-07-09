import { createApp } from '../src/app.js';
import { loadConfig } from '../src/lib/config.js';
import { connectDb } from '../src/lib/db.js';

const config = loadConfig();
connectDb(config.MONGODB_URI).catch((err: unknown) => {
  console.error('DB connect failed at cold start', err);
});
const app = createApp(config);
export default app;
