import Fastify from 'fastify';

type Speed = 'fast' | 'standard' | 'deep';
type Domain = 'financial' | 'medical' | 'legal' | 'code' | 'general';
type StakeLevel = 'low' | 'medium' | 'high' | 'critical';
type OfferingName =
  | 'claim_verification'
  | 'reasoning_audit'
  | 'payment_decision'
  | 'tool_call_guard';

type ContextInput = {
  domain?: Domain;
  stakeLevel?: StakeLevel;
  speed?: Speed;
  onchain?: boolean;
};

type MetadataInput = {
  requestId?: string;
  caller?: string;
};

type ClaimVerificationInput = {
  claim: string;
  claimType?: 'factual' | 'analytical' | 'recommendation' | 'decision' | 'other';
  evidence?: string[];
  question?: string;
};

type PaymentDecisionInput = {
  action: 'approve_payment' | 'reject_payment' | 'hold_payment' | 'review_payment';
  amount: string;
  asset: string;
  recipient: string;
  purpose?: string;
  counterparty?: string;
  paymentMethod?: 'crypto' | 'bank_transfer' | 'card' | 'internal_ledger' | 'other';
  justification?: string;
  riskSignals?: string[];
};

type ToolCallGuardInput = {
  toolName: string;
  action: string;
  arguments?: Record<string, unknown>;
  intent?: string;
  target?: string;
  capabilities?: string[];
  expectedImpact?: 'low' | 'medium' | 'high' | 'critical';
};

type ReasoningAuditStep = {
  statement: string;
  type?: 'premise' | 'inference' | 'assumption' | 'evidence' | 'calculation' | 'other';
  supports?: number[];
  evidenceRefs?: string[];
};

type ReasoningAuditInput = {
  conclusion: string;
  steps: ReasoningAuditStep[];
  question?: string;
};

type Envelope<TInput> = {
  input: TInput;
  context?: ContextInput;
  metadata?: MetadataInput;
};

type OfferingBody =
  | Envelope<ClaimVerificationInput>
  | Envelope<PaymentDecisionInput>
  | Envelope<ToolCallGuardInput>
  | Envelope<ReasoningAuditInput>;

type VerifyRequest = {
  claim: string;
  context?: string;
  domain?: Domain;
  stakeLevel?: StakeLevel;
  speed?: Speed;
  onchain?: boolean;
};

type OfferingDefinition = {
  name: OfferingName;
  title: string;
  description: string;
  defaultSpeed: Speed;
  defaultDomain: Domain;
  defaultStakeLevel: StakeLevel;
  recommendedSpeeds: Speed[];
  tags: string[];
  notes: string[];
  examples: Array<Record<string, unknown>>;
  inputSchema: Record<string, unknown>;
};

const PORT = Number(process.env.PORT ?? 3011);
const BASE_URL = process.env.ACP_BASE_URL ?? `http://localhost:${PORT}`;
const THOUGHTPROOF_API_URL = process.env.THOUGHTPROOF_API_URL ?? 'https://api.thoughtproof.ai';
const THOUGHTPROOF_OPERATOR_KEY = process.env.THOUGHTPROOF_OPERATOR_KEY;

const PRICING = {
  fast: { usd: 0.008, usdc: '0.008', cents: 0.8, amountAtomic: '8000' },
  standard: { usd: 0.02, usdc: '0.02', cents: 2, amountAtomic: '20000' },
  deep: { usd: 0.08, usdc: '0.08', cents: 8, amountAtomic: '80000' },
} as const;

const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    domain: { type: 'string', enum: ['financial', 'medical', 'legal', 'code', 'general'] },
    stakeLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    speed: { type: 'string', enum: ['fast', 'standard', 'deep'] },
    onchain: { type: 'boolean' },
  },
  additionalProperties: false,
};

const METADATA_SCHEMA = {
  type: 'object',
  properties: {
    requestId: { type: 'string' },
    caller: { type: 'string' },
  },
  additionalProperties: false,
};

