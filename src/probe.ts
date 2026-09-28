/**
 * Prüft einen SEOFuxx-MCP-Endpoint mit initialize + tools/list.
 * Bewusst ohne vscode-Import, damit es sich auch außerhalb von VS Code testen lässt.
 */

export type ProbeResult =
  | { ok: true; serverVersion: string; tools: string[] }
  | { ok: false; unauthorized: boolean; message: string };

async function rpc(endpoint: string, apiKey: string, id: number, method: string, params: object = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(15000),
  });

  const body = (await response.json().catch(() => ({}))) as { result?: any; error?: { message?: string } };
  return { status: response.status, body };
}

export async function probeServer(endpoint: string, apiKey: string, clientVersion: string): Promise<ProbeResult> {
  try {
    const init = await rpc(endpoint, apiKey, 1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'seofuxx-vscode', version: clientVersion },
    });

    if (init.status === 401) {
      return { ok: false, unauthorized: true, message: init.body.error?.message ?? 'Unauthorized' };
    }
    if (init.status !== 200 || !init.body.result) {
      return { ok: false, unauthorized: false, message: init.body.error?.message ?? `HTTP ${init.status}` };
    }

    const list = await rpc(endpoint, apiKey, 2, 'tools/list');
    const tools: { name: string }[] = list.body.result?.tools ?? [];

    return {
      ok: true,
      serverVersion: init.body.result.serverInfo?.version ?? '?',
      tools: tools.map((tool) => tool.name),
    };
  } catch (error) {
    return { ok: false, unauthorized: false, message: error instanceof Error ? error.message : String(error) };
  }
}
