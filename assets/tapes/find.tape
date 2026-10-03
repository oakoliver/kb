# Render from the repo root: vhs assets/tapes/find.tape
# Sample content comes from assets/tapes/demo-fixtures.sh; no LLM or API key is used.
Output "/tmp/kb-find.gif"

Set Shell bash
Set FontSize 15
Set Width 1400
Set Height 360
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type `export KB_REPO=$(pwd) && alias kb="bun $KB_REPO/src/cli.ts" && unset ANTHROPIC_API_KEY OPENAI_API_KEY && rm -rf /tmp/kb-demo && bash assets/tapes/demo-fixtures.sh && export HOME=/tmp/kb-demo && cd /tmp/kb-demo`
Enter
Type `kb init garden >/dev/null && cd garden && kb ingest ../notes/tomatoes.md >/dev/null && kb ingest ../notes/compost.md >/dev/null && bash $KB_REPO/assets/tapes/demo-fixtures.sh --wiki .`
Enter
Sleep 3s
Type "export PS1='> ' && clear"
Enter
Show

Type `kb find "tomato watering"`
Sleep 300ms
Enter
Sleep 1.5s
Screenshot assets/find.png
