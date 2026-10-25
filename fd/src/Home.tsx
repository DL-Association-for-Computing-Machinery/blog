import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Code2,
  Search,
  Terminal,
  GitBranch,
  Rss,
  X,
  Hash,
  ArrowDownWideNarrow,
  Bookmark,
  Loader2,
} from "lucide-react";
import { useBlog } from "./context";
import { api } from "./api";
import type { Post } from "./types";
import { Avatar, EmptyState, PostCard } from "./components";

function Hero() {
  return (
    <section className="hero shell">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="live-dot" /> ECUT COMPUTER ASSOCIATION{" "}
          <span className="eyebrow-slash">/</span> BLOG
        </div>
        <h1>
          让知识
          <span className="hero-word">
            流动
            <svg viewBox="0 0 150 12" aria-hidden="true">
              <path d="M3 8 Q70 -2 146 5" />
            </svg>
          </span>
          ，<br />
          让灵感发生<span className="orange">.</span>
        </h1>
        <p>
          这里是东华理工大学计算机协会的技术自留地。
          <br />
          记录探索，分享实践，与一群有趣的人一起成长。
        </p>
        <a className="hero-cta" href="#articles">
          发现值得读的好文章
          <span>
            <ArrowRight size={17} />
          </span>
        </a>
        <div className="hero-people">
          <div className="avatar-stack">
            {["林同学", "周同学", "陈同学", "李同学"].map((n) => (
              <Avatar key={n} name={n} small />
            ))}
          </div>
          <span>
            写下所学，连接同好<span className="small-star">✳</span>
          </span>
        </div>
      </div>
      <div className="hero-scene" aria-label="用代码连接灵感的终端插画">
        <div className="scene-orbit orbit-one" />
        <div className="scene-orbit orbit-two" />
        <span className="orbit-point point-a" />
        <span className="orbit-point point-b" />
        <span className="orbit-point point-c" />
        <div className="floating-chip chip-code">
          <Code2 size={20} />
          <span>
            keep learning<span className="chip-dot">.</span>
          </span>
        </div>
        <div className="hero-terminal">
          <div className="terminal-bar">
            <div className="window-dots">
              <i />
              <i />
              <i />
            </div>
            <span>hello_world.ts</span>
            <Code2 size={13} />
          </div>
          <div className="hero-terminal-body">
            <div>
              <em>01</em>
              <span className="code-comment">
                // 每一行代码，都是一次新的探索
              </span>
            </div>
            <div>
              <em>02</em>
              <span>
                <b>const</b> developer = {"{"}
              </span>
            </div>
            <div>
              <em>03</em>
              <span>
                &nbsp;&nbsp;curiosity: <i>"∞"</i>,
              </span>
            </div>
            <div>
              <em>04</em>
              <span>
                &nbsp;&nbsp;passion: <i>"never stop"</i>,
              </span>
            </div>
            <div>
              <em>05</em>
              <span>
                &nbsp;&nbsp;community: <i>"ECUT"</i>
              </span>
            </div>
            <div>
              <em>06</em>
              <span>{"};"}</span>
            </div>
            <div>
              <em>07</em>
              <span />
            </div>
            <div>
              <em>08</em>
              <span>
                <strong>share</strong>(knowledge);
                <span className="terminal-cursor" />
              </span>
            </div>
          </div>
          <div className="terminal-status">
            <span>
              <GitBranch size={12} /> main*
            </span>
            <span>
              <span className="status-dot" /> All ideas welcome
            </span>
            <span>TypeScript</span>
          </div>
        </div>
        <div className="floating-chip chip-commit">
          <span className="commit-check">✓</span>
          <div>
            <b>New knowledge committed</b>
            <small>just now · 一点一滴，持续生长</small>
          </div>
          <GitBranch size={18} />
        </div>
        <span className="scene-decoration decoration-braces">{"{ }"}</span>
        <span className="scene-decoration decoration-star">✳</span>
        <span className="scene-caption">
          CODE. SHARE. GROW. <span>↗</span>
        </span>
      </div>
    </section>
  );
}
function TechStrip() {
  return (
    <div className="tech-strip">
      <div className="shell tech-inner">
        <span className="tech-label">
          探索不设限
          <ArrowUpRight size={13} />
        </span>
        {[
          "ALGORITHM",
          "REACT",
          "TYPESCRIPT",
          "LINUX",
          "OPEN SOURCE",
          "BUILD & SHARE",
        ].map((t, i) => (
          <span key={t} className="tech-item">
            {i > 0 && <b>✦</b>}
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
function Sidebar({ setTag }: { setTag: (value: string) => void }) {
  const { categories, tags, total } = useBlog();
  return (
    <aside className="sidebar">
      <section className="about-widget">
        <div className="widget-eyebrow">
          <span className="live-dot" /> HELLO, WORLD!
          <Code2 size={17} />
        </div>
        <h3>
          一个人的探索，
          <br />
          一群人的成长<span className="orange">。</span>
        </h3>
        <p>
          从第一行 Hello
          World，到无数个灵光乍现的瞬间。这里，记录着我们的技术与热爱。
        </p>
        <div className="widget-stats">
          <div>
            <strong>{String(total).padStart(2, "0")}</strong>
            <span>技术文章</span>
          </div>
          <div>
            <strong>{String(categories.length).padStart(2, "0")}</strong>
            <span>探索方向</span>
          </div>
          <Code2 className="widget-stat-code" size={32} />
        </div>
        <Link to="/about" className="widget-bottom">
          认识计算机协会
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="tag-widget">
        <div className="widget-title">
          <h3>
            <Hash size={18} /> 热门标签
          </h3>
          <span>TAGS</span>
        </div>
        <div className="tag-cloud">
          {tags.slice(0, 11).map((t) => (
            <button key={t.id} onClick={() => setTag(t.slug)}>
              <span>#</span> {t.name}
              {(t.count || 0) > 1 && <small>{t.count}</small>}
            </button>
          ))}
        </div>
      </section>
      <section className="terminal-widget">
        <div className="terminal-widget-top">
          <Terminal size={15} />
          <span>~/association/blog</span>
          <span className="green-dot" />
        </div>
        <div>
          <p>
            <b>$</b> cat philosophy.txt
          </p>
          <p className="terminal-quote">
            保持好奇，持续构建。
            <br />
            分享是最好的学习方式。
          </p>
          <p>
            <b>$</b> <span className="cursor">▍</span>
          </p>
        </div>
      </section>
      <Link to="/write" className="contribute-widget">
        <span className="contribute-icon">
          <Braces size={24} />
        </span>
        <div>
          <h3>你的经验，也值得被看见</h3>
          <p>分享一篇，启发更多。</p>
        </div>
        <ArrowUpRight size={19} />
      </Link>
      <div className="sidebar-footnote">
        <Rss size={13} />
        <span>每一次分享，都是一次连接。</span>
      </div>
    </aside>
  );
}
export default function Home({
  categoryView = false,
}: {
  categoryView?: boolean;
}) {
  const { posts, categories, mode } = useBlog();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "",
    tag = params.get("tag") || "",
    query = params.get("q") || "";
  const [sort, setSort] = useState("newest"),
    [onlySaved, setOnlySaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ecut-bookmarks") || "[]");
    } catch {
      return [];
    }
  });
  const [remote, setRemote] = useState<Post[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  }
  useEffect(() => {
    localStorage.setItem("ecut-bookmarks", JSON.stringify(saved));
  }, [saved]);
  function onSave(id: string) {
    setSaved((ids) =>
      ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id],
    );
  }
  useEffect(() => {
    if (mode !== "live") return;
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const search = new URLSearchParams({
        category,
        tag,
        search: query,
        sort,
        page: String(page),
        limit: "6",
      });
      api<{ posts: Post[]; total: number }>(`/posts?${search}`)
        .then((data) => {
          if (active) {
            setRemote(data.posts);
            setTotal(data.total);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, category, tag, query, sort, page, retry]);
  const filtered = useMemo(() => {
    const result =
      mode === "live"
        ? remote
        : posts
            .filter(
              (p) =>
                (!category || p.category.slug === category) &&
                (!tag || p.tags.some((t) => t.slug === tag)) &&
                `${p.title} ${p.excerpt} ${p.tags.map((t) => t.name).join(" ")}`
                  .toLowerCase()
                  .includes(query.toLowerCase().trim()),
            )
            .sort((a, b) =>
              sort === "oldest"
                ? a.publishedAt.localeCompare(b.publishedAt)
                : b.publishedAt.localeCompare(a.publishedAt),
            );
    return onlySaved ? result.filter((p) => saved.includes(p.id)) : result;
  }, [posts, category, tag, query, sort, onlySaved, saved, remote, mode]);
  return (
    <>
      {categoryView ? (
        <section className="page-intro shell">
          <span className="eyebrow">EXPLORE BY TOPIC</span>
          <h1>
            每一种好奇，都有方向<span className="orange">。</span>
          </h1>
          <p>选择你的兴趣所在，从一篇好文章开始探索。</p>
        </section>
      ) : (
        <>
          <Hero />
          <TechStrip />
        </>
      )}
      <section className="articles-section shell" id="articles">
        <div className="section-heading">
          <div>
            <span className="eyebrow section-eyebrow">THE KNOWLEDGE FEED</span>
            <h2>
              {categoryView ? "探索方向" : "最近的分享"}
              <span className="heading-dot" />
            </h2>
          </div>
          <p>把走过的路，变成照亮彼此的光。</p>
          <Link to="/archive">
            所有文章
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="content-layout">
          <div className="feed">
            <div className="feed-toolbar">
              <div className="category-tabs" role="group" aria-label="文章分类">
                <button
                  className={!category ? "active" : ""}
                  onClick={() => change("category", "")}
                >
                  <BookOpen size={14} /> 全部
                  <span>
                    {posts.length && mode !== "live" ? posts.length : ""}
                  </span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={category === c.slug ? "active" : ""}
                    onClick={() => change("category", c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="feed-search">
                <Search size={16} />
                <input
                  placeholder="搜索感兴趣的内容…"
                  aria-label="搜索文章"
                  value={query}
                  onChange={(e) => change("q", e.target.value)}
                  maxLength={100}
                />
                {query && (
                  <button
                    className="icon-button"
                    onClick={() => change("q", "")}
                    aria-label="清除搜索"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="feed-subtoolbar">
              <div className="result-summary">
                {tag ? (
                  <button
                    className="active-tag"
                    onClick={() => change("tag", "")}
                  >
                    # {tag}
                    <X size={12} />
                  </button>
                ) : (
                  <span className="result-dot" />
                )}
                <span>
                  {category
                    ? categories.find((c) => c.slug === category)?.name
                    : "全部文章"}
                  <span className="result-count">
                    {mode === "live" ? total : filtered.length} 篇
                  </span>
                </span>
                {onlySaved && <small>· 仅看本页收藏</small>}
              </div>
              <div className="sort-controls">
                <button
                  className={onlySaved ? "active" : ""}
                  onClick={() => setOnlySaved((v) => !v)}
                  aria-pressed={onlySaved}
                  aria-label="只看收藏"
                >
                  <Bookmark size={14} />
                  <span>收藏</span>
                </button>
                <span />
                <label>
                  <ArrowDownWideNarrow size={14} />
                  <select
                    aria-label="文章排序"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">最新发布</option>
                    <option value="oldest">最早发布</option>
                  </select>
                </label>
              </div>
            </div>
            {error ? (
              <div className="empty-state" role="alert">
                <p>{error}</p>
                <button
                  className="button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  请刷新页面重试
                </button>
              </div>
            ) : loading ? (
              <div className="feed-loading">
                <Loader2 className="spin" />
                正在寻找好文章…
              </div>
            ) : filtered.length ? (
              <div className="post-grid">
                {filtered.map((p, i) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    saved={saved.includes(p.id)}
                    onSave={onSave}
                    featured={
                      i === 0 && p.featured && !category && !tag && !query
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState>
                <button
                  className="button"
                  onClick={() => {
                    setParams({});
                    setOnlySaved(false);
                  }}
                >
                  浏览全部文章
                  <ArrowRight size={15} />
                </button>
              </EmptyState>
            )}
            <div className="feed-end">
              {mode === "live" && total > 6 ? (
                <div className="pagination">
                  <button
                    className="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    上一页
                  </button>
                  <span>
                    {page} / {Math.ceil(total / 6)}
                  </span>
                  <button
                    className="button"
                    disabled={page * 6 >= total || loading}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    下一页
                  </button>
                </div>
              ) : (
                <>
                  <span />
                  <Code2 size={16} />
                  <p>探索未完，故事待续</p>
                  <span />
                </>
              )}
            </div>
          </div>
          <Sidebar setTag={(value) => change("tag", value)} />
        </div>
      </section>
      <section className="bottom-callout shell">
        <div className="callout-code">{"</>"}</div>
        <div>
          <span className="eyebrow">YOUR NEXT COMMIT</span>
          <h2>学到的，试过的，都值得写下来。</h2>
          <p>一篇笔记、一次复盘、一个灵感。让你的分享，成为他人的起点。</p>
        </div>
        <Link to="/write" className="button button-navy">
          开始你的第一篇
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
