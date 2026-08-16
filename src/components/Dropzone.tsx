import { useRef, useState, type DragEvent } from 'react'

interface Props {
  onFiles: (files: File[]) => void
}

export function Dropzone({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Carica file .vtt"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".vtt,.srt,text/vtt"
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      <svg className="dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <p className="dropzone__title">Trascina qui i tuoi file .vtt</p>
      <p className="dropzone__hint">
        oppure <span className="dropzone__link">scegli dal computer</span> — puoi caricarne quanti vuoi
      </p>
    </div>
  )
}
