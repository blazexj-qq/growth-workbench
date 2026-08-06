import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardOutlined } from '@ant-design/icons'
import { groups, getModule } from '../data/modules'
import { useAppStore } from '../store/useAppStore'

const { Sider } = Layout

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.collapsed)
  const toggle = useAppStore((s) => s.toggleCollapsed)
  const dark = useAppStore((s) => s.dark)
  const navigate = useNavigate()
  const location = useLocation()

  // 首页入口（成长驾驶舱），独立于分组，始终可点击回到首页
  const homeItem = { key: '/', icon: <DashboardOutlined />, label: '成长驾驶舱' }

  const items = [
    homeItem,
    ...groups
      .filter((g) => g.modules.length > 0)
      .map((g) => ({
        key: g.key,
        label: g.label,
        type: 'group' as const,
        children: g.modules.map((id) => {
          const m = getModule(id)!
          const Icon = m.icon
          return { key: `/m/${id}`, icon: <Icon />, label: m.name }
        })
      }))
  ]

  const activeKey = location.pathname === '/'
    ? ['/']
    : (location.pathname.startsWith('/m/') ? [location.pathname] : [])
  const openKey = groups.find((g) => g.modules.some((id) => location.pathname === `/m/${id}`))?.key

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={toggle}
      width={228}
      collapsedWidth={72}
      theme={dark ? 'dark' : 'light'}
      style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto', borderRight: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: collapsed ? 0 : '0 18px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontWeight: 700,
          fontSize: 15,
          color: '#0EA5A4',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}
      >
        <span style={{ fontSize: 20 }}>🌱</span>
        {!collapsed && '成长·升学工作台'}
      </div>
      <Menu
        theme={dark ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={activeKey}
        defaultOpenKeys={openKey ? [openKey] : []}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}
