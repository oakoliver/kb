---
title: BERT
type: entity
created: 2026-04-02T16:00:00Z
updated: 2026-04-02T16:00:00Z
sources:
  - articles/bert-notes.md
related:
  - "[[Transformer Architecture]]"
  - "[[Attention Mechanism]]"
tags:
  - model
  - nlp
  - pre-training
---

# BERT

BERT (Bidirectional Encoder Representations from Transformers) is a pre-trained language model developed by Google AI.

## Overview

BERT is based on the [[Transformer Architecture]] encoder and is designed to pre-train deep bidirectional representations from unlabeled text.

## Key Features

- **Bidirectional**: Unlike GPT which reads left-to-right, BERT reads in both directions
- **Pre-training Tasks**:
  - Masked Language Modeling (MLM)
  - Next Sentence Prediction (NSP)
- **Fine-tuning**: Can be adapted to various downstream tasks with minimal architecture changes

## Architecture Details

BERT uses the encoder portion of the [[Transformer Architecture]] with:

- **BERT-Base**: 12 layers, 768 hidden, 12 heads, 110M parameters
- **BERT-Large**: 24 layers, 1024 hidden, 16 heads, 340M parameters

## Applications

- Question answering
- Sentiment analysis
- Named entity recognition
- Text classification

## See Also

- [[Transformer Architecture]]
- [[Attention Mechanism]]
