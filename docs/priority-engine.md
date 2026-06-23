# Priority Engine

---

The Priority Engine is what makes CrimeLens's dispatch decisions **explainable**. Instead of a black-box "AI says urgent", every incident gets a transparent, weighted score that a dispatcher — and later an auditor — can decompose into its contributing factors.

- [Why Explainable Scoring](#why)
- [The Formula](#formula)
- [The Factors](#factors)
- [Tiers](#tiers)
- [Auditability](#audit)
- [Auto-Dispatch Policy](#auto-dispatch)
- [Tunability & Safety](#tuning)

<a name="why"></a>
## Why Explainable Scoring

Sending armed officers is a consequential act. A score of "0.91" is meaningless on its own; a score that breaks down into *"high model confidence, a weapon was detected, it's a repeat location, and it's the middle of the night"* is something a dispatcher can trust and a review board can defend. Explainability is a first-class requirement, not a nice-to-have.

<a name="formula"></a>
## The Formula

`IncidentPriorityService` computes a score in `[0, 1]` as a weighted sum of six normalised factors:

```
score = clamp(0, 1,
      0.35 × confidence
    + 0.25 × crime_type_weight
    + 0.15 × weapon
    + 0.10 × repeat_in_area
    + 0.10 × time_of_day
    + 0.05 × crowd_density )
```

| Weight | Factor |
|:------:|--------|
| **0.35** | `confidence` |
| **0.25** | `crime_type_weight` |
| **0.15** | `weapon` |
| **0.10** | `repeat_in_area` |
| **0.10** | `time_of_day` |
| **0.05** | `crowd_density` |

<a name="factors"></a>
## The Factors

Each factor is normalised to `[0, 1]` before weighting:

- **`confidence`** — the AI's own confidence in the detection (the strongest single signal).
- **`crime_type_weight`** — the context weight supplied to the scorer. The current model intake uses a default base of `0.50` for alerts and `0.75` for confirmed reports; it does not currently resolve a `crime_type` from the request.
- **`weapon`** — whether a weapon was detected; a strong escalator.
- **`repeat_in_area`** — recent crimes within a small radius and time window (e.g. ~500 m / 24 h) — captures developing hot-spots.
- **`time_of_day`** — night-time weighting, when risk is higher and witnesses fewer.
- **`crowd_density`** — how many people are in frame; a minor modifier.

All six are persisted on the incident as `priority_factors` (JSON) alongside the final `priority_score`.

<a name="tiers"></a>
## Tiers

The continuous score is bucketed into an operational tier that drives queue ordering and UI colour:

| Tier | Score band | Meaning |
|------|-----------|---------|
| **Critical** | ≥ 0.85 | Top of the queue; auto-dispatch eligible (gated). |
| **High** | 0.65 – 0.85 | Handle next. |
| **Medium** | 0.45 – 0.65 | Standard review. |
| **Low** | < 0.45 | Background / informational. |

The dispatcher queue orders by `priority_score DESC, created_at ASC`, so the most urgent, oldest work always surfaces first.

<a name="audit"></a>
## Auditability

Because `priority_factors` is stored as structured JSON, any incident's score can be reconstructed and explained months later — *which* factors drove it and by how much. Combined with the [decision ledger](/{{route}}/{{version}}/security), this gives CrimeLens a defensible answer to the question every real dispatch system must answer: **"why was this prioritised the way it was?"**

<a name="auto-dispatch"></a>
## Auto-Dispatch Policy

`AutoDispatchPolicy` is intentionally conservative. Auto-dispatch — skipping the human reviewer — is allowed only when **all** of the strictest gates pass simultaneously (a critical-tier score, very high confidence, and a detected weapon). Everything else, by design, waits for a dispatcher. The policy never *lowers* scrutiny; it only fast-tracks the rare, unambiguous case where waiting is the bigger risk.

<a name="tuning"></a>
## Tunability & Safety

The admin console exposes a **priority-weights** screen with dry-run and apply endpoints. It can replay proposed weights against recent incidents, persist them in settings, and record the change in the ledger.

> {warning} `IncidentPriorityService` currently computes live incidents using its `WEIGHTS` constants rather than `SettingsService::priorityWeights()`. Applied admin values therefore affect the sandbox/stored policy but do **not yet change live incident scoring**. Wire the service to the settings provider before describing the weights as runtime-tunable.

Continue to [Crime Lifecycle & Field Ops](/{{route}}/{{version}}/crime-lifecycle).
