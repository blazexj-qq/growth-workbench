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
      borderRadius: 10,
      fontSize: 14,
      colorBgLayout: dark ? '#0f1419' : '#f5f7fa',
      wireframe: false,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif'
    },
    components: {
      Layout: {
        siderBg: dark ? '#141a20' : '#ffffff',
        headerBg: dark ? '#141a20' : '#ffffff',
        bodyBg: dark ? '#0f1419' : '#f5f7fa',
        headerHeight: 56,
        headerPadding: '0 16px'
      },
      Menu: {
        itemSelectedBg: PRIMARY_BG,
        itemSelectedColor: PRIMARY,
        itemBorderRadius: 8,
        itemMarginInline: 8
      },
      Card: { borderRadiusLG: 12 },
      Button: { borderRadius: 8 }
    }
  }
}
