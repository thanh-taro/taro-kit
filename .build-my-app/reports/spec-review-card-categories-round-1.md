# Spec review — card shows every category (D-076), round 1

| # | Sev | Finding | Triage |
|---|---|---|---|
| 1 | high | NFR-07 exception allowed shortening only names and summaries | Fixed: covers category labels and folding into COPY-tool.moreCategories |
| 2 | medium | Fold rule ambiguous; open-mode marker placement unstated | Fixed: labels in order, fold from the first that doesn't fit; marker on the label line, after the labels |
| 3 | medium | F-002.AC13 had no named fixture and an uncheckable N | Fixed: converters, productivity, developer on a linked tool; N = labels not shown |
| 4 | low | Singular "category label" in F-002.AC6 and CMP-ToolCard sizing | Fixed |
| 5 | low | What's-new rows' labels unclear | Fixed: compact cards and what's-new rows show no category labels |

Build follow-ups: MOD-DesignSystem `categoryNames` + fold behavior; MOD-Pages lines 69 and 71 cite D-076.
Outcome: converged (all fixes are the reviewer's wording).
