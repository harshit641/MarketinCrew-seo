import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma config. The datasource URL is only required for migrations / db push
 * (i.e. `prisma migrate deploy`). It is NOT required for `prisma generate`,
 * which runs during `postinstall` and `build` — including on Vercel, where
 * DATABASE_URL may not be present at install time.
 *
 * To avoid the build crashing when DATABASE_URL is unset, we only set the URL
 * when it actually exists.
 */
const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(dbUrl
    ? {
        datasource: {
          url: dbUrl,
        },
      }
    : {}),
});
