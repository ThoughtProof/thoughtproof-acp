# Example ACP Requests

## claim_verification

```json
{
  "input": {
    "claim": "This transaction is low risk and can be executed immediately.",
    "claimType": "decision",
    "question": "Should this be trusted enough to proceed?"
  },
  "context": {
    "domain": "financial",
    "stakeLevel": "high",
    "speed": "standard",
    "onchain": false
  }
}
```

## payment_decision

```json
{
  "input": {
    "action": "approve_payment",
    "amount": "2500.00",
    "asset": "USDC",
    "recipient": "0xabc123...",
    "purpose": "Supplier payout for completed fulfillment",
    "paymentMethod": "crypto",
    "justification": "Delivery confirmed and invoice matched"
  },
  "context": {
    "domain": "financial",
    "stakeLevel": "high",
    "speed": "standard",
    "onchain": true
  }
}
```

## tool_call_guard

```json
{
  "input": {
    "toolName": "wallet.send",
    "action": "transfer",
    "arguments": {
      "amount": "5000",
      "asset": "USDC",
      "to": "0xdef456..."
    },
    "intent": "Send treasury payment to vendor",
    "capabilities": ["transfer", "external_write"],
    "expectedImpact": "high"
  },
  "context": {
    "domain": "financial",
    "stakeLevel": "critical",
    "speed": "standard",
    "onchain": true
  }
}
```

## reasoning_audit

```json
{
  "input": {
    "conclusion": "Approve the payment.",
    "steps": [
      {
        "statement": "The invoice amount matches the purchase order.",
        "type": "evidence"
      },
      {
        "statement": "Delivery confirmation was received from the vendor.",
        "type": "evidence"
      },
      {
        "statement": "No anomaly flags were raised in prior checks.",
        "type": "premise"
      },
      {
        "statement": "Therefore the payment risk is acceptable.",
        "type": "inference",
        "supports": [0, 1, 2]
      }
    ],
    "question": "Which assumptions or missing checks could make this conclusion fail?"
  },
  "context": {
    "domain": "financial",
    "stakeLevel": "high",
    "speed": "deep",
    "onchain": true
  }
}
```
