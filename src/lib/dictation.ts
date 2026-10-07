import { useDictation } from './speech'
import { useAzureDictation } from './stt'
import { sttEngine, type Settings } from './types'

/**
 * Speech input with the engine chosen in settings. When `supported` is false, callers fall back
 * to the system keyboard's dictation by focusing the text field.
 */
export function useSpeechInput(
  settings: Settings,
  opts: { onText: (text: string) => void; onPause?: (text: string) => void; autoSendAfterMs?: number },
) {
  const engine = sttEngine(settings)
  const creds = settings.azureKey && settings.azureRegion ? { key: settings.azureKey, region: settings.azureRegion } : null
  const browser = useDictation({ ...opts, enabled: engine === 'browser' })
  const azure = useAzureDictation({ ...opts, enabled: engine === 'azure', creds })
  return engine === 'azure' ? azure : browser
}
