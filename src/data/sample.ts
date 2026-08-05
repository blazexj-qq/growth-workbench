// 示例数据（M0 预览用，后续由真实录入 / 三件套导入替换）
export const todayStats = [
  { key: 'sleep', label: '睡眠', value: '8.2 h', good: true, tip: '达标（≥9h 为理想，四年级接近）' },
  { key: 'exercise', label: '中高强度运动', value: '35 min', good: false, tip: '偏低，建议每日 ≥60min' },
  { key: 'mood', label: '今日心情', value: '平稳', good: true, tip: '自检无显著情绪波动' },
  { key: 'study', label: '今日学习', value: '1.5 h', good: true, tip: '含数学建模练习 40min' }
]

// 临近节点倒计时（升学规划 E / 时间轴）
export const timelineEvents = [
  { title: '学期体检（视力/身高体重）', date: '2026-09-01', module: 'B' },
  { title: '小升初政策窗口开启', date: '2027-03-01', module: 'E' },
  { title: '南外路径评估（五年级末）', date: '2028-06-30', module: 'E' },
  { title: '中考（指标生资格核验）', date: '2032-06-15', module: 'E' }
]

// 生长曲线示例（年龄→身高 cm / 体重 kg），对应身心发育 B
export const growth = {
  ages: ['6', '7', '8', '9', '10', '11', '12', '13'],
  height: [118, 124, 130, 135, 140, 146, 152, 158],
  weight: [21, 24, 28, 32, 36, 41, 46, 51]
}

export function daysLeft(target: string): number {
  const t = new Date(target + 'T00:00:00').getTime()
  const now = Date.now()
  return Math.max(0, Math.round((t - now) / 86400000))
}
