# SEOFuxx MCP – SEO Audit for Copilot

Bring your [SEOFuxx](https://www.seofuxx.com) SEO analyses into **GitHub Copilot Chat**. This extension registers the
SEOFuxx MCP server (Model Context Protocol) in VS Code, so Copilot's agent mode can read your projects and the
prioritized on-page recommendations of your latest SEO audits – and fix them right in your code.

## Features

- **Zero config** – no `mcp.json` editing. Install, paste your API key, done.
- **Secure** – your API key is stored in VS Code's Secret Storage (OS keychain), never in settings or workspace files.
- **Always up to date** – the server runs at seofuxx.com; new tools show up without an extension update.
- **Read-only** – the tools only read data from your own SEOFuxx account.

### Tools

| Tool | What it does |
|---|---|
| `list_seo_projects` | Lists the domains/projects in your SEOFuxx account incl. keywords and auto-crawl status. |
| `get_seo_recommendations` | Returns the latest SEO analysis for a URL: scores and prioritized recommendations with fix code. |

## Getting started

1. Create a free account at [seofuxx.com](https://www.seofuxx.com) and analyze your website once.
2. Create an API key: **Account → API keys** (or run **SEOFuxx: Create API Key** from the Command Palette).
3. Open Copilot Chat in **Agent** mode. VS Code asks for your key the first time the SEOFuxx server starts
   (or run **SEOFuxx: Set API Key**).
4. Ask for example:
   > *Which SEO problems does SEOFuxx report for https://www.example.com? Fix the ones that affect this project.*

Check the server under **MCP: List Servers → SEOFuxx**.

## Commands

| Command | Description |
|---|---|
| `SEOFuxx: Set API Key` | Store or replace your API key. |
| `SEOFuxx: Test Connection` | Checks the key and lists the available tools. |
| `SEOFuxx: Remove API Key` | Deletes the stored key. |
| `SEOFuxx: Create API Key (opens seofuxx.com)` | Opens the API key page in your browser. |

## Settings

| Setting | Default | Description |
|---|---|---|
| `seofuxx.endpoint` | `https://www.seofuxx.com/api/v1/mcp` | MCP endpoint. Only change this for testing. |

## Requirements

- VS Code 1.101 or newer
- GitHub Copilot Chat (agent mode) or another chat client in VS Code that supports MCP servers

## Other MCP clients

Claude Code, Claude Desktop, Cursor & co. can use the same server directly:

```
claude mcp add --scope user --transport http seofuxx https://www.seofuxx.com/api/v1/mcp \
  --header "Authorization: Bearer sfx_live_…"
```

## Privacy

The extension sends your API key only to the configured SEOFuxx endpoint. It collects no telemetry.
