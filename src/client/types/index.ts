export interface Board {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  nsfw: number;
  max_threads: number;
  bump_limit: number;
  created_at: number;
}

export interface Thread {
  id: number;
  board_id: string;
  subject: string;
  sticky: number;
  locked: number;
  post_count: number;
  image_count: number;
  created_at: number;
  bumped_at: number;
}

export interface Post {
  id: number;
  thread_id: number;
  board_id: string;
  is_op: number;
  author_name: string;
  tripcode: string | null;
  poster_hash: string | null;
  comment: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_width: number | null;
  file_height: number | null;
  file_type: string | null;
  ip_hash: string | null;
  sage: number;
  created_at: number;
}

export interface ThreadWithOP extends Thread {
  op_post?: Post;
  recent_posts?: Post[];
}

export interface CatalogItem extends Thread {
  op_post?: Post;
}

export type ThemeName = 'yotsuba' | 'yotsuba-b';
