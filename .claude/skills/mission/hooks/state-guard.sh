#!/usr/bin/env bash
# vendored from jean-ai-os/protocols/mission-hooks/state-guard.sh @ 0995540 le 2026-09-03 — généré, ne pas éditer ici
# Mission state guard. One script, four Claude Code hook events; the event name arrives in the
# JSON on stdin. Source: jean-ai-os/protocols/mission-hooks/state-guard.sh, vendored per repo by
# /mission-init next to PROTOCOL.md. Edit the source, then re-vendor.
#
#   UserPromptSubmit  a prompt that starts with /mission binds this session to the guard;
#                     a bound session's prompt opens a turn.
#   PreToolUse        holds the main agent of a bound session out of the tree: it dispatches, an
#                     executor builds. Subagents (agent_id set) are never held.
#   PostToolUse       marks the turn as one that acted (the settings matcher says which tools count).
#   Stop              refuses to end an acting turn while STATE.md predates it.
#   SessionStart      prints the active mission's STATE.md and MISSION.md into the new context.
#
# Argument 1: the missions dir, relative to the repo root (default .claude-runs/missions).
# Argument 2: the allowlist, colon-separated repo-relative paths the main agent may still write
#             (records, not code: a design-docs dir, a method file). May be empty.
# The guard keeps its own three marker files under <missions dir>/.guard/: session, turn, dirty.
# It exits 0 and says nothing whenever it has nothing to say: outside a git repo, no active mission,
# a session that never typed /mission.
set -u

MISSIONS_REL="${1:-.claude-runs/missions}"
ALLOW="${2:-}"
input="$(cat)"
field() { jq -r "$1 // empty" <<<"$input"; }

event="$(field .hook_event_name)"
sid="$(field .session_id)"
cwd="$(field .cwd)"
[ -n "$cwd" ] && [ -d "$cwd" ] || cwd="${CLAUDE_PROJECT_DIR:-$PWD}"

# Resolve the main clone even from a worktree, like the skill does with --git-common-dir.
common="$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || exit 0
repo="$(dirname "$common")"
missions="$repo/$MISSIONS_REL"
guard="$missions/.guard"

# The active mission is the one whose STATE.md moved last. archive/<slug>/STATE.md sits one level
# deeper, so the glob never sees it.
active_state() { ls -t "$missions"/*/STATE.md 2>/dev/null | head -1; }
bound() { [ -f "$guard/session" ] && [ "$(cat "$guard/session")" = "$sid" ]; }

case "$event" in

  UserPromptSubmit)
    prompt="$(field .prompt)"
    if [[ "$prompt" =~ ^[[:space:]]*/mission([[:space:]]|$) ]]; then
      mkdir -p "$guard"
      printf '%s' "$sid" > "$guard/session"
    fi
    if bound; then
      touch "$guard/turn"
      rm -f "$guard/dirty"
    fi
    ;;

  PreToolUse)
    bound || exit 0
    [ -z "$(field .agent_id)" ] || exit 0
    tool="$(field .tool_name)"
    IFS=: read -ra allow <<<"$ALLOW"
    deny() {
      cat >&2 <<MSG
Mission state guard: the meta-session does not edit the tree ($1).
Dispatch an executor with the Agent tool and a brief (PROTOCOL.md § Briefing an executor); it builds in its own small context. Still yours to write: files under $MISSIONS_REL${ALLOW:+, and under ${ALLOW//:/, }}. Name one of those paths in a Bash command to let it through. Paths outside the repo are not held.
MSG
      exit 2
    }
    allowed_path() {
      local p="$1"
      [[ "$p" = /* ]] || p="$cwd/$p"
      p="$(realpath -m "$p")"
      case "$p" in "$repo"/*) ;; *) return 0 ;; esac
      case "$p" in "$missions"|"$missions"/*) return 0 ;; esac
      local a
      for a in "${allow[@]}"; do
        [ -n "$a" ] || continue
        case "$p" in "$repo/$a"|"$repo/$a"/*) return 0 ;; esac
      done
      return 1
    }
    case "$tool" in
      Edit|Write|MultiEdit|NotebookEdit)
        f="$(field .tool_input.file_path)"
        [ -n "$f" ] || f="$(field .tool_input.notebook_path)"
        [ -n "$f" ] || exit 0
        allowed_path "$f" || deny "$tool $f"
        ;;
      Bash)
        cmd="$(field .tool_input.command)"
        case "$cmd" in *"$MISSIONS_REL"*) exit 0 ;; esac
        for a in "${allow[@]}"; do
          [ -n "$a" ] && case "$cmd" in *"$a"*) exit 0 ;; esac
        done
        stripped="$(sed -E 's/[0-9]?>&[0-9]//g; s/[0-9&]?>>?[[:space:]]*\/dev\/null//g' <<<"$cmd")"
        if grep -Eq '(^|[^0-9&<])>|\btee\b|\bsed[[:space:]]+(-[a-zA-Z]*i|--in-place)|\bpython3?[[:space:]]+-([[:space:]]|c\b|$)|\b(mv|cp|rm|touch|mkdir|patch)\b|\bgit[[:space:]]+(apply|restore|stash|reset[[:space:]]+--hard|checkout[[:space:]]+--)' <<<"$stripped"; then
          deny "Bash: ${cmd:0:120}"
        fi
        ;;
    esac
    ;;

  PostToolUse)
    bound && touch "$guard/dirty"
    ;;

  Stop)
    bound || exit 0
    [ -f "$guard/dirty" ] || exit 0
    state="$(active_state)"
    [ -n "$state" ] || exit 0
    if [ "$state" -nt "$guard/turn" ]; then
      rm -f "$guard/dirty"
      exit 0
    fi
    if [ "$(field .stop_hook_active)" = "true" ]; then
      echo "mission state guard: $state is still older than this turn; letting the turn end rather than loop." >&2
      exit 0
    fi
    cat >&2 <<MSG
Mission state guard: $state was not updated this turn, and this turn acted (edited files, ran commands, or dispatched agents).
Before you stop, update it so that a fresh session could resume from the file alone: Done, In flight, Next unit, Gates pending, Open questions, and the Updated line. If nothing about the mission changed, say so on the Updated line. Then stop.
MSG
    exit 2
    ;;

  SessionStart)
    state="$(active_state)"
    [ -n "$state" ] || exit 0
    dir="$(dirname "$state")"
    slug="$(basename "$dir")"
    stamp="$(date -r "$state" '+%Y-%m-%d %H:%M')"
    if bound; then binding="bound to this session"; else binding="not bound to this session; a prompt that starts with /mission binds it"; fi
    echo "Mission state guard ($(basename "$repo")): active mission \`$slug\`, STATE.md updated $stamp. Guard $binding."
    echo "If you run this mission, resume it from the two files below. Never add a second INDEX.md line for a slug that already has one."
    echo
    echo "--- $MISSIONS_REL/$slug/STATE.md ---"
    cat "$state"
    if [ -f "$dir/MISSION.md" ]; then
      echo
      echo "--- $MISSIONS_REL/$slug/MISSION.md ---"
      cat "$dir/MISSION.md"
    fi
    ;;

esac
exit 0
