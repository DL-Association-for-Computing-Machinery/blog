import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { Prisma, PrismaClient, type User } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
  detectImage,
} from "./security.js";

export const prisma = new PrismaClient();
export const app = express();
const production = process.env.NODE_ENV === "production";
const origin = process.env.WEB_ORIGIN || "http://localhost:5173";
function trustedOrigin(req: Request) {
  const source = req.get("origin");
  if (source === origin) return true;
  if (production || !source) return false;
  try {
    const url = new URL(source);
    const host = url.hostname;
    const octets = host.split(".").map(Number);
    const privateAddress =
      isIP(host) === 4 &&
      (octets[0] === 10 ||
        octets[0] === 127 ||
        (octets[0] === 172 &&
          (octets[1] ?? -1) >= 16 &&
          (octets[1] ?? -1) <= 31) ||
        (octets[0] === 192 && octets[1] === 168));
    return (
      url.origin === source &&
      url.protocol === "http:" &&
      url.port === "5173" &&
      (host === "localhost" || host === "[::1]" || privateAddress)
    );
  } catch {
    return false;
  }
}
const publicUser = { id: true, name: true, email: true, role: true } as const;
const authorSelect = { id: true, name: true } as const;
const include = {
  author: { select: authorSelect },
  category: true,
  tags: { include: { tag: true } },
  cover: true,
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;
type PostRecord = Prisma.PostGetPayload<{ include: typeof include }>;
function presentPost(p: PostRecord, full = false) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    ...(full ? { content: p.content } : {}),
    author: p.author,
    category: p.category,
    tags: p.tags.map((t) => t.tag),
    featured: p.featured,
    visual: p.visual,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    status: p.status,
    readingTime: Math.max(1, Math.ceil(p.content.length / 350)),
    commentCount: p._count.comments,
    coverUrl: p.cover ? `${process.env.S3_PUBLIC_URL}/${p.cover.key}` : null,
  };
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors((req, done) =>
    done(null, {
      origin: trustedOrigin(req) ? req.get("origin") : false,
      credentials: true,
    }),
  ),
);
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
// Cookie-authenticated writes require the configured site or its local dev proxy.
app.use("/api", (req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !trustedOrigin(req))
    return next(new HttpError(403, "请求来源不受信任"));
  next();
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "请求过于频繁，请稍后重试" },
  }),
);
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "登录尝试过多，请稍后重试" },
});
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "操作过于频繁，请稍后重试" },
});
async function currentUser(req: Request): Promise<User | null> {
  const token = req.cookies?.blog_session;
  if (typeof token !== "string") return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "请先登录");
  return user;
}
async function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { userId, expiresAt: { lt: new Date(Date.now() + 60_000) } },
        ],
      },
    }),
    prisma.session.create({
      data: { tokenHash: tokenHash(token), userId, expiresAt },
    }),
  ]);
  res.cookie("blog_session", token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}
app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "密码至少 8 位").max(128),
});
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { email, password, name } = credentials
    .extend({ name: z.string().trim().min(2).max(30) })
    .parse(req.body);
  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: publicUser,
  });
  await createSession(res, user.id);
  res.status(201).json(user);
});
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    throw new HttpError(401, "邮箱或密码不正确");
  await createSession(res, user.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});
