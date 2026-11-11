/**
 * Client for bili-content-server (BCS).
 *
 * All upload helpers are no-ops when bcsUrl is empty, so clearing the setting
 * keeps the extension's original behaviour. Uploads are fire-and-forget and
 * fail silently: a BCS that is not running must never disturb the user.
 */

export interface BcsVideoMeta {
  bvid?: string
  aid?: number
  cid?: number
  title?: string
  author?: string
  url?: string
  ctime?: number
}

export interface BcsSummary {
  type: SummaryType
  lang?: string
  content?: any
  text?: string
  segment?: {startIdx: number; endIdx?: number}
}

const getBaseUrl = (bcsUrl?: string): string | undefined => {
  if (!bcsUrl) {
    return undefined
  }
  const trimmed = bcsUrl.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(trimmed)) {
    return undefined
  }
  return trimmed
}

export const isBcsEnabled = (bcsUrl?: string): boolean => !!getBaseUrl(bcsUrl)

const parseBvid = (url?: string): string | undefined => {
  if (!url) {
    return undefined
  }
  const matched = url.match(/BV[0-9A-Za-z]+|av\d+/i)
  return matched?.[0]
}

const getSource = (): string => {
  try {
    return `bilibili-subtitle/${chrome.runtime.getManifest().version}`
  } catch (e) {
    return 'bilibili-subtitle'
  }
}

/** Prefer bvid from the video url; fall back to av{aid}_{cid} from storage. */
const resolveVideoKey = async (meta: BcsVideoMeta): Promise<string | undefined> => {
  const bvid = meta.bvid ?? parseBvid(meta.url)
  if (bvid) {
    return bvid
  }
  try {
    const items = await chrome.storage.sync.get(['aid', 'cid'])
    const aid = meta.aid ?? items.aid
    const cid = meta.cid ?? items.cid
    if (aid != null && cid != null) {
      return `av${aid}_${cid}`
    }
  } catch (e) {
    // Fail silently.
  }
  return undefined
}

const put = async (base: string, key: string, kind: 'subtitle' | 'summary', body: object): Promise<void> => {
  try {
    await fetch(`${base}/api/v1/videos/${encodeURIComponent(key)}/${kind}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    })
  } catch (e) {
    // Fail silently: BCS not running must not disturb the user.
  }
}

export const putSubtitle = (bcsUrl: string | undefined, meta: BcsVideoMeta,
                            transcript: Transcript, lan?: string): void => {
  const base = getBaseUrl(bcsUrl)
  if (!base) {
    return
  }
  void (async () => {
    const key = await resolveVideoKey(meta)
    if (!key) {
      return
    }
    await put(base, key, 'subtitle', {
      video: meta,
      lan,
      transcript,
      source: getSource(),
    })
  })()
}

export const putSummary = (bcsUrl: string | undefined, meta: BcsVideoMeta, summary: BcsSummary): void => {
  const base = getBaseUrl(bcsUrl)
  if (!base) {
    return
  }
  void (async () => {
    const key = await resolveVideoKey(meta)
    if (!key) {
      return
    }
    await put(base, key, 'summary', {
      video: meta,
      ...summary,
      source: getSource(),
    })
  })()
}
