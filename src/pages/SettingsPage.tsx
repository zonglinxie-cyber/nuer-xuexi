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
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech'

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
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    void getDetailedStorageStats().then(setStats)
    return () => {
      stopSpeech()
    }
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

  function handleSpeechTest() {
    if (speaking) {
      stopSpeech()
      setSpeaking(false)
      return
    }
    const ok = speakText('朗读正常。请关掉静音，用 Safari 或 Chrome 打开。不要用微信。', {
      onEnd: () => setSpeaking(false),
      onError: (err) => {
        setSpeaking(false)
        setNotice({
          type: 'error',
          message: typeof err === 'string' ? err : '朗读失败，请检查手机是否静音。',
        })
      },
    })
    if (ok) {
      setSpeaking(true)
      setNotice({ type: 'info', message: '正在试听朗读。如果完全没声音，请关掉静音，或换 Safari / Chrome。' })
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
    <div className="space-y-3 sm:space-y-4">
      <NoticeBanner notice={notice} />

      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <h2 className="text-sm sm:text-base font-bold text-[#243026]">⚙️ AI 模型配置</h2>
        <p className="mt-0.5 text-xs text-[#66756c]">
          支持 OpenAI 官方以及各类兼容接口（如各大云厂商的兼容端点）。
        </p>
        <form className="mt-3 space-y-2.5" onSubmit={handleSave}>
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
          <Field label="模型名称" hint="支持看图的多模态模型（如 gpt-4o-mini, qwen-vl-plus 等）。">
            <input
              className={inputClass}
              value={settings.model}
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
              placeholder={DEFAULT_SETTINGS.model}
            />
          </Field>
          <Field
            label="接口地址 (Base URL)"
            hint="官方接口或兼容地址（末尾不要带 /chat/completions）。"
          >
            <input
              className={inputClass}
              value={settings.baseUrl}
              onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
              placeholder={DEFAULT_SETTINGS.baseUrl}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 rounded-xl bg-[#2f5d50] py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#254b40]"
              type="submit"
            >
              保存配置
            </button>
            <button
              className="flex-1 rounded-xl border border-[#2f5d50] bg-white py-2.5 px-3 text-xs sm:text-sm font-bold text-[#2f5d50] hover:bg-[#fbfaf5] disabled:opacity-60"
              type="button"
              disabled={testing}
              onClick={() => void handleTest()}
            >
              {testing ? '测试中…' : '🔍 测试连接'}
            </button>
            {isSpeechSupported() && (
              <button
                className="rounded-xl border border-[#d9d2c3] bg-white py-2.5 px-3 text-xs font-bold text-[#4a5850] hover:bg-[#fbfaf5] shrink-0"
                type="button"
                onClick={handleSpeechTest}
              >
                {speaking ? '⏹️ 停止' : '🔊 试听'}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <h2 className="text-sm sm:text-base font-bold text-[#243026]">💾 本地存储与备份</h2>
        <div className="mt-2 rounded-xl bg-[#fbfaf5] p-2.5 text-xs text-[#4a5850] border border-[#eee7d8]">
          <p className="font-bold text-[#243026] mb-1">📊 当前数据统计：</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            <li>学习记录：{stats.recordsCount} 条</li>
            <li>错题总数：{stats.wrongCount} 道（{stats.imagesCount} 道含照片）</li>
            <li>占用空间：约 {formatFileSize(stats.estimatedBytes)} (IndexedDB 大容量)</li>
          </ul>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 rounded-xl bg-[#2f5d50] py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#254b40]"
            type="button"
            onClick={handleExport}
          >
            📦 导出备份 JSON
          </button>
          <label className="flex-1 rounded-xl border border-[#2f5d50] bg-white py-2.5 px-3 text-center text-xs sm:text-sm font-bold text-[#2f5d50] hover:bg-[#fbfaf5] cursor-pointer">
            📥 导入备份
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
