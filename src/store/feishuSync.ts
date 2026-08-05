// 前端云同步模块：封装对阿里云 FC 飞书代理（workbench-feishu-sync.js）的调用。
// 不持有任何密钥——只存 FC 公网地址和用户开关（localStorage）。
// 真正的飞书 app_id/secret 在服务端 FC 环境变量里，绝不进前端。

import { useEffect, useState } from 'react'

const LS_FC_URL = "growth-workbench-fc-url";
const LS_CLOUD = "growth-workbench-cloud-sync";

// 同一页面内设置页改地址/开关时，其它模块页要能立刻反映。
// 浏览器原生 storage 事件只在跨 tab 时触发，所以这里再派发一个自定义事件兜底。
const EVT_CLOUD = "growth:cloud-changed";

export function getFcUrl(): string {
  return localStorage.getItem(LS_FC_URL) || "";
}
export function setFcUrl(u: string) {
  if (u && u.trim()) localStorage.setItem(LS_FC_URL, u.trim().replace(/\/$/, ""));
  else localStorage.removeItem(LS_FC_URL);
  window.dispatchEvent(new Event(EVT_CLOUD));
}
export function getCloudSync(): boolean {
  return localStorage.getItem(LS_CLOUD) === "1";
}
export function setCloudSync(on: boolean) {
  localStorage.setItem(LS_CLOUD, on ? "1" : "0");
  window.dispatchEvent(new Event(EVT_CLOUD));
}

