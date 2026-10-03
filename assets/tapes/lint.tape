# Render from the repo root: vhs assets/tapes/lint.tape
# Sample content comes from assets/tapes/demo-fixtures.sh; no LLM or API key is used.
Output "/tmp/kb-lint.gif"

Set Shell bash
Set FontSize 15
Set Width 1000
Set Height 470
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type `export KB_REPO=$(pwd) && alias kb="bun $KB_REPO/src/cli.ts" && unset ANTHROPIC_API_KEY OPENAI_API_KEY && rm -rf /tmp/kb-demo && bash assets/tapes/demo-fixtures.sh && export HOME=/tmp/kb-demo && cd /tmp/kb-demo`
Enter
Type `kb init garden >/dev/null && cd garden && kb ingest ../notes/tomatoes.md >/dev/null && kb ingest ../notes/compost.md >/dev/null && bash $KB_REPO/assets/tapes/demo-fixtures.sh --wiki .`
Enter
# One dead related: entry (Crop Rotation was never written) so --fix has something to remove
Type `perl -0pi -e 's/(related:\n)/$1  - "[[Crop Rotation]]"\n/' wiki/concepts/companion-planting.md`
Enter
Sleep 3s
Type "export PS1='> ' && clear"
Enter
Show

Type "kb lint"
Sleep 300ms
Enter
Sleep 1.5s
Type "kb lint --fix"
Sleep 300ms
Enter
Sleep 1.5s
Screenshot assets/lint.png
