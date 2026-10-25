import { test, expect } from "@playwright/test";

test("development page address is accepted for registration requests", async ({
  request,
}) => {
  const address = "http://127.0.0.1:5173";
  const local = await request.post(`${address}/api/auth/register`, {
    headers: { Origin: address },
    data: {
      name: "本地注册测试",
      email: `loopback-${Date.now()}@example.com`,
      password: "loopback-test-password",
    },
  });
  expect(local.status(), await local.text()).toBe(201);

  const foreign = await request.post(`${address}/api/auth/logout`, {
    headers: { Origin: "https://untrusted.invalid" },
  });
  expect(foreign.status()).toBe(403);
});

test("discovery filters, reading, search, theme and local draft work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("让知识");
  await expect(page.locator(".post-card")).toHaveCount(6);
  await page.getByRole("button", { name: "算法竞赛", exact: true }).click();
  await expect(page.locator(".post-card")).toHaveCount(1);
  await expect(page.locator(".post-title")).toContainText("动态规划");
  await page.locator(".category-tabs button").first().click();
  await expect(page.locator(".post-card")).toHaveCount(6);
  await page.getByLabel("搜索文章", { exact: true }).last().fill("Prisma");
  await expect(page.locator(".post-card")).toHaveCount(1);
  await page.getByLabel("清除搜索").click();
  await expect(page.locator(".post-card")).toHaveCount(6);
  await page.locator(".save-button").first().click();
  await expect(page.locator(".save-button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("只看收藏").click();
  await expect(page.locator(".post-card")).toHaveCount(1);
  await page.getByLabel("只看收藏").click();
  await page.getByRole("button", { name: "切换深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "切换浅色模式" }).click();
  await page.locator(".post-title").first().click();
  await expect(page.locator(".markdown-body h2").first()).toContainText(
    "写在开始",
  );
  await expect(page.locator(".comments-section")).toBeVisible();
  await page.getByRole("link", { name: "写文章", exact: true }).click();
  await page.getByLabel("文章标题", { exact: true }).fill("我的本地草稿");
  await page
    .getByLabel("Markdown 正文")
    .fill("## 一个值得记录的问题\n\n这是本地草稿的内容，用来验证编辑体验。");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect(page.locator(".editor-preview h2")).toHaveText(
    "一个值得记录的问题",
  );
  await page.reload();
  await expect(page.getByLabel("文章标题", { exact: true })).toHaveValue(
    "我的本地草稿",
  );
  await expect(page.getByLabel("Markdown 正文")).toHaveValue(
    /这是本地草稿的内容/,
  );
  expect(errors).toEqual([]);
});

test("mobile layout stays within the viewport and navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".post-card")).toHaveCount(6);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByRole("button", { name: "切换导航" }).click();
  await page.getByRole("link", { name: "归档", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "探索的足迹",
  );
  await expect(page.locator(".archive-row")).toHaveCount(6);
  await page.screenshot({ path: ".local/mobile-archive.png", fullPage: true });
  await page.goto("/article/build-your-first-react-project");
  await expect(page.locator(".markdown-body h2").first()).toContainText(
    "写在开始",
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

test("real API: session, permissions, publish, tags, comments and object storage", async ({
  request,
  playwright,
}) => {
  const origin = "http://localhost:5173";
  const headers = { Origin: origin };
  const health = await request.get("/api/health");
  expect(
    health.ok(),
    "start PostgreSQL + API before running the integration test",
  ).toBeTruthy();
  const email = `integration-${Date.now()}@example.com`;
  const auth = await request.post("/api/auth/register", {
    headers,
    data: { email, name: "集成测试", password: "a-long-test-password" },
  });
  expect(auth.status()).toBe(201);
  const user = await auth.json();
  expect(user.passwordHash).toBeUndefined();
  const outsider = await playwright.request.newContext({ baseURL: origin });
  const cats = await (await request.get("/api/categories")).json();
  const malicious = await request.post("/api/posts", {
    headers: { Origin: "https://untrusted.invalid" },
    data: {},
  });
  expect(malicious.status()).toBe(403);
  const draft = await request.post("/api/posts", {
    headers,
    data: {
      title: "独立集成测试文章",
      excerpt: "用真实数据库验证发布与评论流程",
      content: "## 测试内容\n\n这是一篇临时集成测试文章，测试结束会自动清理。",
      categoryId: cats[0].id,
      tags: ["测试标签"],
      status: "DRAFT",
    },
  });
  expect(draft.status()).toBe(201);
  const post = await draft.json();
  expect((await outsider.get(`/api/posts/${post.slug}`)).status()).toBe(404);
  expect(
    (await outsider.delete(`/api/posts/${post.id}`, { headers })).status(),
  ).toBe(401);
  const wrongMime = await request.post("/api/assets", {
    headers,
    multipart: {
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
      },
    },
  });
  expect(wrongMime.status()).toBe(400);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nhsAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await request.post("/api/assets", {
    headers,
    multipart: {
      file: { name: "pixel.png", mimeType: "image/png", buffer: png },
    },
  });
  expect(upload.status(), await upload.text()).toBe(201);
  const asset = await upload.json();
  expect((await request.get(asset.url)).ok()).toBeTruthy();
  const published = await request.put(`/api/posts/${post.id}`, {
    headers,
    data: {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      categoryId: cats[0].id,
      tags: ["测试标签"],
      coverId: asset.id,
      status: "PUBLISHED",
    },
  });
  expect(published.status()).toBe(200);
  expect(
    (await (await outsider.get(`/api/posts/${post.slug}`)).json()).coverUrl,
  ).toBe(asset.url);
  const search = await (await request.get("/api/posts?tag=测试标签")).json();
  expect(search.posts.some((p: { id: string }) => p.id === post.id)).toBe(true);
  const comment = await request.post(`/api/posts/${post.id}/comments`, {
    headers,
    data: { content: "验证评论持久化" },
  });
  expect(comment.status()).toBe(201);
  const c = await comment.json();
  expect(
    (
      await request.post(`/api/posts/${post.id}/comments`, {
        headers,
        data: { content: "回复评论", parentId: c.id },
      })
    ).status(),
  ).toBe(201);
  expect(
    (await (await outsider.get(`/api/posts/${post.id}/comments`)).json()).total,
  ).toBe(2);
  expect(
    (await request.delete(`/api/posts/${post.id}`, { headers })).status(),
  ).toBe(204);
  expect((await outsider.get(`/api/posts/${post.slug}`)).status()).toBe(404);
  expect((await request.post("/api/auth/logout", { headers })).status()).toBe(
    204,
  );
  expect(await (await request.get("/api/auth/me")).json()).toBeNull();
  await outsider.dispose();
});

test("browser authoring: register, save, recover edits, publish and comment", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".post-card")).toHaveCount(6);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.getByRole("button", { name: "注册加入" }).click();
  await page.getByLabel("你的名字").fill("浏览器测试");
  await page
    .getByLabel("邮箱", { exact: true })
    .fill(`browser-${Date.now()}@example.com`);
  await page.getByLabel("密码", { exact: true }).fill("browser-test-password");
  await page.getByRole("button", { name: "创建账号" }).click();
  await expect(page.getByLabel("退出登录")).toBeVisible();
  await page.getByRole("link", { name: "写文章", exact: true }).click();
  await page.getByLabel("文章标题", { exact: true }).fill("浏览器创作流程测试");
  await page
    .getByLabel("文章摘要")
    .fill("这篇临时文章验证完整的写作和发布流程。");
  await page
    .getByLabel("Markdown 正文")
    .fill(
      "## 实际操作\n\n在浏览器中完成草稿、发布和评论，验证前后端衔接正常。",
    );
  await page.getByLabel("文章分类").selectOption({ index: 1 });
  await page.getByLabel("标签", { exact: true }).fill("React, react");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await expect(page).toHaveURL(/\/my-posts$/);
  await page.getByLabel("编辑浏览器创作流程测试").click();
  await expect(page.getByLabel("文章标题", { exact: true })).toHaveValue(
    "浏览器创作流程测试",
  );
  await page.getByLabel("文章标题", { exact: true }).fill("保留未提交的修改");
  await page.reload();
  await expect(page.getByLabel("文章标题", { exact: true })).toHaveValue(
    "保留未提交的修改",
  );
  await page.getByRole("button", { name: "发布文章", exact: true }).click();
  await expect(page).toHaveURL(/\/article\//);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "保留未提交的修改",
  );
  await expect(page.locator(".article-tags a")).toHaveCount(1);
  await page
    .getByLabel("评论内容")
    .fill("这条评论来自浏览器。\n测试换行与持久化。");
  await page.getByRole("button", { name: "发布评论", exact: true }).click();
  await expect(page.locator(".comments-list")).toContainText(
    "这条评论来自浏览器。",
  );
  await page.goto("/my-posts");
  await page.getByLabel("删除保留未提交的修改").click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.locator(".my-post-row")).toHaveCount(0);
});
