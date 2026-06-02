// 더미 데이터 저장소. localStorage 에 영속화되어 새로고침 후에도 CRUD 결과가 유지됩니다.
// 권한 검사는 여기서 하지 않습니다(핸들러가 인증/권한을 책임짐) — db 는 순수 저장소 역할.
import type {
  Category,
  CategoryInput,
  Comment,
  CommentInput,
  MenuItem,
  MenuInput,
  Paginated,
  Post,
  PostInput,
  PostQuery,
  User,
  UserProfile,
} from '../types'

const VERSION_KEY = 'mock_schema_version'
const SCHEMA_VERSION = '3' // 스키마(역할/카테고리/댓글/메뉴) 도입 → 버전 불일치 시 더미 데이터 재시드
const USERS_KEY = 'mock_users'
const PWD_KEY = 'mock_passwords'
const POSTS_KEY = 'mock_posts'
const CATEGORIES_KEY = 'mock_categories'
const COMMENTS_KEY = 'mock_comments'
const MENUS_KEY = 'mock_menus'

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

/**
 * 최초 1회(또는 스키마 버전 변경 시) 더미 데이터를 시드합니다.
 * 관리자 1 + 일반 유저 1, 카테고리 3종, 샘플 게시글 23개(카테고리 분산), 샘플 댓글/대댓글.
 */
