const pool = require("../../config/supabaseDB");
const mongoose = require("mongoose");

const POSTGRES_TABLES = new Set(["exam_attempts", "exam_packages"]);
const MONGO_COLLECTIONS = new Set(["proctoring_events"]);

const ALLOWED_OPS = new Set(["insert", "update", "delete", "read"]);

// Conservative allow-list for exam_attempts to keep SQL builders safe
const EXAM_ATTEMPTS_COLUMNS = new Set([
	"attempt_id",
	"exam_id",
	"attempt_no",
	"policy_snapshot",
	"started_at",
	"submitted_at",
	"final_grade",
	"passed",
	"package_ref",
	"duration_minutes",
	"expires_at"
]);

function isSafeIdentifier(name) {
	return typeof name === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function sanitizeColumns(table, obj) {
	if (!obj || typeof obj !== "object") return {};
	const safe = {};
	for (const [key, value] of Object.entries(obj)) {
		if (!isSafeIdentifier(key)) continue;
		// For exam_attempts, strictly enforce allow-list
		if (table === "exam_attempts") {
			if (EXAM_ATTEMPTS_COLUMNS.has(key)) {
				safe[key] = value;
			}
		} else {
			// For other tables, keep conservative regex gating
			safe[key] = value;
		}
	}
	return safe;
}

async function executePostgres(operation, table, criteria = {}, values = {}) {
	if (!pool || typeof pool.query !== "function") {
		throw new Error("Postgres pool not available");
	}

	const safeCriteria = sanitizeColumns(table, criteria || {});
	const safeValues = sanitizeColumns(table, values || {});

	if (operation === "read") {
		const whereClauses = [];
		const params = [];
		let idx = 1;
		for (const [col, val] of Object.entries(safeCriteria)) {
			whereClauses.push(`"${col}" = $${idx++}`);
			params.push(val);
		}
		const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
		const sql = `SELECT * FROM "${table}" ${where}`;
		const { rows } = await pool.query(sql, params);
		return { rows };
	}

	if (operation === "insert") {
		const cols = Object.keys(safeValues);
		if (cols.length === 0) throw new Error("No values provided for insert");
		const placeholders = cols.map((_, i) => `$${i + 1}`);
		const params = cols.map((c) => safeValues[c]);
		const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
		const { rows } = await pool.query(sql, params);
		return { rows, rowCount: rows.length };
	}

	if (operation === "update") {
		const setCols = Object.keys(safeValues);
		if (setCols.length === 0) throw new Error("No values provided for update");
		const whereCols = Object.keys(safeCriteria);
		if (whereCols.length === 0) throw new Error("Unsafe update: criteria required");

		const params = [];
		const setClauses = setCols.map((c, i) => {
			params.push(safeValues[c]);
			return `"${c}" = $${i + 1}`;
		});
		const whereClauses = whereCols.map((c, i) => {
			params.push(safeCriteria[c]);
			return `"${c}" = $${setCols.length + i + 1}`;
		});
		const sql = `UPDATE "${table}" SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING *`;
		const { rows, rowCount } = await pool.query(sql, params);
		return { rows, rowCount };
	}

	if (operation === "delete") {
		const whereCols = Object.keys(safeCriteria);
		if (whereCols.length === 0) throw new Error("Unsafe delete: criteria required");
		const params = [];
		const whereClauses = whereCols.map((c, i) => {
			params.push(safeCriteria[c]);
			return `"${c}" = $${i + 1}`;
		});
		const sql = `DELETE FROM "${table}" WHERE ${whereClauses.join(" AND ")}`;
		const { rowCount } = await pool.query(sql, params);
		return { rowCount };
	}

	throw new Error(`Unsupported operation: ${operation}`);
}

function getMongoCollection(name) {
	if (!mongoose?.connection?.db) {
		throw new Error("MongoDB connection is not available");
	}
	return mongoose.connection.collection(name);
}

async function executeMongo(operation, collectionName, criteria = {}, values = {}) {
	const col = getMongoCollection(collectionName);

	if (operation === "read") {
		const docs = await col.find(criteria || {}).toArray();
		return { rows: docs };
	}

	if (operation === "insert") {
		const doc = values && typeof values === "object" ? values : {};
		const result = await col.insertOne(doc);
		return { acknowledged: result.acknowledged, insertedId: result.insertedId };
	}

	if (operation === "update") {
		if (!criteria || Object.keys(criteria).length === 0) {
			throw new Error("Unsafe update: criteria required");
		}
		const result = await col.updateMany(criteria, { $set: values || {} });
		return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
	}

	if (operation === "delete") {
		if (!criteria || Object.keys(criteria).length === 0) {
			throw new Error("Unsafe delete: criteria required");
		}
		const result = await col.deleteMany(criteria);
		return { deletedCount: result.deletedCount };
	}

	throw new Error(`Unsupported operation: ${operation}`);
}

async function applyDbOperation(operation, table, criteria = {}, values = {}) {
	if (!ALLOWED_OPS.has(operation)) {
		throw new Error(`Invalid operation: ${operation}`);
	}

	if (POSTGRES_TABLES.has(table)) {
		return await executePostgres(operation, table, criteria, values);
	}
	if (MONGO_COLLECTIONS.has(table)) {
		return await executeMongo(operation, table, criteria, values);
	}

	throw new Error(`Table/collection not allowed: ${table}`);
}

module.exports = { applyDbOperation };


