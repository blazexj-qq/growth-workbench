import { useEffect, useState, type ComponentType } from 'react'
import { Layout } from 'antd'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import HeaderBar from './HeaderBar'
import MobileTabBar from './MobileTabBar'
import Dashboard from '../pages/Dashboard'
import ModuleStub from '../pages/ModuleStub'
import ScoreManager from '../pages/ScoreManager'
import HealthManager from '../pages/HealthManager'
import DecisionManager from '../pages/DecisionManager'
import PAbilityManager from '../pages/PAbilityManager'
import ONutritionManager from '../pages/ONutritionManager'
import CInterestManager from '../pages/CInterestManager'
import DParentingManager from '../pages/DParentingManager'
import FAdmissionManager from '../pages/FAdmissionManager'
import KComprehensiveManager from '../pages/KComprehensiveManager'
import THomeSchoolManager from '../pages/THomeSchoolManager'
import IGoalManager from '../pages/IGoalManager'
import HHabitManager from '../pages/HHabitManager'
import JCareerManager from '../pages/JCareerManager'
import RExperienceManager from '../pages/RExperienceManager'
import MResourceManager from '../pages/MResourceManager'
import GArchiveManager from '../pages/GArchiveManager'
import LAlertManager from '../pages/LAlertManager'
import NPrivacyManager from '../pages/NPrivacyManager'
import SettingManager from '../pages/SettingManager'
import { usePrivacyStore } from '../store/usePrivacyStore'
import { Alert } from 'antd'

export default function AppLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const childPause = usePrivacyStore((s) => s.childPause)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // M1 起：已落地的真模块在此路由，其余仍走占位页
  const realModules: Record<string, ComponentType> = {
    A: ScoreManager,
    B: HealthManager,
    E: DecisionManager,
    P: PAbilityManager,
    O: ONutritionManager,
    C: CInterestManager,
    D: DParentingManager,
    F: FAdmissionManager,
    K: KComprehensiveManager,
    T: THomeSchoolManager,
    I: IGoalManager,
    H: HHabitManager,
    J: JCareerManager,
    R: RExperienceManager,
    M: MResourceManager,
    G: GArchiveManager,
    L: LAlertManager,
    N: NPrivacyManager,
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && <Sidebar />}
      <Layout style={{ paddingBottom: isMobile ? 56 : 0 }}>
        <HeaderBar isMobile={isMobile} />
        {childPause && (
          <Alert
            type="warning"
            showIcon
            banner
            message="孩子已选择暂停记录（在「隐私与合规」模块设置）。请尊重孩子意愿，录入前先与他沟通。"
          />
        )}
        <Layout.Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/m/:id" element={<ModuleStub realModules={realModules} />} />
            <Route path="/settings" element={<SettingManager />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout.Content>
        {isMobile && <MobileTabBar />}
      </Layout>
    </Layout>
  )
}
