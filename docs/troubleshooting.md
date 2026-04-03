# Troubleshooting

Common issues and their solutions.

## Installation Issues

### "command not found: kb"

**Problem:** After installation, `kb` command isn't recognized.

**Solutions:**

1. **Ensure Bun is installed:**
   ```bash
   bun --version
   # Should show version >= 1.0.0
   ```

2. **Reinstall globally:**
   ```bash
   bun add -g @oakoliver/kb
   ```

3. **Check PATH includes Bun global bin:**
   ```bash
   echo $PATH | grep -o '[^:]*bun[^:]*'
   # Should show something like ~/.bun/bin
   ```

4. **Add Bun bin to PATH:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH="$HOME/.bun/bin:$PATH"
   ```

### "bun: command not found"

**Problem:** Bun runtime isn't installed.

**Solution:**
```bash
curl -fsSL https://bun.sh/install | bash
```

---

## API Key Issues

### "Missing API key"

**Problem:** No LLM API key configured.

**Solution:**
```bash
# Set Anthropic key
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# OR set OpenAI key
export OPENAI_API_KEY="sk-..."

# Make persistent (add to shell profile)
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

### "Invalid API key"

**Problem:** API key format is incorrect or key is invalid.

**Solutions:**

1. **Check key format:**
   - Anthropic keys start with `sk-ant-`
   - OpenAI keys start with `sk-`

2. **Verify key is active:**
   - Check Anthropic Console or OpenAI Dashboard
   - Ensure billing is set up

