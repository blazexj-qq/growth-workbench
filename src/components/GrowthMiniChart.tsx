import ReactEChartsCore from 'echarts-for-react/lib/core'
import echarts from '../lib/echarts'
import { Empty } from 'antd'
import { useMemo } from 'react'
import { useHealthStore } from '../store/useHealthStore'

// 成长曲线 mini（对应身心发育 B 模块）
// 读真实录入的身高/体重记录（与 B 模块详情页同数据源），不再使用示例假数据；
// 无记录时显示空态，避免展示与孩子无关的标准生长曲线造成误导。
export default function GrowthMiniChart() {
  const records = useHealthStore((s) => s.records)
  const { dates, heightSeries, weightSeries } = useMemo(() => {
    const sorted = records
      .filter((r) => r.height != null || r.weight != null)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
    return {
      dates: sorted.map((r) => r.date),
      heightSeries: sorted.map((r) => r.height ?? null),
      weightSeries: sorted.map((r) => r.weight ?? null),
    }
  }, [records])

  if (!dates.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未记录身高 / 体重" />
  }

  const option = {
    grid: { left: 40, right: 44, top: 28, bottom: 28, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { data: ['身高(cm)', '体重(kg)'], right: 0, top: 0, textStyle: { fontSize: 11 } },
    // 双 Y 轴：身高(cm) 用左轴、体重(kg) 用右轴，各自刻度，避免体重线被压在底部失真
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 10, rotate: dates.length > 6 ? 32 : 0 },
      name: '日期',
      nameTextStyle: { fontSize: 10 },
    },
    yAxis: [
      { type: 'value', name: '身高cm', scale: true, axisLabel: { fontSize: 10 }, nameTextStyle: { fontSize: 10 }, position: 'left' },
      { type: 'value', name: '体重kg', scale: true, axisLabel: { fontSize: 10 }, nameTextStyle: { fontSize: 10 }, position: 'right', splitLine: { show: false } },
    ],
    series: [
      {
        name: '身高(cm)',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: heightSeries,
        connectNulls: true,
        itemStyle: { color: '#0EA5A4' },
        areaStyle: { opacity: 0.08 },
      },
      {
        name: '体重(kg)',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: weightSeries,
        connectNulls: true,
        itemStyle: { color: '#F59E0B' },
      },
    ],
  }
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220 }} notMerge lazyUpdate />
}
