import { Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getModule, groupMeta } from '../data/modules'

export default function ModuleCard({ id }: { id: string }) {
  const m = getModule(id)
  const navigate = useNavigate()
  if (!m) return null
  const Icon = m.icon
  const gm = groupMeta[m.group]
  const color = gm?.color || '#0EA5A4'
  return (
    <Card
      hoverable
      onClick={() => navigate(`/m/${id}`)}
      styles={{ body: { padding: 16 } }}
      style={{ height: '100%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}1A`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0
          }}
        >
          <Icon />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{m.name}</div>
          <div style={{ marginTop: 4 }}>
            <Tag color={color} style={{ fontSize: 11, lineHeight: '16px', marginRight: 0 }}>{gm?.label || id}</Tag>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10, lineHeight: 1.5 }}>{m.desc}</div>
    </Card>
  )
}
