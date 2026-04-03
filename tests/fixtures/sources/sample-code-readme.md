# Sample Code README

A simple utility library for text processing.

## Installation

```bash
npm install text-utils
```

## Usage

```javascript
import { tokenize, normalize } from 'text-utils';

const text = "Hello, World!";
const tokens = tokenize(text);
console.log(tokens); // ['Hello', ',', 'World', '!']
```

## API

### tokenize(text: string): string[]

Splits text into tokens.

### normalize(text: string): string

Normalizes text by lowercasing and removing special characters.

## License

MIT
