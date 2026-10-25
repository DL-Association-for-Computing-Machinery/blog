import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Clock3,
  Code2,
  GitBranch,
  Terminal,
  X,
  Sparkles,
} from "lucide-react";
import type { Post } from "./types";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="ECUT 计协博客首页">
      <img
        className="brand-logo"
        src="/association-logo.png"
        alt=""
        width={36}
        height={36}
      />
      <span>
        ECUT<span className="brand-divider">/</span>
        <span className="brand-cn">计协博客</span>
        {!compact && <small>COMPUTER ASSOCIATION</small>}
      </span>
    </Link>
  );
}
export function Modal({
  children,
  title,
  close,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,button,textarea,a")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function keys(e: React.KeyboardEvent) {
    if (e.key === "Escape") close();
    if (e.key !== "Tab") return;
    const nodes = [
      ...(ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a,input,textarea,select,[tabindex="0"]',
      ) || []),
    ];
    const first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={keys}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="关闭">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const hue = [...name].reduce((sum, s) => sum + s.charCodeAt(0), 0) % 360;
  return (
    <span
      className={`avatar ${small ? "small" : ""}`}
      style={{
        background: `hsl(${hue} 40% 89%)`,
        color: `hsl(${hue} 35% 28%)`,
      }}
    >
      {name.replace("同学", "")[0]}
    </span>
  );
}
export function ArticleArt({
  kind,
  compact = false,
}: {
  kind: string;
  compact?: boolean;
}) {
  if (kind === "react")
    return (
      <div
        className={`article-art art-react ${compact ? "compact" : ""}`}
        aria-hidden="true"
      >
        <div className="art-grid" />
        <div className="art-label">BUILD SOMETHING GREAT.</div>
        <svg className="react-atom" viewBox="-120 -110 240 220">
          <g fill="none" stroke="currentColor" strokeWidth="3">
            <ellipse rx="103" ry="39" />
            <ellipse rx="103" ry="39" transform="rotate(60)" />
            <ellipse rx="103" ry="39" transform="rotate(120)" />
          </g>
          <circle r="10" fill="currentColor" />
        </svg>
        <span className="art-caption">
          React<span>⌘</span>
        </span>
        <span className="art-index">01 / FRONTEND</span>
        <div className="art-code">
          <i /> index.tsx <span>TS</span>
        </div>
      </div>
    );
  if (kind === "algorithm")
    return (
      <div className="article-art art-algorithm" aria-hidden="true">
        <div className="art-grid" />
        <span className="art-label">THINK. SOLVE. REPEAT.</span>
        <span className="algo-equation">
          dp<span>[i]</span>
        </span>
        <div className="algo-nodes">
          <i>0</i>
          <b>→</b>
          <i>1</i>
          <b>→</b>
          <i>1</i>
          <b>→</b>
          <i>2</i>
          <b>→</b>
          <i>3</i>
          <b>→</b>
          <i>5</i>
        </div>
        <span className="art-index">02 / ALGORITHMS</span>
        <span className="art-corner">f(n) = f(n−1) + f(n−2)</span>
      </div>
    );
  if (kind === "terminal")
    return (
      <div className="article-art art-terminal" aria-hidden="true">
        <div className="tiny-terminal">
          <div className="window-dots">
            <i />
            <i />
            <i />
            <span>~/learning/linux</span>
          </div>
          <p>
            <b>➜</b> <em>~</em> whoami
          </p>
          <p className="terminal-response">a curious developer_</p>
          <p>
            <b>➜</b> <em>~</em> echo "Hello, Linux"
          </p>
          <p className="terminal-response">
            Hello, Linux <span className="cursor">▍</span>
          </p>
        </div>
        <span className="art-index">03 / DEVELOPER TOOLS</span>
        <Terminal className="terminal-watermark" size={110} />
      </div>
    );
  if (kind === "database")
    return (
      <div className="article-art art-database" aria-hidden="true">
        <div className="art-grid" />
        <span className="art-label">EVERYTHING IS CONNECTED.</span>
        <div className="schema-art">
          <span>
            <b>Post</b>
            <small>id · title · authorId</small>
          </span>
          <i>⟷</i>
          <span>
            <b>Tag</b>
            <small>id · name · slug</small>
          </span>
        </div>
        <span className="art-caption">
          Prisma <span>× PostgreSQL</span>
        </span>
        <span className="art-index">04 / BACKEND</span>
      </div>
    );
  if (kind === "git")
    return (
      <div className="article-art art-git" aria-hidden="true">
        <span className="art-label">BETTER, TOGETHER.</span>
        <GitBranch className="git-art" strokeWidth={1.1} />
        <div className="git-words">
          git commit
          <br />
          <span>-m "hello team"</span>
        </div>
        <span className="art-index">05 / OPEN SOURCE</span>
      </div>
    );
  return (
    <div className="article-art art-community" aria-hidden="true">
      <div className="art-grid" />
      <span className="art-label">MADE OF CURIOUS MINDS.</span>
      <div className="community-art">
        <Code2 />
        <span>
          HELLO,
          <br />
          BUILDERS<span className="orange">.</span>
        </span>
        <Sparkles />
      </div>
      <span className="art-index">06 / COMMUNITY</span>
    </div>
  );
}
export function BookmarkButton({
  post,
  saved,
  onSave,
}: {
  post: Post;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <button
      className={`icon-button save-button ${saved ? "saved" : ""}`}
      aria-label={saved ? `取消收藏：${post.title}` : `收藏：${post.title}`}
      aria-pressed={saved}
      onClick={() => onSave(post.id)}
    >
      <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
export function PostCard({
  post,
  saved,
  onSave,
  featured = false,
}: {
  post: Post;
  saved: boolean;
  onSave: (id: string) => void;
  featured?: boolean;
}) {
  return (
    <article className={`post-card ${featured ? "featured-card" : ""}`}>
      <Link
        to={`/article/${post.slug}`}
        className="card-art-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        {post.coverUrl ? (
          <img className="cover-image" src={post.coverUrl} alt="" />
        ) : (
          <ArticleArt kind={post.visual} />
        )}
      </Link>
      <div className="post-card-body">
        <div className="card-topline">
          <span className={`category-label cat-${post.category.slug}`}>
            {post.category.name}
          </span>
          {featured && (
            <span className="featured-label">
              <Sparkles size={12} /> 编辑精选
            </span>
          )}
          <BookmarkButton post={post} saved={saved} onSave={onSave} />
        </div>
        <Link className="post-title" to={`/article/${post.slug}`}>
          <h3>{post.title}</h3>
          <ArrowUpRight size={20} />
        </Link>
        <p className="post-excerpt">{post.excerpt}</p>
        <div className="card-tags">
          {post.tags.slice(0, 3).map((t) => (
            <Link to={`/?tag=${encodeURIComponent(t.slug)}`} key={t.id}>
              # {t.name}
            </Link>
          ))}
        </div>
        <div className="card-meta">
          <span>
            <Avatar name={post.author.name} small />
            {post.author.name}
          </span>
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          <span className="read-time">
            <Clock3 size={12} />
            {post.readingTime} 分钟
          </span>
        </div>
      </div>
    </article>
  );
}
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(new Date(date))
    .replaceAll("/", ".");
export function EmptyState({
  title = "还没有找到相关文章",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Code2 size={35} />
      <h3>{title}</h3>
      <p>换个关键词，或去其他分类里逛逛。</p>
      {children}
    </div>
  );
}
export function TextArrow({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={15} />
    </>
  );
}
