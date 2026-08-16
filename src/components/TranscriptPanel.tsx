import { useEffect, useRef, useState } from 'react'
import type { Stats } from '../lib/vtt'

interface Props {
  text: string
  stats: Stats
  downloadName: string
  /** Cosa si sta guardando: il nome del file isolato, o l'insieme. */
  source?: string
  emptyMessage?: string
}

type Feedback = 'idle' | 'tutto' | 'selezione' | 'errore'

export function TranscriptPanel({
  text,
  stats,
  downloadName,
  source,
  emptyMessage,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [selected, setSelected] = useState('')
  const empty = text.trim() === ''

  useEffect(() => {
    if (feedback === 'idle') return
    const timer = window.setTimeout(() => setFeedback('idle'), 2200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  // Tiene traccia della selezione, ma solo di quella interna alla trascrizione:
  // testo evidenziato altrove nella pagina non deve dirottare il pulsante Copia.
  useEffect(() => {
    const readSelection = () => {
      const selection = document.getSelection()
      const body = bodyRef.current
      if (!selection || selection.isCollapsed || !body) {
        setSelected('')
        return
      }
      const inside =
        body.contains(selection.anchorNode) && body.contains(selection.focusNode)
      setSelected(inside ? selection.toString().trim() : '')
    }

    readSelection()
    document.addEventListener('selectionchange', readSelection)
    return () => document.removeEventListener('selectionchange', readSelection)
  }, [])

  // Cambiando file si riparte dall'inizio, non da dove si era rimasti a scorrere.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [source])

  const hasSelection = selected !== ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hasSelection ? selected : text)
      setFeedback(hasSelection ? 'selezione' : 'tutto')
    } catch {
      setFeedback('errore')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel" aria-label="Trascrizione">
      <header className="panel__header">
        <div className="panel__heading">
          <h2 className="panel__title">
            Trascrizione
            {source && <span className="panel__source" title={source}>{source}</span>}
          </h2>
          <p className="panel__stats">
            {empty ? (
              'In attesa di un file'
            ) : hasSelection ? (
              <span className="panel__selection">
                {countWords(selected).toLocaleString('it-IT')} parole selezionate su{' '}
                {stats.words.toLocaleString('it-IT')}
              </span>
            ) : (
              `${stats.words.toLocaleString('it-IT')} parole · ${stats.characters.toLocaleString('it-IT')} caratteri · ${stats.cues.toLocaleString('it-IT')} battute`
            )}
          </p>
        </div>
        <div className="panel__actions">
          <button
            type="button"
            className="btn"
            onClick={handleCopy}
            // Evita che il click sul pulsante azzeri la selezione prima di leggerla.
            onMouseDown={(event) => event.preventDefault()}
            disabled={empty}
          >
            {feedback === 'errore'
              ? 'Copia non riuscita'
              : feedback !== 'idle'
                ? `✓ Copiat${feedback === 'selezione' ? 'a la selezione' : 'o tutto'}`
                : hasSelection
                  ? 'Copia selezione'
                  : 'Copia testo'}
          </button>
          <button type="button" className="btn btn--primary" onClick={handleDownload} disabled={empty}>
            Scarica .txt
          </button>
        </div>
      </header>

      <div className="panel__body" ref={bodyRef} tabIndex={0}>
        {empty ? (
          <p className="panel__placeholder">
            {emptyMessage ??
              ''}
          </p>
        ) : (
          <article className="transcript">
            {text.split('\n\n').map((paragraph, index) => (
              <p key={index} className="transcript__p">
                {paragraph}
              </p>
            ))}
          </article>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {feedback === 'selezione'
          ? 'Selezione copiata negli appunti'
          : feedback === 'tutto'
            ? 'Testo copiato negli appunti'
            : ''}
      </p>
    </section>
  )
}

function countWords(value: string): number {
  const trimmed = value.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}
