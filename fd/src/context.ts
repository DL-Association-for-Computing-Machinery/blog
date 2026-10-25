import { createContext, useContext } from "react";
import type { Post, Category, Tag, User } from "./types";
export interface BlogContext {
  posts: Post[];
  total: number;
  categories: Category[];
  tags: Tag[];
  user: User | null;
  mode: "loading" | "live" | "demo";
  login: () => void;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
}
export const Context = createContext<BlogContext>(null!);
export const useBlog = () => useContext(Context);