// 响应式云开关 hook：跨 tab 监听 storage 事件 + 同页监听 EVT_CLOUD 事件
export function useCloudOn(): boolean {
  const [on, setOn] = useState<boolean>(getCloudSync() && !!getFcUrl())
  useEffect(() => {
    const refresh = () => setOn(getCloudSync() && !!getFcUrl())
    window.addEventListener(EVT_CLOUD, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(EVT_CLOUD, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])
  return on
}

// 读伴 ReadingBuddy 公网地址（仅存本机 localStorage，不设密钥）
const LS_READBUDDY_URL = "growth-workbench-readbuddy-url";
export function getReadBuddyUrl(): string {
  return localStorage.getItem(LS_READBUDDY_URL) || "";
}
export function setReadBuddyUrl(u: string) {
  if (u && u.trim()) localStorage.setItem(LS_READBUDDY_URL, u.trim());
  else localStorage.removeItem(LS_READBUDDY_URL);
}

export interface ExamRecordLite {
  id: string;
  subject: string;
  examName: string;
  date: string;
  score: number;
  fullScore: number;
  classRank?: number;
  gradeRank?: number;
  note?: string;
}
export interface WeakPointLite {
  id: string;
  subject: string;
  knowledge: string;
  reason: string;
  date: string;
  status: string;
  source: string;
}
export interface HealthRecordLite {
  id: string;
  date: string;
  height?: number; // cm
  weight?: number; // kg
  visionLeft?: number; // 如 5.0
  visionRight?: number; // 如 4.8
  sleepHours?: number; // 睡眠小时
  exerciseMin?: number; // 运动分钟
  mood?: string; // 好/中/差
  note?: string;
}
export interface DecisionOption {
  name: string;
  pros?: string;
  cons?: string;
  weight?: number; // 权重 0-100
}
export interface DecisionRecordLite {
  id: string;
  title: string;
  context?: string;
  options: DecisionOption[];
  decidedOption?: string;
  status?: string; // 进行中/已决/搁置
  dateDecided?: string; // YYYY-MM-DD
  note?: string;
}
// 学习能力画像 P 模块：6 个维度（1-5 分），键名用中文以对齐飞书字段
export interface AbilityRecordLite {
  id: string;
  date: string; // YYYY-MM-DD
  scores: {
    注意力?: number | null;
    工作记忆?: number | null;
    逻辑思维?: number | null;
    语言理解?: number | null;
    执行功能?: number | null;
    学习动机?: number | null;
  };
  note?: string;
}
// 营养与膳食管理 O 模块：一日四餐 + 饮水 + 补充剂
export interface NutritionRecordLite {
  id: string;
  date: string; // YYYY-MM-DD
  早餐?: string | null;
  午餐?: string | null;
  晚餐?: string | null;
  加餐?: string | null;
  饮水ml?: number | null;
  补充剂?: string | null;
  note?: string;
}
// 兴趣与阅读 C 模块：兴趣大类/活动名称/自发性(1-5)/沉浸度(1-5)/表现(1-5)/时长分钟/兴趣度(1-5) + 兼容旧阅读字段（书名/方式/阅读量/理解自评/家长观察），键名用中文以对齐飞书字段
export interface InterestRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  兴趣大类?: string | null;
  活动名称?: string | null;
  自发性?: number | null;
  沉浸度?: number | null;
  表现?: number | null;
  书名?: string | null;
  阅读方式?: string | null;
  时长分钟?: number | null;
  阅读量?: string | null;
  理解自评?: number | null;
  兴趣度?: number | null;
  家长观察?: string | null;
  note?: string;
}
// 亲子关系 D 模块：活动类型/时长/孩子情绪(1-5)/家长情绪(1-5)/沟通要点，键名用中文以对齐飞书字段
export interface ParentingRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  活动类型?: string | null;
  时长分钟?: number | null;
  孩子情绪?: number | null;
  家长情绪?: number | null;
  沟通要点?: string | null;
  note?: string;
}
// 中高考升学助手 F 模块：日期/考试名/总分/满分/估算位次/目标学校，键名用中文以对齐飞书字段
export interface AdmissionRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  考试名?: string | null;
  总分?: number | null;
  满分?: number | null;
  估算位次?: number | null;
  目标学校?: string | null;
  note?: string;
}
// 五育综评对齐 K 模块：日期/类别/学科/项目/佐证材料/状态
export interface ComprehensiveRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  类别?: string | null;
  学科?: string | null;  // 2026-08-05 新增：江苏"3+1+2"高考 9 门 + 其他
  项目?: string | null;
  佐证材料?: string | null;
  状态?: string | null;
  note?: string;
}
// 家校沟通台账 T 模块：日期/渠道/来源/内容摘要/类型，键名用中文以对齐飞书字段
export interface HomeSchoolRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  渠道?: string | null;
  来源?: string | null;
  内容摘要?: string | null;
  类型?: string | null;
  note?: string;
}
// 目标管理 I 模块：创建日期/目标类别/目标内容/截止日期/状态/进度/复盘，键名用中文以对齐飞书字段
export interface GoalRecordLite {
  id: string
  创建日期?: string | null; // YYYY-MM-DD
  目标类别?: string | null;
  目标内容?: string | null;
  截止日期?: string | null; // YYYY-MM-DD
  状态?: string | null;
  进度?: number | null;
  复盘?: string | null;
  note?: string;
}
// 时间管理与习惯养成 H 模块：日期/习惯名/是否完成/时长分钟，键名用中文以对齐飞书字段
export interface HabitRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  习惯名?: string | null;
  是否完成?: number | null;
  时长分钟?: number | null;
  note?: string;
}
// 生涯启蒙与职业探索 J 模块：日期/主题方向/方向领域/触发来源/想法描述/状态，键名用中文以对齐飞书字段
export interface CareerRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  主题方向?: string | null;
  方向领域?: string | null;
  触发来源?: string | null;
  想法描述?: string | null;
  状态?: string | null;
  note?: string;
}
// 职业体验库 R 模块：日期/体验职业/形式/地点机构/时长分钟/兴趣评分/收获感想，键名用中文以对齐飞书字段
export interface ExperienceRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  体验职业?: string | null;
  形式?: string | null;
  地点机构?: string | null;
  时长分钟?: number | null;
  兴趣评分?: number | null;
  收获感想?: string | null;
  note?: string;
}
// 家庭资源与人脉图谱 M 模块：日期/资源名称/类别/来源/状态，键名用中文以对齐飞书字段
export interface ResourceRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  资源名称?: string | null;
  类别?: string | null;
  来源?: string | null;
  状态?: string | null;
  note?: string;
}
// 成长档案管理 G 模块：日期/标题/类别/描述/佐证材料，键名用中文以对齐飞书字段
export interface ArchiveRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  标题?: string | null;
  类别?: string | null;
  描述?: string | null;
  佐证材料?: string | null;
  note?: string;
}
// 多维预警中心 L 模块：日期/级别/维度/内容/已处理，键名用中文以对齐飞书字段
export interface AlertRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  级别?: string | null;
  维度?: string | null;
  内容?: string | null;
  已处理?: number | null;
  note?: string;
}
// 隐私与合规 N 模块：日期/类型/内容/状态，键名用中文以对齐飞书字段
export interface PrivacyRecordLite {
  id: string
  date: string; // YYYY-MM-DD
  类型?: string | null;
  内容?: string | null;
  状态?: string | null;
  note?: string;
}

async function post(path: string, body: any): Promise<any> {
  const base = getFcUrl();
  if (!base) throw new Error("未配置同步地址");
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("同步失败：" + res.status);
  return res.json();
}

