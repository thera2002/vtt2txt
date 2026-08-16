import { useCallback, useMemo, useState } from 'react'
import { Dropzone } from './components/Dropzone'
import { FileList } from './components/FileList'
import { TranscriptPanel } from './components/TranscriptPanel'
import { DEFAULT_OPTIONS, computeStats, formatCues, parseVtt, type FormatOptions } from './lib/vtt'
import type { VttDocument } from './types'

const ACCEPTED = /\.(vtt|srt)$/i

function createId(): string {
  return crypto.randomUUID()
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

export default function App() {
  const [documents, setDocuments] = useState<VttDocument[]>([])
  const [options, setOptions] = useState<FormatOptions>(DEFAULT_OPTIONS)
  const [includeTitles, setIncludeTitles] = useState(true)
  const [rejected, setRejected] = useState<string[]>([])
  /** File isolato nella trascrizione; `null` = tutti, concatenati. */
  const [activeId, setActiveId] = useState<string | null>(null)

  const addFiles = useCallback(async (files: File[]) => {
    const usable = files.filter((file) => ACCEPTED.test(file.name))
    setRejected(files.filter((file) => !ACCEPTED.test(file.name)).map((file) => file.name))

    const parsed = await Promise.all(
      usable.map(async (file): Promise<VttDocument> => {
        // Il contenuto resta in memoria: nessun upload, nessuna persistenza.
        const cues = parseVtt(await file.text())
        return {
          id: createId(),
          name: file.name,
          size: file.size,
          cues,
          duration: cues.length > 0 ? cues[cues.length - 1].end : 0,
          error: cues.length === 0 ? 'Nessuna battuta riconosciuta in questo file' : undefined,
        }
      }),
    )

    setDocuments((current) => [...current, ...parsed])
  }, [])

  const removeDocument = useCallback((id: string) => {
    setDocuments((current) => current.filter((doc) => doc.id !== id))
    setActiveId((current) => (current === id ? null : current))
  }, [])

  const moveDocument = useCallback((id: string, direction: -1 | 1) => {
    setDocuments((current) => {
      const index = current.findIndex((doc) => doc.id === id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setDocuments([])
    setRejected([])
    setActiveId(null)
  }, [])

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeId) ?? null,
    [documents, activeId],
  )

  /** I documenti in trascrizione: quello selezionato, oppure tutti. */
  const shown = useMemo(
    () => (activeDocument ? [activeDocument] : documents),
    [activeDocument, documents],
  )

  const { text, cueCount } = useMemo(() => {
    const usable = shown.filter((doc) => doc.cues.length > 0)
    const showTitles = includeTitles && usable.length > 1

    const sections = usable.map((doc) => {
      const body = formatCues(doc.cues, options)
      return showTitles ? `${baseName(doc.name)}\n\n${body}` : body
    })

    return {
      text: sections.join('\n\n'),
      cueCount: usable.reduce((total, doc) => total + doc.cues.length, 0),
    }
  }, [shown, options, includeTitles])

  const stats = useMemo(() => computeStats(text, cueCount), [text, cueCount])

  const downloadName = useMemo(() => {
    const usable = shown.filter((doc) => doc.cues.length > 0)
    return usable.length === 1 ? `${baseName(usable[0].name)}.txt` : 'trascrizione.txt'
  }, [shown])

  const emptyMessage = activeDocument?.error
    ? 'Questo file non contiene battute riconoscibili.'
    : undefined

  return (
    <div className="app">
      <header className="hero">
        <span className="hero__eyebrow">vtt2txt</span>
        <h1 className="hero__title">Dai sottotitoli al testo, in un attimo</h1>
        <p className="hero__subtitle">
          Carica uno o più file <code>.vtt</code>: vengono ripuliti da indici e marcatori temporali e
          uniti in un testo continuo, pronto da copiare o scaricare.
        </p>
        <p className="hero__privacy">
          <span className="dot" aria-hidden="true" /> Tutto avviene nel browser: i file non vengono
          caricati da nessuna parte e spariscono chiudendo la pagina.
        </p>
      </header>

      <main className="layout">
        <div className="column column--input">
          <Dropzone onFiles={addFiles} />

          {rejected.length > 0 && (
            <p className="notice notice--warn">
              Ignorati (formato non supportato): {rejected.join(', ')}
            </p>
          )}

          <FileList
            documents={documents}
            activeId={activeId}
            onSelect={setActiveId}
            onRemove={removeDocument}
            onMove={moveDocument}
            onClear={clearAll}
          />

          <section className="options" aria-label="Opzioni di formattazione">
            <h2 className="options__title">Formato del testo</h2>

            <div className="segmented" role="radiogroup" aria-label="Disposizione">
              <button
                type="button"
                role="radio"
                aria-checked={options.layout === 'paragrafi'}
                className={`segmented__item${options.layout === 'paragrafi' ? ' is-active' : ''}`}
                onClick={() => setOptions((o) => ({ ...o, layout: 'paragrafi' }))}
              >
                Paragrafi
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={options.layout === 'righe'}
                className={`segmented__item${options.layout === 'righe' ? ' is-active' : ''}`}
                onClick={() => setOptions((o) => ({ ...o, layout: 'righe' }))}
              >
                Una riga per battuta
              </button>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={options.dedupe}
                onChange={(event) => setOptions((o) => ({ ...o, dedupe: event.target.checked }))}
              />
              <span>
                Elimina le ripetizioni
                <small>Scarta le battute identiche consecutive dei sottotitoli a scorrimento.</small>
              </span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={options.includeSpeakers}
                onChange={(event) =>
                  setOptions((o) => ({ ...o, includeSpeakers: event.target.checked }))
                }
              />
              <span>
                Mostra chi parla
                <small>Se il file usa i tag <code>&lt;v Nome&gt;</code>.</small>
              </span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={includeTitles}
                onChange={(event) => setIncludeTitles(event.target.checked)}
              />
              <span>
                Titola ogni file
                <small>Con più file, antepone il nome a ciascuna trascrizione.</small>
              </span>
            </label>
          </section>
        </div>

        <div className="column column--output">
          <TranscriptPanel
            text={text}
            stats={stats}
            downloadName={downloadName}
            source={activeDocument?.name ?? (documents.length > 1 ? 'Tutti i file' : undefined)}
            emptyMessage={emptyMessage}
          />
        </div>
      </main>
    </div>
  )
}
