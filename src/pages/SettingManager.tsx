import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Card, Tabs, Input, Button, Switch, Space, App, Alert, Form, DatePicker, Tag, Tooltip,
  Empty, Row, Col, Statistic, Divider, Modal, Radio, message as antdMsg
} from 'antd'
import {
  CloudSyncOutlined, LinkOutlined, ExportOutlined, ImportOutlined,
  ReloadOutlined, InfoCircleOutlined, DeleteOutlined, ApiOutlined,
  CheckCircleTwoTone, CloseCircleTwoTone
} from '@ant-design/icons'
import {
  getFcUrl, setFcUrl, getCloudSync, setCloudSync,
  getReadBuddyUrl, setReadBuddyUrl,
  feishuSync, useCloudOn, useSyncHealth
} from '../store/feishuSync'
import { useAppStore, calcGradeByBirthday } from '../store/useAppStore'

// 列出所有模块 → 飞书同步路径 → 对应 store 的 syncFromCloud 函数
// 这里采取"白名单"：每个模块一行 + 一个"立即同步"按钮
type ModuleSync = {
  key: string
  name: string
  desc: string
  pull: () => Promise<any>
}

// 注意：这里我们不直接 import 各 store，避免循环依赖；改为按 key 调用 feishuSync 内的 pull 接口，
// 然后让各模块在自己 mount 时再合并（已合并逻辑见各 Manager 的 syncFromCloud）。
// 在设置页这里只测试 FC 连通性 + 拉一条空检查（接口存在性）。
const moduleSyncList: ModuleSync[] = [
  { key: 'A', name: '成绩管理', desc: '考试/分数/排名 + 薄弱点', pull: () => feishuSync.pullExam() },
  { key: 'B', name: '身心监测', desc: '身高/体重/视力/睡眠/运动/心情', pull: () => feishuSync.pullHealth() },
  { key: 'C', name: '兴趣与阅读', desc: '兴趣大类 + 4 大信号 + 阅读', pull: () => feishuSync.pullInterest() },
  { key: 'D', name: '亲子互动', desc: '陪伴时长 + 情绪 + 沟通要点', pull: () => feishuSync.pullParenting() },
  { key: 'E', name: '择校决策', desc: '选项/优劣/权重/结论', pull: () => feishuSync.pullDecision() },
  { key: 'F', name: '升学助手', desc: '模考/位次/目标校', pull: () => feishuSync.pullAdmission() },
  { key: 'G', name: '成长档案', desc: '里程碑/获奖/作品', pull: () => feishuSync.pullArchive() },
  { key: 'H', name: '习惯打卡', desc: '完成率/坚持率', pull: () => feishuSync.pullHabit() },
  { key: 'I', name: '目标管理', desc: '短中长期目标 + 进度', pull: () => feishuSync.pullGoal() },
  { key: 'J', name: '生涯启蒙', desc: '职业方向/触发/状态', pull: () => feishuSync.pullCareer() },
  { key: 'K', name: '五育综评', desc: '德智体美劳+学科', pull: () => feishuSync.pullComprehensive() },
  { key: 'L', name: '多维预警', desc: '预警记录/处理闭环', pull: () => feishuSync.pullAlert() },
  { key: 'M', name: '家庭资源', desc: '人脉/资源/对接', pull: () => feishuSync.pullResource() },
  { key: 'N', name: '隐私合规', desc: '同意/暂停/勘误', pull: () => feishuSync.pullPrivacy() },
  { key: 'O', name: '营养膳食', desc: '三餐/饮水/补充剂', pull: () => feishuSync.pullNutrition() },
  { key: 'P', name: '学习能力', desc: '6 维能力画像', pull: () => feishuSync.pullAbility() },
  { key: 'R', name: '职业体验', desc: '体验/形式/收获', pull: () => feishuSync.pullExperience() },
  { key: 'T', name: '家校沟通', desc: '渠道/类型/摘要', pull: () => feishuSync.pullHomeSchool() },
]

const { TextArea } = Input

