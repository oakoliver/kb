# Render from the repo root: vhs assets/tapes/studio.tape
# Sample content comes from assets/tapes/demo-fixtures.sh; no LLM or API key is used.
# Needs a Nerd Font for Studio's icons.
Output assets/studio.gif

Set Shell bash
Set FontSize 14
Set FontFamily "FiraCode Nerd Font"
Set Width 1100
Set Height 640
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 80ms

Hide
Type `export KB_REPO=$(pwd) && alias kb="bun $KB_REPO/src/cli.ts" && unset ANTHROPIC_API_KEY OPENAI_API_KEY && rm -rf /tmp/kb-demo && bash assets/tapes/demo-fixtures.sh && export HOME=/tmp/kb-demo && cd /tmp/kb-demo`
Enter
Type `kb init garden >/dev/null && cd garden && kb ingest ../notes/tomatoes.md >/dev/null && kb ingest ../notes/compost.md >/dev/null && bash $KB_REPO/assets/tapes/demo-fixtures.sh --wiki .`
Enter
Sleep 3s
Type "export PS1='> ' && clear"
Enter
Show

Type "kb studio"
Sleep 300ms
Enter
Sleep 2s
Down@300ms 5
Sleep 500ms
Enter
Sleep 1.5s
Tab
Sleep 800ms
Enter
Sleep 1.5s
Ctrl+p
Sleep 600ms
Type "comp"
Sleep 900ms
Enter
Sleep 1.8s
Ctrl+q
Sleep 800ms