app.get("/api/auth/me", async (req, res) => {
  const user = await currentUser(req);
  res.json(
    user
      ? { id: user.id, name: user.name, email: user.email, role: user.role }
      : null,
  );
});
app.post("/api/auth/logout", async (req, res) => {
  if (typeof req.cookies?.blog_session === "string")
    await prisma.session.deleteMany({
      where: { tokenHash: tokenHash(req.cookies.blog_session) },
    });
  res.clearCookie("blog_session", {
    path: "/",
    httpOnly: true,
    secure: production,
    sameSite: "lax",
  });
  res.status(204).end();
});
app.get("/api/categories", async (_req, res) => {
  const data = await prisma.category.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
    },
  });
  res.json(data.map(({ _count, ...c }) => ({ ...c, count: _count.posts })));
});
app.get("/api/tags", async (_req, res) => {
  const data = await prisma.tag.findMany({
    include: {
      _count: {
        select: { posts: { where: { post: { status: "PUBLISHED" } } } },
      },
    },
    orderBy: { name: "asc" },
  });
  res.json(
    data
      .map(({ _count, ...t }) => ({ ...t, count: _count.posts }))
      .filter((t) => t.count > 0),
  );
});
app.get("/api/posts", async (req, res) => {
  const q = z
    .object({
      search: z.string().max(100).optional(),
      category: z.string().max(100).optional(),
      tag: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
      sort: z.enum(["newest", "oldest"]).default("newest"),
    })
    .parse(req.query);
  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    ...(q.category ? { category: { slug: q.category } } : {}),
    ...(q.tag ? { tags: { some: { tag: { slug: q.tag } } } } : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: "insensitive" } },
            { excerpt: { contains: q.search, mode: "insensitive" } },
            {
              tags: {
                some: {
                  tag: { name: { contains: q.search, mode: "insensitive" } },
                },
              },
            },
          ],
        }
      : {}),
  };
  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      include,
      orderBy: { publishedAt: q.sort === "newest" ? "desc" : "asc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.post.count({ where }),
  ]);
  res.json({
    posts: posts.map((p) => presentPost(p)),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  });
});
app.get("/api/me/posts", async (req, res) => {
  const user = await requireUser(req);
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    include,
    orderBy: { updatedAt: "desc" },
  });
  res.json(posts.map((p) => presentPost(p, true)));
});
app.get("/api/posts/:slug", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { slug: String(req.params.slug) },
    include,
  });
  if (!post) throw new HttpError(404, "文章不存在");
  if (post.status !== "PUBLISHED") {
    const user = await currentUser(req);
    if (!user || (user.id !== post.authorId && user.role !== "ADMIN"))
      throw new HttpError(404, "文章不存在");
  }
  res.json(presentPost(post, true));
});
const postInput = z.object({
  title: z.string().trim().min(3).max(120),
  excerpt: z.string().trim().min(5).max(240),
  content: z.string().trim().min(20).max(150_000),
  categoryId: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(30)).max(5),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  coverId: z.string().nullable().optional(),
});
async function validateRelations(input: z.infer<typeof postInput>, user: User) {
  if (!(await prisma.category.findUnique({ where: { id: input.categoryId } })))
    throw new HttpError(400, "请选择有效分类");
  if (
    input.coverId &&
    !(await prisma.asset.findFirst({
      where: { id: input.coverId, ownerId: user.id },
    }))
  )
    throw new HttpError(400, "封面文件无效");
}
const tagsData = (tags: string[]) =>
  [...new Map(tags.map((name) => [name.toLowerCase(), name])).entries()].map(
    ([slug, name]) => ({
      tag: { connectOrCreate: { where: { slug }, create: { name, slug } } },
    }),
  );
