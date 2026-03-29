# thoughtproof-acp

**ThoughtProof ACP is a thin wrapper over the existing ThoughtProof verification API.** It gives agents a narrow, programmable verification surface for high-stakes actions such as claim verification, payment decision review, risky tool calls, and structured reasoning audits.

The server supports two operating modes. In hosted mode, requests are forwarded through ThoughtProof using `THOUGHTPROOF_OPERATOR_KEY`. Without an operator key, the server exposes an explicit x402 payment-gated forwarding flow, enabling pay-per-use verification without a separate custom integration.

**This package is intentionally narrow.** It does not introduce a new reasoning engine, a policy engine, or a runtime sandbox. It provides a clean ACP layer over the existing ThoughtProof verification path.

## Status

This is a real working wrapper around the live ThoughtProof API. It does not reimplement verification logic. It exposes ACP-style offerings, machine-readable pricing metadata, and invoke endpoints that forward to `POST /v1/check`.

## Offerings

### 1. `claim_verification`
Verify a claim, output, or decision before execution.

Best for:
- model-generated answers
- factual or analytical claims
- recommendations
- decision support outputs

Not for:
- full structured reasoning traces
- policy/compliance enforcement
- runtime sandboxing

### 2. `payment_decision`
Verify whether a payment decision should proceed.

Best for:
- payout approval
- transaction review
- payment risk checks
- agentic payment workflows

Not for:
- direct settlement execution
- fraud platform replacement
- replacing human approval in regulated contexts

### 3. `tool_call_guard`
Review risky tool calls before execution.

Best for:
- external API actions
- sensitive write operations
- high-impact automations
- risky tool execution review

Not for:
- full runtime isolation
- sandbox enforcement
- permissions systems by itself

### 4. `reasoning_audit`
Audit structured reasoning for assumptions and failure modes.

Best for:
- structured argument review
- advanced decision pipelines
- post-hoc reasoning analysis
- identifying weak links in a chain of reasoning

Not for:
- generic claim verification
- opaque hidden-chain-of-thought extraction
- broad compliance review

## Why these offerings?

These offerings are designed around common high-stakes agent workflows:
- `claim_verification` for verifying outputs before action
- `payment_decision` for reviewing payment-related execution
- `tool_call_guard` for inspecting risky tool usage
- `reasoning_audit` for advanced reasoning-quality analysis

The schema boundaries enforce the product boundaries. Each offering has a distinct input shape so agents can tell the difference between a single claim, a payment decision, a tool invocation, and a structured reasoning trace.

## Non-goals

ThoughtProof ACP is intentionally narrow.

It is **not**:
- a new reasoning engine
- a generic policy/compliance platform
- a runtime sandbox
- a permissions framework
- a settlement layer

It is a thin ACP wrapper over the existing ThoughtProof verification API.

## Pricing metadata

Flat by speed:

- `fast` → `$0.008` → `8000` atomic USDC (6 decimals)
- `standard` → `$0.02` → `20000` atomic USDC
- `deep` → `$0.08` → `80000` atomic USDC

Settlement metadata:

- rail: `x402`
- asset: `USDC`
- network: `base`
- model: `flat_by_speed`

## Endpoints

- `GET /healthz`
- `GET /manifest`
- `GET /offerings/:name`
- `POST /offerings/:name/invoke`

## Live deployment

Production URL:
- `https://thoughtproof-acp.vercel.app`

Quick checks:
- `https://thoughtproof-acp.vercel.app/healthz`
- `https://thoughtproof-acp.vercel.app/manifest`

## Example invoke

```bash
curl -s http://localhost:3011/offerings/payment_decision/invoke \
  -H 'content-type: application/json' \
  -d '{
    "input": {
      "action": "approve_payment",
      "amount": "45",
      "asset": "USDC",
      "recipient": "vendor:legal-research-db",
      "purpose": "Time-sensitive contract review and precedent lookup",
      "paymentMethod": "crypto",
      "justification": "Needed to complete legal review before deadline"
    },
    "context": {
      "domain": "financial",
      "stakeLevel": "high",
      "speed": "standard",
      "onchain": true
    }
  }' | jq
```

## Run locally

```bash
cd thoughtproof-acp
npm install
npm run dev
```

Optional env:

```bash
export THOUGHTPROOF_API_URL="https://api.thoughtproof.ai"
export THOUGHTPROOF_OPERATOR_KEY="tp_op_..."
export ACP_BASE_URL="https://your-deployment.example.com"
```

## Deploy tomorrow

### Generic Node host / Railway / Fly / Render / VM

```bash
cd thoughtproof-acp
npm install
npm run build
PORT=3011 ACP_BASE_URL="https://your-public-host" node dist/index.js
```

### Vercel / Serverless note
This package is a small long-running Node server today, so the lowest-friction deployment tomorrow is a standard Node host.
If needed, it can be adapted to a serverless handler later, but that is **not** required to ship the product.

## Hosted mode vs x402 mode

### With `THOUGHTPROOF_OPERATOR_KEY`
- wrapper forwards authenticated requests to ThoughtProof API
- useful for a first hosted ACP product experience

### Without `THOUGHTPROOF_OPERATOR_KEY`
- wrapper still works
- downstream client receives the forwarded x402 `402 Payment Required` response
- this keeps the payment semantics explicit and machine-readable

## Honest limitations

- This is an ACP wrapper, not a new verifier.
- It depends on the existing ThoughtProof API for real verification work.
- It is **not** suitable for synchronous AMM hooks. ThoughtProof latency is ~30s. The correct pattern there is pre-verification and then an on-chain proof read.
- `tool_call_guard` is a verification surface, not an execution sandbox.
