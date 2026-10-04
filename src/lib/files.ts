import type { Report, Vault } from './types'
import { uid } from './types'

/** Classifies imported Markdown files: the client file, or numbered session reports. */
export async function importMarkdownFiles(files: FileList | File[]) {
  let clientFile: string | null = null
  const reports: Report[] = []
  for (const f of Array.from(files)) {
    const text = await f.text()
    const num = f.name.match(/seans[_\s-]*0*(\d+)/i)
    if (/danisan|danışan/i.test(f.name) || /^#\s*Danışan Dosyası/m.test(text)) {
      clientFile = text
    } else if (num || /^#\s*Seans\s+\d+/m.test(text)) {
      const no = Number(num?.[1] ?? text.match(/^#\s*Seans\s+(\d+)/m)?.[1] ?? 0)
      reports.push(reportFromMarkdown(text, no))
    }
  }
  return { clientFile, reports }
}

export function reportFromMarkdown(markdown: string, no: number): Report {
  const title = markdown.match(/^#\s*Seans\s+\d+\s*Raporu\s*[:—–-]\s*(.+)$/m)?.[1]?.trim() ?? `Seans ${no}`
  const date = markdown.match(/\*\*Tarih:\*\*\s*([\d-]+)/)?.[1] ?? new Date().toISOString().slice(0, 10)
  return { id: uid(), no, date, title, markdown }
}

export function mergeReports(existing: Report[], incoming: Report[]) {
  const byNo = new Map(existing.map((r) => [r.no, r]))
  incoming.forEach((r) => byNo.set(r.no, r))
  return [...byNo.values()].sort((a, b) => b.no - a.no)
}

const pad = (n: number) => String(n).padStart(2, '0')

async function shareOrDownload(files: File[]) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  for (const f of files) {
    const url = URL.createObjectURL(f)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Markdown copies of the client file and reports, ready to drop into the Seans folder on the PC. */
export function exportMarkdown(v: Vault) {
  const files = [
    new File([v.clientFile], 'Danisan_Dosyasi.md', { type: 'text/markdown' }),
    ...v.reports.map((r) => new File([r.markdown], `Seans_${pad(r.no)}_Rapor.md`, { type: 'text/markdown' })),
  ]
  return shareOrDownload(files)
}

/** Full backup without the API key. */
export function exportBackup(v: Vault) {
  const { apiKey: _omit, ...rest } = v
  void _omit
  rest.settings = { ...rest.settings, azureKey: undefined }
  const name = `seans-yedek-${new Date().toISOString().slice(0, 10)}.json`
  return shareOrDownload([new File([JSON.stringify(rest, null, 2)], name, { type: 'application/json' })])
}

export async function readBackup(file: File): Promise<Partial<Vault>> {
  const data = JSON.parse(await file.text())
  if (data?.version !== 1) throw new Error('Bu dosya bir Seans yedeği değil.')
  return data
}
