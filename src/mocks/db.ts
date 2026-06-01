// 더미 데이터 저장소. localStorage 에 영속화되어 새로고침 후에도 CRUD 결과가 유지됩니다.
import type { Paginated, Post, PostInput, PostQuery, User } from '../types'

const USERS_KEY = 'mock_users'
const PWD_KEY = 'mock_passwords'
const POSTS_KEY = 'mock_posts'

type PasswordMap = Record<string, string>

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function nowIso(offsetMs = 0): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

function genId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return `${prefix}-${rnd}`
}

/** 최초 1회 더미 데이터를 시드합니다 (관리자 계정 + 샘플 게시글 23개). */
function ensureSeed(): void {
  if (localStorage.getItem(USERS_KEY)) return

  const admin: User = {
    id: 'u-1',
    username: 'admin',
    email: 'admin@example.com',
    createdAt: nowIso(),
  }
  write<User[]>(USERS_KEY, [admin])
  write<PasswordMap>(PWD_KEY, { admin: 'admin1234' })

  const posts: Post[] = Array.from({ length: 23 }, (_, i) => {
    const ts = nowIso((23 - i) * 3_600_000)
    return {
      id: `p-${i + 1}`,
      title: `샘플 게시글 ${i + 1}`,
      content: `<p>이것은 <b>${i + 1}</b>번째 더미 게시글입니다.</p><p>실제 API 연동 전 임시 데이터입니다.</p>`,
      authorId: admin.id,
      authorName: admin.username,
      createdAt: ts,
      updatedAt: ts,
    }
  })
  write<Post[]>(POSTS_KEY, posts)
}

ensureSeed()

export const db = {
  // ----- users -----
  getUsers: (): User[] => read<User[]>(USERS_KEY, []),
  findUserById: (id: string): User | null => db.getUsers().find((u) => u.id === id) ?? null,
  findUserByUsername: (username: string): User | null =>
    db.getUsers().find((u) => u.username === username) ?? null,
  checkPassword: (username: string, password: string): boolean =>
    read<PasswordMap>(PWD_KEY, {})[username] === password,
  createUser: (data: { username: string; email: string }, password: string): User => {
    const user: User = {
      id: genId('u'),
      username: data.username,
      email: data.email,
      createdAt: nowIso(),
    }
    write<User[]>(USERS_KEY, [...db.getUsers(), user])
    const pwds = read<PasswordMap>(PWD_KEY, {})
    pwds[data.username] = password
    write<PasswordMap>(PWD_KEY, pwds)
    return user
  },

  // ----- posts -----
  getPosts: (): Post[] => read<Post[]>(POSTS_KEY, []),
  getPost: (id: string): Post | null => db.getPosts().find((p) => p.id === id) ?? null,
  listPosts: ({ page = 1, pageSize = 10, search = '' }: PostQuery): Paginated<Post> => {
    let items = [...db.getPosts()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const q = search.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.replace(/<[^>]*>/g, '').toLowerCase().includes(q),
      )
    }
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  },
  createPost: (input: PostInput, author: User): Post => {
    const ts = nowIso()
    const post: Post = {
      id: genId('p'),
      title: input.title,
      content: input.content,
      authorId: author.id,
      authorName: author.username,
      createdAt: ts,
      updatedAt: ts,
    }
    write<Post[]>(POSTS_KEY, [post, ...db.getPosts()])
    return post
  },
  updatePost: (id: string, input: PostInput): Post => {
    const posts = db.getPosts()
    const idx = posts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('게시글을 찾을 수 없습니다.')
    const updated: Post = {
      ...posts[idx],
      title: input.title,
      content: input.content,
      updatedAt: nowIso(),
    }
    posts[idx] = updated
    write<Post[]>(POSTS_KEY, posts)
    return updated
  },
  deletePost: (id: string): void => {
    write<Post[]>(
      POSTS_KEY,
      db.getPosts().filter((p) => p.id !== id),
    )
  },
}
