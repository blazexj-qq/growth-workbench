import { useMemo, useState, useEffect } from 'react'
import {
  Card, Tabs, Form, Select, Input, InputNumber, DatePicker, Button, Table, Tag,
  Empty, Statistic, Row, Col, Space, App, Divider, message, Switch, Modal,
  Alert, Upload
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useScoreStore, SUBJECTS, SUBJECT_REFERENCE, type ExamRecord, type Subject, type WeakPoint, type WeakStatus } from '../store/useScoreStore'
import { feishuSync, useCloudOn } from '../store/feishuSync'
import { axisBase, splitLineBase, darkTooltip, LABEL_COLOR, SUB_COLOR } from '../utils/chartStyle'

const { TextArea } = Input

// 把一行 CSV 解析成薄弱点；返回 ok 行 或 null（格式错误）
function parseCsvLine(ln: string): Omit<WeakPoint, 'id'> | null {
  // 支持半角逗号；允许空行；不区分大小写的字段名首行（视为表头跳过）
  const parts = ln.split(',').map((s) => s.trim())
  if (parts.length < 4) return null
  const [subject, knowledge, reason, date] = parts
  if (!subject || !knowledge || !reason || !date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!SUBJECTS.includes(subject as Subject)) return null
  return {
    subject: subject as Subject,
    knowledge,
    reason,
    date,
    status: '未过关',
    source: '错题管家',
  }
}

function parseCsv(text: string): { rows: Omit<WeakPoint, 'id'>[]; bad: number; skippedHeader: boolean; totalLines: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (!lines.length) return { rows: [], bad: 0, skippedHeader: false, totalLines: 0 }
  let skippedHeader = false
  let start = 0
  // 检测首行是否为表头（中文"科目"开头 / 英文"subject"开头）
  const first = lines[0].toLowerCase()
  if (first.includes('subject') || first.includes('科目')) {
    skippedHeader = true
    start = 1
  }
  const rows: Omit<WeakPoint, 'id'>[] = []
  let bad = 0
  for (let i = start; i < lines.length; i++) {
    const r = parseCsvLine(lines[i])
    if (r) rows.push(r); else bad++
  }
  return { rows, bad, skippedHeader, totalLines: lines.length - (skippedHeader ? 1 : 0) }
}

const SUBJECT_COLOR: Record<string, string> = {
  语文: '#0EA5A4',
  数学: '#F59E0B',
  英语: '#6366F1',
  科学: '#10B981',
  道德与法治: '#EF4444',
  物理: '#3B82F6',
  历史: '#A855F7',
  化学: '#06B6D4',
  生物: '#22C55E',
  '政治(思政)': '#F43F5E',
  地理: '#84CC16',
  体育: '#14B8A6',
  音乐: '#8B5CF6',
  美术: '#EC4899',
  信息技术: '#0EA5A4',
  劳动: '#D97706',
  其他: '#94A3B8',
}

function newId() {
  return 's_' + Math.random().toString(36).slice(2, 9)
}

