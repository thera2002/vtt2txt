import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, formatCues, parseVtt } from './vtt'

const SAMPLE = `WEBVTT

0
00:00:05.800 --> 00:00:06.750
l'asia

1
00:00:06.909 --> 00:00:10.310
è l'incapacità di riconoscere gli oggetti
`

describe('parseVtt', () => {
  it('scarta header, indici e timestamp', () => {
    const cues = parseVtt(SAMPLE)
    expect(cues).toHaveLength(2)
    expect(cues[0]).toMatchObject({ start: 5.8, end: 6.75, text: "l'asia" })
    expect(cues[1].text).toBe("è l'incapacità di riconoscere gli oggetti")
  })

  it('gestisce CRLF, BOM e blocchi NOTE/STYLE', () => {
    const source = '﻿WEBVTT\r\n\r\nNOTE una nota\r\n\r\nSTYLE\r\n::cue { color: red }\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nciao\r\n'
    expect(parseVtt(source).map((c) => c.text)).toEqual(['ciao'])
  })

  it('estrae il nome di chi parla e ripulisce i tag inline', () => {
    const source = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<v Maria>ciao <c.bold>a</c> tutti &amp; grazie'
    const [cue] = parseVtt(source)
    expect(cue.speaker).toBe('Maria')
    expect(cue.text).toBe('ciao a tutti & grazie')
  })

  it('accetta le impostazioni di posizione sulla riga di timing', () => {
    const source = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000 line:0 position:20% align:start\ntesto'
    expect(parseVtt(source)).toHaveLength(1)
  })

  it('restituisce una lista vuota per un file non-VTT', () => {
    expect(parseVtt('questo non è un file di sottotitoli')).toEqual([])
  })
})

describe('formatCues', () => {
  it('unisce i frammenti in testo scorrevole', () => {
    expect(formatCues(parseVtt(SAMPLE), DEFAULT_OPTIONS)).toBe(
      "l'asia è l'incapacità di riconoscere gli oggetti",
    )
  })

  it('rimuove le battute ripetute consecutive', () => {
    const cues = parseVtt(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nuno\n\n00:00:02.000 --> 00:00:03.000\nUno\n\n00:00:03.000 --> 00:00:04.000\ndue',
    )
    expect(formatCues(cues, DEFAULT_OPTIONS)).toBe('uno due')
    expect(formatCues(cues, { ...DEFAULT_OPTIONS, dedupe: false })).toBe('uno Uno due')
  })

  it('produce una riga per battuta nel layout righe', () => {
    expect(formatCues(parseVtt(SAMPLE), { ...DEFAULT_OPTIONS, layout: 'righe' })).toBe(
      "l'asia\nè l'incapacità di riconoscere gli oggetti",
    )
  })

  it('apre un paragrafo a ogni cambio di interlocutore', () => {
    const cues = parseVtt(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<v Anna>buongiorno\n\n00:00:02.000 --> 00:00:03.000\n<v Luca>buonasera',
    )
    expect(formatCues(cues, DEFAULT_OPTIONS)).toBe('Anna: buongiorno\n\nLuca: buonasera')
    expect(formatCues(cues, { ...DEFAULT_OPTIONS, includeSpeakers: false })).toBe(
      'buongiorno buonasera',
    )
  })
})
