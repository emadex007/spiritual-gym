// Client-only: PDF.js, loaded from the CDN only when a book is opened (keeps the app itself small)
const VERSION = '4.10.38'
const BASE = () => (typeof window !== 'undefined' && (window as Window & { __PDFJS_BASE?: string }).__PDFJS_BASE) || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/`

type PdfJs = {
  getDocument: (src: { url?: string; data?: ArrayBuffer }) => { promise: Promise<PdfDoc> }
  GlobalWorkerOptions: { workerSrc: string }
}
export type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number }
  getTextContent: () => Promise<{ items: { str?: string; hasEOL?: boolean; transform?: number[] }[] }>
  render: (o: { canvas?: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> }
}
export type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> }

let lib: Promise<PdfJs> | null = null
export function pdfjs(): Promise<PdfJs> {
  if (!lib) {
    const base = BASE()
    lib = import(/* @vite-ignore */ `${base}pdf.min.mjs`).then((m: PdfJs) => {
      m.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`
      return m
    })
    lib.catch(() => (lib = null))
  }
  return lib
}

export async function openPdf(src: { url?: string; data?: ArrayBuffer }) {
  const m = await pdfjs()
  return m.getDocument(src).promise
}

/** The text of one page, with line breaks where the PDF has them and blank lines between paragraphs */
export async function pageText(page: PdfPage) {
  const { items } = await page.getTextContent()
  let out = ''
  let lastY: number | null = null
  for (const it of items) {
    const y = it.transform?.[5] ?? null
    // a big jump down the page = a new paragraph
    if (lastY !== null && y !== null && lastY - y > 22 && !out.endsWith('\n\n')) out = out.replace(/\n?$/, '\n\n')
    out += it.str ?? ''
    if (it.hasEOL) out += '\n'
    if (y !== null) lastY = y
  }
  return out.replace(/[ \t]+\n/g, '\n').trim()
}

/** Draw a page onto a canvas, fitted to a width */
export async function renderPage(page: PdfPage, canvas: HTMLCanvasElement, width: number) {
  const base = page.getViewport({ scale: 1 })
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  const viewport = page.getViewport({ scale: (width / base.width) * ratio })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${width}px`
  canvas.style.height = `${(viewport.height / viewport.width) * width}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
}
