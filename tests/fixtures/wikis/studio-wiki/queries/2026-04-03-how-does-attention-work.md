---
title: How does attention work?
type: query
created: 2026-04-03T11:00:00Z
updated: 2026-04-03T11:00:00Z
sources:
  - wiki/concepts/attention-mechanism.md
  - wiki/entities/transformer.md
related: []
---

# How does attention work?

The attention mechanism works by computing weighted sums of values, where the weights are determined by the compatibility between queries and keys.

## Answer

At its core, attention computes three vectors for each input element: a **Query (Q)**, a **Key (K)**, and a **Value (V)**. The attention score between two elements is computed as the dot product of their query and key vectors, scaled by the square root of the key dimension.

The softmax function is then applied to these scores to produce attention weights, which are used to compute a weighted sum of the value vectors. This produces the output of the attention layer.

## Sources

- [Attention Mechanism](wiki/concepts/attention-mechanism.md)
- [Transformer Architecture](wiki/entities/transformer.md)
