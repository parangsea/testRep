import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('open=false 면 아무것도 렌더하지 않는다', () => {
    render(
      <Modal open={false} onClose={() => {}} title="제목">
        <p>본문</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('open=true 면 제목과 children 을 렌더한다', () => {
    render(
      <Modal open onClose={() => {}} title="사용자 정보">
        <p>본문 내용</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('사용자 정보')).toBeInTheDocument()
    expect(screen.getByText('본문 내용')).toBeInTheDocument()
  })

  it('닫기 버튼 클릭 시 onClose 를 호출한다', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="제목">
        <p>본문</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('닫기'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ESC 키 입력 시 onClose 를 호출한다', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="제목">
        <p>본문</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
