import { useState } from 'react'
import { Drawer, Tag, Input, Space, Avatar, Typography, Divider, Row, Col, Tooltip, Button } from 'antd'
import { RobotOutlined, ArrowRightOutlined, SendOutlined } from '@ant-design/icons'
import { useScoreStore } from '../store/useScoreStore'
import { useHealthStore } from '../store/useHealthStore'
import { useDecisionStore } from '../store/useDecisionStore'
import { useAbilityStore } from '../store/useAbilityStore'
import { useNutritionStore } from '../store/useNutritionStore'
import { useAlertStore } from '../store/useAlertStore'
import { useCareerStore } from '../store/useCareerStore'
import { useParentingStore } from '../store/useParentingStore'

type ExpertKey = 'edu' | 'exam' | 'psy' | 'career' | 'family' | 'health' | 'nutrition'

const experts: { key: ExpertKey; name: string; tip: string; emoji: string }[] = [
  { key: 'edu', name: '教育专家', tip: '薄弱点 / 学法 / 错题归因', emoji: '📚' },
  { key: 'exam', name: '升学规划师', tip: '时间轴 / 节点红线 / 志愿', emoji: '🎓' },
  { key: 'psy', name: '心理学家', tip: '情绪 / 压力 / 分级预警', emoji: '🧠' },
  { key: 'career', name: '职业规划师', tip: '生涯启蒙 / 档案→简历', emoji: '🧭' },
  { key: 'family', name: '亲子维护专家', tip: '关系健康 / 沟通话术', emoji: '💞' },
  { key: 'health', name: '身心健康师', tip: '睡眠 / 运动 / 发育', emoji: '🌿' },
  { key: 'nutrition', name: '营养学家', tip: '膳食结构 / 营养素', emoji: '🥗' },
]

// 读取各模块本机记录条数（用 getState，避免抽屉随数据频繁重渲染）
function counts() {
  const safeLen = (s: any) => (Array.isArray(s?.records) ? s.records.length : 0)
  return {
    score: safeLen(useScoreStore.getState()),
    health: safeLen(useHealthStore.getState()),
    decision: safeLen(useDecisionStore.getState()),
    ability: safeLen(useAbilityStore.getState()),
    nutrition: safeLen(useNutritionStore.getState()),
    alert: safeLen(useAlertStore.getState()),
    career: safeLen(useCareerStore.getState()),
    parenting: safeLen(useParentingStore.getState()),
  }
}

// M0 本地模板回复生成器：用本机数据给一段实用建议，明确标注非真 AI
function localReply(key: ExpertKey, question: string): string {
  const c = counts()
  const q = question.trim()
  const head = (label: string) => `【${label} · M0 本地模板】`
  switch (key) {
    case 'edu':
      return `${head('教育专家')} 你目前已记录 ${c.score} 条成绩、${c.ability} 条学习能力观察。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 先按"计算→建模→考试策略"三块归错，每周集中攻一个；② 错过的题隔天重做一遍，比刷新题更提分。\n' +
        '（说明：这是本机模板生成，未接入真实大模型；M1 接入后会结合具体薄弱点给更精准的学法建议。）'
    case 'exam':
      return `${head('升学规划师')} 你目前已记录 ${c.decision} 条择校决策、${c.score} 条模考成绩。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 指标生是冲六大（顶尖四星）的低成本路径，先把学籍稳在同一初中满 3 年；② 普高/四星有分数兜底，不必只盯头部。\n' +
        '（说明：本机模板生成，未接真 AI；M1 接入后会按你的年级与时间轴动态提醒节点红线。）'
    case 'psy':
      return `${head('心理学家')} 你已记录 ${c.parenting} 条亲子互动、${c.alert} 条预警。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 情绪分只是观察参考，别据此给孩子贴标签；② 若预警里出现持续低落类，先和老师沟通、必要时找专业评估，本工具不做诊断。\n' +
        '（说明：本机模板生成，非真 AI；M1 接入后会结合情绪趋势给更细致的分级建议。）'
    case 'career':
      return `${head('职业规划师')} 你已记录 ${c.career} 条生涯探索。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 四年级只记录兴趣萌芽，不做任何职业定论；② 多看、多体验、多聊"为什么好奇"，方向感会自己长出来。\n' +
        '（说明：本机模板生成，未接真 AI；M1 接入后会结合兴趣信号给更连贯的方向建议。）'
    case 'family':
      return `${head('亲子维护专家')} 你已记录 ${c.parenting} 条亲子互动。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 每天固定 15 分钟"专属亲子时间"，比时长更长但随机更好；② 沟通多用"我观察到…"代替"你总是…"，少评判多接住。\n' +
        '（说明：本机模板生成，非真 AI；M1 接入后会结合互动记录给话术示例。）'
    case 'health':
      return `${head('身心健康师')} 你已记录 ${c.health} 条身心监测。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 小学生每天睡眠建议 9–11 小时、中高强度运动 ≥60 分钟；② 视力每 3–6 个月测一次，屏幕时间分段、用眼 20 分钟远眺 20 秒。\n' +
        '（说明：本机模板生成，非真 AI；M1 接入后会结合生长曲线给个性化提醒。）'
    case 'nutrition':
      return `${head('营养学家')} 你已记录 ${c.nutrition} 条膳食。\n` +
        (q ? `关于你问的「${q}」：` : '') +
        '建议：① 每天蔬果 + 优质蛋白 + 全谷物，饮水 800–1200ml；② 少含糖饮料，早餐必有蛋白更扛饿、利专注。\n' +
        '（说明：本机模板生成，非真 AI；M1 接入后会结合膳食结构给具体缺口提示。）'
    default:
      return '（未知专家）'
  }
}

