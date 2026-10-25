import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Code2,
  GitBranch,
  BookOpen,
  Users,
  PenLine,
  Trash2,
  Loader2,
} from "lucide-react";
import { useBlog } from "./context";
import { api } from "./api";
import type { Post } from "./types";
import { EmptyState, formatDate, Modal } from "./components";
export function Archive() {
  const { posts, mode, total } = useBlog();
  const [items, setItems] = useState<Post[]>(posts),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setItems(posts);
    setPage(1);
  }, [posts]);
  async function more() {
    setBusy(true);
    try {
      const data = await api<{ posts: Post[] }>(
        `/posts?limit=50&page=${page + 1}`,
      );
      setItems((p) => [...p, ...data.posts]);
      setPage((p) => p + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const groups = new Map<string, Post[]>();
  for (const p of items) {
    const month = (p.publishedAt || p.createdAt || "").slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), p]);
  }
  return (
    <div className="shell archive-page">
      <div className="page-intro">
        <span className="eyebrow">A TIMELINE OF CURIOSITY</span>
        <h1>
          探索的足迹<span className="orange">。</span>
        </h1>
        <p>每一次记录，都让成长有迹可循。共 {total} 篇文章。</p>
      </div>
      <div className="archive-list">
        {[...groups].map(([month, articles]) => (
          <section key={month}>
            <h2>
              <CalendarDays size={19} />
              {month.replace("-", " / ")}
              <small>{articles.length} 篇</small>
            </h2>
            {articles.map((p) => (
              <Link
                to={`/article/${p.slug}`}
                className="archive-row"
                key={p.id}
              >
                <time>
                  {formatDate(p.publishedAt || p.createdAt!).slice(5)}
                </time>
                <span>{p.title}</span>
                <small>{p.category.name}</small>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </section>
        ))}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {mode === "live" && items.length < total && (
        <button className="button" onClick={() => void more()} disabled={busy}>
          加载更早的分享
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
export function About() {
  return (
    <div className="shell about-page">
      <div className="page-intro">
        <span className="eyebrow">ECUT COMPUTER ASSOCIATION</span>
        <h1>
          因热爱而相聚，
          <br />
          因分享而成长<span className="orange">。</span>
        </h1>
        <p>这里是东华理工大学计算机协会的技术博客。</p>
      </div>
      <div className="about-manifesto">
        <span className="about-big-code">{"</>"}</span>
        <div>
          <h2>一群有趣的人，一些值得做的事。</h2>
          <p>
            东华理工大学计算机协会是由校内计算机科学和信息技术爱好者组成的学术科技类社团。我们通过技术讲座、主题分享、算法培训和模拟赛，为成员提供学习、交流与合作的机会。
          </p>
          <p>
            这个博客，是我们共同维护的知识花园。让一次解决问题的过程、一份认真整理的笔记，成为更多人的起点。
          </p>
        </div>
      </div>
      <div className="about-values">
        {[
          {
            icon: BookOpen,
            title: "保持好奇",
            text: "从一个问题开始，走进更广阔的技术世界。",
          },
          {
            icon: Code2,
            title: "动手构建",
            text: "把想法变成作品，在实践中理解每一个细节。",
          },
          {
            icon: Users,
            title: "开放分享",
            text: "记录走过的路，和志同道合的人一起成长。",
          },
        ].map((v) => (
          <section key={v.title}>
            <v.icon size={28} />
            <h3>{v.title}</h3>
            <p>{v.text}</p>
          </section>
        ))}
      </div>
      <div className="about-links">
        <Link to="/" className="button button-navy">
          探索技术文章
          <ArrowRight size={17} />
        </Link>
        <a
          className="button"
          href="https://github.com/DL-Association-for-Computing-Machinery/association-website/tree/feat-reconstruct-lxw"
          target="_blank"
          rel="noreferrer"
        >
          <GitBranch size={16} />在 GitHub 认识我们
          <ArrowUpRight size={15} />
        </a>
      </div>
    </div>
  );
}
export function MyPosts() {
  const { user, login, mode, notify, refresh } = useBlog();
  const [posts, setPosts] = useState<Post[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState<Post | null>(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    try {
      setPosts(await api<Post[]>("/me/posts"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user && mode === "live") void load();
    else setLoading(false);
  }, [user, mode]);
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(`/posts/${removing.id}`, { method: "DELETE" });
      notify("文章已删除");
      setRemoving(null);
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell my-posts-page">
      <div className="page-intro">
        <span className="eyebrow">MY WRITING DESK</span>
        <h1>
          我的创作台<span className="orange">。</span>
        </h1>
        <p>整理草稿，打磨想法，记录每一步。</p>
      </div>
      {!user ? (
        <EmptyState title="登录后，继续你的创作">
          <button className="button button-navy" onClick={login}>
            登录 / 注册
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="my-posts-heading">
            <h2>
              我的文章 <small>{posts.length}</small>
            </h2>
            <Link to="/write" className="button button-navy">
              <PenLine size={15} />
              写一篇新文章
            </Link>
          </div>
          {loading ? (
            <div className="page-loading">
              <Loader2 className="spin" />
              正在加载…
            </div>
          ) : posts.length ? (
            posts.map((p) => (
              <div className="my-post-row" key={p.id}>
                <span
                  className={`post-status ${p.status === "PUBLISHED" ? "published" : ""}`}
                >
                  {p.status === "PUBLISHED" ? "已发布" : "草稿"}
                </span>
                <Link to={`/article/${p.slug}`}>
                  {p.title}
                  <small>
                    {formatDate(p.createdAt!)} · {p.category.name}
                  </small>
                </Link>
                <Link
                  to={`/edit/${p.slug}`}
                  className="icon-button"
                  aria-label={`编辑${p.title}`}
                >
                  <PenLine size={17} />
                </Link>
                <button
                  className="icon-button"
                  aria-label={`删除${p.title}`}
                  onClick={() => setRemoving(p)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          ) : (
            <EmptyState title="你的第一篇分享，正在路上">
              <Link to="/write" className="button">
                写下第一个想法
                <ArrowRight size={15} />
              </Link>
            </EmptyState>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {removing && (
        <Modal title="删除这篇文章？" close={() => setRemoving(null)}>
          <p>「{removing.title}」及其评论将被删除，此操作无法撤销。</p>
          <div className="modal-actions">
            <button className="button" onClick={() => setRemoving(null)}>
              取消
            </button>
            <button
              className="button button-danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "删除中…" : "确认删除"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function NotFound() {
  return (
    <div className="shell">
      <EmptyState title="404 · 这条探索路线尚未开辟">
        <Link to="/" className="button button-navy">
          回到发现页
          <ArrowRight size={15} />
        </Link>
      </EmptyState>
    </div>
  );
}
