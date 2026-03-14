import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

/**
 * 判断是否在原生平台（Android/iOS）
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * 检查并请求文件写入权限
 * 如果已有权限则直接返回 true
 * 如果没有则尝试请求，请求成功返回 true，失败抛出错误
 */
export async function ensureFilePermission(): Promise<boolean> {
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage === 'granted') {
      return true
    }

    const requested = await Filesystem.requestPermissions()
    if (requested.publicStorage === 'granted') {
      return true
    }

    throw new Error('PERMISSION_DENIED')
  } catch (err: any) {
    if (err?.message === 'PERMISSION_DENIED') {
      throw err
    }
    // 某些 Android 版本可能不支持 checkPermissions (scoped storage)
    // 直接尝试写入，交给系统决定
    return true
  }
}

/**
 * 在原生环境使用 Filesystem 写入 JSON 到 Documents 目录
 */
export async function nativeExportJson(filename: string, data: object): Promise<string> {
  const result = await Filesystem.writeFile({
    path: filename,
    data: JSON.stringify(data, null, 2),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })
  return result.uri
}

/**
 * Web 环境降级：使用 Blob + a 标签下载
 */
export function webExportJson(filename: string, data: object): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 使用 input[type=file] 选择文件并读取内容
 * 同时适用于 Web 和原生环境（WebView 中 input file 正常工作）
 */
export function pickAndReadJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('NO_FILE_SELECTED'))
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        resolve(ev.target?.result as string)
      }
      reader.onerror = () => reject(new Error('READ_ERROR'))
      reader.readAsText(file)
    }
    input.click()
  })
}
