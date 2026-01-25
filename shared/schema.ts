import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const schoolSettings = pgTable("school_settings", {
  id: text("id").primaryKey().default("default"),
  iaName: text("ia_name").notNull().default("IA: DAKAR"),
  iefName: text("ief_name").notNull().default("IEF: PARCELLES ASSAINIES"),
  schoolName: text("school_name").notNull().default("TAWFEEX AK TAYSIIR"),
  phone: text("phone").notNull().default("77 737 95 80"),
  email: text("email").notNull().default("khadimba18@gmail.com"),
});

export const insertSchoolSettingsSchema = createInsertSchema(schoolSettings);
export type SchoolSettings = typeof schoolSettings.$inferSelect;
export type InsertSchoolSettings = z.infer<typeof insertSchoolSettingsSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
