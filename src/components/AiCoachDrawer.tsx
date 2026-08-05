import { Drawer, Tag, Input, Space, Avatar, Typography, Divider, Row, Col, Tooltip } from 'antd'
import { RobotOutlined, ArrowRightOutlined } from '@ant-design/icons'

const experts = [
  { key: 'edu', name: '教育专家', tip: '薄弱点 / 学法 / 错题归因' },
  { key: 'exam', name: '升学规划师', tip: '时间轴 / 节点红线 / 志愿' },
  { key: 'psy', name: '心理学家', tip: '情绪 / 压力 / 分级预警' },
  { key: 'career', name: '职业规划师', tip: '生涯启蒙 / 档案→简历' },
  { key: 'family', name: '亲子维护专家', tip: '关系健康 / 沟通话术' },
  { key: 'health', name: '身心健康师', tip: '睡眠 / 运动 / 发育' },
  { key: 'nutrition', name: '营养学家', tip: '膳食结构 / 营养素' }
]

// M0 预览：AI 教练团界面骨架；真实大模型接入在 M1/M2 里程碑（AI Gateway + 七专家人格）
export default function AiCoachDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined style={{ color: '#0EA5A4' }} />
          <span style={{ fontSize: 15 }}>成长教练团</span>
          <Tag color="cyan" style={{ marginLeft: 4 }}>7 专家</Tag>
        </Space>
      }
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        选择一位专家人格开始对话。下方为 M0 预览界面，大模型接入将在后续的 M1/M2 里程碑完成（AI Gateway 模型无关代理）。
      </Typography.Paragraph>

      {/* 2 列网格，让 7 个专家排版整齐（最后一行只有 1 个会自然靠左） */}
      <Row gutter={[10, 10]}>
        {experts.map((e) => (
          <Col span={12} key={e.key}>
            <Tooltip title="M0 占位，M1/M2 接入后可对话" placement="top">
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#FCFCFD',
                  cursor: 'pointer',
                  minHeight: 60,
                  boxSizing: 'border-box',
                }}
              >
                <Avatar
                  size={36}
                  style={{
                    background: '#0EA5A4',
                    flexShrink: 0,
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {e.name[0]}
                </Avatar>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: '#0F172A',
                      lineHeight: 1.25,
                      marginBottom: 3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#64748B',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.tip}
                  </div>
                </div>
                <ArrowRightOutlined style={{ color: '#94A3B8', fontSize: 12, flexShrink: 0 }} />
              </div>
            </Tooltip>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: '14px 0 10px' }} />

      <div
        style={{
          minHeight: 120,
          border: '1px dashed rgba(0,0,0,0.12)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.35)',
          fontSize: 13,
        }}
      >
        对话区（M0 占位）
      </div>
      <Input.TextArea
        rows={2}
        placeholder="接入大模型后可在此提问，例如：『这周数据里我最该关注什么？』"
        style={{ marginTop: 10, fontSize: 13 }}
        disabled
      />
      <ButtonSend />
    </Drawer>
  )
}

// 抽出占位按钮，避免污染主组件
function ButtonSend() {
  // 用函数组件内联样式保持简单
  return (
    <button
      disabled
      style={{
        marginTop: 8,
        width: '100%',
        height: 34,
        borderRadius: 6,
        background: '#0EA5A4',
        color: '#fff',
        border: 'none',
        opacity: 0.5,
        fontSize: 14,
        cursor: 'not-allowed',
      }}
    >
      发送（待接入）
    </button>
  )
}
