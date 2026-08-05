import ReactECharts from 'echarts-for-react'
import { growth } from '../data/sample'

// 成长曲线 mini（对应身心发育 B 模块；ECharts 为开发方案指定图表库）
export default function GrowthMiniChart() {
  const option = {
    grid: { left: 36, right: 16, top: 28, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { data: ['身高(cm)', '体重(kg)'], right: 0, top: 0, textStyle: { fontSize: 11 } },
    xAxis: { type: 'category', data: growth.ages, axisLabel: { fontSize: 10 }, name: '岁', nameTextStyle: { fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10 } },
    series: [
      {
        name: '身高(cm)',
        type: 'line',
        smooth: true,
        data: growth.height,
        itemStyle: { color: '#0EA5A4' },
        areaStyle: { opacity: 0.08 }
      },
      {
        name: '体重(kg)',
        type: 'line',
        smooth: true,
        data: growth.weight,
        itemStyle: { color: '#F59E0B' }
      }
    ]
  }
  return <ReactECharts option={option} style={{ height: 220 }} notMerge lazyUpdate />
}
