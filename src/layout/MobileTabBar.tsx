import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, LineChartOutlined, HeartOutlined, CompassOutlined, AimOutlined, IdcardOutlined
} from '@ant-design/icons'

// 手机端底部 Tab（对应开发方案「响应式：手机左栏变底部 Tab Bar」）
const tabs = [
  { key: '/', label: '驾驶舱', icon: DashboardOutlined },
  { key: '/m/A', label: '学业', icon: LineChartOutlined },
  { key: '/m/B', label: '身心', icon: HeartOutlined },
  { key: '/m/E', label: '升学', icon: CompassOutlined },
  { key: '/m/I', label: '规划', icon: AimOutlined },
  { key: '/m/G', label: '档案', icon: IdcardOutlined }
]

export default function MobileTabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (key: string) => (key === '/' ? location.pathname === '/' : location.pathname.startsWith(key))

  return (
    <div className="wb-tabbar">
      {tabs.map((t) => {
        const Icon = t.icon
        const active = isActive(t.key)
        return (
          <div
            key={t.key}
            className={`wb-tabbar-item${active ? ' active' : ''}`}
            onClick={() => navigate(t.key)}
          >
            <span className="wb-tab-icon"><Icon /></span>
            <span>{t.label}</span>
          </div>
        )
      })}
    </div>
  )
}
