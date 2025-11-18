# Change: Add `assessment_type` to ExamPackage

- date: 2025-11-18
- area: backend, mongodb
- files:
  - `backend/models/examPackage.model.js`
  - `backend/services/core/examsService.js`

## Summary
- Added a new Mongo field `assessment_type` (e.g., "baseline", "postcourse") placed before `exam_id` in the `ExamPackage` schema for clearer document semantics and downstream filtering.
- Persist `assessment_type` when creating packages (set from `exam_type`) in `buildExamPackageDoc`.

## Rationale
- Enables explicit filtering/analytics by assessment type without inferring from nested metadata.

## Implementation Notes
- Schema: `assessment_type: { type: String, required: false, index: true }` defined before `exam_id`.
- Creation: `assessment_type` set to `String(exam_type || '')` when composing the document.

## Compatibility
- Backward compatible: field is optional, no breaking changes to existing reads.

## Follow-ups
- Optionally expose `assessment_type` in reporting endpoints or admin UIs.


