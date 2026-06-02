import {
  FileText,
  FolderTree,
  LayoutDashboard,
  List,
  Menu,
  PenSquare,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** 메뉴 테이블의 icon 문자열 → lucide 컴포넌트 매핑. 미등록 이름은 아이콘 없이 렌더된다. */
export const menuIcons: Record<string, LucideIcon> = {
  List,
  PenSquare,
  FolderTree,
  Menu,
  Shield,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
}

/** 메뉴 관리 폼에서 선택 가능한 아이콘 이름 목록. */
export const menuIconNames = Object.keys(menuIcons)
