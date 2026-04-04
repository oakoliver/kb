---
title: Transformer Architecture
type: entity
created: 2026-04-02T15:00:00Z
updated: 2026-04-02T15:00:00Z
sources:
  - articles/transformer-paper.md
related:
  - "[[Attention Mechanism]]"
  - "[[Self-Attention]]"
  - "[[BERT]]"
tags:
  - architecture
  - deep-learning
---

# Transformer Architecture

The Transformer is a neural network architecture introduced in the paper "Attention Is All You Need" by Vaswani et al. (2017).

## Overview

The Transformer architecture relies entirely on [[Attention Mechanism|attention mechanisms]], dispensing with recurrence and convolutions entirely. This allows for significantly more parallelization during training.

## Architecture

### Encoder

The encoder consists of a stack of identical layers, each containing:

1. Multi-head self-attention mechanism
2. Position-wise fully connected feed-forward network

### Decoder

The decoder also consists of a stack of identical layers with:

1. Masked multi-head [[Self-Attention]]
2. Multi-head attention over encoder output
3. Position-wise feed-forward network

### Key Innovations

- **Positional Encoding**: Since the model has no recurrence, position information is added via sinusoidal functions
- **Multi-Head Attention**: Multiple attention operations run in parallel
- **Layer Normalization**: Applied after each sub-layer

## Impact

The Transformer has become the foundation for many state-of-the-art models including:

- [[BERT]]
- GPT series
- T5
- PaLM

## See Also

- [[Attention Mechanism]]
- [[Self-Attention]]
- [[BERT]]
