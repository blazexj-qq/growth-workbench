// 监听窗口宽度变化（用于图表/表格移动端适配）
// 用法：const w = useWindowWidth(); 然后 useMemo 依赖 w
import { useEffect, useState } from 'react'

export function useWindowWidth() {
  const [w, setW] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setW(window.innerWidth))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return w
}

export const isMobileWidth = (w: number) => w < 600
