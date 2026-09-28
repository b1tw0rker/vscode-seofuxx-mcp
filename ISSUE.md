# VS-Code-Extension „SEOFuxx MCP“ – SEOFuxx-MCP-Server per Marketplace bereitstellen

**Labels:** `feature`, `mcp`, `vscode-extension`, `marketplace`
**Betrifft:** neues Repo `b1tw0rker/vscode-seofuxx-mcp`, Nacharbeiten in `plugins/mcp/` (dieses Repo)

---

## Ziel

SEOFuxx-Nutzer sollen den bestehenden SEOFuxx-MCP-Server in VS Code (GitHub Copilot Chat / Agent Mode) mit
**einer Installation aus dem Visual Studio Marketplace und einem eingefügten API-Key** nutzen können – ohne
`mcp.json` von Hand zu pflegen. Vorbild ist Hostinger, das seinen MCP-Server ebenfalls als VS-Code-Extension
ausliefert.

Die Extension ist ein dünner Wrapper: Sie registriert den **bereits existierenden** HTTP-Endpoint
`https://www.seofuxx.com/api/v1/mcp` über die VS-Code-API und liefert den API-Key als Bearer-Header mit. Die
eigentliche Logik (Tools, Auth, Daten) bleibt serverseitig in diesem Repo.

## Ist-Stand

| Baustein | Ort | Stand |
|---|---|---|
| MCP-Endpoint (Streamable HTTP, nur POST, zustandslos) | `api/v1/mcp/index.php` → `plugins/mcp/inc/mcp-server.inc.php` | läuft auf prod und www001 |
| Protokollversion | `BW_MCP_PROTOCOL_VERSION = '2025-06-18'` | |
| Auth | `Authorization: Bearer sfx_live_…`, geprüft von `inc/services/ApiKeyService.php` | Keys unter `/account`, Tab „API-Keys“ |
| Tools | `plugins/mcp/inc/tools.inc.php` | `list_seo_projects`, `get_seo_recommendations` (beide nur lesend) |
| Registry-Beschreibung | `server.json` (`com.seofuxx/seo-audit`) | vorhanden, noch nicht in der MCP-Registry veröffentlicht |
| Marketplace-Publisher | `BITWORKER` (bereits genutzt für `bw-snippets`) | PAT/Azure-DevOps-Zugang auf dem Dev-Rechner vorhanden |

Heute muss jeder Nutzer den Server manuell eintragen (`.vscode/mcp.json` bzw. `claude mcp add`). Das ist die
Hürde, die die Extension beseitigt.

## Scope

**Drin**

- Neue VS-Code-Extension `BITWORKER.seofuxx-mcp`, Anzeigename „SEOFuxx MCP“
- Registrierung des Remote-Servers über `mcpServerDefinitionProviders` / `vscode.lm.registerMcpServerDefinitionProvider`
- API-Key-Verwaltung über `context.secrets` (SecretStorage), nie in `settings.json`
- Befehle zum Setzen, Prüfen und Entfernen des Keys
- Marketplace-Listing (README, Icon, Screenshots, CHANGELOG) und Veröffentlichung per `vsce publish`
- Kleine serverseitige Nacharbeiten, damit die ersten Eindrücke im Marketplace stimmen (siehe unten)

**Nicht drin (eigene Issues)**

- Neue Tools, die Analysen auslösen oder Daten schreiben (Credits, Rate-Limits, Missbrauch sind separat zu klären)
- OAuth-Flow statt API-Key
- Open-VSX-Veröffentlichung für Cursor/Windsurf/VSCodium
- Server-seitiges Streaming (SSE/GET)

## Architektur

```
VS Code (Copilot Chat, Agent Mode)
   │  McpServerDefinitionProvider  ──►  McpHttpServerDefinition
   │                                     uri:     https://www.seofuxx.com/api/v1/mcp
   │                                     headers: Authorization: Bearer <Key aus SecretStorage>
   ▼
POST /api/v1/mcp  (JSON-RPC 2.0, Streamable HTTP, non-streaming)
   ▼
plugins/mcp/inc/mcp-server.inc.php  →  ApiKeyService::authenticate()  →  tools.inc.php
```

Kein lokaler Prozess, kein Node-Server auf dem Rechner des Nutzers – die Extension liefert nur die
Server-Definition. Dadurch gibt es clientseitig nichts zu warten, neue Tools erscheinen ohne Extension-Update.

## Umsetzung der Extension

### `package.json` (Kern)

