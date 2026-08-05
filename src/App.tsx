import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppStore } from './store/useAppStore'
import { themeConfig } from './theme'
import AppLayout from './layout/AppLayout'

export default function App() {
  const dark = useAppStore((s) => s.dark)
  return (
    <ConfigProvider locale={zhCN} theme={themeConfig(dark)}>
      <AntdApp>
        <AppLayout />
      </AntdApp>
    </ConfigProvider>
  )
}
