/**
 * Parser WebVTT minimale e tollerante: estrae solo il parlato,
 * scartando header, timestamp, indici dei cue, note, stili e regioni.
 * Tutto avviene in memoria, nel browser: il .vtt non lascia mai la macchina.
 */

export interface Cue {
  /** Inizio del cue in secondi. */
  start: number
  /** Fine del cue in secondi. */
  end: number
  /** Nome di chi parla, se il cue usa il tag `<v Nome>`. */
  speaker?: string
  text: string
}

const TIMING_LINE = /-->/
const TIMESTAMP = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/
const BLOCK_KEYWORD = /^(NOTE|STYLE|REGION)\b/
const VOICE_TAG = /^<v(?:\.[^\s>]+)*\s+([^>]*)>/i
const ANY_TAG = /<\/?[^>]*>/g

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lrm: '',
  rlm: '',
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    const replacement = ENTITIES[body.toLowerCase()]
    return replacement === undefined ? match : replacement
  })
}

function toSeconds(match: RegExpMatchArray): number {
  const [, hours, minutes, seconds, fraction] = match
  return (
    Number(hours ?? 0) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(fraction.padEnd(3, '0')) / 1000
  )
}

/** Legge i due estremi di una riga `00:00:01.000 --> 00:00:03.000`. */
function parseTiming(line: string): { start: number; end: number } {
  const matches = [...line.matchAll(new RegExp(TIMESTAMP, 'g'))]
  const start = matches[0] ? toSeconds(matches[0]) : 0
  const end = matches[1] ? toSeconds(matches[1]) : start
  return { start, end }
}

/** Rimuove i tag inline (`<c>`, `<i>`, `<00:00:01.000>`, …) e normalizza gli spazi. */
function cleanPayload(line: string): string {
  return decodeEntities(line.replace(ANY_TAG, ' ')).replace(/\s+/g, ' ').trim()
}

/** Estrae i cue di un singolo file .vtt (o .srt: il formato è abbastanza vicino). */
export function parseVtt(source: string): Cue[] {
  const normalized = source
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')

  const blocks = normalized.split(/\n{2,}/)
  const cues: Cue[] = []

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '')
    if (lines.length === 0) continue
    if (BLOCK_KEYWORD.test(lines[0].trim())) continue
    if (/^WEBVTT\b/.test(lines[0].trim())) continue

    const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line))
    if (timingIndex === -1) continue

    const { start, end } = parseTiming(lines[timingIndex])
    const payload = lines.slice(timingIndex + 1)
    if (payload.length === 0) continue

    let speaker: string | undefined
    const parts: string[] = []

    for (const raw of payload) {
      const voice = VOICE_TAG.exec(raw.trim())
      if (voice) speaker = voice[1].trim() || undefined
      const cleaned = cleanPayload(raw)
      if (cleaned) parts.push(cleaned)
    }

    const text = parts.join(' ').replace(/\s+/g, ' ').trim()
    if (text) cues.push({ start, end, speaker, text })
  }

  return cues
}

export type Layout = 'paragrafi' | 'righe'

export interface FormatOptions {
  /** `paragrafi`: testo scorrevole. `righe`: un frammento per riga, come nel file. */
  layout: Layout
  /** Scarta i frammenti ripetuti consecutivi (tipici dei sottotitoli "a scorrimento"). */
  dedupe: boolean
  /** Antepone `Nome:` quando il file dichiara chi parla. */
  includeSpeakers: boolean
}

export const DEFAULT_OPTIONS: FormatOptions = {
  layout: 'paragrafi',
  dedupe: true,
  includeSpeakers: true,
}

/** Un nuovo paragrafo viene chiuso a fine frase, superata questa lunghezza. */
const PARAGRAPH_TARGET = 420

function dropConsecutiveDuplicates(cues: Cue[]): Cue[] {
  const out: Cue[] = []
  for (const cue of cues) {
    const previous = out[out.length - 1]
    if (previous && previous.text.toLowerCase() === cue.text.toLowerCase()) continue
    out.push(cue)
  }
  return out
}

/** Unisce due frammenti: senza spazio se il primo finisce con un troncamento. */
function joinFragments(left: string, right: string): string {
  if (!left) return right
  if (left.endsWith('-')) return left.slice(0, -1) + right
  return `${left} ${right}`
}

function endsSentence(text: string): boolean {
  return /[.!?…][)"'»”’]?$/.test(text)
}

function toParagraphs(cues: Cue[], includeSpeakers: boolean): string {
  const paragraphs: string[] = []
  let current = ''
  let currentSpeaker: string | undefined

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed) paragraphs.push(trimmed)
    current = ''
  }

  for (const cue of cues) {
    const speakerChanged = includeSpeakers && cue.speaker !== currentSpeaker
    if (speakerChanged) {
      flush()
      currentSpeaker = cue.speaker
      // Senza spazio finale: ci pensa joinFragments a separare dal primo frammento.
      if (cue.speaker) current = `${cue.speaker}:`
    }

    current = joinFragments(current, cue.text)

    if (current.length >= PARAGRAPH_TARGET && endsSentence(current)) flush()
  }

  flush()
  return paragraphs.join('\n\n')
}

function toLines(cues: Cue[], includeSpeakers: boolean): string {
  return cues
    .map((cue) =>
      includeSpeakers && cue.speaker ? `${cue.speaker}: ${cue.text}` : cue.text,
    )
    .join('\n')
}

/** Trasforma i cue nel testo finale mostrato a schermo. */
export function formatCues(cues: Cue[], options: FormatOptions): string {
  const prepared = options.dedupe ? dropConsecutiveDuplicates(cues) : cues
  if (prepared.length === 0) return ''
  return options.layout === 'righe'
    ? toLines(prepared, options.includeSpeakers)
    : toParagraphs(prepared, options.includeSpeakers)
}

export interface Stats {
  characters: number
  words: number
  cues: number
}

export function computeStats(text: string, cues: number): Stats {
  const trimmed = text.trim()
  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    cues,
  }
}

/** Durata coperta dai cue, formattata come `mm:ss` / `h:mm:ss`. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
