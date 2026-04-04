---
title: Evolution of NLP Architectures
type: synthesis
created: 2026-04-03T10:00:00Z
updated: 2026-04-03T10:00:00Z
sources:
  - articles/attention-mechanism.md
  - articles/transformer-paper.md
  - articles/bert-notes.md
related:
  - "[[Transformer Architecture]]"
  - "[[Attention Mechanism]]"
  - "[[BERT]]"
tags:
  - synthesis
  - nlp
  - history
---

# Evolution of NLP Architectures

This synthesis traces the evolution of neural network architectures for natural language processing, from early attention mechanisms to modern transformer-based models.

## From RNNs to Attention

The introduction of the [[Attention Mechanism]] marked a pivotal shift in NLP. Before attention, sequence-to-sequence models relied on compressing the entire input into a single fixed-length vector, creating an information bottleneck.

## The Transformer Revolution

The [[Transformer Architecture]] eliminated recurrence entirely, replacing it with [[Self-Attention]]. This enabled:

- **Parallelization**: Training could be distributed across GPUs much more efficiently
- **Long-range dependencies**: Self-attention captures relationships regardless of distance
- **Scalability**: Models could be scaled to billions of parameters

## Pre-training Era

[[BERT]] demonstrated that large-scale pre-training on unlabeled text could produce representations useful for a wide range of downstream tasks. This "pre-train then fine-tune" paradigm became the dominant approach in NLP.

## Key Takeaways

1. Attention mechanisms solved the information bottleneck problem
2. Self-attention enabled parallel processing of sequences
3. Pre-training on large corpora provides powerful transferable representations
4. Scale matters: larger models generally perform better
