import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Moon,
  Sun,
  PenLine,
  Menu,
  X,
  LogOut,
  FileText,
  Loader2,
} from "lucide-react";
import { api } from "./api";
import { demoPosts, demoCategories, demoTags } from "./data";
import type { Category, Tag, Post, User } from "./types";
import { Context, useBlog } from "./context";
import { Avatar, Brand, Modal } from "./components";
import Home from "./Home";
import Article from "./Article";
import Editor from "./Editor";
import { Archive, About, NotFound, MyPosts } from "./Pages";

export default function App() {
  const [posts, setPosts] = useState<Post[]>(demoPosts);
  const [total, setTotal] = useState(demoPosts.length);
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [tags, setTags] = useState<Tag[]>(demoTags);
  const [mode, setMode] = useState<"loading" | "live" | "demo">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState(false);
  const [search, setSearch] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("ecut-theme") === "dark",
  );
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const location = useLocation();
  function notify(message: string) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }
  async function refresh() {
    try {
      const [data, cats, ts, me] = await Promise.all([
        api<{ posts: Post[]; total: number }>("/posts?limit=50"),
        api<Category[]>("/categories"),
        api<Tag[]>("/tags"),
        api<User | null>("/auth/me"),
      ]);
      setPosts(data.posts);
      setTotal(data.total);
      setCategories(cats);
      setTags(ts);
      setUser(me);
      setMode("live");
    } catch {
      setMode("demo");
    }
  }
  useEffect(() => {
    void refresh();
    return () => clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("ecut-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      notify("已退出登录");
    } catch {
      notify("退出失败，请重试");
    }
  }
  return (
    <Context.Provider
      value={{
        posts,
        total,
        categories,
        tags,
        user,
        mode,
        login: () => setAuth(true),
        notify,
        refresh,
      }}
    >
      <a href="#main" className="skip-link">
        跳到正文
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="主导航" className={mobile ? "mobile-open" : ""}>
            <NavLink to="/" end>
              发现
              <span />
            </NavLink>
            <NavLink to="/categories">
              分类
              <span />
            </NavLink>
            <NavLink to="/archive">
              归档
              <span />
            </NavLink>
            <NavLink to="/about">
              关于计协
              <ArrowUpRight size={12} />
            </NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="header-search"
              onClick={() => setSearch(true)}
              aria-label="搜索文章"
            >
              <Search size={17} />
              <span>搜索文章</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="header-separator" />
            <button
              className="icon-button theme-toggle"
              onClick={() => setDark((v) => !v)}
              aria-label={dark ? "切换浅色模式" : "切换深色模式"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {user ? (
              <div className="user-dropdown">
                <Link to="/my-posts" title="我的文章">
                  <Avatar name={user.name} small />
                </Link>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="退出登录"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button className="login-link" onClick={() => setAuth(true)}>
                登录
              </button>
            )}
            <Link to="/write" className="button button-navy write-button">
              <PenLine size={15} />
              <span>写文章</span>
            </Link>
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobile((v) => !v)}
              aria-label="切换导航"
              aria-expanded={mobile}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Home categoryView />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/about" element={<About />} />
          <Route path="/write" element={<Editor key={location.pathname} />} />
          <Route
            path="/edit/:slug"
            element={<Editor key={location.pathname} />}
          />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Brand compact />
            <p>因热爱而相聚，因分享而成长。</p>
          </div>
          <div className="footer-links">
            <Link to="/about">
              关于我们
              <ArrowUpRight size={12} />
            </Link>
            <a
              href="https://github.com/DL-Association-for-Computing-Machinery/association-website/tree/feat-reconstruct-lxw"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <ArrowUpRight size={12} />
            </a>
            <Link to="/archive">
              文章归档
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <span className="footer-note">
            © {new Date().getFullYear()} ECUT 计算机协会
            <br />
            <small>Built with curiosity & a little bit of code.</small>
          </span>
        </div>
      </footer>
      {mode === "demo" && (
        <div
          className="demo-indicator"
          title="数据库未连接，当前展示示例文章；登录、评论及发布需要启动后端服务"
        >
          <span /> 示例预览
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {auth && <AuthModal close={() => setAuth(false)} onUser={setUser} />}
      {search && <SearchModal close={() => setSearch(false)} />}
    </Context.Provider>
  );
}
function AuthModal({
  close,
  onUser,
}: {
  close: () => void;
  onUser: (user: User) => void;
}) {
  const { mode, notify } = useBlog();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (mode !== "live") {
      setError(
        "当前为示例预览。请先按 README 启动 PostgreSQL 与后端服务，再登录或注册。",
      );
      return;
    }
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const user = await api<User>(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      onUser(user);
      notify(`欢迎你，${user.name}`);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={register ? "加入这场知识分享" : "欢迎回到计协"} close={close}>
      <p className="modal-intro">用热爱连接彼此，用文字记录成长。</p>
      <form className="stack-form" onSubmit={submit}>
        {register && (
          <label>
            你的名字
            <input
              name="name"
              required
              minLength={2}
              maxLength={30}
              placeholder="大家应该如何称呼你"
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          邮箱
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          密码
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            placeholder="至少 8 位字符"
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button button-navy full-width" disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} /> : null}
          {register ? "创建账号" : "登录"}
          <ArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        {register ? "已经有账号？" : "还没有账号？"}
        <button
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "去登录" : "注册加入"}
        </button>
      </p>
    </Modal>
  );
}
function SearchModal({ close }: { close: () => void }) {
  const { posts, mode } = useBlog();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState(posts),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (mode !== "live") {
        setResults(
          posts.filter((p) =>
            `${p.title} ${p.excerpt} ${p.tags.map((t) => t.name).join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          ),
        );
        return;
      }
      setLoading(true);
      setError("");
      api<{ posts: Post[] }>(
        `/posts?search=${encodeURIComponent(query)}&limit=20`,
      )
        .then((d) => {
          if (active) setResults(d.posts);
        })
        .catch(() => {
          if (active) setError("搜索失败，请稍后重试");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, mode, posts]);
  return (
    <Modal title="寻找一点灵感" close={close} wide>
      <div className="search-field">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索关键词"
          placeholder="搜索文章、技术或标签…"
          maxLength={100}
        />
        <kbd>ESC</kbd>
      </div>
      <p className="search-hint">
        {query ? `关于「${query}」的搜索结果` : "从最近的分享开始"}
      </p>
      <div className="search-results">
        {loading ? (
          <p>正在搜索…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : results.length ? (
          results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                navigate(`/article/${p.slug}`);
                close();
              }}
            >
              <FileText size={20} />
              <span>
                <b>{p.title}</b>
                <small>
                  {p.category.name} · {p.readingTime} 分钟阅读
                </small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))
        ) : (
          <p className="search-empty">没有找到相关文章，试试其他关键词。</p>
        )}
      </div>
    </Modal>
  );
}
