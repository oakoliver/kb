---
title: Attention Mechanism
type: concept
created: 2026-04-01T10:30:00Z
updated: 2026-04-01T10:30:00Z
sources:
  - articles/attention-mechanism.md
related:
  - "[[Transformer Architecture]]"
  - "[[Self-Attention]]"
tags:
  - machine-learning
  - nlp
  - deep-learning
---

# Attention Mechanism

The attention mechanism is a technique that allows neural networks to focus on specific parts of the input sequence when producing an output.

## Overview

Attention was first introduced in the context of neural machine translation, where it enabled models to align source and target sequences dynamically. Rather than compressing the entire input into a fixed-length vector, attention allows the decoder to "look back" at the encoder's hidden states.

## Mathematical Formulation

The core attention computation is:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

Where:
- **Query (Q)**: What we're looking for
- **Key (K)**: What we're comparing against
- **Value (V)**: The information we extract
- **$d_k$**: The dimension of the keys (used for scaling)

## Types of Attention

1. **Self-Attention**: Relates different positions within the same sequence
2. **Cross-Attention**: Relates positions between two different sequences
3. **Multi-Head Attention**: Runs multiple attention operations in parallel

## Applications

- Machine translation
- Text summarization
- Image captioning
- Speech recognition

## See Also

- [[Transformer Architecture]]
- [[Self-Attention]]
- [[BERT]]
