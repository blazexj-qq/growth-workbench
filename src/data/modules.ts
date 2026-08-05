import {
  LineChartOutlined, HeartOutlined, StarOutlined, TeamOutlined, CompassOutlined,
  RocketOutlined, IdcardOutlined, CalendarOutlined, AimOutlined, BulbOutlined,
  TrophyOutlined, AlertOutlined, ShareAltOutlined, SafetyCertificateOutlined,
  MedicineBoxOutlined, FundOutlined, NodeIndexOutlined, SolutionOutlined,
  SmileOutlined, BookOutlined
} from '@ant-design/icons'
import type { ComponentType } from 'react'

export interface ModuleDef {
  id: string
  name: string
  icon: ComponentType<{ style?: React.CSSProperties }>
  group: string
  desc: string
  planned: string[] // 该模块规划中的子功能（占位页展示）
}

// 模块地图（对应集成优化 V2 方案，共 18 个域：Q 已并入 E 作择校卡子功能，S 已并入 N 作孩子端可见性规则）
export const modules: ModuleDef[] = [
  { id: 'A', name: '成绩管理', icon: LineChartOutlined, group: 'study',
    desc: '校内考试成绩、班级/年级排名趋势，错题管家数据自动归集。',
    planned: ['考试成绩录入/导入', '趋势折线图', '薄弱知识点雷达', '错题管家一键接入'] },
  { id: 'P', name: '学习能力画像', icon: FundOutlined, group: 'study',
    desc: '注意力、记忆力、思维风格等可训练能力的结构化评估。',
    planned: ['注意力/工作记忆测评', '学习风格标签', '能力-学科映射', '训练建议'] },
  { id: 'B', name: '身心健康与身体发育监测', icon: HeartOutlined, group: 'health',
    desc: '睡眠/运动/情绪 + 生长曲线/骨龄/体态/青春期里程碑。',
    planned: ['生长曲线百分位', '骨龄与实际年龄差', '脊柱自查记录', '心理分级预警', '运动处方'] },
  { id: 'O', name: '营养与膳食管理', icon: MedicineBoxOutlined, group: 'health',
    desc: '膳食记录、餐盘结构评分、营养素缺口，与发育联动。',
    planned: ['三餐+加餐记录', '餐盘结构评分（彩虹饮食）', '添加糖/奶制品/饮水', '联动发育曲线'] },
  { id: 'C', name: '兴趣爱好管理', icon: StarOutlined, group: 'life',
    desc: '兴趣活动、才艺、作品沉淀，读伴阅读记录自动汇入。',
    planned: ['兴趣标签档案', '活动/作品集', '阅读记录接入', '成就时间线'] },
  { id: 'D', name: '亲子关系管理', icon: TeamOutlined, group: 'life',
    desc: '亲子时光、家庭会议、关系健康度与沟通建议。',
    planned: ['亲子时光打卡', '家庭会议记录', '关系健康度量表', '沟通话术建议'] },
  { id: 'E', name: '升学规划管理', icon: CompassOutlined, group: 'edu',
    desc: '小升初→中考→高考全周期时间轴、节点红线、政策雷达；含「择校决策追踪卡」。',
    planned: ['升学时间轴', '关键节点倒计时', '政策雷达（爬虫接入）', '红线提醒', '择校决策追踪卡（原 Q）'] },
  { id: 'F', name: '中高考升学助手', icon: RocketOutlined, group: 'edu',
    desc: '多 Agent 编排：估分/数据/概率/分析/顾问，志愿填报。',
    planned: ['估分→位次', '院校/专业数据', '冲稳保概率', '五维分析报告', '顾问综合建议'] },
  { id: 'K', name: '五育综评对齐', icon: TrophyOutlined, group: 'edu',
    desc: '对齐教育部德智体美劳口径，提前攒综合素质评价材料。',
    planned: ['五育指标映射', '材料归集', '综评导出', '缺口提示'] },
  { id: 'T', name: '家校沟通台账', icon: BookOutlined, group: 'edu',
    desc: '老师原话/通知/作业量手动录入 + AI 结构化，补全学校信息源。',
    planned: ['老师反馈台账', '通知/作业量记录', 'AI 结构化摘要', '学期对比'] },
  { id: 'I', name: '目标管理 / 愿景板', icon: AimOutlined, group: 'grow',
    desc: '学年/学期目标拆解成阶梯，愿景板锚定长期方向。',
    planned: ['目标拆解', '愿景板', '里程碑打卡', '进度可视化'] },
  { id: 'H', name: '时间管理与习惯养成', icon: CalendarOutlined, group: 'grow',
    desc: '日程/习惯打卡，培养自驱力与节律。',
    planned: ['习惯打卡', '日程视图', '番茄/专注', '连续天数统计'] },
  { id: 'J', name: '生涯启蒙与职业探索', icon: BulbOutlined, group: 'grow',
    desc: '霍兰德兴趣测评 + 职业探索（规划到高考为止，就业重活延后），从四年级开始种下方向感。',
    planned: ['霍兰德测评（轻量）', '职业卡片', '兴趣-学科关联', '写给未来自己'] },
  { id: 'R', name: '职业体验库', icon: SolutionOutlined, group: 'grow',
    desc: '真实职业体验/访谈记录（轻量素材库，非就业对接）。',
    planned: ['体验活动记录', '职业访谈', '影子学习', '反思笔记'] },
  { id: 'M', name: '家庭资源与人脉图谱', icon: ShareAltOutlined, group: 'grow',
    desc: '家庭可调动的资源、榜样与人脉，支撑生涯与升学。',
    planned: ['资源清单', '榜样人物', '人脉地图', '可求助项'] },
  { id: 'G', name: '成长档案管理', icon: IdcardOutlined, group: 'archive',
    desc: '一人一档，贯通小学→高考，可信存证（哈希+时间戳）。',
    planned: ['全周期档案', '作品集', '哈希存证', '学期/学年导出'] },
  { id: 'L', name: '多维预警中心', icon: AlertOutlined, group: 'archive',
    desc: '汇总成绩/身心/营养/亲子/升学预警，分级推送。',
    planned: ['分级预警（紧急/重点/一般）', '跨维度关联研判', '推送设置', '处理闭环'] },
  { id: 'N', name: '隐私与合规', icon: SafetyCertificateOutlined, group: 'archive',
    desc: '字段加密、角色权限、授权审计、被遗忘权（未成年人底线）；含孩子端可见性规则（原 S）。',
    planned: ['角色权限（孩子/家长/规划师）', '字段级加密', '访问审计', '一键导出/删除', '孩子端可见性与暂停记录（原 S）'] }
]

export const groups = [
  { key: 'overview', label: '成长总览', modules: [] as string[] },
  { key: 'study', label: '学业', modules: ['A', 'P'] },
  { key: 'health', label: '身心健康', modules: ['B', 'O'] },
  { key: 'life', label: '兴趣与亲子', modules: ['C', 'D'] },
  { key: 'edu', label: '升学规划', modules: ['E', 'F', 'K', 'T'] },
  { key: 'grow', label: '成长与规划', modules: ['I', 'H', 'J', 'R', 'M'] },
  { key: 'archive', label: '档案与安全', modules: ['G', 'L', 'N'] }
]

export function getModule(id: string): ModuleDef | undefined {
  return modules.find((m) => m.id === id)
}