```json
{
  "name": "seofuxx-mcp",
  "displayName": "SEOFuxx MCP",
  "description": "SEO-Analysen und priorisierte Onpage-Empfehlungen aus deinem SEOFuxx-Account direkt im Copilot-Chat.",
  "publisher": "BITWORKER",
  "version": "0.1.0",
  "license": "MIT",
  "icon": "images/seofuxx-128.png",
  "engines": { "vscode": "^1.101.0" },
  "categories": ["AI", "Chat"],
  "keywords": ["mcp", "seo", "seofuxx", "copilot", "onpage"],
  "repository": { "type": "git", "url": "https://github.com/b1tw0rker/vscode-seofuxx-mcp" },
  "main": "./dist/extension.js",
  "extensionKind": ["ui", "workspace"],
  "activationEvents": [],
  "contributes": {
    "mcpServerDefinitionProviders": [
      { "id": "seofuxx", "label": "SEOFuxx" }
    ],
    "commands": [
      { "command": "seofuxx.setApiKey",    "title": "SEOFuxx: API-Key hinterlegen" },
      { "command": "seofuxx.testConnection", "title": "SEOFuxx: Verbindung testen" },
      { "command": "seofuxx.clearApiKey",  "title": "SEOFuxx: API-Key entfernen" },
      { "command": "seofuxx.openApiKeys",  "title": "SEOFuxx: API-Key erzeugen (Browser)" }
    ],
    "configuration": {
      "title": "SEOFuxx",
      "properties": {
        "seofuxx.endpoint": {
          "type": "string",
          "default": "https://www.seofuxx.com/api/v1/mcp",
          "description": "MCP-Endpoint. Nur für Tests ändern (z. B. https://www001.seofuxx.com/api/v1/mcp)."
        }
      }
    }
  }
}
```

`engines.vscode` muss mindestens die Version sein, in der die MCP-Provider-API stabil ist (1.101). Mit
`activationEvents: []` aktiviert VS Code die Extension automatisch über den Contribution Point.

### `src/extension.ts` (Verhalten)

- `activate()` registriert den Provider unter der ID `seofuxx` (muss mit `contributes.mcpServerDefinitionProviders[].id` übereinstimmen).
- `provideMcpServerDefinitions()` liefert **immer** genau eine `McpHttpServerDefinition` („SEOFuxx“, Endpoint aus
  `seofuxx.endpoint`, `version` = Extension-Version) – noch ohne Key, damit der Server in der MCP-Liste sichtbar ist.
- `resolveMcpServerDefinition()` wird beim Start des Servers aufgerufen:
  - Key aus `context.secrets.get('seofuxx.apiKey')` lesen.
  - Fehlt er: `showInputBox({ password: true, prompt: … })` mit Link-Hinweis auf `/account`; Eingabe muss mit
    `sfx_live_` beginnen. Abbruch → `undefined` zurückgeben (Server startet nicht).
  - Key als Header `Authorization: Bearer <key>` setzen und Definition zurückgeben.
- `onDidChangeMcpServerDefinitions` feuert bei Änderung des Keys (`context.secrets.onDidChange`) und bei Änderung
  von `seofuxx.endpoint`, damit VS Code den Server neu aufbaut.
- `seofuxx.testConnection` schickt `initialize` + `tools/list` an den Endpoint und meldet Erfolg mit Tool-Anzahl
  bzw. bei 401 „API-Key ungültig oder widerrufen“.
- Keine Telemetrie, kein Logging des Keys (auch nicht im Output-Channel).

### Repo-Aufbau

```
vscode-seofuxx-mcp/
├─ src/extension.ts
├─ images/seofuxx-128.png        # Marketplace-Icon, 128×128 PNG
├─ images/screenshot-*.png       # für README
├─ README.md                     # Marketplace-Seite
├─ CHANGELOG.md
├─ LICENSE.md
├─ .vscodeignore                 # src/, node_modules/, *.map raus
├─ esbuild.js                    # bündelt nach dist/extension.js
├─ package.json
└─ tsconfig.json
```

Lokal liegt das Projekt neben `vscode-snippets` unter `/home/nick/daten/DEV/vscode-seofuxx-mcp`.

## Serverseitige Nacharbeiten (dieses Repo)

Diese Punkte sind im Marketplace sofort sichtbar, deshalb vor dem ersten Release erledigen:

