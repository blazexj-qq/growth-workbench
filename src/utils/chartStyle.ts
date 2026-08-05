// 统一图表审美（大厂风格）
// 细柱/细线 + 顶部圆角 + 字号 12 + 浅灰虚线网格 + 深色 tooltip 卡片
// 所有模块（成绩/目标/习惯/兴趣/亲子/五育）共用，避免各文件重复写样式。

export const AXIS_LINE_COLOR = '#CBD5E1'
export const SPLIT_COLOR = '#E2E8F0'
export const LABEL_COLOR = '#475569' // 坐标轴文字
export const SUB_COLOR = '#94A3B8' // 次级说明文字
export const TOOLTIP_BG = 'rgba(15, 23, 42, 0.92)'

// 坐标轴基础样式（浅灰轴线、隐藏刻度、12 号深灰文字）
export const axisBase = (extra?: Record<string, any>) => ({
  axisLine: { lineStyle: { color: AXIS_LINE_COLOR } },
  axisTick: { show: false },
  axisLabel: { color: LABEL_COLOR, fontSize: 12 },
  ...extra,
})

// 浅灰虚线网格（横向分隔）
export const splitLineBase = {
  lineStyle: { type: [4, 4] as [number, number], color: SPLIT_COLOR },
}

// 深色 tooltip 卡片（统一浮层观感）
export const darkTooltip = (extra?: Record<string, any>) => ({
  backgroundColor: TOOLTIP_BG,
  borderWidth: 0,
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'box-shadow: 0 6px 18px rgba(0,0,0,0.18); border-radius: 6px;',
  ...extra,
})

// 判断移动端（< 600px 视口）
export const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 600

// X 轴防重叠：移动端旋转 30° + 隐藏重叠；桌面端水平
export const xLabelForMobile = () =>
  isMobile()
    ? { interval: 0, rotate: 30, fontSize: 10, color: LABEL_COLOR, hideOverlap: true }
    : { fontSize: 12, color: LABEL_COLOR, hideOverlap: true }