const CLAIM_VERIFICATION_SCHEMA = {
  type: 'object',
  required: ['input'],
  properties: {
    input: {
      type: 'object',
      required: ['claim'],
      properties: {
        claim: { type: 'string', description: 'The claim, output, recommendation, or decision to verify.' },
        claimType: { type: 'string', enum: ['factual', 'analytical', 'recommendation', 'decision', 'other'] },
        evidence: { type: 'array', items: { type: 'string' } },
        question: { type: 'string' },
      },
      additionalProperties: false,
    },
    context: CONTEXT_SCHEMA,
    metadata: METADATA_SCHEMA,
  },
  additionalProperties: false,
};

const PAYMENT_DECISION_SCHEMA = {
  type: 'object',
  required: ['input'],
  properties: {
    input: {
      type: 'object',
      required: ['action', 'amount', 'asset', 'recipient'],
      properties: {
        action: { type: 'string', enum: ['approve_payment', 'reject_payment', 'hold_payment', 'review_payment'] },
        amount: { type: 'string', description: 'Payment amount as a string for precision.' },
        asset: { type: 'string' },
        recipient: { type: 'string' },
        purpose: { type: 'string' },
        counterparty: { type: 'string' },
        paymentMethod: { type: 'string', enum: ['crypto', 'bank_transfer', 'card', 'internal_ledger', 'other'] },
        justification: { type: 'string' },
        riskSignals: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
    context: CONTEXT_SCHEMA,
    metadata: METADATA_SCHEMA,
  },
  additionalProperties: false,
};

const TOOL_CALL_GUARD_SCHEMA = {
  type: 'object',
  required: ['input'],
  properties: {
    input: {
      type: 'object',
      required: ['toolName', 'action'],
      properties: {
        toolName: { type: 'string' },
        action: { type: 'string' },
        arguments: { type: 'object', additionalProperties: true },
        intent: { type: 'string' },
        target: { type: 'string' },
        capabilities: { type: 'array', items: { type: 'string' } },
        expectedImpact: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      additionalProperties: false,
    },
    context: CONTEXT_SCHEMA,
    metadata: METADATA_SCHEMA,
  },
  additionalProperties: false,
};

const REASONING_AUDIT_SCHEMA = {
  type: 'object',
  required: ['input'],
  properties: {
    input: {
      type: 'object',
      required: ['conclusion', 'steps'],
      properties: {
        conclusion: { type: 'string' },
        steps: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['statement'],
            properties: {
              statement: { type: 'string' },
              type: { type: 'string', enum: ['premise', 'inference', 'assumption', 'evidence', 'calculation', 'other'] },
              supports: { type: 'array', items: { type: 'integer' } },
              evidenceRefs: { type: 'array', items: { type: 'string' } },
            },
            additionalProperties: false,
          },
        },
        question: { type: 'string' },
      },
      additionalProperties: false,
    },
    context: CONTEXT_SCHEMA,
    metadata: METADATA_SCHEMA,
  },
  additionalProperties: false,
};

const OFFERINGS: Record<OfferingName, OfferingDefinition> = {
  claim_verification: {
    name: 'claim_verification',
    title: 'ThoughtProof Claim Verification',
    description: 'Verify a claim, output, or decision before execution.',
    defaultSpeed: 'standard',
    defaultDomain: 'general',
    defaultStakeLevel: 'medium',
    recommendedSpeeds: ['fast', 'standard'],
    tags: ['verification', 'claims', 'decision-support'],
    notes: [
      'Best default offering for a single claim, recommendation, or decision.',
      'Primary input is a single claim rather than a structured reasoning chain.',
    ],
    examples: [
      {
        input: {
          claim: 'This transaction is low risk and can be executed immediately.',
          claimType: 'decision',
          question: 'Should this be trusted enough to proceed?',
        },
        context: {
          domain: 'financial',
          stakeLevel: 'high',
          speed: 'standard',
          onchain: false,
        },
      },
    ],
    inputSchema: CLAIM_VERIFICATION_SCHEMA,
  },
  payment_decision: {
    name: 'payment_decision',
    title: 'ThoughtProof Payment Decision',
    description: 'Verify whether a payment decision should proceed.',
    defaultSpeed: 'standard',
    defaultDomain: 'financial',
    defaultStakeLevel: 'high',
    recommendedSpeeds: ['standard', 'deep'],
    tags: ['payments', 'treasury', 'agent-commerce'],
    notes: [
      'Specialized for payment-related actions before funds move.',
      'Not for replacing human approval in regulated contexts.',
    ],
    examples: [
      {
        input: {
          action: 'approve_payment',
          amount: '2500.00',
          asset: 'USDC',
          recipient: '0xabc123...',
          purpose: 'Supplier payout for completed fulfillment',
          paymentMethod: 'crypto',
          justification: 'Delivery confirmed and invoice matched',
        },
        context: {
          domain: 'financial',
          stakeLevel: 'high',
          speed: 'standard',
          onchain: true,
        },
      },
    ],
    inputSchema: PAYMENT_DECISION_SCHEMA,
  },
  tool_call_guard: {
    name: 'tool_call_guard',
    title: 'ThoughtProof Tool Call Guard',
    description: 'Review risky tool calls before execution.',
    defaultSpeed: 'fast',
    defaultDomain: 'code',
    defaultStakeLevel: 'medium',
    recommendedSpeeds: ['fast', 'standard'],
    tags: ['tools', 'guardrail', 'execution'],
    notes: [
      'Use for sensitive or high-impact tool invocations before execution.',
      'This is a verification layer, not a runtime sandbox or permissions system.',
    ],
    examples: [
      {
        input: {
          toolName: 'wallet.send',
          action: 'transfer',
          arguments: {
            amount: '5000',
            asset: 'USDC',
            to: '0xdef456...',
          },
          intent: 'Send treasury payment to vendor',
          capabilities: ['transfer', 'external_write'],
          expectedImpact: 'high',
        },
        context: {
          domain: 'code',
          stakeLevel: 'critical',
          speed: 'standard',
          onchain: true,
        },
      },
    ],
    inputSchema: TOOL_CALL_GUARD_SCHEMA,
  },
  reasoning_audit: {
    name: 'reasoning_audit',
    title: 'ThoughtProof Reasoning Audit',
    description: 'Audit structured reasoning for assumptions and failure modes.',
    defaultSpeed: 'deep',
    defaultDomain: 'general',
    defaultStakeLevel: 'high',
    recommendedSpeeds: ['standard', 'deep'],
    tags: ['audit', 'verification', 'reasoning'],
    notes: [
      'Advanced offering for structured reasoning traces rather than single claims.',
      'Use when you want to inspect assumptions, inference quality, and likely failure modes.',
    ],
    examples: [
      {
        input: {
          conclusion: 'Approve the payment.',
          steps: [
            {
              statement: 'The invoice amount matches the purchase order.',
              type: 'evidence',
            },
            {
              statement: 'Delivery confirmation was received from the vendor.',
              type: 'evidence',
            },
            {
              statement: 'No anomaly flags were raised in prior checks.',
              type: 'premise',
            },
            {
              statement: 'Therefore the payment risk is acceptable.',
              type: 'inference',
              supports: [0, 1, 2],
            },
          ],
          question: 'Which assumptions or missing checks could make this conclusion fail?',
        },
        context: {
          domain: 'financial',
          stakeLevel: 'high',
          speed: 'deep',
          onchain: true,
        },
      },
    ],
    inputSchema: REASONING_AUDIT_SCHEMA,
  },
};

function isOfferingName(value: string): value is OfferingName {
  return value in OFFERINGS;
}

function buildOfferingManifest(name: OfferingName) {
  const offering = OFFERINGS[name];
  return {
    id: `thoughtproof.${name}`,
    name: offering.name,
    title: offering.title,
    description: offering.description,
    provider: {
      name: 'ThoughtProof',
      website: 'https://thoughtproof.ai',
      apiBaseUrl: THOUGHTPROOF_API_URL,
    },
    version: '0.2.0',
    transport: {
      invokeUrl: `${BASE_URL}/offerings/${name}/invoke`,
      method: 'POST',
      contentType: 'application/json',
    },
    pricing: {
      rail: 'x402',
      settlementAsset: 'USDC',
      network: 'base',
      model: 'flat_by_speed',
      tiers: Object.entries(PRICING).map(([speed, meta]) => ({
        speed,
        amountUsd: meta.usd,
        amountUsdc: meta.usdc,
        amountAtomic: meta.amountAtomic,
        currency: 'USDC',
      })),
      defaultSpeed: offering.defaultSpeed,
    },
    inputSchema: offering.inputSchema,
    outputSchema: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['ALLOW', 'BLOCK', 'UNCERTAIN'] },
        confidence: { type: 'number' },
        objections: { type: 'array', items: { type: 'string' } },
        durationMs: { type: 'integer' },
        verificationProfile: { type: 'string', enum: ['fast', 'standard', 'deep'] },
        modelCount: { type: 'integer' },
        mdi: { type: 'number' },
        onchain_proof: { type: 'object', additionalProperties: true },
      },
    },
    metadata: {
      tags: [...offering.tags, 'agent-safety', 'verification'],
      recommendedSpeeds: offering.recommendedSpeeds,
      latencyHint: '~30s for full verification',
      notes: [
        'ThoughtProof ACP is a thin wrapper over the existing ThoughtProof verification API.',
        'This package is intentionally narrow.',
        'Not suitable for synchronous AMM hooks; use pre-verification or on-chain proof reads for that pattern.',
        ...offering.notes,
      ],
      examples: offering.examples,
    },
  };
}