3. **Check for extra whitespace:**
   ```bash
   # Bad (has space at end)
   export ANTHROPIC_API_KEY="sk-ant-... "
   
   # Good
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

### "Rate limit exceeded"

**Problem:** Too many API requests.

**Solutions:**

1. **Wait and retry:**
   ```bash
   # Wait a minute, then retry
   sleep 60
   kb compile
   ```

2. **Use incremental compilation:**
   ```bash
   # Only recompile changed sources (default)
   kb compile
   # NOT kb compile --full
   ```

3. **Upgrade API tier** if hitting limits frequently.

---

## Wiki Resolution Issues

### "No knowledge base found"

**Problem:** kb can't find a wiki in current or parent directories.

**Solutions:**

1. **Check you're in the right directory:**
   ```bash
   pwd
   ls -la .kb/  # Should exist
   ```

2. **Initialize a wiki:**
   ```bash
   kb init
   ```

3. **Check for global wiki:**
   ```bash
   ls -la ~/.kb/  # Global wiki location
   ```

4. **Navigate to wiki root:**
   ```bash
   cd /path/to/your/wiki
   kb status
   ```

### "Already initialized"

**Problem:** Trying to init where a wiki exists.

**Solutions:**

1. **Use existing wiki:**
   ```bash
   # Just use it, don't reinitialize
   kb status
   ```

2. **Choose different location:**
   ```bash
   kb init different-name
   ```

3. **Remove and reinitialize (DESTRUCTIVE):**
   ```bash
   rm -rf .kb raw wiki queries
   kb init
   ```

---

## Ingestion Issues

### "Failed to fetch URL"

**Problem:** Can't download content from URL.

**Causes and solutions:**

1. **Network issues:**
   ```bash
   # Test connectivity
   curl -I https://example.com
   ```

2. **URL requires authentication:**
   - kb can't access login-protected content
   - Save content locally first, then ingest

3. **URL has JavaScript-rendered content:**
   - kb fetches static HTML only
   - Save page as HTML/PDF, then ingest

4. **URL is blocked/rate-limited:**
   - Wait and retry
   - Try from different network

### "Failed to parse PDF"

**Problem:** PDF text extraction failed.

**Solutions:**

1. **Check PDF isn't corrupted:**
   ```bash
   # Try opening in a PDF viewer
   open file.pdf
   ```

2. **Check PDF has text (not just images):**
   - Scanned PDFs may not extract well
   - Consider OCR tools first

3. **Try different PDF:**
   - Some PDFs have unusual encoding

### "Duplicate source skipped"

**Problem:** Source was already ingested.

**This is normal behavior!** kb detects duplicates by content hash.

If you want to re-ingest:
1. Source content must have changed, OR
2. Delete manifest entry:
   ```bash
   # Edit raw/_manifest.json
   # Remove the entry for this source
   kb ingest <source>
   ```

---

## Compilation Issues

### "Compilation failed"

**Problem:** LLM couldn't compile sources.

**Solutions:**

1. **Check API key is valid:**
   ```bash
   # Test with a simple query
   kb query "Hello"
   ```

2. **Check source content is valid:**
   ```bash
   # Verify raw file exists and has content
   cat raw/articles/your-source.md
   ```

3. **Try with --full flag:**
   ```bash
   kb compile --full
   ```

4. **Check for very large sources:**
   - Split large documents into smaller files

### "No sources to compile"

**Problem:** Manifest is empty or no changes detected.

**Solutions:**

1. **Ingest some sources first:**
   ```bash
   kb ingest https://example.com/article
   ```

2. **Check manifest:**
   ```bash
   cat raw/_manifest.json
   ```

3. **Force full recompilation:**
   ```bash
   kb compile --full
   ```

### "LLM response timeout"

**Problem:** LLM took too long to respond.

**Solutions:**

1. **Retry:**
   ```bash
   kb compile
   ```

2. **Check source size:**
   - Very large sources may timeout
   - Split into smaller documents

3. **Check API status:**
   - Anthropic: status.anthropic.com
   - OpenAI: status.openai.com

---

## Search Issues

### "No results found"

**Problem:** `kb find` returns nothing.

**Solutions:**

1. **Compile first:**
   ```bash
   kb compile
   kb find "your query"
   ```

2. **Check wiki has articles:**
   ```bash
   kb status
   ls wiki/concepts/ wiki/entities/
   ```

3. **Try different keywords:**
   ```bash
   kb find "attention"
   kb find "mechanism"
   kb find "transformer"
   ```

4. **Check spelling:**
   - BM25 is exact match
   - "trasformer" won't match "transformer"

### "Query returns irrelevant results"

**Problem:** Search results don't match intent.

**Solutions:**

1. **Use more specific terms:**
   ```bash
   # Too broad
   kb find "model"
   
   # More specific
   kb find "transformer model architecture"
   ```

2. **Use `kb query` for semantic search:**
   ```bash
   # LLM understands intent better
   kb query "How do language models work?"
   ```

---

## Lint Issues

### "Broken link detected"

**Problem:** Wikilink points to non-existent article.

**Solutions:**

1. **Create the missing article:**
   - Add source about that topic
   - Compile

2. **Fix the link:**
   - Edit the article with broken link
   - Correct the wikilink text

3. **Check for typos:**
   ```bash
   # List all article titles
   grep -h "^title:" wiki/*/*.md | sort
   ```

### "Orphan article detected"

**Problem:** Article has no sources or backlinks.

**This is a warning, not an error.**

**Solutions:**

1. **Add backlinks manually:**
   - Edit related articles
   - Add wikilinks to the orphan

2. **Delete if unneeded:**
   ```bash
   rm wiki/concepts/orphan-article.md
   kb compile  # Regenerates index
   ```

3. **Ignore if intentional:**
   - Some standalone articles are fine

---

## Common Errors Reference

| Error | Cause | Quick Fix |
|-------|-------|-----------|
| "command not found: kb" | Not installed | `bun add -g @oakoliver/kb` |
| "Missing API key" | No env var | `export ANTHROPIC_API_KEY=...` |
| "No knowledge base found" | Wrong directory | `cd /path/to/wiki` |
| "Failed to fetch URL" | Network/access | Check connectivity |
| "Rate limit exceeded" | Too many requests | Wait and retry |
| "Duplicate source" | Already ingested | Normal behavior |
| "No sources to compile" | Empty manifest | `kb ingest <source>` |

---

## Getting Help

### Check Logs

kb outputs errors to stderr:
```bash
kb compile 2>&1 | tee compile.log
```

### Verbose Mode

Use JSON output for detailed info:
```bash
kb status --json | jq .
kb lint --json | jq .
```

### Report Issues

File bugs at: https://github.com/oakoliver/kb/issues

Include:
- kb version (`kb --version`)
- Bun version (`bun --version`)
- OS and version
- Steps to reproduce
- Error message (full)
