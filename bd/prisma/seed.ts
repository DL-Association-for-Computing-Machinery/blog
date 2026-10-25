import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/security.js";
const prisma = new PrismaClient();
const posts = JSON.parse(
  await readFile(new URL("./posts.json", import.meta.url), "utf8"),
) as {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  categorySlug: string;
  tags: string[];
  author: string;
  date: string;
  visual: string;
  featured: boolean;
}[];
try {
  for (const post of posts) {
    const author = await prisma.user.upsert({
      where: {
        email: `demo-${encodeURIComponent(post.author)}@example.invalid`,
      },
      update: {},
      create: {
        email: `demo-${encodeURIComponent(post.author)}@example.invalid`,
        name: post.author,
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      },
    });
    const category = await prisma.category.upsert({
      where: { slug: post.categorySlug },
      update: {},
      create: { slug: post.categorySlug, name: post.category },
    });
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        visual: post.visual,
        featured: post.featured,
        status: "PUBLISHED",
        publishedAt: new Date(post.date),
        authorId: author.id,
        categoryId: category.id,
        tags: {
          create: post.tags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name, slug: name.toLowerCase() },
              },
            },
          })),
        },
      },
    });
  }
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12)
      throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: {
        email,
        name: "计协编辑",
        passwordHash: await hashPassword(password),
        role: "ADMIN",
      },
    });
  }
  console.log(
    "Seeded 6 clearly identified sample articles. Existing content was preserved.",
  );
} finally {
  await prisma.$disconnect();
}
