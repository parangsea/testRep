import { Mail, Shield, User as UserIcon } from 'lucide-react'
import Modal from './Modal'
import { useUserProfileQuery } from '../hooks/useUser'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/error'
import styles from './UserProfileModal.module.css'

interface UserProfileModalProps {
  /** 표시할 유저 id. null 이면 모달이 닫혀 있다. */
  userId: string | null
  onClose: () => void
}

/** 작성자 이름 클릭 시 뜨는 유저 정보 모달. 공개 프로필 + 활동 통계를 보여준다. */
export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const { data: profile, isLoading, isError, error } = useUserProfileQuery(userId, Boolean(userId))

  return (
    <Modal open={Boolean(userId)} onClose={onClose} title="사용자 정보">
      {isLoading && <p className="muted">불러오는 중...</p>}
      {isError && <p className="error-text">{getErrorMessage(error)}</p>}
      {profile && (
        <div className={styles.profile}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              <UserIcon size={22} />
            </span>
            <div>
              <div className={styles.name}>
                {profile.username}
                {profile.role === 'admin' && (
                  <span className={styles.adminBadge}>
                    <Shield size={12} /> 관리자
                  </span>
                )}
              </div>
              <div className={`muted ${styles.email}`}>
                <Mail size={13} /> {profile.email}
              </div>
            </div>
          </div>

          <dl className={styles.stats}>
            <div>
              <dt>작성 글</dt>
              <dd>{profile.postCount}</dd>
            </div>
            <div>
              <dt>작성 댓글</dt>
              <dd>{profile.commentCount}</dd>
            </div>
            <div>
              <dt>가입일</dt>
              <dd>{profile.createdAt ? formatDate(profile.createdAt) : '-'}</dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  )
}
