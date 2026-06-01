import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../config'
import { db } from './db'
import { signMockJwt, subFromToken } from './jwt'
import type { LoginPayload, PostInput, RegisterPayload } from '../types'

const BASE = API_BASE_URL.replace(/\/$/, '')
const url = (path: string) => `${BASE}${path}`

const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Authorization 헤더에서 현재 사용자 id 를 추출합니다. */
function currentUserId(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return subFromToken(auth.slice(7))
}

export const handlers = [
  // ----- auth -----
  http.post(url('/auth/login'), async ({ request }) => {
    await delay()
    const { username, password } = (await request.json()) as LoginPayload
    const user = db.findUserByUsername(username)
    if (!user || !db.checkPassword(username, password)) {
      return HttpResponse.json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }
    return HttpResponse.json({ token: signMockJwt(user), user })
  }),

  http.post(url('/auth/register'), async ({ request }) => {
    await delay()
    const { username, email, password } = (await request.json()) as RegisterPayload
    if (db.findUserByUsername(username)) {
      return HttpResponse.json({ message: '이미 사용 중인 아이디입니다.' }, { status: 409 })
    }
    const user = db.createUser({ username, email }, password)
    return HttpResponse.json({ token: signMockJwt(user), user }, { status: 201 })
  }),

  http.get(url('/auth/me'), ({ request }) => {
    const uid = currentUserId(request)
    const user = uid ? db.findUserById(uid) : null
    if (!user) return HttpResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
    return HttpResponse.json(user)
  }),

  // ----- posts -----
  http.get(url('/posts'), async ({ request }) => {
    await delay()
    const u = new URL(request.url)
    return HttpResponse.json(
      db.listPosts({
        page: Number(u.searchParams.get('page') ?? '1') || 1,
        pageSize: Number(u.searchParams.get('pageSize') ?? '10') || 10,
        search: u.searchParams.get('search') ?? '',
      }),
    )
  }),

  http.get(url('/posts/:id'), async ({ params }) => {
    await delay()
    const post = db.getPost(String(params.id))
    if (!post) return HttpResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    return HttpResponse.json(post)
  }),

  http.post(url('/posts'), async ({ request }) => {
    await delay()
    const uid = currentUserId(request)
    const user = uid ? db.findUserById(uid) : null
    if (!user) return HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
    const input = (await request.json()) as PostInput
    return HttpResponse.json(db.createPost(input, user), { status: 201 })
  }),

  http.put(url('/posts/:id'), async ({ request, params }) => {
    await delay()
    const uid = currentUserId(request)
    const user = uid ? db.findUserById(uid) : null
    if (!user) return HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
    const post = db.getPost(String(params.id))
    if (!post) return HttpResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    if (post.authorId !== user.id)
      return HttpResponse.json({ message: '수정 권한이 없습니다.' }, { status: 403 })
    const input = (await request.json()) as PostInput
    return HttpResponse.json(db.updatePost(post.id, input))
  }),

  http.delete(url('/posts/:id'), async ({ request, params }) => {
    await delay()
    const uid = currentUserId(request)
    const user = uid ? db.findUserById(uid) : null
    if (!user) return HttpResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
    const post = db.getPost(String(params.id))
    if (!post) return HttpResponse.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    if (post.authorId !== user.id)
      return HttpResponse.json({ message: '삭제 권한이 없습니다.' }, { status: 403 })
    db.deletePost(post.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