function flattenClaimVerification(body: Envelope<ClaimVerificationInput>, defaults: OfferingDefinition): VerifyRequest {
  return {
    claim: body.input.claim,
    context: [body.input.question, ...(body.input.evidence ?? [])].filter(Boolean).join('\n\n') || undefined,
    domain: body.context?.domain ?? defaults.defaultDomain,
    stakeLevel: body.context?.stakeLevel ?? defaults.defaultStakeLevel,
    speed: body.context?.speed ?? defaults.defaultSpeed,
    onchain: body.context?.onchain ?? false,
  };
}

function flattenPaymentDecision(body: Envelope<PaymentDecisionInput>, defaults: OfferingDefinition): VerifyRequest {
  const input = body.input;
  return {
    claim: `Payment decision: ${input.action} ${input.amount} ${input.asset} to ${input.recipient}.`,
    context: [
      input.purpose ? `Purpose: ${input.purpose}` : undefined,
      input.counterparty ? `Counterparty: ${input.counterparty}` : undefined,
      input.paymentMethod ? `Payment method: ${input.paymentMethod}` : undefined,
      input.justification ? `Justification: ${input.justification}` : undefined,
      input.riskSignals?.length ? `Risk signals: ${input.riskSignals.join(', ')}` : undefined,
    ].filter(Boolean).join('\n'),
    domain: body.context?.domain ?? defaults.defaultDomain,
    stakeLevel: body.context?.stakeLevel ?? defaults.defaultStakeLevel,
    speed: body.context?.speed ?? defaults.defaultSpeed,
    onchain: body.context?.onchain ?? false,
  };
}

