import { Layout, Input, Badge, Button, Avatar, Tag, Tooltip, Popover, List, Empty, Modal, Alert, App } from 'antd'
import { SearchOutlined, BellOutlined, RobotOutlined, SunOutlined, MoonOutlined, SettingOutlined, CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, type AlertItem } from '../store/useAppStore'
import AiCoachDrawer from '../components/AiCoachDrawer'
import { getModule } from '../data/modules'

const { Header } = Layout

const levelColor: Record<string, string> = { urgent: 'red', warning: 'orange', info: 'blue' }
const levelLabel: Record<string, string> = { urgent: '紧急', warning: '重点', info: '提示' }

export default function HeaderBar({ isMobile }: { isMobile: boolean }) {
  const child = useAppStore((s) => s.child)
  const dark = useAppStore((s) => s.dark)
  const toggleDark = useAppStore((s) => s.toggleDark)
  const alerts = useAppStore((s) => s.alerts)
  const markAlertRead = useAppStore((s) => s.markAlertRead)
  const markAllAlertsRead = useAppStore((s) => s.markAllAlertsRead)
  const [aiOpen, setAiOpen] = useState(false)
  const [selected, setSelected] = useState<AlertItem | null>(null)
  const navigate = useNavigate()
  const { message: msg } = App.useApp()

  // 角标 = 未读总数（已读即移除）
  const unreadCount = alerts.length

  const openDetail = (a: AlertItem) => setSelected(a)
  const closeDetail = () => setSelected(null)

  const handleRead = (a: AlertItem) => {
    markAlertRead(a.id)
    setSelected(null)
    msg.success('已标记为已读')
  }
  const handleReadAndView = (a: AlertItem) => {
    markAlertRead(a.id)
    const m = getModule(a.module)
    setSelected(null)
    if (m) {
      navigate(`/m/${a.module}`)
      msg.success('已标记为已读，并进入「' + m.name + '」')
    } else {
      msg.success('已标记为已读')
    }
  }
  const handleAllRead = () => {
    if (alerts.length === 0) return
    markAllAlertsRead()
    msg.success('已全部标记为已读')
  }

  const alertPanel = (
    <div style={{ width: 320, maxHeight: 380, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>
          共 {alerts.length} 条未读，点击任意条目查看详情
        </span>
        {alerts.length > 0 && (
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={handleAllRead}>
            全部已读
          </Button>
        )}
      </div>
      {alerts.length === 0 ? (
        <Empty description="暂无未读预警，全部已处理 👍" />
      ) : (
        <List
          size="small"
          dataSource={alerts}
          renderItem={(a) => {
            const m = getModule(a.module)
            return (
              <List.Item
                onClick={() => openDetail(a)}
                style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 6, transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>
                      <Tag color={levelColor[a.level]} style={{ marginRight: 6 }}>
                        {levelLabel[a.level] || a.level}
                      </Tag>
                      {a.title}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>{a.date}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, lineHeight: 1.5 }}>{a.desc}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                    模块 {a.module} · {m?.name || a.module} · 点击查看详情 →
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      )}
    </div>
  )

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar style={{ background: child.avatarColor, flexShrink: 0 }}>{child.name[0]}</Avatar>
        <div style={{ lineHeight: 1.25, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{child.name} · {child.grade}</div>
          <div style={{ fontSize: 12, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {child.school}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        {!isMobile && (
          <Input prefix={<SearchOutlined />} placeholder="搜索模块 / 记录 / 政策" style={{ maxWidth: 260 }} />
        )}
        <Tooltip title="同步状态（本地已保存）">
          <Tag color="green" style={{ margin: 0, display: isMobile ? 'none' : 'inline-flex' }}>
            ● 本地已同步
          </Tag>
        </Tooltip>
        <Popover content={alertPanel} title="多维预警中心" trigger="click" placement="bottomRight">
          <Badge count={unreadCount} size="small" offset={[0, 2]}>
            <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
          </Badge>
        </Popover>
        <Tooltip title="AI 成长教练团（七专家）">
          <Button type="primary" icon={<RobotOutlined />} onClick={() => setAiOpen(true)}>
            {!isMobile && 'AI 教练'}
          </Button>
        </Tooltip>
        <Tooltip title="切换浅色 / 暗色">
          <Button type="text" icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={toggleDark} />
        </Tooltip>
        <Tooltip title="设置（云同步 / 读伴 / 备份）">
          <Button type="text" icon={<SettingOutlined style={{ fontSize: 18 }} />} onClick={() => navigate('/settings')} />
        </Tooltip>
      </div>

      <AiCoachDrawer open={aiOpen} onClose={() => setAiOpen(false)} />

      <Modal
        open={!!selected}
        onCancel={closeDetail}
        title={selected ? (
          <span>
            <Tag color={levelColor[selected.level]} style={{ marginRight: 4 }}>
              {levelLabel[selected.level] || selected.level}
            </Tag>
            {selected.title}
          </span>
        ) : ''}
        width={isMobile ? '92%' : 520}
        footer={selected ? [
          <Button key="close" onClick={closeDetail}>关闭</Button>,
          <Button
            key="view"
            type="default"
            icon={<ArrowRightOutlined />}
            onClick={() => handleReadAndView(selected)}
          >
            前往模块
          </Button>,
          <Button
            key="ok"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleRead(selected)}
          >
            我知道了
          </Button>
        ] : null}
      >
        {selected && (() => {
          const m = getModule(selected.module)
          return (
            <div>
              <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.7, marginBottom: 12 }}>
                {selected.desc}
              </div>
              {selected.suggestion && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="处理建议"
                  description={selected.suggestion}
                />
              )}
              <div style={{ fontSize: 12, color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                关联模块：{m?.name || selected.module}（{selected.module}） · 触发日期 {selected.date}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                点击「我知道了」后，本条将从未读列表移除，铃铛角标自动减 1。
              </div>
            </div>
          )
        })()}
      </Modal>
    </Header>
  )
}
