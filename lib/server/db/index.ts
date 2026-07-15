import { drizzle } from 'drizzle-orm/neon-http';

const db = drizzle(process.env.PG_CONNECTION_STRING as string);
export default db
