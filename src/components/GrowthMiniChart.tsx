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
    grid: { left: 40, right: 44, top: 24, bottom: 48, containLabel: true },
    tooltip: { trigger: 'axis' },
    // 图例放底部；标签简化为'身高/体重'(Y轴已带单位cm/kg)，避免窄卡片内文字被截断
    legend: {
      data: ['身高', '体重'],
      bottom: 4,
      left: 'center',
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 24,
      textStyle: { fontSize: 11 },
    },
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
        name: '身高',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: heightSeries,
        connectNulls: true,
        itemStyle: { color: '#0EA5A4' },
        areaStyle: { opacity: 0.08 },
      },
      {
        name: '体重',
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