- [ ] `get_seo_recommendations`: `{{platzhalter}}` in `title`, `description` und `fix` auflösen (heute nur in
      `fix_code` über `bwMcpResolveRecText()`), `plugins/mcp/inc/tools.inc.php`
- [ ] `get_seo_recommendations`: Analyse per vollständiger URL suchen, Domain nur als Fallback
- [ ] `get_seo_recommendations`: `score_google` und `pagespeed` mit ausliefern
- [ ] Tool-Beschreibungen auf Englisch (Copilot wählt Tools anhand der Beschreibung; deutsche Antworten bleiben)
- [ ] `annotations: { readOnlyHint: true }` an beiden Tools setzen, damit VS Code sie ohne Rückfrage ausführen darf
- [ ] `instructions` im `initialize`-Result ergänzen (kurz: wofür der Server da ist, welche Tools wann)
- [ ] `BW_MCP_SERVER_VERSION` bei jeder Tool-Änderung hochziehen
- [ ] Rate-Limit pro API-Key auf `/api/v1/mcp` prüfen bzw. ergänzen
- [ ] Internal-Error-Antwort (`-32603`) gibt `$e->getMessage()` an den Client – durch generische Meldung ersetzen,
      Details nur in `bwSecureLog()`

`www.host-x.de` hat keinen MCP-Endpoint; dort ist nichts anzugleichen.

## Sicherheit

- API-Key nur in SecretStorage (OS-Keychain), nie in Settings, Workspace-Dateien oder Logs.
- Der Key gewährt ausschließlich Lesezugriff auf den eigenen Account; alle Tools bleiben `readOnly`, bis ein eigenes
  Issue schreibende Tools freigibt.
- Endpoint-Setting nur mit `https://` akzeptieren, sonst Warnung und Fallback auf prod.
- Der Marketplace-PAT (Azure DevOps, Scope „Marketplace › Manage“) bleibt lokal auf dem Dev-Rechner und kommt nicht
  ins Repo.

## Veröffentlichung

1. Icon (128×128), 2–3 Screenshots (Befehlspalette, Chat mit Tool-Aufruf, MCP-Serverliste) erstellen.
2. `npx @vscode/vsce package` → `.vsix` lokal in VS Code installieren und Akzeptanzkriterien durchgehen.
3. `npx @vscode/vsce publish` mit Publisher `BITWORKER`.
4. Marketplace-Seite prüfen (Beschreibung, Kategorien „AI“/„Chat“, Icon, Links).
5. Link zur Extension auf seofuxx.com eintragen: `/account` Tab „API-Keys“ und API-Doku (`api-docs/`).
6. Optional: `server.json` in der offiziellen MCP-Registry veröffentlichen – dann taucht SEOFuxx zusätzlich in der
   MCP-Suche von VS Code (`@mcp` in der Extensions-Ansicht) auf.

## Akzeptanzkriterien

- [ ] Frisches VS Code ≥ 1.101 mit Copilot: Extension installieren → „SEOFuxx“ erscheint unter *MCP: List Servers*.
- [ ] Erster Serverstart fragt nach dem API-Key; nach Eingabe laufen `list_seo_projects` und
      `get_seo_recommendations` im Agent-Mode-Chat.
- [ ] Nach VS-Code-Neustart wird nicht erneut nach dem Key gefragt.
- [ ] Widerrufener Key → klare Meldung, Server startet nicht in einer Endlosschleife neu.
- [ ] *SEOFuxx: API-Key entfernen* → nächster Start fragt wieder.
- [ ] `seofuxx.endpoint` auf www001 umgestellt → Server wird ohne Neustart neu aufgebaut und spricht www001 an.
- [ ] Der Key taucht in keinem Log, keiner Einstellung und keiner Datei im Workspace auf.
- [ ] Extension funktioniert in Remote-SSH/WSL-Fenstern (Key bleibt lokal).
- [ ] `vsce package` erzeugt keine Warnungen; `.vsix` < 1 MB.

## Offene Fragen

- Extension-Name final „SEOFuxx MCP“ oder „SEOFuxx – SEO Audit for Copilot“ (besser auffindbar)?
- Soll der Publisher `BITWORKER` bleiben oder ein eigener Publisher `seofuxx` angelegt werden (Vertrauen im
  Marketplace, „Verified Publisher“ über die Domain seofuxx.com)?
- Open VSX (Cursor/Windsurf) direkt mitnehmen? Dort ist die Provider-API nicht garantiert verfügbar; Fallback wäre
  eine README-Anleitung für manuelle `mcp.json`-Konfiguration.