export default function ScoreManager() {
  const { exams, weakPoints, addExam, deleteExam, updateExam, importWeakPoints, updateWeakStatus, clearWeakPoints, pushWeakAll, pushExamAll, syncFromCloud } = useScoreStore()
  const { message: msg } = App.useApp()

  // 云同步：全站共享配置，hook 响应式获取
  const cloudOn = useCloudOn()
  useEffect(() => { if (cloudOn) syncFromCloud() /* eslint-disable-next-line */ }, [cloudOn])
  const [form] = Form.useForm()
  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const isEditing = !!editingId
  const resetForm = () => { form.resetFields(); setEditingId(null) }
  const [csv, setCsv] = useState('')
  // 一键导入：GitHub URL / 本地文件
  const [ghUrl, setGhUrl] = useState('')
  const [ghLoading, setGhLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)

  // 导入结果弹窗
  const [report, setReport] = useState<null | { ok: boolean; msg: string; details: { inserted: number; duplicate: number; bad: number; total: number } }>(null)



  // 各科平均分（薄弱点推导依据）
  const subjectAvg = useMemo(() => {
    const map: Record<string, { sum: number; n: number }> = {}
    exams.forEach((e) => {
      const pct = (e.score / e.fullScore) * 100
      if (!map[e.subject]) map[e.subject] = { sum: 0, n: 0 }
      map[e.subject].sum += pct
      map[e.subject].n += 1
    })
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.sum / v.n]))
  }, [exams])

  const weakSubjects = useMemo(
    () => Object.entries(subjectAvg).filter(([, v]) => v < 90).map(([k]) => k),
    [subjectAvg]
  )

  // 趋势图数据：按科目分组成多条线
  const trendOption = useMemo(() => {
    const bySubject: Record<string, ExamRecord[]> = {}
    exams.forEach((e) => {
      if (!bySubject[e.subject]) bySubject[e.subject] = []
      bySubject[e.subject].push(e)
    })
    const allDates = Array.from(new Set(exams.map((e: ExamRecord) => e.date))).sort() as string[]
    const series = Object.entries(bySubject).map(([sub, list]) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
      const dataMap = new Map<string, number>(sorted.map((e) => [e.date, +((e.score / e.fullScore) * 100).toFixed(1)] as [string, number]))
      return {
        name: sub,
        type: 'line',
        smooth: true,
        data: allDates.map((d: string) => dataMap.get(d) ?? null),
        itemStyle: { color: SUBJECT_COLOR[sub] },
        connectNulls: true
      }
    })
    return {
      grid: { left: 48, right: 24, top: 40, bottom: 36, containLabel: true },
      tooltip: { ...darkTooltip(), trigger: 'axis', valueFormatter: (v: any) => (v == null ? '-' : v + ' 分') },
      legend: { top: 0, textStyle: { color: LABEL_COLOR, fontSize: 12 } },
      xAxis: { ...axisBase(), type: 'category', data: allDates, boundaryGap: false },
      yAxis: { ...axisBase(), type: 'value', min: 0, max: 100, name: '得分率%', nameTextStyle: { color: SUB_COLOR, fontSize: 11 }, splitLine: splitLineBase },
      series: series.map((s) => ({ ...s, smooth: true, symbolSize: 7, lineStyle: { width: 2.5 } })),
    }
  }, [exams])

  const onAdd = (values: any) => {
    const rec: ExamRecord = {
      id: newId(),
      subject: values.subject,
      examName: values.examName,
      date: values.date.format('YYYY-MM-DD'),
      score: values.score,
      fullScore: values.fullScore ?? 100,
      classRank: values.classRank || undefined,
      gradeRank: values.gradeRank || undefined,
      note: values.note || '',
    }
    addExam(rec)
    form.resetFields()
    msg.success('已保存成绩')
    if (cloudOn) feishuSync.pushExam([rec as any])
      .then(() => {})
      .catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
  }

  const onDeleteExam = (r: ExamRecord) => {
    deleteExam(r.id)
    if (cloudOn) feishuSync.deleteExam([r.id]).catch((e) => msg.warning('飞书删除失败：' + e.message))
  }

  const onEdit = (r: ExamRecord) => {
    setEditingId(r.id)
    form.setFieldsValue({
      subject: r.subject,
      examName: r.examName,
      date: dayjs(r.date),
      score: r.score,
      fullScore: r.fullScore,
      classRank: r.classRank,
      note: r.note,
    })
    msg.info('已载入该成绩，修改后点「更新」即可')
  }
  const onUpdate = (values: any) => {
    if (!editingId) return
    const patch = {
      subject: values.subject,
      examName: values.examName,
      date: values.date.format('YYYY-MM-DD'),
      score: values.score,
      fullScore: values.fullScore ?? 100,
      classRank: values.classRank || undefined,
      note: values.note || '',
    }
    updateExam(editingId, patch)
    msg.success('已更新成绩')
    setEditingId(null)
    form.resetFields()
    if (cloudOn) {
      const full = useScoreStore.getState().exams.find((r) => r.id === editingId)
      if (full) feishuSync.pushExam([full as any]).then(() => {}).catch((e) => msg.warning('已存本地，飞书同步失败：' + e.message))
    }
  }

  // 通用导入：解析 → 写入 → 报告
  const runImport = (text: string, source: string) => {
    const parsed = parseCsv(text)
    if (!parsed.rows.length && !parsed.bad) {
      msg.warning('没有可识别的内容')
      return
    }
    const r = importWeakPoints(parsed.rows)
    setReport({
      ok: r.inserted > 0,
      msg: r.inserted > 0
        ? `来自「${source}」已写入 ${r.inserted} 条薄弱点${r.duplicate ? `，${r.duplicate} 条与已有重复已跳过` : ''}`
        : `来自「${source}」未写入新数据${r.duplicate ? `（${r.duplicate} 条全部重复）` : ''}`,
      details: {
        inserted: r.inserted,
        duplicate: r.duplicate,
        bad: parsed.bad,
        total: parsed.totalLines,
      },
    })
    if (r.inserted > 0) pushWeakAll()
  }

  const onImportCsv = () => {
    if (!csv.trim()) return msg.warning('请先粘贴 CSV')
    runImport(csv, '手动粘贴')
    setCsv('')
  }

  const onFetchGh = async () => {
    const url = ghUrl.trim()
    if (!url) return msg.warning('请填写 GitHub raw URL')
    if (!/^https?:\/\/.+/.test(url)) return msg.warning('URL 必须以 http(s):// 开头')
    setGhLoading(true)
    try {
      // 直连 GitHub raw（沙箱若被 CORS 拦截，则提示用本地导入）
      const resp = await fetch(url, { method: 'GET' })
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      const text = await resp.text()
      runImport(text, 'GitHub')
      setGhUrl('')
    } catch (e: any) {
      msg.error('拉取失败：' + (e?.message || '网络/CORS 问题') + '。可改为「下载到本机 → 上传文件」。')
    } finally {
      setGhLoading(false)
    }
  }

  // 上传本地 CSV 文件
  const onPickFile = async (file: File) => {
    setFileLoading(true)
    try {
      const text = await file.text()
      runImport(text, file.name || '本地文件')
    } catch (e: any) {
      msg.error('读取文件失败：' + (e?.message || ''))
    } finally {
      setFileLoading(false)
    }
    return false // 阻止 Upload 默认上传
  }

  const examColumns: ColumnsType<ExamRecord> = [
    { title: '日期', dataIndex: 'date', width: 110 },
    { title: '科目', dataIndex: 'subject', width: 90, render: (s) => <Tag color={SUBJECT_COLOR[s]}>{s}</Tag> },
    { title: '考试', dataIndex: 'examName' },
    { title: '得分', render: (_, r) => `${r.score}/${r.fullScore}` },
    { title: '得分率', render: (_, r) => `${((r.score / r.fullScore) * 100).toFixed(1)}%` },
    { title: '班排', dataIndex: 'classRank', render: (v) => v ?? '-' },
    { title: '备注', dataIndex: 'note', ellipsis: true },
    { title: '操作', width: 120, render: (_, r) => (
      <Space size={4}>
        <Button type="link" size="small" disabled={isEditing && editingId !== r.id} onClick={() => onEdit(r)}>编辑</Button>
        <Button type="link" danger size="small" onClick={() => onDeleteExam(r)}>删除</Button>
      </Space>
    ) }
  ]

  const weakColumns: ColumnsType<WeakPoint> = [
    { title: '科目', dataIndex: 'subject', width: 90, render: (s) => <Tag color={SUBJECT_COLOR[s]}>{s}</Tag> },
    { title: '知识点', dataIndex: 'knowledge' },
    { title: '错因', dataIndex: 'reason', ellipsis: true },
    { title: '日期', dataIndex: 'date', width: 110 },
    {
      title: '状态', dataIndex: 'status', width: 130,
      render: (s: WeakStatus, r) => (
        <Select
          size="small" value={s}
          onChange={(v) => { updateWeakStatus(r.id, v); pushWeakAll() }}
          options={[{ value: '未过关', label: '未过关' }, { value: '复盘中', label: '复盘中' }, { value: '已掌握', label: '已掌握' }]}
        />
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>成绩管理</h2>
        <div style={{ color: '#64748B', fontSize: 13 }}>
          本地优先存储（刷新不丢）；开启云同步后数据写入飞书多维表格（境内）。得分率 = 得分 ÷ 满分。
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        {SUBJECTS.filter((s) => subjectAvg[s] != null).map((s) => (
          <Col key={s} xs={12} sm={8} md={6} lg={4}>
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Statistic title={s} value={+subjectAvg[s].toFixed(1)} suffix="%" valueStyle={{ color: subjectAvg[s] < 90 ? '#EF4444' : '#0EA5A4', fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {weakSubjects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="warning">重点科目（得分率&lt;90%）</Tag>
          {weakSubjects.map((s) => <Tag key={s} color={SUBJECT_COLOR[s]}>{s} {subjectAvg[s].toFixed(1)}%</Tag>)}
        </div>
      )}

      <Tabs
        items={[
          {
            key: 'input',
            label: '录入与记录',
            children: (
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Card size="small" title={isEditing ? '编辑该成绩' : '录入一次考试'} extra={isEditing ? <Button size="small" onClick={resetForm}>取消编辑</Button> : null} style={isEditing ? { borderColor: '#0EA5A4' } : undefined}>
                    <Form form={form} layout="vertical" onFinish={isEditing ? onUpdate : onAdd}>
                      <Form.Item name="subject" label="科目" rules={[{ required: true }]}>
                        <Select
                          placeholder="选科目（小学到高中 17 门全集）"
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            (option?.label as string)?.includes(input) ||
                            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                          options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                        />
                      </Form.Item>
                      <Form.Item name="examName" label="考试名称" rules={[{ required: true }]} initialValue="单元测试">
                        <Input placeholder="如：期中 / 期末 / 单元一" />
                      </Form.Item>
                      <Form.Item name="date" label="日期" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="score" label="得分" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="fullScore" label="满分" initialValue={100}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="classRank" label="班级排名（可选）">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="note" label="备注（可选）">
                        <Input placeholder="失分原因等" />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" block>{isEditing ? '更新记录' : '保存'}</Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card size="small" title={`已录成绩（${exams.length} 条）`}>
                    {exams.length ? (
                      <Table rowKey="id" size="small" columns={examColumns} dataSource={exams.slice().sort((a, b) => b.date.localeCompare(a.date))} pagination={false} scroll={{ x: 'max-content', y: 320 }} rowClassName={(r) => (r.id === editingId ? 'row-editing' : '')} />
                    ) : <Empty description="还没有成绩，先在左侧录入" />}
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: 'trend',
            label: '趋势分析',
            children: (
              <Card size="small" title="各科得分率趋势">
                {exams.length ? <ReactECharts option={trendOption} style={{ height: 320 }} notMerge lazyUpdate /> : <Empty description="暂无数据" />}
              </Card>
            )
          },
          {
            key: 'weak',
            label: `薄弱点（${weakPoints.length}）`,
            children: (
              <Card size="small"
                title="薄弱知识点"
                extra={<Button size="small" danger onClick={() => { clearWeakPoints(); msg.success('已清空') }}>清空</Button>}
              >
                {weakPoints.length ? (
                  <Table rowKey="id" size="small" columns={weakColumns} dataSource={weakPoints} pagination={false} scroll={{ x: 'max-content' }} />
                ) : <Empty description="从「错题管家接入」导入，或手动记录" />}
              </Card>
            )
          },
          {
            key: 'hub',
            label: '错题管家接入',
            children: (
              <Card size="small" title="从错题管家导入薄弱点">
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message={
                    <span>
                      错题管家（wrong-question-hub.html）已沉淀错题与知识点。三种方式任选其一，
                      格式：<code>科目,知识点,错因,日期(YYYY-MM-DD)</code>，一行一条，可含表头。
                      重复条目（科目+知识点+错因）会自动跳过。
                    </span>
                  }
                />

                <Row gutter={[16, 16]}>
                  {/* 方式 1：粘贴 CSV */}
                  <Col xs={24} md={12}>
                    <Card
                      size="small"
                      type="inner"
                      title={<span><span style={{ color: '#0EA5A4', fontWeight: 600 }}>①</span> 粘贴 CSV</span>}
                    >
                      <TextArea
                        rows={6}
                        value={csv}
                        onChange={(e) => setCsv(e.target.value)}
                        placeholder={'数学,小数乘除,进位漏写,2026-09-16\n语文,阅读理解·推断,信息提取不全,2026-09-16'}
                      />
                      <Space style={{ marginTop: 10 }} wrap>
                        <Button type="primary" onClick={onImportCsv} disabled={!csv.trim()}>导入</Button>
                        <Button onClick={() => setCsv('')} disabled={!csv}>清空输入框</Button>
                      </Space>
                    </Card>
                  </Col>

                  {/* 方式 2：GitHub raw URL */}
                  <Col xs={24} md={12}>
                    <Card
                      size="small"
                      type="inner"
                      title={<span><span style={{ color: '#0EA5A4', fontWeight: 600 }}>②</span> 一键拉 GitHub（iPad 已备份）</span>}
                    >
                      <Input
                        addonBefore="GitHub raw URL"
                        placeholder="https://raw.githubusercontent.com/xxx/cuo-ti-jing/main/wrong-2026.csv"
                        value={ghUrl}
                        onChange={(e) => setGhUrl(e.target.value)}
                        allowClear
                      />
                      <Space style={{ marginTop: 10 }} wrap>
                        <Button type="primary" onClick={onFetchGh} loading={ghLoading} disabled={!ghUrl.trim()}>
                          拉取并导入
                        </Button>
                        <Button onClick={() => setGhUrl('')} disabled={!ghUrl}>清空</Button>
                      </Space>
                      <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
                        提示：iPad 端把 wrong-2026.csv 推上 GitHub raw 后，复制 raw 链接粘到这里即可。
                      </div>
                    </Card>
                  </Col>

                  {/* 方式 3：本地文件 */}
                  <Col xs={24}>
                    <Card
                      size="small"
                      type="inner"
                      title={<span><span style={{ color: '#0EA5A4', fontWeight: 600 }}>③</span> 上传本地 CSV 文件</span>}
                    >
                      <Upload
                        accept=".csv,text/csv"
                        beforeUpload={onPickFile}
                        showUploadList={false}
                        multiple={false}
                      >
                        <Button loading={fileLoading}>选择文件并导入</Button>
                      </Upload>
                      <span style={{ marginLeft: 12, color: '#94A3B8', fontSize: 12 }}>
                        若 GitHub 拉取受网络限制，下载到本机再上传也行。Safari/Chrome/Edge 都支持。
                      </span>
                    </Card>
                  </Col>
                </Row>

                <Divider />
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                  注：开启云同步后，导入的薄弱点会自动写入飞书；未开启则仅存本地。
                  重复条目（同 科目+知识点+错因）会被自动跳过，可在「薄弱点」Tab 查看与改状态。
                </div>
              </Card>
            )
          }
        ]}
      />

      {/* 导入结果弹窗 */}
      <Modal
        open={!!report}
        onCancel={() => setReport(null)}
        onOk={() => setReport(null)}
        okText="知道了"
        cancelText="关闭"
        title={report?.ok ? '导入完成 ✅' : '导入结果 ⚠️'}
      >
        {report && (
          <>
            <p style={{ marginBottom: 12 }}>{report.msg}</p>
            <Row gutter={12}>
              <Col span={6}>
                <Statistic title="新增" value={report.details.inserted} valueStyle={{ color: '#0EA5A4', fontSize: 22 }} suffix="条" />
              </Col>
              <Col span={6}>
                <Statistic title="重复跳过" value={report.details.duplicate} valueStyle={{ color: '#F59E0B', fontSize: 22 }} suffix="条" />
              </Col>
              <Col span={6}>
                <Statistic title="格式错误" value={report.details.bad} valueStyle={{ color: '#EF4444', fontSize: 22 }} suffix="行" />
              </Col>
              <Col span={6}>
                <Statistic title="共识别" value={report.details.total} valueStyle={{ color: '#64748B', fontSize: 22 }} suffix="行" />
              </Col>
            </Row>
            {report.details.bad > 0 && (
              <Alert
                style={{ marginTop: 12 }} type="warning" showIcon
                message={`有 ${report.details.bad} 行无法识别（科目不在列表或日期格式非 YYYY-MM-DD），请检查 CSV 内容。`}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