function flattenToolCallGuard(body: Envelope<ToolCallGuardInput>, defaults: OfferingDefinition): VerifyRequest {
  const input = body.input;
  return {
    claim: `Tool call: ${input.toolName}.${input.action}`,
    context: [
      input.intent ? `Intent: ${input.intent}` : undefined,
      input.target ? `Target: ${input.target}` : undefined,
      input.capabilities?.length ? `Capabilities: ${input.capabilities.join(', ')}` : undefined,
      input.expectedImpact ? `Expected impact: ${input.expectedImpact}` : undefined,
      input.arguments ? `Arguments: ${JSON.stringify(input.arguments)}` : undefined,
    ].filter(Boolean).join('\n'),
    domain: body.context?.domain ?? defaults.defaultDomain,
    stakeLevel: body.context?.stakeLevel ?? defaults.defaultStakeLevel,
    speed: body.context?.speed ?? defaults.defaultSpeed,
    onchain: body.context?.onchain ?? false,
  };
}

function flattenReasoningAudit(body: Envelope<ReasoningAuditInput>, defaults: OfferingDefinition): VerifyRequest {
  const input = body.input;
  const steps = input.steps
    .map((step, index) => `${index + 1}. ${step.statement}${step.type ? ` [${step.type}]` : ''}`)
    .join('\n');

  return {
    claim: `Reasoning conclusion: ${input.conclusion}`,
    context: [
      input.question ? `Audit question: ${input.question}` : undefined,
      steps ? `Reasoning steps:\n${steps}` : undefined,
    ].filter(Boolean).join('\n\n'),
    domain: body.context?.domain ?? defaults.defaultDomain,
    stakeLevel: body.context?.stakeLevel ?? defaults.defaultStakeLevel,
    speed: body.context?.speed ?? defaults.defaultSpeed,
    onchain: body.context?.onchain ?? true,
  };
}

