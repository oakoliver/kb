#!/usr/bin/env bash
# Sample content for the README recordings. Creates /tmp/kb-demo/notes (raw
# notes to ingest) and, with --wiki <kb-dir>, a few wiki articles in the
# format `kb compile` writes, so `kb find`/`kb lint` can run without an LLM.
set -euo pipefail
mkdir -p /tmp/kb-demo/notes
cat > /tmp/kb-demo/notes/tomatoes.md <<'MD'
# Growing tomatoes
Tomatoes want 6-8 hours of direct sun, deep watering twice a week, and a cage
or stake before the first truss sets. Pinch out side shoots on cordon types.
MD
cat > /tmp/kb-demo/notes/compost.md <<'MD'
# Hot composting
Mix greens (kitchen scraps, grass) and browns (leaves, cardboard) roughly 1:2,
keep the pile as damp as a wrung-out sponge, and turn it weekly.
MD
cat > /tmp/kb-demo/notes/watering.md <<'MD'
# Watering in summer
Water early in the morning at the base of the plant. Mulch keeps soil moist
and cuts watering by about a third.
MD

[ "${1:-}" = "--wiki" ] || exit 0
W="$2/wiki"
article() { # dir slug title type related... ; body on stdin
  local dir=$1 slug=$2 title=$3 type=$4; shift 4
  { echo '---'; echo "title: \"$title\""; echo "type: $type"
    echo 'created: 2026-09-30T09:00:00Z'; echo 'updated: 2026-09-30T09:00:00Z'
    echo 'sources:'; echo "  - raw/articles/$slug.md"; echo 'related:'
    for r in "$@"; do echo "  - \"[[$r]]\""; done; echo '---'; cat; } > "$W/$dir/$slug.md"
}
article entities tomato "Tomato" entity "Watering" "Companion Planting" <<'MD'
# Tomato
A warm-season fruit that needs full sun, steady [[Watering]] and support.
Basil is a classic [[Companion Planting]] partner for tomatoes.
MD
article concepts watering "Watering" concept "Tomato" <<'MD'
# Watering
Water deeply and early in the morning, at the base of the plant. Tomatoes
need about two deep waterings a week in summer; [[Mulching]] reduces that.
MD
article concepts hot-composting "Hot Composting" concept "Summer Garden Routine" <<'MD'
# Hot Composting
Balance greens and browns about 1:2, keep the pile damp, and turn it weekly
so it heats up. Finished compost feeds [[Soil Health]].
MD
article concepts companion-planting "Companion Planting" concept "Tomato" <<'MD'
# Companion Planting
Growing plants together for mutual benefit: basil beside [[Tomato]] plants
deters pests, marigolds draw aphids away.
MD
article syntheses summer-garden-routine "Summer Garden Routine" synthesis "Tomato" "Watering" "Hot Composting" <<'MD'
# Summer Garden Routine
Morning [[Watering]] at the roots, weekly turns of the [[Hot Composting]] pile,
and tying in [[Tomato]] stems as they grow.
MD
