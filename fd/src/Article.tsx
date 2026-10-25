import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
  MessageSquare,
  Link2,
  Send,
  Reply,
  X,
  Loader2,
  PenLine,
  Trash2,
} from "lucide-react";
import { useBlog } from "./context";
import { api } from "./api";
import type { Post, Comment } from "./types";
import { ArticleArt, Avatar, formatDate, EmptyState } from "./components";

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith("#") ? undefined : "_blank"}
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} loading="lazy" />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
export default function Article() {
  const { slug } = useParams();
  const { posts, user, mode, login, notify } = useBlog();
  const [post, setPost] = useState<Post | null>(null),
    [comments, setComments] = useState<Comment[]>([]),
    [commentTotal, setCommentTotal] = useState(0),
    [commentPage, setCommentPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [commentError, setCommentError] = useState(""),
    [content, setContent] = useState(""),
    [sending, setSending] = useState(false),
    [reply, setReply] = useState<Comment | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setComments([]);
    setCommentTotal(0);
    setCommentPage(1);
    setReply(null);
    setContent("");
    setCommentError("");
    if (mode === "loading") return;
    if (mode === "demo") {
      setPost(posts.find((p) => p.slug === slug) || null);
      setLoading(false);
      return;
    }
    api<Post>(`/posts/${slug}`)
      .then(async (p) => {
        if (!active) return;
        setPost(p);
        if (p.status !== "DRAFT") {
          try {
            const c = await api<{ comments: Comment[]; total: number }>(
              `/posts/${p.id}/comments`,
            );
            if (active) {
              setComments(c.comments);
              setCommentTotal(c.total);
            }
          } catch {
            if (active) setCommentError("评论加载失败，请刷新后重试");
          }
        }
      })
      .catch((e) => {
        if (active) {
          setPost(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, mode, posts]);
  useEffect(() => {
    document.title = post ? `${post.title} · 计协博客` : "阅读文章 · 计协博客";
    return () => {
      document.title = "ECUT · 计协博客";
    };
  }, [post]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      login();
      return;
    }
    if (!post || !content.trim()) return;
    setSending(true);
    setCommentError("");
    try {
      await api<Comment>(`/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId: reply?.id }),
      });
      const data = await api<{ comments: Comment[]; total: number }>(
        `/posts/${post.id}/comments`,
      );
      setComments(data.comments);
      setCommentTotal(data.total);
      setCommentPage(1);
      setContent("");
      setReply(null);
      notify("评论已发布");
    } catch (e) {
      setCommentError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function loadComments() {
    if (!post) return;
    setSending(true);
    try {
      const data = await api<{ comments: Comment[]; total: number }>(
        `/posts/${post.id}/comments?page=${commentPage + 1}`,
      );
      setComments((old) => [...old, ...data.comments]);
      setCommentTotal(data.total);
      setCommentPage((v) => v + 1);
    } catch (e) {
      setCommentError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function deleteComment(comment: Comment) {
    try {
      await api(`/comments/${comment.id}`, { method: "DELETE" });
      const data = await api<{ comments: Comment[]; total: number }>(
        `/posts/${post!.id}/comments`,
      );
      setComments(data.comments);
      setCommentTotal(data.total);
      setCommentPage(1);
      notify("评论已删除");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  if (loading)
    return (
      <div className="page-loading">
        <Loader2 className="spin" />
        正在打开文章…
      </div>
    );
  if (!post)
    return (
      <div className="shell">
        <EmptyState title={error || "这篇文章还没有出现"}>
          <Link to="/" className="button">
            返回发现页
          </Link>
        </EmptyState>
      </div>
    );
  const headings =
    post.content
      ?.split("\n")
      .filter((l) => l.startsWith("## "))
      .map((l) => l.slice(3)) || [];
  return (
    <div className="article-page shell">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        回到文章列表
      </Link>
      <div className="article-layout">
        <article className="article-main">
          <header className="article-header">
            <Link
              className={`category-label cat-${post.category.slug}`}
              to={`/?category=${post.category.slug}`}
            >
              {post.category.name}
            </Link>
            {post.status === "DRAFT" && (
              <span className="draft-label">未发布 · 草稿</span>
            )}
            <h1>{post.title}</h1>
            <p className="article-deck">{post.excerpt}</p>
            <div className="article-byline">
              <Avatar name={post.author.name} />
              <div>
                <b>{post.author.name}</b>
                <small>
                  {formatDate(post.publishedAt || post.createdAt!)}
                  <span>·</span>
                  <Clock3 size={12} />
                  {post.readingTime} 分钟阅读
                </small>
              </div>
              <button
                className="icon-button"
                title="复制链接"
                aria-label="复制文章链接"
                onClick={() =>
                  navigator.clipboard
                    .writeText(window.location.href)
                    .then(() => notify("文章链接已复制"))
                    .catch(() => notify("复制失败，请从地址栏复制链接"))
                }
              >
                <Link2 size={18} />
              </button>
              {user &&
                (user.id === post.author.id || user.role === "ADMIN") && (
                  <Link
                    className="icon-button"
                    to={`/edit/${post.slug}`}
                    aria-label="编辑文章"
                  >
                    <PenLine size={18} />
                  </Link>
                )}
            </div>
          </header>
          <div className="article-cover">
            {post.coverUrl ? (
              <img src={post.coverUrl} alt={`${post.title}封面`} />
            ) : (
              <ArticleArt kind={post.visual} />
            )}
          </div>
          {mode === "demo" && (
            <p className="sample-note">
              这是一篇示例文章，用于预览博客的阅读体验。
            </p>
          )}
          <MarkdownBody content={post.content || ""} />
          <div className="article-tags">
            {post.tags.map((t) => (
              <Link key={t.id} to={`/?tag=${encodeURIComponent(t.slug)}`}>
                # {t.name}
              </Link>
            ))}
          </div>
          <div className="article-endnote">
            <CodeFooter />
            <span>感谢阅读。让每一次探索，都有迹可循。</span>
          </div>
          {post.status !== "DRAFT" && (
            <section className="comments-section" id="comments">
              <h2>
                <MessageSquare size={22} />
                一起聊聊 <span>{commentTotal}</span>
              </h2>
              <p className="comments-intro">
                一个好问题，也是一份值得分享的知识。
              </p>
              <form onSubmit={submit} className="comment-form">
                {reply && (
                  <div className="reply-label">
                    回复 {reply.author.name}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setReply(null)}
                      aria-label="取消回复"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <textarea
                  placeholder={
                    user
                      ? "分享你的想法，或提出一个问题…"
                      : "登录后，分享你的想法…"
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  aria-label="评论内容"
                />
                <div>
                  <span>{content.length} / 2000</span>
                  {user ? (
                    <button
                      className="button button-navy"
                      disabled={sending || !content.trim()}
                    >
                      <Send size={14} />
                      发布评论
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-navy"
                      onClick={login}
                    >
                      登录后参与讨论
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
              </form>
              {commentError && (
                <p className="form-error" role="alert">
                  {commentError}
                </p>
              )}
              <div className="comments-list">
                {comments.length ? (
                  comments.map((c) => (
                    <div
                      className={`comment ${c.parentId ? "comment-reply" : ""}`}
                      key={c.id}
                    >
                      <Avatar name={c.author.name} small />
                      <div>
                        <div className="comment-author">
                          <b>{c.author.name}</b>
                          <time>{formatDate(c.createdAt)}</time>
                        </div>
                        {c.parentId && (
                          <small className="reply-to">
                            回复{" "}
                            {comments.find((p) => p.id === c.parentId)?.author
                              .name || "此前的评论"}
                          </small>
                        )}
                        <p>{c.content}</p>
                        <button
                          onClick={() => {
                            if (!user) {
                              login();
                              return;
                            }
                            setReply(c);
                            document
                              .querySelector<HTMLTextAreaElement>(
                                ".comment-form textarea",
                              )
                              ?.focus();
                          }}
                        >
                          <Reply size={12} />
                          回复
                        </button>
                        {user &&
                          (user.id === c.author.id ||
                            user.role === "ADMIN") && (
                            <button onClick={() => void deleteComment(c)}>
                              <Trash2 size={12} />
                              删除
                            </button>
                          )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-comments">
                    <MessageSquare size={24} />
                    <p>讨论从你开始，写下第一条评论吧。</p>
                  </div>
                )}
              </div>
              {comments.length < commentTotal && (
                <button
                  className="button"
                  onClick={() => void loadComments()}
                  disabled={sending}
                >
                  加载更多评论
                </button>
              )}
            </section>
          )}
        </article>
        <aside className="article-aside">
          <div className="toc">
            <span className="eyebrow">ON THIS PAGE</span>
            <h3>阅读路线</h3>
            {headings.map((h, i) => (
              <button
                key={h}
                onClick={() => {
                  const el = document.querySelectorAll(".markdown-body h2")[i];
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {h}
              </button>
            ))}
            <a href="#comments">
              <MessageSquare size={14} />
              参与讨论
            </a>
          </div>
          <div className="reading-note">
            <BookIcon />
            <p>
              读完一篇，
              <br />
              离想做的事更近一点。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function CodeFooter() {
  return <span className="end-code">{"</>"}</span>;
}
function BookIcon() {
  return <span className="end-code">{"{ … }"}</span>;
}
