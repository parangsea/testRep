import { http, HttpResponse, passthrough } from 'msw'
import type { z } from 'zod'
import { API_BASE_URL } from '../config'
import { db } from './db'
import { subFromToken } from './jwt'
import { categorySchema } from '../schemas/category.schema'
import { commentSchema } from '../schemas/comment.schema'
import { menuSchema } from '../schemas/menu.schema'
import type { CommentInput, User } from '../types'

const BASE = API_BASE_URL.replace(/\/$/, '')
const url = (path: string) => `${BASE}${path}`

const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Authorization 헤더에서 현재 사용자를 해석합니다. 미인증/만료 시 null. */
function currentUser(request: Request): User | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const uid = subFromToken(auth.slice(7))
  return uid ? db.findUserById(uid) : null
}

const unauthorized = () => HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
const forbidden = (msg = '권한이 없습니다.') => HttpResponse.json({ message: msg }, { status: 403 })

/** zod 검증 실패 → 첫 메시지로 400. 서버 경계에서 프런트와 동일한 입력 계약을 강제한다. */
const badRequest = (error: z.ZodError) =>
  HttpResponse.json({ message: error.issues[0]?.message ?? '잘못된 요청입니다.' }, { status: 400 })

/**
 * 요청 body 를 안전하게 JSON 파싱한다. 빈 body·malformed JSON 이면 예외 대신 null 을 반환해
 * 호출 측이 일관되게 400 으로 처리하도록 한다(파싱 단계에서 검증 경계가 깨지지 않게).
 */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 작성자 본인이거나 관리자면 수정/삭제 허용. */
const canModify = (user: User, ownerId: string) => user.id === ownerId || user.role === 'admin'

