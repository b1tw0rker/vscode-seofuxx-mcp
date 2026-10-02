# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Projekt

VS-Code-Extension **SEOFuxx MCP** (`BITWORKER.seofuxx-mcp`). Dünner Wrapper, der den bestehenden Remote-MCP-Server
`https://www.seofuxx.com/api/v1/mcp` (Streamable HTTP) per `mcpServerDefinitionProviders` in VS Code registriert und den
API-Key (`sfx_live_…`) als Bearer-Header mitliefert. Die Tool-Logik liegt serverseitig in einem anderen Repo – hier
gibt es **keine** MCP-Tools.

Hintergrund und Scope: [ISSUE.md](ISSUE.md). Nutzerdoku: [README.md](README.md).

## Ordnerstruktur

```
.
├── src/              TypeScript-Quellen (Einstieg: extension.ts)
│   ├── extension.ts  activate(): Provider, Commands, SecretStorage
│   └── probe.ts      initialize + tools/list gegen den Endpoint (ohne vscode-Import, testbar)
├── dist/             Build-Ausgabe (esbuild-Bundle, nicht committen)
├── images/           Marketplace-Icon
├── .vscode/          launch.json (Extension Host), tasks.json
├── package.json      Extension-Manifest (contributes, Commands, Settings) + Scripts
├── tsconfig.json     strict, nur Typprüfung (noEmit)
├── .vscodeignore     Was NICHT ins .vsix kommt
├── CHANGELOG.md      Pro Release pflegen
└── *.vsix            Paketierte Extension (nicht committen)
```

## Befehle

| Zweck | Befehl |
|---|---|
| Build (Typecheck + Bundle) | `npm run build` |
| .vsix erzeugen | `npm run package` |
| Veröffentlichen | `npm run publish` (Publisher `BITWORKER`, PAT nötig) |
| Debuggen | F5 → Konfiguration „Extension“ |

Es gibt aktuell keine Tests und keinen Linter.

## Konventionen

- TypeScript `strict`; Bundle per esbuild (`platform=node`, `cjs`, `vscode` external).
- Der API-Key liegt ausschließlich in `context.secrets` (Key `seofuxx.apiKey`) – nie in Settings, Logs oder Dateien.
- `seofuxx.endpoint` muss mit `https://` beginnen, sonst Fallback auf Prod.
- Neue Commands: in `package.json` (`contributes.commands`, Kategorie „SEOFuxx“) **und** in `extension.ts` registrieren.
- UI-Texte und README auf Englisch, Code-Kommentare auf Deutsch (bestehender Stil).
- Logik ohne `vscode`-Abhängigkeit in eigene Module auslagern (wie `probe.ts`).
- Bei Änderungen: `CHANGELOG.md` ergänzen und Version in `package.json` anheben.

## Hinweise

- `dist/`, `node_modules/` und `*.vsix` sind in `.gitignore`.
- `README.md` landet im Marketplace – Änderungen dort sind öffentlich sichtbar.

## Git-Workflow

- Claude committet und pusht Änderungen selbstständig, ohne vorher nachzufragen (dauerhafte Freigabe des Users).
- Nach abgeschlossenen, sinnvoll abgegrenzten Änderungen: `git add` (gezielt, keine Secrets/`dist/`/`*.vsix`), Commit, `git push`.
- Commit-Messages kurz und im Imperativ; Branch ist `main`.
- Kein `--force`, kein `--no-verify` und keine History-Umschreibung ohne ausdrückliche Anweisung.

## Arbeitsweise

- So selbstständig wie möglich arbeiten: Aufgabe direkt erledigen, nicht zwischendurch nachfragen oder um Bestätigung bitten.
- Bei Unklarheiten die naheliegendste Variante wählen, umsetzen und das Ergebnis kurz nennen.
- Nur bei wirklich riskanten oder unumkehrbaren Aktionen (z. B. Force-Push, Löschen von Daten) vorher rückfragen.

## Infrastruktur

- Wir sind selbst DNS-Anbieter und Domain-Provider für `seofuxx.com` (PowerDNS). DNS-Änderungen, z. B. TXT-Records für die MCP-Registry-Verifizierung, können daher direkt erledigt werden.
- Zugangsdaten (SSH, Web-Oberfläche, PowerDNS-API) liegen in der lokalen `.env` – nur dort lesen, nie in Code, Logs, Commits oder Antworten ausgeben. `.env` ist nicht im Git.
- Reine Lese-Abfragen sind frei. Schreibende DNS-Änderungen vorher kurz nennen und danach per `dig` prüfen; bestehende Records nicht löschen oder überschreiben, nur gezielt ergänzen.
- Du kannst diene eigen Claude.md selber selbststänidg ohne nachfragen bearbeiten