function ensureSeed(): void {
  if (localStorage.getItem(VERSION_KEY) === SCHEMA_VERSION) return

  // 버전 불일치 → 구 스키마 데이터를 비우고 재시드(더미 데이터이므로 안전).
  for (const k of [USERS_KEY, PWD_KEY, POSTS_KEY, CATEGORIES_KEY, COMMENTS_KEY, MENUS_KEY]) {
    localStorage.removeItem(k)
  }

  const admin: User = {
    id: 'u-1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: nowIso(),
  }
  const member: User = {
    id: 'u-2',
    username: 'user',
    email: 'user@example.com',
    role: 'user',
    createdAt: nowIso(),
  }
  write<User[]>(USERS_KEY, [admin, member])
  write<PasswordMap>(PWD_KEY, { admin: 'admin1234', user: 'user1234' })

  const categories: Category[] = [
    { id: 'c-notice', slug: 'notice', name: '공지사항', order: 1 },
    { id: 'c-free', slug: 'free', name: '자유게시판', order: 2 },
    { id: 'c-qna', slug: 'qna', name: '질문답변', order: 3 },
  ]
  write<Category[]>(CATEGORIES_KEY, categories)

  const authors = [admin, member]
  const posts: Post[] = Array.from({ length: 23 }, (_, i) => {
    const ts = nowIso((23 - i) * 3_600_000)
    const cat = categories[i % categories.length]
    const author = authors[i % authors.length]
    return {
      id: `p-${i + 1}`,
      title: `[${cat.name}] 샘플 게시글 ${i + 1}`,
      content: `<p>이것은 <b>${i + 1}</b>번째 더미 게시글입니다.</p><p>실제 API 연동 전 임시 데이터입니다.</p>`,
      authorId: author.id,
      authorName: author.username,
      categoryId: cat.id,
      categoryName: cat.name,
      createdAt: ts,
      updatedAt: ts,
    }
  })
  write<Post[]>(POSTS_KEY, posts)

  const c1 = nowIso(50 * 60_000)
  const comments: Comment[] = [
    {
      id: 'cm-1',
      postId: 'p-1',
      parentId: null,
      authorId: member.id,
      authorName: member.username,
      content: '첫 댓글입니다. 좋은 글 감사합니다!',
      createdAt: c1,
      updatedAt: c1,
    },
    {
      id: 'cm-2',
      postId: 'p-1',
      parentId: 'cm-1',
      authorId: admin.id,
      authorName: admin.username,
      content: '읽어주셔서 감사합니다. (대댓글 예시)',
      createdAt: nowIso(40 * 60_000),
      updatedAt: nowIso(40 * 60_000),
    },
  ]
  write<Comment[]>(COMMENTS_KEY, comments)

  // 네비게이션 메뉴(메뉴 테이블) — 권한별. Navbar 와 라우트 가드가 이 테이블로 동적 구동된다.
  // (참고) VERSION_KEY 는 raw 문자열로 저장/비교한다 — write()(JSON 직렬화)를 쓰면 "\"3\"" 가 저장되어
  // 매 부팅마다 버전 불일치로 재시드되며 사용자 데이터가 소실되므로 절대 write() 를 쓰지 않는다.
  const menus: MenuItem[] = [
    { id: 'm-board', label: '게시판', path: '/posts', icon: 'List', order: 1, access: 'public' },
    { id: 'm-write', label: '글쓰기', path: '/posts/new', icon: 'PenSquare', order: 2, access: 'auth' },
    {
      id: 'm-cat',
      label: '카테고리 관리',
      path: '/admin/categories',
      icon: 'FolderTree',
      order: 3,
      access: 'admin',
    },
    {
      id: 'm-menu',
      label: '메뉴 관리',
      path: '/admin/menus',
      icon: 'Menu',
      order: 4,
      access: 'admin',
    },
  ]
  write<MenuItem[]>(MENUS_KEY, menus)

  localStorage.setItem(VERSION_KEY, SCHEMA_VERSION) // raw 저장 — 가드의 raw getItem 비교와 대칭
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
      role: 'user', // 신규 가입은 항상 일반 유저. admin 승격은 별도(여기선 시드 admin 만).
      createdAt: nowIso(),
    }
    write<User[]>(USERS_KEY, [...db.getUsers(), user])
    const pwds = read<PasswordMap>(PWD_KEY, {})
    pwds[data.username] = password
    write<PasswordMap>(PWD_KEY, pwds)
    return user
  },
  /** 공개 프로필 + 활동 통계(유저 정보 모달용). */
  getUserProfile: (id: string): UserProfile | null => {
    const user = db.findUserById(id)
    if (!user) return null
    const postCount = db.getPosts().filter((p) => p.authorId === id).length
    const commentCount = db.getComments().filter((c) => c.authorId === id).length
    return { ...user, postCount, commentCount }
  },

  // ----- categories -----
  getCategories: (): Category[] =>
    [...read<Category[]>(CATEGORIES_KEY, [])].sort((a, b) => a.order - b.order),
  getCategory: (id: string): Category | null =>
    db.getCategories().find((c) => c.id === id) ?? null,
  findCategoryBySlug: (slug: string): Category | null =>
    db.getCategories().find((c) => c.slug === slug) ?? null,
  createCategory: (input: CategoryInput): Category => {
    const existing = db.getCategories()
    if (existing.some((c) => c.slug === input.slug)) {
      throw new Error('이미 존재하는 slug 입니다.')
    }
    const order = existing.reduce((max, c) => Math.max(max, c.order), 0) + 1
    const category: Category = { id: genId('c'), slug: input.slug, name: input.name, order }
    write<Category[]>(CATEGORIES_KEY, [...existing, category])
    return category
  },
  deleteCategory: (id: string): void => {
    const used = db.getPosts().some((p) => p.categoryId === id)
    if (used) throw new Error('게시글이 있는 카테고리는 삭제할 수 없습니다.')
    write<Category[]>(
      CATEGORIES_KEY,
      db.getCategories().filter((c) => c.id !== id),
    )
  },

  // ----- posts -----
  getPosts: (): Post[] => read<Post[]>(POSTS_KEY, []),
  getPost: (id: string): Post | null => db.getPosts().find((p) => p.id === id) ?? null,
  listPosts: ({ page = 1, pageSize = 10, search = '', categoryId }: PostQuery): Paginated<Post> => {
    let items = [...db.getPosts()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (categoryId) items = items.filter((p) => p.categoryId === categoryId)
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
    const category = db.getCategory(input.categoryId)
    if (!category) throw new Error('존재하지 않는 카테고리입니다.')
    const ts = nowIso()
    const post: Post = {
      id: genId('p'),
      title: input.title,
      content: input.content,
      authorId: author.id,
      authorName: author.username,
      categoryId: category.id,
      categoryName: category.name,
      createdAt: ts,
      updatedAt: ts,
    }
    write<Post[]>(POSTS_KEY, [post, ...db.getPosts()])
    return post
  },
  updatePost: (id: string, input: PostInput): Post => {
    const category = db.getCategory(input.categoryId)
    if (!category) throw new Error('존재하지 않는 카테고리입니다.')
    const posts = db.getPosts()
    const idx = posts.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('게시글을 찾을 수 없습니다.')
    const updated: Post = {
      ...posts[idx],
      title: input.title,
      content: input.content,
      categoryId: category.id,
      categoryName: category.name,
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
    // 게시글 삭제 시 해당 게시글의 댓글도 함께 정리(고아 댓글 방지).
    write<Comment[]>(
      COMMENTS_KEY,
      db.getComments().filter((c) => c.postId !== id),
    )
  },

  // ----- comments -----
  getComments: (): Comment[] => read<Comment[]>(COMMENTS_KEY, []),
  getComment: (id: string): Comment | null => db.getComments().find((c) => c.id === id) ?? null,
  /** 한 게시글의 모든 댓글(최상위+대댓글)을 작성순(오래된→최신)으로 평면 반환. 트리 구성은 클라이언트가. */
  listComments: (postId: string): Comment[] =>
    db
      .getComments()
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  createComment: (postId: string, input: CommentInput, author: User): Comment => {
    // 대댓글이면 부모 검증: 같은 게시글의 "최상위" 댓글에만 달 수 있다(2단계 스레드 유지).
    let parentId: string | null = null
    if (input.parentId) {
      const parent = db.getComment(input.parentId)
      if (!parent || parent.postId !== postId) throw new Error('부모 댓글을 찾을 수 없습니다.')
      if (parent.parentId) throw new Error('대댓글에는 다시 답글을 달 수 없습니다.')
      parentId = parent.id
    }
    const ts = nowIso()
    const comment: Comment = {
      id: genId('cm'),
      postId,
      parentId,
      authorId: author.id,
      authorName: author.username,
      content: input.content,
      createdAt: ts,
      updatedAt: ts,
    }
    write<Comment[]>(COMMENTS_KEY, [...db.getComments(), comment])
    return comment
  },
  updateComment: (id: string, content: string): Comment => {
    const comments = db.getComments()
    const idx = comments.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('댓글을 찾을 수 없습니다.')
    const updated: Comment = { ...comments[idx], content, updatedAt: nowIso() }
    comments[idx] = updated
    write<Comment[]>(COMMENTS_KEY, comments)
    return updated
  },
  deleteComment: (id: string): void => {
    // 최상위 댓글 삭제 시 그 대댓글들도 함께 삭제(cascade).
    write<Comment[]>(
      COMMENTS_KEY,
      db.getComments().filter((c) => c.id !== id && c.parentId !== id),
    )
  },

  // ----- menus (네비게이션 메뉴 테이블) -----
  getMenus: (): MenuItem[] =>
    [...read<MenuItem[]>(MENUS_KEY, [])].sort((a, b) => a.order - b.order),
  getMenu: (id: string): MenuItem | null => db.getMenus().find((m) => m.id === id) ?? null,
  createMenu: (input: MenuInput): MenuItem => {
    const existing = db.getMenus()
    const order = input.order ?? existing.reduce((max, m) => Math.max(max, m.order), 0) + 1
    const menu: MenuItem = {
      id: genId('m'),
      label: input.label,
      path: input.path,
      icon: input.icon || undefined,
      access: input.access,
      order,
    }
    write<MenuItem[]>(MENUS_KEY, [...existing, menu])
    return menu
  },
  updateMenu: (id: string, input: MenuInput): MenuItem => {
    const menus = db.getMenus()
    const idx = menus.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('메뉴를 찾을 수 없습니다.')
    const updated: MenuItem = {
      ...menus[idx],
      label: input.label,
      path: input.path,
      icon: input.icon || undefined,
      access: input.access,
      ...(input.order != null && { order: input.order }),
    }
    menus[idx] = updated
    write<MenuItem[]>(MENUS_KEY, menus)
    return updated
  },
  deleteMenu: (id: string): void => {
    write<MenuItem[]>(
      MENUS_KEY,
      db.getMenus().filter((m) => m.id !== id),
    )
  },
  /** 주어진 id 순서대로 order 를 1..N 으로 재배치한다(원자적 단일 쓰기 — 부분 적용/중복 order 방지). */
  reorderMenus: (orderedIds: string[]): MenuItem[] => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]))
    const next = db.getMenus().map((m) => (orderMap.has(m.id) ? { ...m, order: orderMap.get(m.id)! } : m))
    write<MenuItem[]>(MENUS_KEY, next)
    return db.getMenus()
  },
}
