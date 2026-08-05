import { Card, Tag } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getModule } from '../data/modules'

export default function ModuleCard({ id }: { id: string }) {
  const m = getModule(id)
  const navigate = useNavigate()
  if (!m) return null
  const Icon = m.icon
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
            background: '#E6F7F6',
            color: '#0EA5A4',
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
          <Tag color="cyan" style={{ marginTop: 2 }}>{id}</Tag>
        </div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10, lineHeight: 1.5 }}>{m.desc}</div>
    </Card>
  )
}
