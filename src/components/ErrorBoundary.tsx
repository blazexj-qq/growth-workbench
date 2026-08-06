import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button } from 'antd'

interface Props {
  children: ReactNode
  module?: string
}

interface State {
  hasError: boolean
  error?: Error
  info?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <Alert
            type="error"
            showIcon
            message={`${this.props.module || '当前页面'}加载出错，已兜底显示`}
            description={
              <div>
                <p>错误信息：<code>{this.state.error?.message || '未知错误'}</code></p>
                <p>请点击下方按钮刷新，或截图错误信息给 AI 排查。</p>
              </div>
            }
            action={
              <Button type="primary" danger onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            }
          />
          {this.state.info?.componentStack && (
            <pre style={{ marginTop: 16, padding: 12, background: '#F8FAFC', borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
              {this.state.info.componentStack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