export default function SettingManager() {
  const { message: msg } = App.useApp()
  const child = useAppStore((s) => s.child)
  const setChild = useAppStore((s) => s.setChild)

  // 云同步：本地 state 仅用于"待保存"输入，保存后通过 setFcUrl 写 localStorage
  const [fcUrl, setFcUrlInput] = useState(getFcUrl())
  const [cloudOn, setCloudOnInput] = useState(getCloudSync())
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pingResult, setPingResult] = useState<{ ok: boolean; text: string } | null>(null)
  const liveOn = useCloudOn() // 实时跟随 localStorage 变化的全局开关

  // 同步健康：上次成功时间 + 上次失败（来自 feishuSync 的 localStorage 埋点）
  const { lastSync, lastErr } = useSyncHealth()
  const fmtSync = (iso: string) => (iso ? dayjs(iso).format('MM-DD HH:mm') : '从未')
  const syncHealth = useMemo(() => {
    if (lastErr && (!lastSync || new Date(lastErr.at).getTime() > new Date(lastSync).getTime()))
      return { text: '上次同步出错', color: '#EF4444' }
    if (!lastSync) return { text: '从未同步', color: '#94A3B8' }
    const diffH = (Date.now() - new Date(lastSync).getTime()) / 3600000
    if (diffH <= 24) return { text: '正常（24h内）', color: '#0EA5A4' }
    return { text: '较久未同步', color: '#F59E0B' }
  }, [lastSync, lastErr])

  // 读伴地址
  const [rbUrl, setRbUrlInput] = useState(getReadBuddyUrl())
  const [rbMsg, setRbMsg] = useState<string>('')

  // 备份/恢复
  const [importText, setImportText] = useState('')

  // 孩子信息
  const [childForm] = Form.useForm()
  useEffect(() => {
    childForm.setFieldsValue({
      name: child.name, birthday: child.birthday, gender: child.gender,
      school: child.school, grade: child.grade
    })
  }, [child, childForm])

  // 年级推算提示：实时跟随表单里改动的生日
  const watchedBirthday = Form.useWatch('birthday', childForm)
  const gradeHint = useMemo(
    () => calcGradeByBirthday(watchedBirthday?.format?.('YYYY-MM-DD') || child.birthday),
    [watchedBirthday, child.birthday]
  )

  // 同步地址保存
  const saveFc = () => {
    setFcUrl(fcUrl.trim())
    msg.success('同步地址已保存（仅存本机）')
  }
  // 开关切换
  const toggleCloud = (v: boolean) => {
    setCloudSync(v)
    setCloudOnInput(v)
    if (v && !fcUrl) {
      msg.warning('请先填写同步地址再开启')
      setCloudSync(false); setCloudOnInput(false); return
    }
    msg.success(v ? '已开启云同步' : '已关闭云同步（退回纯本地）')
  }

  // 连通性测试：随便发一个最小 pull 看是否回 200
  const pingFc = async () => {
    if (!fcUrl) { msg.warning('请先填写同步地址'); return }
    setPingResult(null)
    try {
      const list = await feishuSync.pullExam()
      setPingResult({ ok: true, text: `连通正常（成绩表拉取 0 条记录：${list?.length ?? 0}）` })
    } catch (e: any) {
      setPingResult({ ok: false, text: '连通失败：' + (e?.message || '未知错误') })
    }
  }

  // 一键拉全部（按模块顺序）
  const syncAll = async () => {
    if (!liveOn) { msg.warning('请先开启云同步并填写地址'); return }
    setSyncing(true); setSyncMsg(null)
    let totalOk = 0
    const fails: string[] = []
    for (const m of moduleSyncList) {
      try {
        const r = await m.pull()
        totalOk += (r as any[])?.length ?? 0
      } catch (e: any) {
        fails.push(`${m.name}: ${e?.message || '失败'}`)
      }
    }
    setSyncing(false)
    if (fails.length === 0) setSyncMsg({ ok: true, text: `全部连通，已拉到本地 ${totalOk} 条记录（合并需在各模块页确认）` })
    else setSyncMsg({ ok: false, text: `${moduleSyncList.length - fails.length} 个模块成功，${fails.length} 个失败：` + fails.join('；').slice(0, 80) })
  }

  // 读伴地址
  const saveRb = () => {
    setReadBuddyUrl(rbUrl.trim())
    setRbMsg('已保存读伴地址')
    setTimeout(() => setRbMsg(''), 2000)
  }

  // 数据导出（合并所有 zustand persist 存储为一份 JSON）
  const exportAll = () => {
    const dump: Record<string, any> = { __version: '1', __exportedAt: new Date().toISOString() }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || k.startsWith('lark_') || k.startsWith('chs_')) continue // 飞书 token 不导出
      const v = localStorage.getItem(k)
      try { dump[k] = JSON.parse(v ?? '') } catch { dump[k] = v }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `growth-workbench-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    msg.success('已导出全站数据 JSON')
  }

  // 数据恢复
  const importAll = () => {
    if (!importText.trim()) { msg.warning('请先粘贴备份 JSON'); return }
    try {
      const obj = JSON.parse(importText)
      let count = 0
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('__')) continue
        if (typeof v === 'string') localStorage.setItem(k, v)
        else localStorage.setItem(k, JSON.stringify(v))
        count++
      }
      msg.success(`已恢复 ${count} 项配置/数据，请刷新页面生效`)
      setImportText('')
    } catch (e: any) {
      msg.error('JSON 格式错误：' + (e?.message || ''))
    }
  }

  // 清空全部（危险）
  const confirmClearAll = () => {
    Modal.confirm({
      title: '确定清空全部本地数据？',
      content: '将删除所有模块的本地记录和配置（含同步地址）。云端飞书数据不受影响。刷新页面后无法恢复。',
      okText: '我已备份，清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.clear()
        msg.success('已清空全部本地数据，3 秒后刷新...')
        setTimeout(() => location.reload(), 3000)
      }
    })
  }

  const childSave = (v: any) => {
    setChild({
      name: v.name, birthday: v.birthday?.format?.('YYYY-MM-DD') || v.birthday,
      gender: v.gender, school: v.school, grade: v.grade
    })
    msg.success('孩子档案已保存')
  }

  // ===== 顶部状态条 =====
  const statusStrip = useMemo(() => {
    if (!fcUrl && !liveOn) return <Alert type="info" showIcon message="当前未配置同步地址，数据仅保存在本机浏览器（换电脑/清浏览器会丢）。" />
    if (!fcUrl && liveOn) return <Alert type="warning" showIcon message="已开启云同步开关但未配置地址，配置后才会真正生效。" />
    if (fcUrl && !liveOn) return <Alert type="info" showIcon message="已配置同步地址但开关未开启，开启后才会写入飞书。" />
    return <Alert type="success" showIcon message="云同步已开启：所有模块的新数据会自动写入飞书多维表格。" />
  }, [fcUrl, liveOn])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>设置</h2>
        <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
          全局配置、云同步、读伴入口、数据备份与恢复都在这里。
        </div>
      </div>

      {statusStrip}

      <Tabs
        defaultActiveKey="cloud"
        style={{ marginTop: 12 }}
        items={[
          {
            key: 'cloud',
            label: <span><CloudSyncOutlined /> 云同步</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={14}>
                  <Card size="small" title="飞书云同步（阿里云 FC 代理）">
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      <div>
                        <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                          <ApiOutlined /> FC 同步地址
                          <Tooltip title="阿里云函数计算的公网访问地址，形如 https://xxx.cn-hangzhou.fc.devsapp.net。仅存在你的浏览器本机，不上传任何地方。">
                            <InfoCircleOutlined style={{ marginLeft: 4, color: '#94A3B8' }} />
                          </Tooltip>
                        </div>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            placeholder="粘贴 FC 同步地址，如 https://xxx.cn-hangzhou.fc.devsapp.net"
                            value={fcUrl}
                            onChange={(e) => setFcUrlInput(e.target.value)}
                            allowClear
                            style={{ width: 'calc(100% - 80px)' }}
                          />
                          <Button onClick={saveFc} type="primary">保存</Button>
                        </Space.Compact>
                      </div>

                      <Space wrap>
                        <span style={{ color: '#475569' }}>同步开关</span>
                        <Switch checked={cloudOn} onChange={toggleCloud} checkedChildren="开" unCheckedChildren="关" />
                        <Tag color={liveOn ? 'green' : 'default'}>
                          当前：{liveOn ? '已开启' : '未开启'}
                        </Tag>
                        <Button onClick={pingFc} icon={<LinkOutlined />}>连通测试</Button>
                        <Button type="primary" onClick={syncAll} loading={syncing} icon={<CloudSyncOutlined />}>
                          一键拉取所有模块
                        </Button>
                      </Space>

                      {(syncMsg || pingResult) && (
                        <div style={{ fontSize: 13 }}>
                          {pingResult && (
                            <div style={{ color: pingResult.ok ? '#0EA5A4' : '#EF4444' }}>
                              {pingResult.ok ? <CheckCircleTwoTone twoToneColor="#0EA5A4" /> : <CloseCircleTwoTone twoToneColor="#EF4444" />}
                              {' '}{pingResult.text}
                            </div>
                          )}
                          {syncMsg && (
                            <div style={{ color: syncMsg.ok ? '#0EA5A4' : '#EF4444' }}>
                              {syncMsg.text}
                            </div>
                          )}
                        </div>
                      )}

                      <Alert
                        type="info" showIcon
                        message="数据存飞书多维表格（境内合规）。飞书 app_id/secret 在服务端 FC 环境变量，地址仅存你本机。关掉开关即退回纯本地。"
                      />
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={10}>
                  <Card size="small" title="同步状态速览">
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic
                          title="已配置地址"
                          value={fcUrl ? '是' : '否'}
                          valueStyle={{ color: fcUrl ? '#0EA5A4' : '#94A3B8', fontSize: 18 }}
                          prefix={fcUrl ? <CheckCircleTwoTone twoToneColor="#0EA5A4" /> : <CloseCircleTwoTone twoToneColor="#94A3B8" />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="云同步"
                          value={liveOn ? '开启' : '关闭'}
                          valueStyle={{ color: liveOn ? '#0EA5A4' : '#94A3B8', fontSize: 18 }}
                          prefix={liveOn ? <CheckCircleTwoTone twoToneColor="#0EA5A4" /> : <CloseCircleTwoTone twoToneColor="#94A3B8" />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="上次同步成功"
                          value={fmtSync(lastSync)}
                          valueStyle={{ color: syncHealth.color, fontSize: 16 }}
                          prefix={<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: syncHealth.color, marginRight: 6, verticalAlign: 'middle' }} />}
                        />
                      </Col>
                    </Row>
                    <Divider style={{ margin: '12px 0' }} />
                    {lastErr && (
                      <Alert type="error" showIcon style={{ marginBottom: 8 }}
                        message={`上次同步失败（${dayjs(lastErr.at).format('MM-DD HH:mm')}）：${lastErr.msg}`} />
                    )}
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                      <div>· 数据本地优先：所有录入先存浏览器，关掉开关就退回纯本地。</div>
                      <div>· 开启后：每个模块首次打开会自动从飞书拉取合并。</div>
                      <div>· 新数据：录入/修改/删除时会自动 push 到飞书对应表。</div>
                      <div>· 18 张表覆盖 A–S 全部模块（除 S 隐私合规已并入 N）。</div>
                    </div>
                  </Card>
                </Col>

                <Col xs={24}>
                  <Card size="small" title="按模块拉取（点哪个拉哪个）">
                    <Row gutter={[8, 8]}>
                      {moduleSyncList.map((m) => (
                        <Col xs={12} sm={8} md={6} lg={4} key={m.key}>
                          <Card size="small" hoverable style={{ background: '#F8FAFC' }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>{m.desc}</div>
                            <Button
                              size="small" type="link" icon={<ReloadOutlined />}
                              disabled={!liveOn}
                              onClick={async () => {
                                try {
                                  const list = await m.pull()
                                  antdMsg.success(`${m.name}：拉到 ${list?.length ?? 0} 条（合并在对应模块页生效）`)
                                } catch (e: any) {
                                  antdMsg.error(`${m.name} 失败：${e?.message || ''}`)
                                }
                              }}
                            >
                              拉取
                            </Button>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'readbuddy',
            label: <span><LinkOutlined /> 读伴入口</span>,
            children: (
              <Card size="small" title="读伴 ReadingBuddy 公网地址">
                <p style={{ color: '#64748B', fontSize: 13 }}>
                  把 iPad 上的「读伴」网页部署到阿里云 FC 后，地址填到这里。C兴趣模块顶部会出现「打开读伴」按钮。
                </p>
                <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                  <Input
                    placeholder="https://xxx.cn-hangzhou.fc.devsapp.net/reading-buddy"
                    value={rbUrl}
                    onChange={(e) => setRbUrlInput(e.target.value)}
                    allowClear
                  />
                  <Button type="primary" onClick={saveRb}>保存</Button>
                </Space.Compact>
                {rbMsg && <div style={{ marginTop: 8, color: '#0EA5A4' }}>{rbMsg}</div>}
                <Divider />
                <Alert type="info" showIcon message="未配置时，C 模块的读伴入口按钮不会显示。不影响数据记录功能。" />
              </Card>
            )
          },
          {
            key: 'profile',
            label: <span><InfoCircleOutlined /> 孩子档案</span>,
            children: (
              <Card size="small" title="孩子基本信息">
                <Form form={childForm} layout="vertical" onFinish={childSave} style={{ maxWidth: 480 }}>
                  <Form.Item name="name" label="姓名 / 昵称" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="birthday" label="生日"><DatePicker style={{ width: '100%' }} /></Form.Item>
                  <Form.Item name="gender" label="性别">
                    <Radio.Group optionType="button" buttonStyle="solid">
                      <Radio value="女">女</Radio>
                      <Radio value="男">男</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item name="school" label="学校"><Input /></Form.Item>
                  <Form.Item name="grade" label="年级"><Input placeholder="如 四年级" /></Form.Item>
                  {gradeHint && (
                    <div style={{ color: '#64748B', fontSize: 12, marginTop: -12, marginBottom: 16, lineHeight: 1.6 }}>
                      按生日推算：当前为 <b>{gradeHint.current}</b>（{dayjs().year() + 1} 年 9 月起 {gradeHint.next}）。
                      如需手写（如「四年级·预习中」）可覆盖上面的框。
                    </div>
                  )}
                  <Button type="primary" htmlType="submit">保存档案</Button>
                </Form>
              </Card>
            )
          },
          {
            key: 'backup',
            label: <span><ExportOutlined /> 数据备份</span>,
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card size="small" title="导出全站数据">
                    <p style={{ color: '#64748B', fontSize: 13 }}>
                      把浏览器里的所有本地数据（含各模块记录、阈值配置、地址）打包成一个 JSON 文件下载。换电脑/重装浏览器后用「导入」恢复。
                    </p>
                    <Button type="primary" icon={<ExportOutlined />} onClick={exportAll}>导出 JSON</Button>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card size="small" title="导入备份">
                    <p style={{ color: '#64748B', fontSize: 13 }}>
                      粘贴之前导出的 JSON 文本，将覆盖本地数据。建议先导出当前数据再导入。
                    </p>
                    <TextArea rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"growth-workbench-m0": {...}}' />
                    <Space style={{ marginTop: 12 }}>
                      <Button icon={<ImportOutlined />} onClick={importAll}>导入并恢复</Button>
                      <Button onClick={() => setImportText('')}>清空输入框</Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card size="small" title={<span><DeleteOutlined style={{ color: '#EF4444' }} /> 危险操作</span>}>
                    <p style={{ color: '#64748B', fontSize: 13 }}>
                      清空浏览器里的所有本地配置和记录（云端飞书数据不受影响）。操作前请先导出备份。
                    </p>
                    <Button danger onClick={confirmClearAll}>清空全部本地数据</Button>
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'about',
            label: <span><InfoCircleOutlined /> 关于</span>,
            children: (
              <Card size="small" title="成长·升学工作台">
                <Row gutter={16}>
                  <Col xs={12} md={6}><Statistic title="版本" value="M2 (2026-08)" /></Col>
                  <Col xs={12} md={6}><Statistic title="真模块" value={18} suffix="个" /></Col>
                  <Col xs={12} md={6}><Statistic title="本地存储" value="localStorage" /></Col>
                  <Col xs={12} md={6}><Statistic title="云端" value="飞书多维表格" /></Col>
                </Row>
                <Divider />
                <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
                  <div>· 数据底座：本地优先（浏览器 localStorage），开启云同步后写入飞书多维表格。</div>
                  <div>· 隐私：所有密钥仅在服务端 FC 环境变量；前端只存公网地址。</div>
                  <div>· 合规：硬约束包括不诊断、防焦虑、规划只到高考、孩子可暂停记录。</div>
                  <div>· 工程师：AI 协作搭建，老徐（非 IT）本机自维护，源代码 GitHub 私有。</div>
                </div>
              </Card>
            )
          },
        ]}
      />
    </div>
  )
}