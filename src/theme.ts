import type { ThemeConfig } from 'antd'
import { theme as antdTheme } from 'antd'

// 设计 Token（对应开发方案「UI 设计系统」一节）
export const PRIMARY = '#0EA5A4' // 沉静蓝绿：信任 / 健康感，避免高饱和红黄（减负）
export const PRIMARY_BG = '#E6F7F6' // 主色浅底（选中态等）
export const ACCENT = '#F59E0B' // 辅助橙（用于对比曲线、提示）

export function themeConfig(dark: boolean): ThemeConfig {
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: PRIMARY,
      borderRadius: 12, // 全局圆角放大，控件更圆润亲和
      fontSize: 14,
      lineHeight: 1.6, // 行高更舒展，正文不挤
      colorBgLayout: dark ? '#0f1419' : '#f4f6f8', // 布局底色更柔
      wireframe: false,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif'
    },
    components: {
      Layout: {
        siderBg: dark ? '#141a20' : '#ffffff',
        headerBg: dark ? '#141a20' : '#ffffff',
        bodyBg: dark ? '#0f1419' : '#f4f6f8',
        headerHeight: 56,
        headerPadding: '0 16px'
      },
      Menu: {
        itemSelectedBg: PRIMARY_BG,
        itemSelectedColor: PRIMARY,
        itemBorderRadius: 8,
        itemMarginInline: 8
      },
      Card: { borderRadiusLG: 16, borderRadiusSM: 12 },
      Button: { borderRadius: 10 },
      // 表格降噪：淡边框 + 柔和表头 + 行更松 + 去表头分隔竖线
      Table: {
        headerBg: '#F1F5F9',
        headerColor: '#475569',
        headerSplitColor: 'transparent',
        borderColor: '#EEF2F6',
        rowHoverBg: 'rgba(14, 165, 164, 0.06)',
        cellPaddingBlock: 12,
        cellPaddingInline: 12,
        footerBg: '#F8FAFC'
      },
      // 分段控件（周报/月报切换等）圆润、选中态用白底主色字
      Segmented: {
        borderRadius: 10,
        itemSelectedBg: dark ? '#0EA5A4' : '#ffffff',
        itemSelectedColor: dark ? '#ffffff' : PRIMARY,
        trackBg: '#EEF2F6'
      },
      Input: { borderRadius: 10 },
      Select: { borderRadius: 10 }
    }
  }
}