app.post("/api/posts", writeLimiter, async (req, res) => {
  const user = await requireUser(req);
  const input = postInput.parse(req.body);
  await validateRelations(input, user);
  const { tags, ...data } = input;
  const post = await prisma.post.create({
    data: {
      ...data,
      slug: randomUUID(),
      authorId: user.id,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      tags: { create: tagsData(tags) },
    },
    include,
  });
  res.status(201).json(presentPost(post, true));
});
app.put("/api/posts/:id", writeLimiter, async (req, res) => {
  const user = await requireUser(req);
  const id = String(req.params.id);
  const input = postInput.parse(req.body);
  const old = await prisma.post.findUnique({ where: { id } });
  if (!old) throw new HttpError(404, "文章不存在");
  if (old.authorId !== user.id && user.role !== "ADMIN")
    throw new HttpError(403, "没有修改权限");
  await validateRelations(input, user);
  const { tags, ...data } = input;
  const post = await prisma.post.update({
    where: { id },
    data: {
      ...data,
      publishedAt:
        input.status === "PUBLISHED" ? old.publishedAt || new Date() : null,
      tags: { deleteMany: {}, create: tagsData(tags) },
    },
    include,
  });
  res.json(presentPost(post, true));
});
app.delete("/api/posts/:id", writeLimiter, async (req, res) => {
  const user = await requireUser(req);
  const post = await prisma.post.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!post) throw new HttpError(404, "文章不存在");
  if (post.authorId !== user.id && user.role !== "ADMIN")
    throw new HttpError(403, "没有删除权限");
  await prisma.post.delete({ where: { id: post.id } });
  res.status(204).end();
});
app.get("/api/posts/:id/comments", async (req, res) => {
  const postId = String(req.params.id);
  if (
    !(await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED" },
    }))
  )
    throw new HttpError(404, "文章不存在");
  const q = z
    .object({ page: z.coerce.number().int().min(1).default(1) })
    .parse(req.query);
  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        author: { select: authorSelect },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      skip: (q.page - 1) * 50,
    }),
    prisma.comment.count({ where: { postId } }),
  ]);
  res.json({ comments, total });
});
app.post("/api/posts/:id/comments", writeLimiter, async (req, res) => {
  const user = await requireUser(req);
  const postId = String(req.params.id);
  const input = z
    .object({
      content: z.string().trim().min(1).max(2000),
      parentId: z.string().optional(),
    })
    .parse(req.body);
  if (
    !(await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED" },
    }))
  )
    throw new HttpError(404, "文章不存在");
  if (
    input.parentId &&
    !(await prisma.comment.findFirst({ where: { id: input.parentId, postId } }))
  )
    throw new HttpError(400, "回复目标无效");
  const comment = await prisma.comment.create({
    data: { ...input, postId, authorId: user.id },
    select: {
      id: true,
      content: true,
      parentId: true,
      createdAt: true,
      author: { select: authorSelect },
    },
  });
  res.status(201).json(comment);
});
app.delete("/api/comments/:id", writeLimiter, async (req, res) => {
  const user = await requireUser(req);
  const comment = await prisma.comment.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!comment) throw new HttpError(404, "评论不存在");
  if (comment.authorId !== user.id && user.role !== "ADMIN")
    throw new HttpError(403, "没有删除权限");
  await prisma.comment.delete({ where: { id: comment.id } });
  res.status(204).end();
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
const storage = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});
app.post(
  "/api/assets",
  writeLimiter,
  async (req, res, next) => {
    try {
      res.locals.user = await requireUser(req);
      next();
    } catch (error) {
      next(error);
    }
  },
  upload.single("file"),
  async (req, res) => {
    const user: User = res.locals.user;
    if (!req.file) throw new HttpError(400, "请选择图片");
    const mimeType = detectImage(req.file.buffer);
    if (!mimeType || mimeType !== req.file.mimetype)
      throw new HttpError(400, "仅支持真实 PNG、JPEG、WebP 图片");
    if (!process.env.S3_PUBLIC_URL || !process.env.S3_BUCKET)
      throw new HttpError(503, "文件存储尚未配置");
    const ext = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    }[mimeType];
    const key = `images/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const Bucket = process.env.S3_BUCKET;
    await storage.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: mimeType,
        CacheControl: "public,max-age=31536000,immutable",
      }),
    );
    try {
      const asset = await prisma.asset.create({
        data: { key, size: req.file.size, mimeType, ownerId: user.id },
      });
      res
        .status(201)
        .json({ id: asset.id, url: `${process.env.S3_PUBLIC_URL}/${key}` });
    } catch (error) {
      await storage
        .send(new DeleteObjectCommand({ Bucket, Key: key }))
        .catch(() => {});
      throw error;
    }
  },
);
app.use((_req, res) => {
  res.status(404).json({ error: "接口不存在" });
});
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: error.issues[0]?.message || "输入格式有误" });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE" ? "图片不能超过 8 MB" : "图片上传失败",
    });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({ error: "该邮箱或名称已存在" });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "请求 JSON 无效" });
    return;
  }
  console.error(
    error instanceof Error ? error.message : "Unknown server error",
  );
  res
    .status(503)
    .json({ error: "服务暂时不可用，请确认数据库与文件存储已启动" });
});
