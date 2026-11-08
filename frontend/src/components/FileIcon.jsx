import React from 'react'
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Video,
  Music,
  Archive,
  File
} from 'lucide-react'

export default function FileIcon({ contentType, filename, size = 22, className = '' }) {
  const ct = (contentType || '').toLowerCase()
  const ext = (filename || '').split('.').pop().toLowerCase()

  // PDF
  if (ct.includes('pdf') || ext === 'pdf') {
    return <FileText size={size} strokeWidth={1.8} color="#f87171" className={className} />
  }

  // Images
  if (ct.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <ImageIcon size={size} strokeWidth={1.8} color="#60a5fa" className={className} />
  }

  // Spreadsheets / Excel / CSV
  if (ct.includes('spreadsheet') || ct.includes('excel') || ct.includes('csv') || ['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={size} strokeWidth={1.8} color="#4ade80" className={className} />
  }

  // Word / Docs
  if (ct.includes('word') || ct.includes('document') || ['docx', 'doc', 'rtf', 'odt'].includes(ext)) {
    return <FileText size={size} strokeWidth={1.8} color="#818cf8" className={className} />
  }

  // Code & Text
  if (
    ct.startsWith('text/') ||
    ct.includes('json') ||
    ct.includes('javascript') ||
    ct.includes('xml') ||
    ['txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'md', 'xml', 'yaml', 'yml', 'sql', 'log'].includes(ext)
  ) {
    return <FileCode size={size} strokeWidth={1.8} color="#fbbf24" className={className} />
  }

  // Video
  if (ct.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) {
    return <Video size={size} strokeWidth={1.8} color="#c084fc" className={className} />
  }

  // Audio
  if (ct.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return <Music size={size} strokeWidth={1.8} color="#f472b6" className={className} />
  }

  // Archives / Zip
  if (ct.includes('zip') || ct.includes('tar') || ct.includes('compressed') || ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Archive size={size} strokeWidth={1.8} color="#fb923c" className={className} />
  }

  // Default fallback
  return <File size={size} strokeWidth={1.8} color="#9ca3af" className={className} />
}
