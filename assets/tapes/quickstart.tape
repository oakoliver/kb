# Render from the repo root: vhs assets/tapes/quickstart.tape
# Sample content comes from assets/tapes/demo-fixtures.sh; no LLM or API key is used.
Output assets/quickstart.gif

Set Shell bash
Set FontSize 15
Set Width 900
Set Height 470
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type `export KB_REPO=$(pwd) && alias kb="bun $KB_REPO/src/cli.ts" && unset ANTHROPIC_API_KEY OPENAI_API_KEY && rm -rf /tmp/kb-demo && bash assets/tapes/demo-fixtures.sh && export HOME=/tmp/kb-demo && cd /tmp/kb-demo`
Enter

Type "export PS1='> ' && clear"
Enter
Show

Type "kb init garden"
Sleep 300ms
Enter
Sleep 1.2s
Type "cd garden && kb ingest ../notes/tomatoes.md"
Sleep 300ms
Enter
Sleep 1.5s
Type "kb status"
Sleep 300ms
Enter
Sleep 2.5s
