import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('ko')

/** ISO 문자열 -> 'YYYY-MM-DD HH:mm' */
export function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

/** ISO 문자열 -> '3시간 전' 형태의 상대 시간 */
export function fromNow(iso: string): string {
  return dayjs(iso).fromNow()
}
