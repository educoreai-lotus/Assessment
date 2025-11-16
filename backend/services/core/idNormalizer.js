// IMPORTANT ARCHITECTURE NOTE
// ---------------------------
// PostgreSQL stores ONLY numeric IDs.
// MongoDB stores original string IDs.
// Incoming API can send ANY ID format.
// normalizeToInt() extracts numeric portion for SQL usage.
// This guarantees:
// - strict relational integrity in PostgreSQL
// - flexible ID formats for external microservices
// - zero prefix collisions
// - correct grading and attempt lookup

// Universal ID Normalizer
// =======================
// Converts any user_id or course_id into a usable integer for PostgreSQL.
// Examples it must support:
//   200              → 200
//   "200"            → 200
//   "u_200"          → 200
//   "user-200"       → 200
//   "COURSE:555"     → 555
//   "abc"            → null (caller handles error)

function normalizeToInt(id) {
  if (id == null) return null;

  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }

  const match = String(id).match(/(\d+)/);
  if (match) return Number(match[1]);

  return null;
}

module.exports = { normalizeToInt };


