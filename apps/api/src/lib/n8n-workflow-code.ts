export const PIPELINE_CALLBACK_CODE = `
import { workflow, node, trigger } from '@n8n/workflow-sdk';

const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2,
  config: {
    name: 'Pipeline Callback Webhook',
    parameters: {
      httpMethod: 'POST',
      path: 'leadloop-pipeline',
      responseMode: 'lastNode',
    },
  },
});

const logPayload = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log Pipeline Result',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'received', name: 'received', value: '={{ $json }}', type: 'object' },
        ],
      },
    },
  },
});

export default workflow('leadloop-pipeline-callback', 'LeadLoop Pipeline Callback')
  .add(webhook)
  .to(logPayload);
`;

export const LEAD_ROUTER_CODE = `
import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

const inboundWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2,
  config: {
    name: 'Inbound Lead Webhook',
    parameters: {
      httpMethod: 'POST',
      path: 'inbound-lead',
      responseMode: 'responseNode',
    },
  },
});

const processLead = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Process Lead (LeadLoop API)',
    parameters: {
      method: 'POST',
      url: "={{ ($env.LEADLOOP_API_URL || 'http://localhost:3011') + '/leads/process' }}",
      sendBody: true,
      specifyBody: 'json',
      jsonBody:
        "={{ JSON.stringify({ name: $json.body?.name || $json.name, email: $json.body?.email || $json.email, company: $json.body?.company || $json.company, role: $json.body?.role || $json.role, message: $json.body?.message || $json.message, phone: $json.body?.phone || $json.phone, source: $json.body?.source || $json.source || 'n8n_webhook' }) }}",
    },
  },
});

const hotBranch = ifElse({
  version: 2,
  config: {
    name: 'IF Hot Lead',
    parameters: {
      conditions: {
        options: { caseSensitive: true, typeValidation: 'strict' },
        combinator: 'and',
        conditions: [
          {
            id: 'hot-check',
            leftValue: '={{ $json.band }}',
            rightValue: 'hot',
            operator: { type: 'string', operation: 'equals' },
          },
        ],
      },
    },
  },
});

const logHot = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log Hot Lead',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'log-hot',
            name: 'message',
            value: '=Hot lead routed: {{ $json.leadRunId }}',
            type: 'string',
          },
        ],
      },
    },
  },
});

const respond = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.1,
  config: {
    name: 'Respond to Webhook',
    parameters: {
      respondWith: 'json',
      responseBody:
        "={{ JSON.stringify({ leadRunId: $('Process Lead (LeadLoop API)').item.json.leadRunId, status: $('Process Lead (LeadLoop API)').item.json.status, band: $('Process Lead (LeadLoop API)').item.json.band, attioPersonUrl: $('Process Lead (LeadLoop API)').item.json.attioPersonUrl }) }}",
    },
  },
});

export default workflow('leadloop-inbound-router', 'LeadLoop Inbound Lead Router')
  .add(inboundWebhook)
  .to(processLead)
  .to(hotBranch)
  .onTrue(logHot.to(respond))
  .onFalse(respond);
`;
