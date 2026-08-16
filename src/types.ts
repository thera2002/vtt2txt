import type { Cue } from './lib/vtt'

export interface VttDocument {
  id: string
  name: string
  size: number
  cues: Cue[]
  /** Istante finale dell'ultimo cue, in secondi. */
  duration: number
  /** Valorizzato se il file non conteneva cue leggibili. */
  error?: string
}
