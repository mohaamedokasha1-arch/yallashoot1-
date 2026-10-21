import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { slugify } from "@/lib/utils/slug";
import { safeHref } from "./markup";

/**
 * Editorial articles written by the site's own team (admin panel). Third-party
 * articles are never copied: external news appears only as headline links
 * (see feeds.ts).
 */

export const ARTICLE_CATEGORIES = {
  news: "أخبار",
  analysis: "تحليلات",
  guides: "دليل المشجع",
} as const;

export type ArticleCategory = keyof typeof ARTICLE_CATEGORIES;

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v ? v : null))
  .nullable()
  .refine((v) => v === null || safeHref(v) !== null, "رابط غير صالح");

export const articleInputSchema = z
  .object({
    title: z.string().trim().min(8, "العنوان قصير جدًا").max(140, "العنوان طويل جدًا"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(100)
      .refine((v) => v === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "المعرّف يقبل حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط")
      .default(""),
    excerpt: z.string().trim().min(20, "الملخص قصير جدًا").max(300, "الملخص طويل جدًا"),
    body: z.string().trim().min(50, "المحتوى قصير جدًا").max(20000, "المحتوى طويل جدًا"),
    category: z.enum(["news", "analysis", "guides"]),
    status: z.enum(["draft", "published"]),
    sourceName: z.string().trim().max(80).transform((v) => (v ? v : null)).nullable().default(null),
    sourceUrl: optionalUrl.default(null),
    imageUrl: optionalUrl.default(null),
    imageCredit: z.string().trim().max(120).transform((v) => (v ? v : null)).nullable().default(null),
  })
  .refine((a) => !a.imageUrl || a.imageCredit, { message: "يجب ذكر مصدر/ترخيص الصورة", path: ["imageCredit"] });

export type ArticleInput = z.infer<typeof articleInputSchema>;

export interface Article extends ArticleInput {
  id: string;
  slug: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const KEY = "content:articles";

export async function listArticles(includeDrafts = false): Promise<Article[]> {
  try {
    const all = Object.values(await getStore().hgetall<Article>(KEY)).filter((a) => a && typeof a.id === "string");
    return all
      .filter((a) => includeDrafts || a.status === "published")
      .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  } catch {
    return [];
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const all = await listArticles(true);
  return all.find((a) => a.id === id) ?? null;
}

export async function getArticleBySlug(slug: string, includeDrafts = false): Promise<Article | null> {
  const all = await listArticles(includeDrafts);
  return all.find((a) => a.slug === slug) ?? null;
}

export async function saveArticle(input: ArticleInput, author: string, id?: string): Promise<Article> {
  const all = await listArticles(true);
  const existing = id ? all.find((a) => a.id === id) : undefined;
  const now = new Date().toISOString();
  const articleId = existing?.id ?? randomUUID();
  let slug = input.slug || slugify(input.title) || `article-${articleId.slice(0, 8)}`;
  if (all.some((a) => a.slug === slug && a.id !== articleId)) slug = `${slug}-${articleId.slice(0, 6)}`;
  const article: Article = {
    ...input,
    id: articleId,
    slug,
    author: existing?.author ?? author,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: input.status === "published" ? (existing?.publishedAt ?? now) : null,
  };
  await getStore().hset(KEY, { [articleId]: article });
  return article;
}

export async function deleteArticle(id: string): Promise<void> {
  await getStore().hdel(KEY, id);
}

export async function qPublishedArticles(): Promise<Article[]> {
  "use cache";
  cacheLife("reference");
  cacheTag("articles");
  return listArticles(false);
}

export async function qArticle(slug: string): Promise<Article | null> {
  "use cache";
  cacheLife("reference");
  cacheTag("articles", `article:${slug}`);
  return getArticleBySlug(slug, false);
}
