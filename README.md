# Aurea Hair Studio — sito demo

Landing page dimostrativa per un parrucchiere, pensata per essere mostrata a
potenziali clienti. Salone fittizio: **Aurea Hair Studio, Torino**.

## Com'è fatta

- **Hero a scroll-scrub**: il video della trasformazione (sfondo bianco) è stato
  convertito in una sequenza di 121 frame WebP (`assets/frames` per desktop,
  `assets/frames-sm` per mobile) disegnati su `<canvas>` in base alla posizione
  di scroll, con interpolazione per un movimento fluido. Tre battute di testo si
  alternano in sincrono con l'animazione.
- **Slider prima/dopo** costruito con il primo e l'ultimo frame del video.
- **Palette**: teal `#44DDF1` · oro `#F5CD6A` · arancio `#EB8F48` · prugna
  `#3A2044` + relative tinte (tutti i token in `css/style.css`).
- **Font**: Montserrat (titoli) e Inter (testo), self-hostati in
  `assets/fonts` come font variabili — nessuna chiamata a Google Fonts.
- Vanilla HTML/CSS/JS, zero dipendenze. Rispetta `prefers-reduced-motion`
  (hero statico con il frame finale) e funziona anche senza JavaScript.

## Per provarla in locale
.
```bash
cd parrucchiere
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Cosa personalizzare per un cliente reale

- Testi e prezzi in `index.html` (tutte le sezioni sono marcate da commenti).
- Numero di telefono/WhatsApp, indirizzo e orari (sezione "contatti" + JSON-LD).
- L'email nella fascia "demo" e nel footer.
