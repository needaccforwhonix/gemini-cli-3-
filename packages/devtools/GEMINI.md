# Gemini CLI DevTools

Integrated Developer Tools for Gemini CLI, providing a Chrome DevTools-like
interface for Network and Console inspection. Launched automatically when the
`general.devtools` setting is enabled.

## Features

- **Network Inspector**: Real-time request/response logging with streaming
  chunks and duration tracking
- **Console Inspector**: Real-time console log viewing
  (log/warn/error/debug/info)
- **Session Management**: Multiple CLI session support with live connection
  status
- **Import/Export**: Import JSONL log files, export current session logs

## How It Works

When `general.devtools` is enabled, the CLI's `devtoolsService` automatically:

1. Probes port 25417 for an existing DevTools instance
2. If found, connects as a WebSocket client
3. If not, starts a new DevTools server and connects to it
4. If another instance races for the port, the loser connects to the winner

No environment variables needed for normal use.

## Architecture

```
gemini.tsx / nonInteractiveCli.ts
         │  (dynamic import)
         ▼
  devtoolsService.ts          ← orchestration + DevTools lifecycle
         │  (imports)
         ▼
  activityLogger.ts           ← pure logging (capture, file, WebSocket transport)
         │  (events)
         ▼
  DevTools server (:25417)    ← this package (HTTP + WebSocket + SSE)
         │  (SSE /events)
         ▼
  DevTools UI (React)         ← client/ compiled by esbuild
```

## Environment Variables

| Variable                         | Description                                   |
| -------------------------------- | --------------------------------------------- |
| `GEMINI_CLI_ACTIVITY_LOG_TARGET` | File path for JSONL mode (optional, fallback) |

## API Endpoints

| Endpoint                | Method    | Description                                                                 |
| ----------------------- | --------- | --------------------------------------------------------------------------- |
| `/ws`                   | WebSocket | Log ingestion from CLI sessions (register, network, console)                |
| `/events`               | SSE       | Pushes snapshot on connect, then incremental network/console/session events |
| `/api/trigger-debugger` | POST      | Triggers the Node.js debugger for a specific CLI session via WebSocket      |

## Development

```bash
# Build everything (client + server)
npm run build

# Rebuild client only after UI changes
npm run build:client
```

### Project Structure

```
packages/devtools/
├── src/
│   └── index.ts           # DevTools server (HTTP, WebSocket, SSE)
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx        # React entry
│       ├── App.tsx         # DevTools UI
│       └── hooks.ts        # Data fetching hooks
├── esbuild.client.js       # Client build script
└── dist/                   # Build output
    ├── src/index.js        # Compiled server
    └── client/             # Bundled client assets
```



## 🛡️ Strict Embedding Separation, Zero-Fallback Law & 24/7 Dual-GPU Invariant
- **Reference**: `/home/m1st/.agents/rules/RULE_Strict_Embedding_Separation_And_Dual_Pipeline.md`

### 1. Das Absolute Fallback-Verbot (Zero-Fallback Law)
Unter keinen Umständen, zu keinem Zeitpunkt und aus keinem Grund darf ein Fallback zwischen verschiedenen Embedding-Modellen stattfinden.
* **Geltende Aktion:** Fällt ein Embedding-Modell aus oder ist überlastet, MUSS die Operation sofort hart fehlschlagen (`Fail-Fast`) oder die Payload transaktional in einer Queue (NATS/SQLite) verharren, bis das exakte Modell bereit ist.
* **Verboten:** Kein stiller oder dynamischer Modellwechsel (weder Jina -> Gemma noch umgekehrt).

### 2. Warum ein Embedding-Fallback mathematisch & informationstheoretisch unmöglich ist
* **Topologische Inkompatibilität heterogener Vektorräume (Non-Isomorphism):**
  Jedes Modell $f_\theta: \mathcal{X} \to \mathbb{R}^D$ projiziert Text in eine spezifische, gelernte Riemannsche Mannigfaltigkeit. Jina v5 ($D=256$) und EmbeddingGemma ($D=768$) spannen zwei völlig inkompatible geometrische Räume auf. Die Basisvektoren der semantischen Achsen sind ohne explizite Procrustes-Transformation nicht ausgerichtet.
* **Kollaps der Kosinus-Ähnlichkeit ($	ext{sim} \approx 0$):**
  Wird eine Suchanfrage mit Modell $B$ berechnet ($v_q = f_B(q)$), während der Dokumentenkorpus mit Modell $A$ indiziert wurde ($v_d = f_A(d)$), verhält sich das Skalarprodukt mathematisch wie das zweier rein zufälliger Vektoren auf einer hochdimensionalen Einheitssphäre:
  $$\mathbb{E}[\text{sim}(u, v)] = 0 \quad \text{mit Varianz} \quad \sigma^2 = \frac{1}{D}$$
  Der Nearest-Neighbor-Algorithmus (HNSW/k-NN) liefert stochastisches Rauschen. Das RAG-System erhält völlig falsche oder irrelevante Kontexte.
* **Irreversible Index-Vergiftung (Index Poisoning):**
  Wird auch nur ein einziger Vektor von Modell $B$ als "Fallback" in den Index von Modell $A$ geschrieben, verunreinigt er die Distanzgraphen und Clusterzentren dauerhaft.
* **Das Gesetz des Fail-Fast:**
  Ein Ausfall muss hart abbrechen (`HTTP 503 Service Unavailable / IngestionQueueBlocked`).

### 3. Duale 24/7 Erfassungspflicht (GPU-Only)
* **GPU-Only Mandat:** Es läuft absolut nichts auf der CPU — GPU ONLY (NVIDIA GB10 CUDA) für ausnahmslos jedes Embedding-Modell.
* **24/7 Parallelität:** Sowohl `jina-embeddings-v5-omni-nano-classification` (256D, ~4,1 GB VRAM) als auch `google/embeddinggemma-300m` (768D, ~1,2 GB VRAM) laufen dauerhaft 24/7 im VRAM (Summe ~5,3 GB VRAM).
* **Duale Erfassung:** Jeder zu indizierende Text/Chunk wird immer von beiden Modellen parallel eingebettet und getrennt persistiert.

### 4. Idioten- & Failsafe-Sicherung auf Datenbankebene
* **SQLite Schema CHECK-Constraints:**
  `model_signature TEXT NOT NULL CHECK(model_signature = '...')` und `dimension INTEGER NOT NULL CHECK(dimension = ...)` erzwingen atomare Abbrüche auf Engine-Ebene bei Modell-Mismatches.
* **Qdrant Collection Constraints:**
  Strikte Trennung in separate Collections (`dgx_text_embeddings_jina_256` vs `dgx_text_embeddings_gemma_768`) mit fixierter Vektordimension.


## ⚡ High-Quality Systems Programming Languages Priority (No-Python Policy)
- **Reference**: `/home/m1st/.agents/rules/RULE_High_Quality_Systems_Programming_Languages.md`
- **Rule**:
  1. **Bevorzugte Sprachen:** High Quality **Golang (Go), Rust, C++, Zig, PowerShell, C** sind IMMER und AUSNAHMSLOS die bevorzugten Programmiersprachen.
  2. **Kein Python:** Python ist für neue Daemons, Watcher, Automatisierungen, APIs, CLI-Tools und Dienste strikt untersagt (GIL-Bottlenecks, Dependency-Drift, Speicherineffizienz).
  3. **Natives Systems-Engineering:** Alle Hintergrunddienste, Caching-Ebenen und Task-Runner müssen als native, speichersichere und nebenläufige Binaries kompiliert werden.
