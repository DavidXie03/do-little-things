import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

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
    return true
  }
}

export async function nativeExportJson(filename: string, data: object): Promise<string> {
  const result = await Filesystem.writeFile({
    path: filename,
    data: JSON.stringify(data, null, 2),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })
  return result.uri
}

export function webExportJson(filename: string, data: object): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
