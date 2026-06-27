import { env } from "./env.js";
import { createLogger } from "./logger.js";
import { LEAD_ROUTER_CODE, PIPELINE_CALLBACK_CODE } from "./n8n-workflow-code.js";

const logger = createLogger("n8n-mcp");

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export function isN8nMcpConfigured(): boolean {
  return Boolean(env.n8nMcpUrl && env.n8nMcpToken);
}

export class N8nMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(
    private readonly url = env.n8nMcpUrl,
    private readonly token = env.n8nMcpToken,
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.token}`,
    };
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    return headers;
  }

  private parseResponseBody(text: string): JsonRpcResponse {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed) as JsonRpcResponse;
    }

    const dataLines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    for (const data of dataLines.reverse()) {
      if (!data || data === "[DONE]") continue;
      try {
        return JSON.parse(data) as JsonRpcResponse;
      } catch {
        continue;
      }
    }

    throw new Error(`Could not parse MCP response: ${text.slice(0, 200)}`);
  }

  private async post(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(message),
    });

    const sessionHeader = res.headers.get("mcp-session-id");
    if (sessionHeader) this.sessionId = sessionHeader;

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    return this.parseResponseBody(text);
  }

  async initialize(): Promise<void> {
    const res = await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "leadloop", version: "1.0.0" },
      },
    });
    if (res.error) throw new Error(`MCP initialize failed: ${res.error.message}`);

    await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "notifications/initialized",
      params: {},
    }).catch(() => undefined);
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await this.post({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/call",
      params: { name, arguments: args },
    });
    if (res.error) throw new Error(`tools/call ${name} failed: ${res.error.message}`);

    const result = res.result as {
      content?: Array<{ type: string; text?: string }>;
      structuredContent?: T;
    };

    if (result.structuredContent) return result.structuredContent;

    const text = result.content?.find((c) => c.type === "text")?.text;
    if (text) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    }

    return result as T;
  }
}

type WorkflowSearchRow = {
  id: string;
  name: string;
  active?: boolean;
};

async function findWorkflow(
  client: N8nMcpClient,
  name: string,
): Promise<WorkflowSearchRow | undefined> {
  const result = await client.callTool<{ data?: WorkflowSearchRow[] }>("search_workflows", {
    query: name,
  });
  const rows = result.data ?? [];
  const matches = rows.filter((w) => w.name === name || w.name.includes(name));
  if (matches.length === 0) return undefined;
  return matches.find((w) => w.active) ?? matches.find((w) => w.name === name) ?? matches[0];
}

async function publishWorkflow(
  client: N8nMcpClient,
  workflowId: string,
  name: string,
): Promise<void> {
  const published = await client.callTool<{ success?: boolean; error?: string }>(
    "publish_workflow",
    { workflowId },
  );
  if (published.success) return;
  throw new Error(`Failed to publish ${name}: ${published.error ?? "unknown error"}`);
}

async function ensureWorkflow(
  client: N8nMcpClient,
  name: string,
  code: string,
): Promise<string> {
  const existing = await findWorkflow(client, name);
  if (existing?.id) {
    if (existing.active) {
      logger.info({ workflowId: existing.id, name: existing.name }, "Workflow already active");
      return existing.id;
    }

    try {
      await publishWorkflow(client, existing.id, name);
      logger.info({ workflowId: existing.id, name: existing.name }, "Published existing workflow");
      return existing.id;
    } catch (err) {
      logger.warn(
        {
          workflowId: existing.id,
          name: existing.name,
          err: err instanceof Error ? err.message : String(err),
        },
        "Existing workflow could not be published — creating a new one",
      );
      await client.callTool("archive_workflow", { workflowId: existing.id }).catch(() => undefined);
    }
  }

  const created = await client.callTool<{ workflowId: string; nodeCount?: number }>(
    "create_workflow_from_code",
    { code, name },
  );

  await publishWorkflow(client, created.workflowId, name);

  logger.info(
    { workflowId: created.workflowId, name, nodeCount: created.nodeCount },
    "Created and published workflow",
  );
  return created.workflowId;
}

export async function ensureLeadLoopWorkflowsViaMcp(): Promise<{
  callbackId: string;
  routerId: string;
}> {
  if (!isN8nMcpConfigured()) {
    throw new Error("Set N8N_MCP_URL and N8N_MCP_TOKEN in .env.local");
  }

  const client = new N8nMcpClient();
  await client.initialize();

  const callbackId = await ensureWorkflow(
    client,
    "LeadLoop Pipeline Callback",
    PIPELINE_CALLBACK_CODE,
  );

  const routerId = await ensureWorkflow(
    client,
    "LeadLoop Inbound Lead Router",
    LEAD_ROUTER_CODE,
  );

  return { callbackId, routerId };
}
