export interface Author {
  id: string;
  name: string;
  role?: string;
}
export interface Category {
  id: string;
  slug: string;
  name: string;
  count?: number;
}
export interface Tag {
  id: string;
  slug: string;
  name: string;
  count?: number;
}
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  category: Category;
  tags: Tag[];
  author: Author;
  publishedAt: string;
  createdAt?: string;
  visual: string;
  featured: boolean;
  readingTime: number;
  commentCount: number;
  coverUrl?: string;
  status?: string;
}
export interface Comment {
  id: string;
  content: string;
  author: Author;
  parentId: string | null;
  createdAt: string;
}
export interface User extends Author {
  email: string;
}
