import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { safeHref } from "./markup";

/**
 * Editorial annotations for a match (e.g. official broadcaster). Stored
 * separately from provider data, always shown with their source, and never
 * used to change scores, times or statuses.
 */

export const annotationInputSchema = z.object({
  fixtureId: z.number().int().positive(),
  broadcasters: z.array(z.string().trim().min(2).max(60)).min(1, "أضف جهة بث واحدة على الأقل").max(6),
  sourceName: z.string().trim().min(2, "اذكر اسم المصدر").max(80),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => safeHref(v)?.startsWith("https://") ?? false, "رابط المصدر يجب أن يبدأ بـ https://"),
  note: z.string().trim().max(200).transform((v) => (v ? v : null)).nullable().default(null),
});

export type AnnotationInput = z.infer<typeof annotationInputSchema>;

export interface MatchAnnotation extends AnnotationInput {
  updatedAt: string;
  updatedBy: string;
}

const KEY = "content:annotations";

export async function listAnnotations(): Promise<MatchAnnotation[]> {
  try {
    return Object.values(await getStore().hgetall<MatchAnnotation>(KEY))
      .filter((a) => a && typeof a.fixtureId === "number")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function getAnnotation(fixtureId: number): Promise<MatchAnnotation | null> {
  try {
    const all = await getStore().hgetall<MatchAnnotation>(KEY);
    return all[String(fixtureId)] ?? null;
  } catch {
    return null;
  }
}

export async function saveAnnotation(input: AnnotationInput, user: string): Promise<MatchAnnotation> {
  const annotation: MatchAnnotation = { ...input, updatedAt: new Date().toISOString(), updatedBy: user };
  await getStore().hset(KEY, { [String(input.fixtureId)]: annotation });
  return annotation;
}

export async function deleteAnnotation(fixtureId: number): Promise<void> {
  await getStore().hdel(KEY, String(fixtureId));
}

export async function qAnnotation(fixtureId: number): Promise<MatchAnnotation | null> {
  "use cache";
  cacheLife("reference");
  cacheTag("annotations", `annotation:${fixtureId}`);
  return getAnnotation(fixtureId);
}
