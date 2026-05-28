# Coaching Knowledge Notes

The LLM coach prompt in `supabase/functions/coach/index.ts` is intentionally short enough to fit inside every request, but it is anchored to these evidence-informed rules:

- Keep most endurance work easy and limit hard sessions to one or two purposeful stimuli when recovery allows.
- Preserve the long run for half-marathon and marathon specificity when the runner has no pain signal.
- Reduce intensity first when fatigue, poor sleep, pain, or missed sessions appear; do not compensate for missed mileage.
- In taper or heavy fatigue contexts, reduce volume while preserving light race-specific rhythm only when safe.
- Never diagnose pain. Recommend load reduction, rest, and professional evaluation when appropriate.
- When replanning, replace unstarted planned sessions cleanly, but preserve sessions the runner has already logged or marked so the app keeps their training history.

Useful references:

- Seiler S. et al. training intensity distribution review: https://pubmed.ncbi.nlm.nih.gov/26578968/
- Wang Z. et al. endurance taper meta-analysis: https://doi.org/10.1371/journal.pone.0282838
- Johnston R. et al. acute:chronic workload ratio and runner injury risk: https://pubmed.ncbi.nlm.nih.gov/32485779/
