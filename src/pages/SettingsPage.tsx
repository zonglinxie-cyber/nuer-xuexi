import { useState, type FormEvent } from 'react'
import Field, { inputClass } from '../components/Field'
import NoticeBanner from '../components/NoticeBanner'
import { AiServiceError, testAiConnection } from '../services/aiService'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService'
import { downloadJson, exportBackup, getImportSummary, getLocalStorageUsage, importBackup } from '../services/storageService'
import type { AppNotice } from '../types'
import { formatFileSize } from '../utils/image'

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings)
  const [notice, setNotice] = useState<AppNotice | null>(null)
  const [usage, setUsage] = useState(getLocalStorageUsage)
  const [testing, setTesting] = useState(false)

  function handleSave(event: FormEvent) {
    event.preventDefault()
    saveSettings(settings)
    setNotice({ type: 'success', message: '设置已保存。API Key 只存在本机浏览器，不会写进代码。' })
  }

  async function handleTest() {
    saveSettings(settings)
    setTesting(true)
    try {
      await testAiConnection(settings)
      setNotice({ type: 'success', message: '连接成功。可以去拍照页识别题目了。' })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof AiServiceError || error instanceof Error ? error.message : '测试连接失败。',
      })
    } finally {
      setTesting(false)
    }
  }

  function handleExport() {
    downloadJson(`四年级数学学习助手备份-${new Date().toISOString().slice(0, 10)}.json`, exportBackup())
    setNotice({ type: 'success', message: '已导出学习记录和错题本。备份文件不含 API Key。' })
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      const summary = getImportSummary(JSON.parse(text))
      const confirmed = window.confirm(
        `将用备份里的 ${summary.incomingRecords} 条学习记录、${summary.incomingWrong} 道错题，替换当前的 ${summary.currentRecords} 条记录、${summary.currentWrong} 道错题。建议先导出。确定导入吗？`,
      )
      if (!confirmed) {
        setNotice({ type: 'info', message: '已取消导入。' })
        return
      }
      importBackup(JSON.parse(text))
      setUsage(getLocalStorageUsage())
      setNotice({ type: 'success', message: '备份已导入。请到错题本和学习记录页查看。' })
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
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">AI 设置</h2>
        <p className="mt-2 text-base leading-7 text-[#4a5850]">
          请填写你自己的 API Key。支持 OpenAI 兼容接口。没有填写时，页面不会崩溃，但不能识别题目。
        </p>
        <form className="mt-5 space-y-4" onSubmit={handleSave}>
          <Field label="API Key" hint="不会显示在项目代码里，只保存在你自己的浏览器中。">
            <input
              className={inputClass}
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </Field>
          <Field label="模型名称" hint="需要能看图的多模态模型，例如 gpt-4o-mini、gpt-4o、qwen-vl-plus。">
            <input
              className={inputClass}
              value={settings.model}
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
              placeholder={DEFAULT_SETTINGS.model}
            />
          </Field>
          <Field
            label="接口地址"
            hint="本机开发时，官方地址 https://api.openai.com/v1 会自动走代理。GitHub 网页上官方接口可能被跨域拦住，这时请改用兼容接口地址。"
          >
            <input
              className={inputClass}
              value={settings.baseUrl}
              onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
              placeholder={DEFAULT_SETTINGS.baseUrl}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-[#2f5d50] px-5 py-3 text-white" type="submit">
              保存设置
            </button>
            <button
              className="rounded-xl border border-[#2f5d50] px-5 py-3 text-[#2f5d50] disabled:opacity-60"
              type="button"
              disabled={testing}
              onClick={() => void handleTest()}
            >
              {testing ? '正在测试…' : '测试连接'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">数据备份</h2>
        <p className="mt-2 text-base leading-7 text-[#4a5850]">
          学习记录和错题本保存在本机浏览器。清除浏览器缓存可能导致数据丢失，请定期导出备份。带原图的错题最占空间；空间不够时，先导出备份，再删掉一些旧错题。导入会整份替换当前数据，请先确认。
        </p>
        <p className="mt-3 rounded-xl bg-[#fbfaf5] px-4 py-3 text-sm leading-6 text-[#4a5850]">
          当前大约已用 {formatFileSize(usage.bytes)}：学习记录 {usage.recordCount} 条，错题 {usage.wrongCount}{' '}
          道，其中 {usage.imageCount} 道带原图。学习记录不再保存原图，以节省空间。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-xl bg-[#2f5d50] px-5 py-3 text-white" type="button" onClick={handleExport}>
            导出 JSON
          </button>
          <label className="rounded-xl border border-[#2f5d50] px-5 py-3 text-[#2f5d50]">
            导入 JSON
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
