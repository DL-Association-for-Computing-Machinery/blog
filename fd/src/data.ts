import content from "../../bd/prisma/posts.json";
import type { Post, Category, Tag } from "./types";
export const demoPosts: Post[] = content.map((p, i) => ({
  ...p,
  id: `demo-${i}`,
  author: { id: `author-${p.author}`, name: p.author },
  category: { id: p.categorySlug, name: p.category, slug: p.categorySlug },
  tags: p.tags.map((name) => ({ id: name, name, slug: name })),
  publishedAt: `${p.date}T08:00:00.000Z`,
  readingTime: Math.max(3, Math.ceil(p.content.length / 280)),
  commentCount: 0,
}));
export const demoCategories: Category[] = [
  { id: "frontend", slug: "frontend", name: "前端开发" },
  { id: "backend", slug: "backend", name: "后端开发" },
  { id: "algorithm", slug: "algorithm", name: "算法竞赛" },
  { id: "tools", slug: "tools", name: "开发工具" },
  { id: "community", slug: "community", name: "协会动态" },
].map((c) => ({
  ...c,
  count: demoPosts.filter((p) => p.category.slug === c.slug).length,
}));
export const demoTags: Tag[] = [...new Set(content.flatMap((p) => p.tags))].map(
  (name) => ({
    id: name,
    slug: name,
    name,
    count: demoPosts.filter((p) => p.tags.some((t) => t.name === name)).length,
  }),
);
