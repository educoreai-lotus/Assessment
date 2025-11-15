# Feature Spec: Theoretical Questions

## Scope

- Define construction, normalization, and storage rules for theoretical (non-coding) questions across exam and non-exam flows.

## Difficulty Policy

- Exams: All theoretical questions MUST be stored with difficulty = `medium`.
- Non-exam DevLab requests: Difficulty MAY be preserved only when explicitly allowed by the builder.
- Coding questions: Preserve external difficulty as provided by the source (e.g., DevLab).

## Builder API

- `TheoreticalQuestionBuilder(allowExternalDifficulty=false)`
  - When `allowExternalDifficulty=false` (default): force `difficulty = "medium"`.
  - When `true`: use provided `difficulty` if present, otherwise fallback to `"medium"`.
  - Normalizes type to `mcq` for consistency.

## Storage Mapping

- `examsService.buildExamPackageDoc`:
  - Removes `hints` from all stored prompts.
  - Additionally strips `difficulty` from theoretical prompts before persistence.
  - Assigns `metadata.difficulty = "medium"` for theoretical items, and preserves difficulty for coding items.

## Traceability

- Architecture: `templates/04-Design_And_Architecture.md` (Exam Flow: Difficulty Enforcement)
- AI Design: `templates/06-AI_Design_Prompt.md` (Theoretical Question Difficulty Policy)
