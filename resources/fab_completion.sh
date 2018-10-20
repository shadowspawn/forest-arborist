###-begin-fab-completion-###
#
# fab command completion script
# (based on npm completion script)
#
# Installation: fab completion >> ~/.bashrc  (or ~/.zshrc)
# Or, maybe: fab completion > /usr/local/etc/bash_completion.d/fab
#

if type complete &>/dev/null; then
  _fab_completion () {
    local words cword
    if type _get_comp_words_by_ref &>/dev/null; then
      _get_comp_words_by_ref -n = -n @ -n : -w words -i cword
    else
      cword="$COMP_CWORD"
      words=("${COMP_WORDS[@]}")
    fi

    local si="$IFS"
    IFS=$'\n' COMPREPLY=($(COMP_CWORD="$cword" \
                           COMP_LINE="$COMP_LINE" \
                           COMP_POINT="$COMP_POINT" \
                           fab completion -- "${words[@]}" \
                           2>/dev/null)) || return $?
    IFS="$si"
    if type __ltrim_colon_completions &>/dev/null; then
      __ltrim_colon_completions "${words[cword]}"
    fi
  }
  complete -o default -F _fab_completion fab
elif type compdef &>/dev/null; then
  _fab_completion() {
    local si=$IFS
    compadd -- $(COMP_CWORD=$((CURRENT-1)) \
                 COMP_LINE=$BUFFER \
                 COMP_POINT=0 \
                 fab completion -- "${words[@]}" \
                 2>/dev/null)
    IFS=$si
  }
  compdef _fab_completion fab
elif type compctl &>/dev/null; then
  _fab_completion () {
    local cword line point words si
    read -Ac words
    read -cn cword
    let cword-=1
    read -l line
    read -ln point
    si="$IFS"
    IFS=$'\n' reply=($(COMP_CWORD="$cword" \
                       COMP_LINE="$line" \
                       COMP_POINT="$point" \
                       fab completion -- "${words[@]}" \
                       2>/dev/null)) || return $?
    IFS="$si"
  }
  compctl -K _fab_completion fab
fi
###-end-fab-completion-###
