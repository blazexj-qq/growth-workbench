// 统一按需引入 echarts，避免 echarts-for-react 全量打包导致 2.6MB 大包。
// ⚠️ 维护约束：以后若新增图表类型（如 pie/scatter），必须在此处一并注册对应的
// Chart 与 Component（坐标系），否则该图表会白屏。当前工程只用 line/bar/radar。
import * as echarts from 'echarts/core'
import { LineChart, BarChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  RadarComponent,
  CanvasRenderer,
])

export default echarts