function normalizePayload(name: OfferingName, body: OfferingBody): VerifyRequest {
  const offering = OFFERINGS[name];

  switch (name) {
    case 'claim_verification':
      return flattenClaimVerification(body as Envelope<ClaimVerificationInput>, offering);
    case 'payment_decision':
      return flattenPaymentDecision(body as Envelope<PaymentDecisionInput>, offering);
    case 'tool_call_guard':
      return flattenToolCallGuard(body as Envelope<ToolCallGuardInput>, offering);
    case 'reasoning_audit':
      return flattenReasoningAudit(body as Envelope<ReasoningAuditInput>, offering);
  }
}

async function invokeThoughtProof(payload: VerifyRequest) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (THOUGHTPROOF_OPERATOR_KEY) {
    headers['X-Operator-Key'] = THOUGHTPROOF_OPERATOR_KEY;
  }

  const response = await fetch(`${THOUGHTPROOF_API_URL}/v1/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

const app = Fastify({ logger: true });

app.get('/healthz', async () => ({ ok: true }));

app.get('/manifest', async () => ({
  name: 'thoughtproof-acp',
  version: '0.2.0',
  baseUrl: BASE_URL,
  offerings: (Object.keys(OFFERINGS) as OfferingName[]).map((name) => buildOfferingManifest(name)),
}));

app.get('/offerings/:name', async (request, reply) => {
  const name = (request.params as { name: string }).name;
  if (!isOfferingName(name)) {
    return reply.status(404).send({ error: 'unknown_offering' });
  }
  return buildOfferingManifest(name);
});

app.post('/offerings/:name/invoke', async (request, reply) => {
  const name = (request.params as { name: string }).name;
  if (!isOfferingName(name)) {
    return reply.status(404).send({ error: 'unknown_offering' });
  }

  const body = (request.body ?? {}) as OfferingBody;
  if (!body || typeof body !== 'object' || !('input' in body) || typeof body.input !== 'object' || body.input === null) {
    return reply.status(400).send({ error: 'input is required' });
  }

  const payload = normalizePayload(name, body);
  if (!payload.claim || typeof payload.claim !== 'string') {
    return reply.status(400).send({ error: 'invalid input payload' });
  }

  const resolvedSpeed = payload.speed ?? OFFERINGS[name].defaultSpeed;
  const result = await invokeThoughtProof(payload);

  if (result.status >= 400) {
    return reply.status(result.status).send({
      offering: name,
      manifest: buildOfferingManifest(name),
      forwarded: true,
      requestedPricing: PRICING[resolvedSpeed],
      forwardedPayload: payload,
      upstream: result.data,
      ...(result.data && typeof result.data === 'object' ? result.data : {}),
    });
  }

  return {
    offering: name,
    pricing: PRICING[resolvedSpeed],
    request: body,
    forwardedPayload: payload,
    result: result.data,
  };
});

app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
