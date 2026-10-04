import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

/** Markdown to sanitized HTML. Content comes from the model and imported files, so it is always sanitized. */
export const renderMarkdown = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }))
