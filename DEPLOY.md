# Deploy Checklist

## 1. Install and build

```bash
cd /Users/rauljager/.openclaw/workspace/PROJECTS/ProofOfThought/thoughtproof-acp
npm install
npm run build
```

## 2. Set env vars

```bash
export PORT=3011
export ACP_BASE_URL="https://YOUR_PUBLIC_HOST"
export THOUGHTPROOF_API_URL="https://api.thoughtproof.ai"
# optional but recommended for hosted mode
export THOUGHTPROOF_OPERATOR_KEY="tp_op_..."
```

## 3. Start server

```bash
node dist/index.js
```

## 4. Verify endpoints

```bash
curl -s $ACP_BASE_URL/healthz | jq
curl -s $ACP_BASE_URL/manifest | jq '.offerings[].id'
curl -s $ACP_BASE_URL/offerings/payment_decision | jq '.pricing'
```

## 5. Verify invoke path

```bash
curl -s $ACP_BASE_URL/offerings/claim_verification/invoke \
  -H 'content-type: application/json' \
  -d '{
    "input": {
      "claim": "Approve the $2,000 payment to vendor-42 based on the matching invoice and prior transaction history.",
      "claimType": "decision",
      "question": "Should this be trusted enough to proceed?"
    },
    "context": {
      "domain": "financial",
      "stakeLevel": "high",
      "speed": "fast",
      "onchain": false
    }
  }' | jq
```

## Expected behavior

### If operator key is configured
- returns successful forwarded ThoughtProof response

### If operator key is not configured
- returns forwarded `402 Payment Required`
- includes x402 payment instructions from ThoughtProof API
- includes `requestedPricing` and `forwardedPayload` for debugging and integration clarity

## Steelman review before public launch

- [ ] Confirm no stale price anywhere except fast/standard/deep = 0.008/0.02/0.08
- [ ] Confirm manifest examples are realistic and non-misleading
- [ ] Confirm no offering promises synchronous on-chain verification
- [ ] Confirm README clearly states this is a wrapper over /v1/check
- [ ] Confirm payment mode behavior is intentional when operator key absent
- [ ] Confirm public manifest exposes only 4 offerings and no `policy_check`
