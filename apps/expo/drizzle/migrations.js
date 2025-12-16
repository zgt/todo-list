// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import m0000 from "./0000_lean_silver_samurai.sql";
import journal from "./meta/_journal.json";

export default {
  journal,
  migrations: {
    m0000,
  },
};
