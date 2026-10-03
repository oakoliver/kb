# Render from the repo root: vhs assets/tapes/help.tape
# Sample content comes from assets/tapes/demo-fixtures.sh; no LLM or API key is used.
Output "/tmp/kb-help.gif"

Set Shell bash
Set FontSize 15
Set Width 900
Set Height 800
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type `export KB_REPO=$(pwd) && alias kb="bun $KB_REPO/src/cli.ts" && unset ANTHROPIC_API_KEY OPENAI_API_KEY && rm -rf /tmp/kb-demo && bash assets/tapes/demo-fixtures.sh && export HOME=/tmp/kb-demo && cd /tmp/kb-demo`
Enter

Type "export PS1='> ' && clear"
Enter
Show

Type "kb --help"
Sleep 300ms
Enter
Sleep 1.5s
Screenshot assets/help.png
