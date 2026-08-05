import { useParams, useNavigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { Card, Tag, Typography, List, Button, Space, Result, Progress } from 'antd'
import { ArrowLeftOutlined, ExperimentOutlined } from '@ant-design/icons'
import { getModule } from '../data/modules'

const { Title, Paragraph, Text } = Typography

// M0 占位页：展示模块元信息与"规划中"的功能清单；已落地的真模块由 realModules 渲染
export default function ModuleStub({ realModules = {} }: { realModules?: Record<string, ComponentType> }) {
  const { id } = useParams()
  const navigate = useNavigate()

  // 已落地真模块：直接渲染
  if (id && realModules[id]) {
    const Real = realModules[id]
    return <Real />
  }

  const m = id ? getModule(id) : undefined

  if (!m) {
    return <Result status="404" title="模块不存在" extra={<Button onClick={() => navigate('/')}>返回驾驶舱</Button>} />
  }

  const Icon = m.icon
  return (
    <div>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 8 }}>
        返回驾驶舱
      </Button>
      <Card>
        <Space align="center" size={16}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, background: '#E6F7F6', color: '#0EA5A4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
            }}
          >
            <Icon />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {m.name} <Tag color="cyan">{m.id}</Tag>
            </Title>
            <Text type="secondary">{m.desc}</Text>
          </div>
        </Space>

        <Paragraph style={{ marginTop: 20, marginBottom: 8 }}>
          <ExperimentOutlined style={{ color: '#0EA5A4' }} /> <b>规划中的子功能（M1–M4 逐步落地）</b>
        </Paragraph>
        <List
          dataSource={m.planned}
          renderItem={(p, i) => (
            <List.Item>
              <Space>
                <Progress type="circle" percent={0} size={18} strokeColor="#0EA5A4" />
                <span>{p}</span>
              </Space>
            </List.Item>
          )}
        />
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
          状态：规划占位（M0 基座）。该模块的数据结构已在开发方案「数据模型」一节定义，后续里程碑按 Epic 排期实现。
        </Paragraph>
      </Card>
    </div>
  )
}