export const feishuSync = {
  pullExam: () => post("/exam", { action: "pull" }).then((r) => (r.exams as ExamRecordLite[]) || []),
  pushExam: (records: ExamRecordLite[]) => post("/exam", { action: "push", records }),
  deleteExam: (ids: string[]) => post("/exam", { action: "delete", ids }),
  pullWeak: () => post("/weak", { action: "pull" }).then((r) => (r.weak as WeakPointLite[]) || []),
  pushWeak: (records: WeakPointLite[]) => post("/weak", { action: "push", records }),
  deleteWeak: (ids: string[]) => post("/weak", { action: "delete", ids }),
  pullHealth: () => post("/health", { action: "pull" }).then((r) => (r.health as HealthRecordLite[]) || []),
  pushHealth: (records: HealthRecordLite[]) => post("/health", { action: "push", records }),
  deleteHealth: (ids: string[]) => post("/health", { action: "delete", ids }),
  pullDecision: () => post("/decision", { action: "pull" }).then((r) => (r.decisions as DecisionRecordLite[]) || []),
  pushDecision: (records: DecisionRecordLite[]) => post("/decision", { action: "push", records }),
  deleteDecision: (ids: string[]) => post("/decision", { action: "delete", ids }),
  pullAbility: () => post("/ability", { action: "pull" }).then((r) => (r.abilities as AbilityRecordLite[]) || []),
  pushAbility: (records: AbilityRecordLite[]) => post("/ability", { action: "push", records }),
  deleteAbility: (ids: string[]) => post("/ability", { action: "delete", ids }),
  pullNutrition: () => post("/nutrition", { action: "pull" }).then((r) => (r.nutritions as NutritionRecordLite[]) || []),
  pushNutrition: (records: NutritionRecordLite[]) => post("/nutrition", { action: "push", records }),
  deleteNutrition: (ids: string[]) => post("/nutrition", { action: "delete", ids }),
  pullInterest: () => post("/interest", { action: "pull" }).then((r) => (r.interests as InterestRecordLite[]) || []),
  pushInterest: (records: InterestRecordLite[]) => post("/interest", { action: "push", records }),
  deleteInterest: (ids: string[]) => post("/interest", { action: "delete", ids }),
  pullParenting: () => post("/parenting", { action: "pull" }).then((r) => (r.parentings as ParentingRecordLite[]) || []),
  pushParenting: (records: ParentingRecordLite[]) => post("/parenting", { action: "push", records }),
  deleteParenting: (ids: string[]) => post("/parenting", { action: "delete", ids }),
  pullAdmission: () => post("/admission", { action: "pull" }).then((r) => (r.admissions as AdmissionRecordLite[]) || []),
  pushAdmission: (records: AdmissionRecordLite[]) => post("/admission", { action: "push", records }),
  deleteAdmission: (ids: string[]) => post("/admission", { action: "delete", ids }),
  pullComprehensive: () => post("/comprehensive", { action: "pull" }).then((r) => (r.comprehensives as ComprehensiveRecordLite[]) || []),
  pushComprehensive: (records: ComprehensiveRecordLite[]) => post("/comprehensive", { action: "push", records }),
  deleteComprehensive: (ids: string[]) => post("/comprehensive", { action: "delete", ids }),
  pullHomeSchool: () => post("/homeSchool", { action: "pull" }).then((r) => (r.homeSchools as HomeSchoolRecordLite[]) || []),
  pushHomeSchool: (records: HomeSchoolRecordLite[]) => post("/homeSchool", { action: "push", records }),
  deleteHomeSchool: (ids: string[]) => post("/homeSchool", { action: "delete", ids }),
  pullGoal: () => post("/goal", { action: "pull" }).then((r) => (r.goals as GoalRecordLite[]) || []),
  pushGoal: (records: GoalRecordLite[]) => post("/goal", { action: "push", records }),
  deleteGoal: (ids: string[]) => post("/goal", { action: "delete", ids }),
  pullHabit: () => post("/habit", { action: "pull" }).then((r) => (r.habits as HabitRecordLite[]) || []),
  pushHabit: (records: HabitRecordLite[]) => post("/habit", { action: "push", records }),
  deleteHabit: (ids: string[]) => post("/habit", { action: "delete", ids }),
  pullCareer: () => post("/career", { action: "pull" }).then((r) => (r.careers as CareerRecordLite[]) || []),
  pushCareer: (records: CareerRecordLite[]) => post("/career", { action: "push", records }),
  deleteCareer: (ids: string[]) => post("/career", { action: "delete", ids }),
  pullExperience: () => post("/experience", { action: "pull" }).then((r) => (r.experiences as ExperienceRecordLite[]) || []),
  pushExperience: (records: ExperienceRecordLite[]) => post("/experience", { action: "push", records }),
  deleteExperience: (ids: string[]) => post("/experience", { action: "delete", ids }),
  pullResource: () => post("/resource", { action: "pull" }).then((r) => (r.resources as ResourceRecordLite[]) || []),
  pushResource: (records: ResourceRecordLite[]) => post("/resource", { action: "push", records }),
  deleteResource: (ids: string[]) => post("/resource", { action: "delete", ids }),
  pullArchive: () => post("/archive", { action: "pull" }).then((r) => (r.archives as ArchiveRecordLite[]) || []),
  pushArchive: (records: ArchiveRecordLite[]) => post("/archive", { action: "push", records }),
  deleteArchive: (ids: string[]) => post("/archive", { action: "delete", ids }),
  pullAlert: () => post("/alert", { action: "pull" }).then((r) => (r.alerts as AlertRecordLite[]) || []),
  pushAlert: (records: AlertRecordLite[]) => post("/alert", { action: "push", records }),
  deleteAlert: (ids: string[]) => post("/alert", { action: "delete", ids }),
  pullPrivacy: () => post("/privacy", { action: "pull" }).then((r) => (r.privacies as PrivacyRecordLite[]) || []),
  pushPrivacy: (records: PrivacyRecordLite[]) => post("/privacy", { action: "push", records }),
  deletePrivacy: (ids: string[]) => post("/privacy", { action: "delete", ids }),
};
