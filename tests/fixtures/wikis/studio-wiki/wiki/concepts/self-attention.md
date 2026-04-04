---
title: Self-Attention
type: concept
created: 2026-04-01T11:00:00Z
updated: 2026-04-01T11:00:00Z
sources:
  - articles/attention-mechanism.md
related:
  - "[[Attention Mechanism]]"
  - "[[Transformer Architecture]]"
tags:
  - machine-learning
  - nlp
---

# Self-Attention

Self-attention, sometimes called intra-attention, is a mechanism that relates different positions of a single sequence to compute a representation of the same sequence.

## How It Works

In self-attention, the queries, keys, and values all come from the same source. Each element in the sequence attends to every other element, creating a weighted representation.

## Key Benefits

- Captures long-range dependencies efficiently
- Enables parallel computation (unlike RNNs)
- Provides interpretable attention weights

## Relationship to Attention

Self-attention is a special case of the general [[Attention Mechanism]] where the input sequence attends to itself rather than to a different sequence.

## See Also

- [[Attention Mechanism]]
- [[Transformer Architecture]]