type Msg = { role: 'user' | 'bot'; text: string }

export default function AiCoachDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState<ExpertKey | null>(null)
  const [input, setInput] = useState('')
  const [chats, setChats] = useState<Record<ExpertKey, Msg[]>>({
    edu: [], exam: [], psy: [], career: [], family: [], health: [], nutrition: [],
  })

  const activeExpert = experts.find((e) => e.key === active) || null

  const send = () => {
    if (!active || !input.trim()) return
    const text = input.trim()
    const reply = localReply(active, text)
    setChats((prev) => ({ ...prev, [active]: [...prev[active], { role: 'user', text }, { role: 'bot', text: reply }] }))
    setInput('')
  }

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
      width={420}
      open={open}
      onClose={onClose}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        点一位专家进入对话。当前为 <b>M0 本地模板</b>：会用你本机已存的数据给一段实用建议，但<b>未接入真实大模型</b>；M1 里程碑接入 AI Gateway 后将升级为真正能理解上下文的对话。
      </Typography.Paragraph>

      {/* 专家选择 */}
      <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>选择专家</div>
      <Row gutter={[10, 10]}>
        {experts.map((e) => (
          <Col span={12} key={e.key}>
            <div
              onClick={() => setActive(e.key)}
              style={{
                border: `1px solid ${active === e.key ? '#0EA5A4' : '#E2E8F0'}`,
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: active === e.key ? '#F0FDFA' : '#FCFCFD',
                cursor: 'pointer',
                minHeight: 60,
                boxSizing: 'border-box',
              }}
            >
              <Avatar size={36} style={{ background: '#0EA5A4', flexShrink: 0, fontSize: 16 }}>{e.emoji}</Avatar>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', lineHeight: 1.25, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.tip}</div>
              </div>
              <ArrowRightOutlined style={{ color: active === e.key ? '#0EA5A4' : '#94A3B8', fontSize: 12, flexShrink: 0 }} />
            </div>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: '14px 0 10px' }} />

      {activeExpert ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)', minHeight: 280 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#0F766E', marginBottom: 8 }}>
            与 {activeExpert.emoji} {activeExpert.name} 的对话
          </div>
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, background: '#FCFCFD' }}>
            {chats[activeExpert.key].length === 0 ? (
              <div style={{ color: 'rgba(0,0,0,0.35)', fontSize: 13 }}>试着问一句，如：「这周数据里我最该关注什么？」</div>
            ) : (
              chats[activeExpert.key].map((m, i) => (
                <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      maxWidth: '88%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      textAlign: 'left',
                      background: m.role === 'user' ? '#0EA5A4' : '#fff',
                      color: m.role === 'user' ? '#fff' : '#0F172A',
                      border: m.role === 'user' ? 'none' : '1px solid #E2E8F0',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <Space.Compact style={{ marginTop: 8, width: '100%' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={send}
              placeholder="输入你的问题…"
              style={{ fontSize: 13 }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={send} disabled={!input.trim()}>发送</Button>
          </Space.Compact>
        </div>
      ) : (
        <div style={{ minHeight: 120, border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.35)', fontSize: 13 }}>
          请先在上方选择一位专家
        </div>
      )}
    </Drawer>
  )
}
