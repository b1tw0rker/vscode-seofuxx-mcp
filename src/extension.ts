import * as vscode from 'vscode';
import { probeServer } from './probe';

const PROVIDER_ID = 'seofuxx';
const SECRET_KEY = 'seofuxx.apiKey';
const KEY_PREFIX = 'sfx_live_';
const DEFAULT_ENDPOINT = 'https://www.seofuxx.com/api/v1/mcp';
const API_KEYS_URL = 'https://www.seofuxx.com/account#apikeys';

export function activate(context: vscode.ExtensionContext) {
  const version: string = context.extension.packageJSON.version;
  const changed = new vscode.EventEmitter<void>();

  /**
   * Endpoint aus den Settings, nur https - sonst Fallback auf prod.
   */
  function endpoint(): string {
    const configured = vscode.workspace.getConfiguration('seofuxx').get<string>('endpoint', DEFAULT_ENDPOINT).trim();
    return configured.startsWith('https://') ? configured : DEFAULT_ENDPOINT;
  }

  async function askForApiKey(): Promise<string | undefined> {
    const createKey = 'Create API key';
    const key = await vscode.window.showInputBox({
      title: 'SEOFuxx API key',
      prompt: 'Paste your personal SEOFuxx API key (seofuxx.com → Account → API keys).',
      placeHolder: `${KEY_PREFIX}…`,
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim().startsWith(KEY_PREFIX) ? undefined : `The key starts with "${KEY_PREFIX}".`),
    });

    if (key === undefined) {
      const choice = await vscode.window.showInformationMessage('SEOFuxx needs an API key to start the MCP server.', createKey);
      if (choice === createKey) {
        await vscode.env.openExternal(vscode.Uri.parse(API_KEYS_URL));
      }
      return undefined;
    }

    await context.secrets.store(SECRET_KEY, key.trim());
    return key.trim();
  }

  const provider: vscode.McpServerDefinitionProvider<vscode.McpHttpServerDefinition> = {
    onDidChangeMcpServerDefinitions: changed.event,

    // Immer sichtbar, auch ohne Key - der wird erst beim Start in resolve abgefragt.
    provideMcpServerDefinitions: () => [new vscode.McpHttpServerDefinition('SEOFuxx', vscode.Uri.parse(endpoint()), {}, version)],

    resolveMcpServerDefinition: async (server) => {
      const apiKey = (await context.secrets.get(SECRET_KEY)) ?? (await askForApiKey());
      if (!apiKey) {
        return undefined;
      }

      server.headers = { ...server.headers, Authorization: `Bearer ${apiKey}` };
      return server;
    },
  };

  context.subscriptions.push(
    changed,
    vscode.lm.registerMcpServerDefinitionProvider(PROVIDER_ID, provider),

    context.secrets.onDidChange((event) => {
      if (event.key === SECRET_KEY) {
        changed.fire();
      }
    }),

    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('seofuxx.endpoint')) {
        changed.fire();
      }
    }),

    vscode.commands.registerCommand('seofuxx.setApiKey', async () => {
      if (await askForApiKey()) {
        vscode.window.showInformationMessage('SEOFuxx API key saved.');
      }
    }),

    vscode.commands.registerCommand('seofuxx.clearApiKey', async () => {
      await context.secrets.delete(SECRET_KEY);
      vscode.window.showInformationMessage('SEOFuxx API key removed.');
    }),

    vscode.commands.registerCommand('seofuxx.openApiKeys', () => vscode.env.openExternal(vscode.Uri.parse(API_KEYS_URL))),

    vscode.commands.registerCommand('seofuxx.testConnection', async () => {
      const apiKey = (await context.secrets.get(SECRET_KEY)) ?? (await askForApiKey());
      if (!apiKey) {
        return;
      }

      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'SEOFuxx: testing connection…' },
        () => probeServer(endpoint(), apiKey, version),
      );

      if (result.ok) {
        vscode.window.showInformationMessage(`SEOFuxx connected (server ${result.serverVersion}). Tools: ${result.tools.join(', ')}`);
      } else if (result.unauthorized) {
        const replace = 'Enter new key';
        const choice = await vscode.window.showErrorMessage('SEOFuxx: API key is invalid or has been revoked.', replace);
        if (choice === replace) {
          await askForApiKey();
        }
      } else {
        vscode.window.showErrorMessage(`SEOFuxx: connection failed – ${result.message}`);
      }
    }),
  );
}

export function deactivate() {}
