import { useEffect, useState, type FormEvent } from 'react'
import Field, { inputClass } from '../components/Field'
import NoticeBanner from '../components/NoticeBanner'
import { AiServiceError, testAiConnection } from '../services/aiService'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService'
import {
  downloadJson,
  exportBackup,
  getDetailedStorageStats,
  getImportSummary,
  importBackup,
} from '../services/storageService'
import type { AppNotice } from '../types'
import { formatFileSize } from '../utils/image'

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings)
  const [notice, setNotice] = useState<AppNotice | null>(null)
  const [stats, setStats] = useState<{
    recordsCount: number
    wrongCount: number
    imagesCount: number
    estimatedBytes: number
  }>({
    recordsCount: 0,
    wrongCount: 0,
    imagesCount: 0,
    estimatedBytes: 0,
  })
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void getDetailedStorageStats().then(setStats)
  }, [])

  function handleSave(event: FormEvent) {
    event.preventDefault()
    saveSettings(settings)
    setNotice({ type: 'success', message: '设置已保存。API Key 仅保存在本机浏览器中。' })
  }

  async function handleTest() {
    saveSettings(settings)
    setTesting(true)
    try {
      await testAiConnection(settings)
      setNotice({ type: 'success', message: '🎉 AI 连接测试成功！可以前往拍照识别作业或生成变式题。' })
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error instanceof AiServiceError || error instanceof Error
            ? error.message
            : '测试连接失败，请检查 API Key 和网络。',
      })
    } finally {
      setTesting(false)
    }
  }

  function handleExport() {
    downloadJson(`四年级学习助手完整备份-${new Date().toISOString().slice(0, 10)}.json`, exportBackup())
    setNotice({ type: 'success', message: '已成功导出学习记录与错题本备份（包含原图）。' })
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      const summary = getImportSummary(JSON.parse(text))
      const confirmed = window.confirm(
        `将用备份里的 ${summary.incomingRecords} 条学习记录、${summary.incomingWrong} 道错题，替换当前的 ${summary.currentRecords} 条记录、${summary.currentWrong} 道错题。建议先导出备份。确定导入吗？`,
      )
      if (!confirmed) {
        setNotice({ type: 'info', message: '已取消导入。' })
        return
      }
      await importBackup(JSON.parse(text))
      const updated = await getDetailedStorageStats()
      setStats(updated)
      setNotice({ type: 'success', message: '备份已成功导入！请到错题本和学习记录页查看。' })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '导入失败，请确认这是本软件导出的 JSON。',
      })
    }
  }

  return (
    <div className="space-y-6">
      <NoticeBanner notice={notice} />

      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h2 className="text-lg font-bold text-[#243026] sm:text-xl">⚙️ AI 模型配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#4a5850]">
          请填写您自己的 API Key。支持 OpenAI 官方以及各类兼容接口。火山引擎通常不能被网页直接调用，请用允许网页访问的兼容地址。
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSave}>
          <Field label="API Key" hint="仅保存在本机浏览器，不上传任何中间服务器。">
            <input
              className={inputClass}
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </Field>
          <Field label="模型名称" hint="需支持看图的多模态模型，如 gpt-4o-mini、gpt-4o、qwen-vl-plus。">
            <input
              className={inputClass}
              value={settings.model}
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
              placeholder={DEFAULT_SETTINGS.model}
            />
          </Field>
          <Field
            label="接口地址"
            hint="默认 OpenAI 官方地址。如用第三方兼容平台，填写它提供的 BaseUrl（末尾不要带 /chat/completions）。火山引擎等国内接口通常不能被 GitHub 网页直接调用。"
          >
            <input
              className={inputClass}
              value={settings.baseUrl}
              onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
              placeholder={DEFAULT_SETTINGS.baseUrl}
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap pt-2">
            <button
              className="w-full rounded-2xl bg-[#2f5d50] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#254b40] sm:w-auto"
              type="submit"
            >
              保存配置
            </button>
            <button
              className="w-full rounded-2xl border border-[#2f5d50] bg-white px-6 py-3.5 text-sm font-bold text-[#2f5d50] hover:bg-[#fbfaf5] disabled:opacity-60 sm:w-auto"
              type="button"
              disabled={testing}
              onClick={() => void handleTest()}
            >
              {testing ? '正在测试…' : '🔍 测试 AI 连接'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h2 className="text-lg font-bold text-[#243026] sm:text-xl">💾 本地存储与数据备份</h2>
        <p className="mt-2 text-sm leading-6 text-[#4a5850]">
          系统底层已升级为 <strong>IndexedDB 大容量引擎</strong>，轻松支持数百兆原图与错题保存，彻底告别 5MB 空间溢出限制。
        </p>
        <div className="mt-4 rounded-2xl bg-[#fbfaf5] p-4 text-xs leading-6 text-[#4a5850] border border-[#eee7d8]">
          <p className="font-bold text-[#243026] mb-1">📊 当前本地存储统计：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>学习记录：{stats.recordsCount} 条</li>
            <li>错题总数：{stats.wrongCount} 道（其中 {stats.imagesCount} 道包含原始照片）</li>
            <li>占用容量：约 {formatFileSize(stats.estimatedBytes)}</li>
          </ul>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="w-full rounded-2xl bg-[#2f5d50] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#254b40] sm:w-auto"
            type="button"
            onClick={handleExport}
          >
            📦 导出备份 JSON
          </button>
          <label className="w-full rounded-2xl border border-[#2f5d50] bg-white px-6 py-3 text-center text-sm font-bold text-[#2f5d50] hover:bg-[#fbfaf5] sm:w-auto cursor-pointer">
            📥 导入备份 JSON
            <input
              className="hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void handleImport(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
