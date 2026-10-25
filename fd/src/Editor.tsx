import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Code2,
  ImagePlus,
  Loader2,
  Save,
  Send,
  FileText,
  X,
} from "lucide-react";
import { api } from "./api";
import { useBlog } from "./context";
import { MarkdownBody } from "./Article";
import type { Post } from "./types";

interface Draft {
  title: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  coverId: string | null;
  coverUrl: string;
}
const blank: Draft = {
  title: "",
  excerpt: "",
  content: "",
  categoryId: "",
  tags: "",
  coverId: null,
  coverUrl: "",
};
export default function Editor() {
  const { slug } = useParams(),
    navigate = useNavigate();
  const { categories, user, login, mode, notify, refresh } = useBlog();
  const key = `ecut-draft-${slug || "new"}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") || blank;
    } catch {
      return blank;
    }
  });
  const [id, setId] = useState(""),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!!slug),
    [uploading, setUploading] = useState(false),
    [loaded, setLoaded] = useState(!slug);
  const change = (field: keyof Draft, value: string | null) =>
    setDraft((d) => ({ ...d, [field]: value }));
  useEffect(() => {
    if (loaded) localStorage.setItem(key, JSON.stringify(draft));
  }, [draft, key, loaded]);
  useEffect(() => {
    if (!slug || mode === "loading") return;
    if (mode !== "live") {
      setError("编辑已发布文章需要连接后端服务。");
      setLoading(false);
      return;
    }
    let active = true;
    api<Post>(`/posts/${slug}`)
      .then((p) => {
        if (active) {
          if (!user || (user.id !== p.author.id && user.role !== "ADMIN")) {
            setError("只有作者可以编辑这篇文章。");
            return;
          }
          setId(p.id);
          let local: Draft | null = null;
          try {
            local = JSON.parse(localStorage.getItem(key) || "null");
          } catch {
            /* A damaged browser draft should not prevent server recovery. */
          }
          setError("");
          setDraft(
            local || {
              title: p.title,
              excerpt: p.excerpt,
              content: p.content || "",
              categoryId: p.category.id,
              tags: p.tags.map((t) => t.name).join(", "),
              coverId: null,
              coverUrl: p.coverUrl || "",
            },
          );
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, mode, user]);
  async function upload(e: ChangeEvent<HTMLInputElement>, cover: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      login();
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("图片不能超过 8 MB");
      return;
    }
    setUploading(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    try {
      const asset = await api<{ id: string; url: string }>("/assets", {
        method: "POST",
        body: data,
      });
      if (cover)
        setDraft((d) => ({ ...d, coverId: asset.id, coverUrl: asset.url }));
      else
        setDraft((d) => ({
          ...d,
          content: `${d.content}\n\n![图片](${asset.url})\n`,
        }));
      notify("图片已上传至独立文件存储");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  async function save(status: "DRAFT" | "PUBLISHED") {
    if (mode !== "live") {
      setError(
        "当前为示例预览，内容已保存在本机草稿中。连接后端后即可登录并发布。",
      );
      return;
    }
    if (!user) {
      login();
      return;
    }
    if (
      !draft.title.trim() ||
      !draft.excerpt.trim() ||
      draft.content.trim().length < 20 ||
      !draft.categoryId
    ) {
      setError("请填写标题、摘要、分类和不少于 20 字的正文。");
      return;
    }
    if (slug && !id) {
      setError("文章尚未加载完成或没有编辑权限");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        title: draft.title,
        excerpt: draft.excerpt,
        content: draft.content,
        categoryId: draft.categoryId,
        tags: draft.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        ...(!slug || draft.coverId || !draft.coverUrl
          ? { coverId: draft.coverId }
          : {}),
      };
      const post = await api<Post>(id ? `/posts/${id}` : "/posts", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      localStorage.removeItem(key);
      notify(status === "DRAFT" ? "草稿已保存到服务器" : "文章已发布");
      await refresh();
      navigate(status === "DRAFT" ? "/my-posts" : `/article/${post.slug}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="page-loading">
        <Loader2 className="spin" />
        正在加载文章…
      </div>
    );
  return (
    <div className="editor-page shell">
      <div className="editor-heading">
        <div>
          <Link to="/" className="back-link">
            <ArrowLeft size={15} />
            回到发现页
          </Link>
          <h1>
            {slug ? "打磨你的分享" : "让灵感，从这里开始"}
            <span className="orange">。</span>
          </h1>
          <p>写下你的探索。草稿自动保存在此浏览器中。</p>
        </div>
        <span className="editor-status">
          <span className="green-dot" />
          本机自动保存
        </span>
      </div>
      {!user && (
        <div className="editor-notice">
          <FileText size={18} />
          <span>可以先写下灵感，登录后再保存或发布。</span>
          <button onClick={login}>登录 / 注册 →</button>
        </div>
      )}
      <div className="editor-grid">
        <section className="editor-main">
          <input
            className="editor-title"
            placeholder="给这次探索起个名字…"
            aria-label="文章标题"
            maxLength={120}
            minLength={3}
            value={draft.title}
            onChange={(e) => change("title", e.target.value)}
          />
          <textarea
            className="editor-excerpt"
            placeholder="用一两句话，介绍这篇文章…"
            aria-label="文章摘要"
            maxLength={240}
            value={draft.excerpt}
            onChange={(e) => change("excerpt", e.target.value)}
          />
          <div className="editor-toolbar">
            <div>
              <button
                className={!preview ? "active" : ""}
                onClick={() => setPreview(false)}
              >
                <Code2 size={15} />
                Markdown
              </button>
              <button
                className={preview ? "active" : ""}
                onClick={() => setPreview(true)}
              >
                <Eye size={15} />
                预览
              </button>
            </div>
            <label className="upload-control">
              {uploading ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <ImagePlus size={16} />
              )}
              插入图片
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => void upload(e, false)}
              />
            </label>
          </div>
          {preview ? (
            <div className="editor-preview">
              <MarkdownBody
                content={draft.content || "*还没有内容，先写下一点想法吧。*"}
              />
            </div>
          ) : (
            <textarea
              className="editor-content"
              value={draft.content}
              onChange={(e) => change("content", e.target.value)}
              placeholder={
                "## 从一个好问题开始\n\n写下你的实践、思考和发现…\n\n支持 Markdown，代码块和图片。"
              }
              aria-label="Markdown 正文"
              maxLength={150000}
            />
          )}
          <div className="editor-bottom">
            <span>支持 Markdown · GFM</span>
            <span>{draft.content.length} 字符</span>
          </div>
        </section>
        <aside className="editor-settings stack-form">
          <h3>给分享一个方向</h3>
          <label>
            文章分类
            <select
              value={draft.categoryId}
              onChange={(e) => change("categoryId", e.target.value)}
              required
            >
              <option value="">选择一个分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            标签
            <input
              aria-label="标签"
              placeholder="React, 工程实践"
              value={draft.tags}
              onChange={(e) => change("tags", e.target.value)}
              maxLength={154}
            />
            <small>用逗号分隔，最多 5 个标签。</small>
          </label>
          <label>文章封面</label>
          {draft.coverUrl ? (
            <div className="editor-cover">
              <img src={draft.coverUrl} alt="封面预览" />
              <button
                className="icon-button"
                onClick={() =>
                  setDraft((d) => ({ ...d, coverUrl: "", coverId: null }))
                }
                aria-label="移除封面"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="cover-upload">
              <ImagePlus size={25} />
              <span>{uploading ? "上传中…" : "上传一张封面"}</span>
              <small>PNG / JPEG / WebP · 最大 8 MB</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => void upload(e, true)}
              />
            </label>
          )}
          <p className="editor-hint">
            好的分享不必长篇大论，真实的尝试和清晰的表达就足够。
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-navy"
            disabled={busy || uploading}
            onClick={() => void save("PUBLISHED")}
          >
            {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            发布文章
          </button>
          <button
            className="button"
            disabled={busy || uploading}
            onClick={() => void save("DRAFT")}
          >
            <Save size={16} />
            保存草稿
          </button>
        </aside>
      </div>
    </div>
  );
}
