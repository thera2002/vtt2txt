# vtt2txt

Webapp che trasforma file di sottotitoli `.vtt` (e `.srt`) in testo continuo,
ripulito da indici di battuta, marcatori temporali e tag inline.

Tutta l'elaborazione avviene nel browser: i file non vengono caricati su nessun
server e non vengono salvati da nessuna parte — chiusa la pagina, spariscono.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
```

Altri comandi: `npm run build` (build di produzione in `dist/`),
`npm run preview`, `npm test`.

## Cosa fa

- Caricamento di **n file** insieme, per trascinamento o dal file picker;
  riordinabili, così il testo unito segue l'ordine delle lezioni.
- **Un file alla volta o tutti insieme**: cliccando una scheda nell'elenco la
  trascrizione mostra solo quel file; con *Tutti i file* (o ricliccando la
  scheda attiva) si torna al testo unito.
- **Copia negli appunti** e **download `.txt`** del testo generato. Se una parte
  del testo è selezionata, il pulsante copia solo quella (e lo dichiara).
- Formato del testo configurabile:
  - *Paragrafi* — i frammenti vengono uniti in prosa scorrevole, spezzata in
    paragrafi a fine frase;
  - *Una riga per battuta* — mantiene la suddivisione originale del file;
  - eliminazione delle ripetizioni consecutive (sottotitoli a scorrimento);
  - nome di chi parla, quando il file usa i tag `<v Nome>`;
  - titolo per ogni file quando se ne carica più di uno.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `src/lib/vtt.ts` | parser WebVTT e formattazione del testo (nessuna dipendenza da React) |
| `src/lib/vtt.test.ts` | test del parser |
| `src/App.tsx` | stato dell'applicazione e opzioni |
| `src/components/` | dropzone, elenco file, pannello trascrizione |
| `src/styles.css` | tema chiaro/scuro |
| `data/` | due `.vtt` di esempio per provare l'app |
