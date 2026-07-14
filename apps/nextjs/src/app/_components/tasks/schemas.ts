import { z } from "zod";

// Validation schema for inline task editing
export const EditTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
});