export const handlers = [
  // ----- auth (실서버 위임) -----
  // 하이브리드 연동: 인증은 실제 백엔드(testBoot)가 처리한다. MSW 는 가로채지 않고
  // Vite 프록시를 통해 그대로 통과시킨다(passthrough).
  http.post(url('/auth/login'), () => passthrough()),
  http.post(url('/auth/register'), () => passthrough()),
  http.get(url('/auth/me'), () => passthrough()),

  // ----- users (공개 프로필 + 통계) -----
  http.get(url('/users/:id'), async ({ params }) => {
    await delay()
    const profile = db.getUserProfile(String(params.id))
    if (!profile) return HttpResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    return HttpResponse.json(profile)
  }),

  // ----- menus (네비게이션 메뉴 테이블) -----
  // 전체 메뉴(+access)를 반환한다. "노출 권한 필터링"은 클라이언트(Navbar)가 canAccess 로,
  // "라우트 보호"는 MenuGuard 가 각 메뉴의 access 로 수행한다(가드가 항상 실제 access 를 알 수 있게).
  // 실제 데이터 접근 보안은 각 API 핸들러의 role 검사가 담당한다.
  http.get(url('/menus'), async () => {
    await delay()
    return HttpResponse.json(db.getMenus())
  }),

  http.post(url('/menus'), async ({ request }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 메뉴를 만들 수 있습니다.')
    const parsed = menuSchema.safeParse(await readJson(request))
    if (!parsed.success) return badRequest(parsed.error)
    return HttpResponse.json(db.createMenu(parsed.data), { status: 201 })
  }),

  // 순서 재배치 — 단일 원자적 요청. (':id' 라우트보다 먼저 등록해야 'reorder' 가 id 로 매칭되지 않는다)
  http.put(url('/menus/reorder'), async ({ request }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 메뉴 순서를 바꿀 수 있습니다.')
    const body = (await readJson(request)) as { orderedIds?: unknown } | null
    const ids = body?.orderedIds
    if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
      return HttpResponse.json({ message: 'orderedIds(문자열 배열)가 필요합니다.' }, { status: 400 })
    }
    // 부분/원자성 결함 방지: orderedIds 는 현재 메뉴 전체의 "순열"이어야 한다(중복·누락·미존재 거부).
    const current = db.getMenus().map((m) => m.id)
    const set = new Set(ids as string[])
    if (ids.length !== current.length || set.size !== ids.length || !current.every((id) => set.has(id))) {
      return HttpResponse.json(
        { message: 'orderedIds 는 현재 메뉴 전체의 순열이어야 합니다(중복·누락 불가).' },
        { status: 400 },
      )
    }
    return HttpResponse.json(db.reorderMenus(ids as string[]))
  }),

  http.put(url('/menus/:id'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 메뉴를 수정할 수 있습니다.')
    if (!db.getMenu(String(params.id)))
      return HttpResponse.json({ message: '메뉴를 찾을 수 없습니다.' }, { status: 404 })
    const parsed = menuSchema.safeParse(await readJson(request))
    if (!parsed.success) return badRequest(parsed.error)
    return HttpResponse.json(db.updateMenu(String(params.id), parsed.data))
  }),

  http.delete(url('/menus/:id'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 메뉴를 삭제할 수 있습니다.')
    if (!db.getMenu(String(params.id)))
      return HttpResponse.json({ message: '메뉴를 찾을 수 없습니다.' }, { status: 404 })
    db.deleteMenu(String(params.id))
    return new HttpResponse(null, { status: 204 })
  }),

  // ----- categories -----
  http.get(url('/categories'), async () => {
    await delay()
    return HttpResponse.json(db.getCategories())
  }),

  http.post(url('/categories'), async ({ request }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 카테고리를 만들 수 있습니다.')
    const parsed = categorySchema.safeParse(await readJson(request))
    if (!parsed.success) return badRequest(parsed.error)
    try {
      return HttpResponse.json(db.createCategory(parsed.data), { status: 201 })
    } catch (e) {
      return HttpResponse.json({ message: (e as Error).message }, { status: 409 })
    }
  }),

  http.delete(url('/categories/:id'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'admin') return forbidden('관리자만 카테고리를 삭제할 수 있습니다.')
    if (!db.getCategory(String(params.id)))
      return HttpResponse.json({ message: '카테고리를 찾을 수 없습니다.' }, { status: 404 })
    try {
      db.deleteCategory(String(params.id))
      return new HttpResponse(null, { status: 204 })
    } catch (e) {
      return HttpResponse.json({ message: (e as Error).message }, { status: 409 })
    }
  }),

  // ----- posts (실서버 위임) -----
  // 게시글 CRUD/목록은 실제 백엔드가 처리한다(passthrough).
  // '/posts/:id/comments' 는 세그먼트 수가 달라 아래 댓글 핸들러가 계속 가로챈다(댓글은 목 유지).
  http.get(url('/posts'), () => passthrough()),
  http.post(url('/posts'), () => passthrough()),
  http.get(url('/posts/:id'), () => passthrough()),
  http.put(url('/posts/:id'), () => passthrough()),
  http.delete(url('/posts/:id'), () => passthrough()),

  // ----- comments -----
  http.get(url('/posts/:id/comments'), async ({ params }) => {
    await delay()
    // 하이브리드: 게시글은 실서버에 있으므로 목 DB 존재 검사를 생략한다.
    // 해당 글의 (목)댓글이 없으면 빈 배열을 반환해 상세 페이지가 깨지지 않게 한다.
    return HttpResponse.json(db.listComments(String(params.id)))
  }),

  http.post(url('/posts/:id/comments'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    const post = db.getPost(String(params.id))
    if (!post) return HttpResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    const body = ((await readJson(request)) ?? {}) as Partial<CommentInput>
    const parsed = commentSchema.safeParse({ content: body?.content })
    if (!parsed.success) return badRequest(parsed.error)
    // parentId 는 문자열(대댓글) 또는 생략/null(최상위)만 허용 — 숫자/객체/불리언 등은 거부해 계약을 결정적으로.
    const parentId = body?.parentId
    if (parentId != null && typeof parentId !== 'string') {
      return HttpResponse.json({ message: 'parentId 는 문자열이거나 생략해야 합니다.' }, { status: 400 })
    }
    try {
      const input: CommentInput = { content: parsed.data.content, parentId: parentId ?? null }
      return HttpResponse.json(db.createComment(post.id, input, user), { status: 201 })
    } catch (e) {
      return HttpResponse.json({ message: (e as Error).message }, { status: 400 })
    }
  }),

  http.put(url('/comments/:id'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    const comment = db.getComment(String(params.id))
    if (!comment) return HttpResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 })
    if (!canModify(user, comment.authorId)) return forbidden('수정 권한이 없습니다.')
    const parsed = commentSchema.safeParse(await readJson(request))
    if (!parsed.success) return badRequest(parsed.error)
    return HttpResponse.json(db.updateComment(comment.id, parsed.data.content))
  }),

  http.delete(url('/comments/:id'), async ({ request, params }) => {
    await delay()
    const user = currentUser(request)
    if (!user) return unauthorized()
    const comment = db.getComment(String(params.id))
    if (!comment) return HttpResponse.json({ message: '댓글을 찾을 수 없습니다.' }, { status: 404 })
    if (!canModify(user, comment.authorId)) return forbidden('삭제 권한이 없습니다.')
    db.deleteComment(comment.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
