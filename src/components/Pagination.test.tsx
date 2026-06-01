import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination'

describe('<Pagination />', () => {
  it('페이지가 1개 이하면 렌더링하지 않는다', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('페이지 번호 클릭 시 onChange 가 호출된다', async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} totalPages={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
