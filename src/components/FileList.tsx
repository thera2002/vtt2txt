import type { VttDocument } from '../types'
import { formatDuration } from '../lib/vtt'

interface Props {
  documents: VttDocument[]
  /** File attualmente mostrato; `null` = tutti, concatenati. */
  activeId: string | null
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onClear: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileList({
  documents,
  activeId,
  onSelect,
  onRemove,
  onMove,
  onClear,
}: Props) {
  if (documents.length === 0) return null

  const multiple = documents.length > 1

  return (
    <section className="files" aria-label="File caricati">
      <header className="files__header">
        <h2 className="files__title">
          File caricati <span className="badge">{documents.length}</span>
        </h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
          Rimuovi tutti
        </button>
      </header>

      {multiple && (
        <p className="files__hint">
          Clicca un file per vederlo da solo nella trascrizione.
        </p>
      )}

      <ul className="files__list">
        {multiple && (
          <li>
            <button
              type="button"
              className={`file file--all${activeId === null ? ' is-active' : ''}`}
              aria-pressed={activeId === null}
              onClick={() => onSelect(null)}
            >
              <span className="file__name">Tutti i file</span>
              <span className="file__meta">Trascrizioni unite nell'ordine dell'elenco</span>
            </button>
          </li>
        )}

        {documents.map((doc, index) => {
          const active = doc.id === activeId
          return (
            <li
              key={doc.id}
              className={`file-row${doc.error ? ' file-row--error' : ''}`}
            >
              <button
                type="button"
                className={`file file--pick${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => onSelect(active ? null : doc.id)}
                title={active ? 'Torna a tutti i file' : `Mostra solo ${doc.name}`}
              >
                <span className="file__name">{doc.name}</span>
                <span className="file__meta">
                  {doc.error
                    ? doc.error
                    : `${doc.cues.length} battute · ${formatDuration(doc.duration)} · ${formatSize(doc.size)}`}
                </span>
              </button>

              <div className="file__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onMove(doc.id, -1)}
                  disabled={index === 0}
                  aria-label={`Sposta ${doc.name} in alto`}
                  title="Sposta in alto"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => onMove(doc.id, 1)}
                  disabled={index === documents.length - 1}
                  aria-label={`Sposta ${doc.name} in basso`}
                  title="Sposta in basso"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => onRemove(doc.id)}
                  aria-label={`Rimuovi ${doc.name}`}
                  title="Rimuovi"
                >
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
