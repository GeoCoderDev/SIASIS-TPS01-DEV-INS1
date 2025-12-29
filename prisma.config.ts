import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Usa la misma variable de entorno que tenías en el schema: `multi`
    url: env("RDP02_INS1_DATABASE_URL"),
  },
});
