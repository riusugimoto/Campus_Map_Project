// QueryParserHelpers.ts
import { InsightError } from "./IInsightFacade";
import {
	ApplyRule,
	OrderClause,
	SECTIONS_FIELDS,
	ROOMS_FIELDS,
	ValidFields,
	WhereClause,
	TransformationsClause,
} from "./QueryTypes";

export class QueryParserHelpers {
	public static isValidQueryStructure(query: any): boolean {
		return (
			typeof query === "object" &&
			query !== null &&
			"WHERE" in query &&
			"OPTIONS" in query &&
			(("TRANSFORMATIONS" in query && typeof query.TRANSFORMATIONS === "object") || !("TRANSFORMATIONS" in query))
		);
	}

	public static parseFilter(filter: any, updateDatasetInfo: (key: string) => void): WhereClause {
		const keys = Object.keys(filter);
		if (keys.length !== 1) {
			throw new InsightError("Invalid filter structure");
		}

		const [operator] = keys;
		const val = filter[operator];

		switch (operator) {
			case "AND":
			case "OR":
				if (!Array.isArray(val) || val.length === 0) {
					throw new InsightError(`Invalid ${operator} filter: must be non-empty array`);
				}
				return {
					type: "LOGICCOMPARISON",
					value: { operator, filters: val.map((f) => QueryParserHelpers.parseFilter(f, updateDatasetInfo)) },
				};

			case "LT":
			case "GT":
			case "EQ":
				return QueryParserHelpers.parseMComparison(operator, val, updateDatasetInfo);

			case "IS":
				return QueryParserHelpers.parseSComparison(val, updateDatasetInfo);

			case "NOT":
				return { type: "NEGATION", value: QueryParserHelpers.parseFilter(val, updateDatasetInfo) };

			default:
				throw new InsightError(`Unknown filter type: ${operator}`);
		}
	}

	public static parseMComparison(
		operator: "LT" | "GT" | "EQ",
		value: any,
		updateDatasetInfo: (key: string) => void
	): WhereClause {
		if (typeof value !== "object" || Object.keys(value).length !== 1) {
			throw new InsightError(`Invalid ${operator} structure`);
		}

		const [key] = Object.keys(value);
		const numValue = value[key];

		if (typeof numValue !== "number" || !QueryParserHelpers.isValidMField(key, updateDatasetInfo)) {
			throw new InsightError(`Invalid ${operator} value or key`);
		}

		updateDatasetInfo(key);
		return {
			type: "MCOMPARISON",
			value: { operator, key, value: numValue },
		};
	}

	public static parseSComparison(value: any, updateDatasetInfo: (key: string) => void): WhereClause {
		if (typeof value !== "object" || Object.keys(value).length !== 1) {
			throw new InsightError("Invalid IS structure");
		}

		const [key] = Object.keys(value);
		const pattern = value[key];

		if (typeof pattern !== "string" || !QueryParserHelpers.isValidSField(key, updateDatasetInfo)) {
			throw new InsightError("Invalid IS value or key");
		}

		if (!QueryParserHelpers.isValidPattern(pattern)) {
			throw new InsightError("Invalid string pattern");
		}

		updateDatasetInfo(key);
		return {
			type: "SCOMPARISON",
			value: { key, pattern },
		};
	}

	public static parseGroup(group: any, updateDatasetInfo: (key: string) => void): string[] {
		if (!Array.isArray(group) || group.length === 0) {
			throw new InsightError("Invalid GROUP: must be non-empty array");
		}

		return group.map((key) => {
			if (typeof key !== "string" || !QueryParserHelpers.isValidKey(key, updateDatasetInfo)) {
				throw new InsightError(`Invalid GROUP key: ${key}`);
			}
			updateDatasetInfo(key);
			return key;
		});
	}

	private static validateApplyRule(rule: any): void {
		if (typeof rule !== "object" || Object.keys(rule).length !== 1) {
			throw new InsightError("Invalid apply rule structure");
		}
	}

	private static validateApplyKey(applyKey: string, applyKeys: Set<string>): void {
		if (applyKey.includes("_")) {
			throw new InsightError("Apply key cannot contain underscore");
		}

		if (applyKeys.has(applyKey)) {
			throw new InsightError("Duplicate apply key");
		}
	}

	private static validateOperation(operation: any): void {
		if (typeof operation !== "object" || Object.keys(operation).length !== 1) {
			throw new InsightError("Invalid operation structure");
		}
	}

	private static processApplyRule(
		rule: any,
		applyKeys: Set<string>,
		updateDatasetInfo: (key: string) => void
	): ApplyRule {
		QueryParserHelpers.validateApplyRule(rule);

		const [applyKey] = Object.keys(rule);
		QueryParserHelpers.validateApplyKey(applyKey, applyKeys);
		applyKeys.add(applyKey);

		const operation = rule[applyKey];
		QueryParserHelpers.validateOperation(operation);

		const [operator] = Object.keys(operation);
		const field = operation[operator];

		if (!QueryParserHelpers.isValidApplyOperator(operator)) {
			throw new InsightError(`Invalid apply operator: ${operator}`);
		}

		if (!QueryParserHelpers.isValidApplyField(operator, field, updateDatasetInfo)) {
			throw new InsightError(`Invalid field ${field} for operator ${operator}`);
		}

		return {
			name: applyKey,
			operation: {
				operator: operator as "MAX" | "MIN" | "AVG" | "COUNT" | "SUM",
				field: field,
			},
		};
	}

	public static parseApply(apply: any, updateDatasetInfo: (key: string) => void): ApplyRule[] {
		if (!Array.isArray(apply)) {
			throw new InsightError("Invalid APPLY: must be array");
		}

		const applyKeys = new Set<string>();
		return apply.map((rule) => QueryParserHelpers.processApplyRule(rule, applyKeys, updateDatasetInfo));
	}

	public static parseOrder(order: any, columns: string[]): string | OrderClause | undefined {
		if (!order) {
			return undefined;
		}

		if (typeof order === "string") {
			if (!columns.includes(order)) {
				throw new InsightError("ORDER key must be in COLUMNS");
			}
			return order;
		}

		if (typeof order !== "object" || !order.dir || !order.keys || !Array.isArray(order.keys)) {
			throw new InsightError("Invalid ORDER structure");
		}

		if (order.dir !== "UP" && order.dir !== "DOWN") {
			throw new InsightError("Invalid order direction");
		}

		if (order.keys.length === 0) {
			throw new InsightError("Order keys cannot be empty");
		}

		order.keys.forEach((key: string) => {
			if (!columns.includes(key)) {
				throw new InsightError(`Order key ${key} must be in COLUMNS`);
			}
		});

		return {
			dir: order.dir,
			keys: order.keys,
		};
	}

	public static parseColumns(columns: any, query: any, updateDatasetInfo: (key: string) => void): string[] {
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("COLUMNS must be a non-empty array");
		}

		return columns.map((column) => {
			if (typeof column !== "string") {
				throw new InsightError("Column must be string");
			}

			if (column.includes("_")) {
				if (!QueryParserHelpers.isValidKey(column, updateDatasetInfo)) {
					throw new InsightError(`Invalid column key: ${column}`);
				}
				updateDatasetInfo(column);
			} else {
				if (!query.TRANSFORMATIONS) {
					throw new InsightError("Apply key found but no TRANSFORMATIONS section");
				}
			}

			return column;
		});
	}

	public static validateColumnsWithTransformations(columns: string[], transformations: TransformationsClause): void {
		const validKeys = new Set([...transformations.group, ...transformations.apply.map((rule) => rule.name)]);

		columns.forEach((column) => {
			if (!validKeys.has(column)) {
				throw new InsightError(
					`Column "${column}" must be in GROUP (${transformations.group.join(", ")}) ` +
						`or be an APPLY key (${transformations.apply.map((r) => r.name).join(", ")})`
				);
			}
		});
	}

	private static isValidApplyOperator(operator: string): operator is "MAX" | "MIN" | "AVG" | "COUNT" | "SUM" {
		const validOperators = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		return validOperators.includes(operator);
	}

	private static isValidApplyField(operator: string, field: string, updateDataset: (key: string) => void): boolean {
		if (!field.includes("_")) {
			return false;
		}

		if (operator === "COUNT") {
			return QueryParserHelpers.isValidKey(field, updateDataset);
		}

		return QueryParserHelpers.isValidMField(field, updateDataset);
	}

	public static isValidKey(key: string, updateDatasetInfo: (key: string) => void): boolean {
		const [dataset, field] = key.split("_");
		if (!dataset || !field) {
			return false;
		}

		updateDatasetInfo(key);
		const datasetFields = QueryParserHelpers.getDatasetFields(key);
		if (!datasetFields) {
			return false;
		}

		return [...datasetFields.mfields, ...datasetFields.sfields].includes(field);
	}

	private static isValidMField(key: string, updateDatasetInfo: (key: string) => void): boolean {
		const [, field] = key.split("_");
		updateDatasetInfo(key);
		const datasetFields = QueryParserHelpers.getDatasetFields(key);
		return datasetFields?.mfields.includes(field) || false;
	}

	private static isValidSField(key: string, updateDatasetInfo: (key: string) => void): boolean {
		const [, field] = key.split("_");
		updateDatasetInfo(key);
		const datasetFields = QueryParserHelpers.getDatasetFields(key);
		return datasetFields?.sfields.includes(field) || false;
	}

	private static isValidPattern(pattern: string): boolean {
		const AST = 2;
		const asteriskCount = (pattern.match(/\*/g) || []).length;
		if (asteriskCount > AST) {
			return false;
		}

		const startsWithAsterisk = pattern.startsWith("*");
		const endsWithAsterisk = pattern.endsWith("*");
		const middlePattern = pattern.slice(startsWithAsterisk ? 1 : 0, endsWithAsterisk ? -1 : undefined);

		return !middlePattern.includes("*");
	}

	private static getDatasetFields(key: string): ValidFields | null {
		const [, field] = key.split("_");
		const isSectionsKey = SECTIONS_FIELDS.mfields.includes(field) || SECTIONS_FIELDS.sfields.includes(field);
		return isSectionsKey ? SECTIONS_FIELDS : ROOMS_FIELDS;
	}

	public static extractKeysFromWhere(where: WhereClause): string[] {
		const keys: string[] = [];

		switch (where.type) {
			case "MCOMPARISON":
			case "SCOMPARISON":
				keys.push(where.value.key);
				break;
			case "LOGICCOMPARISON":
				where.value.filters.forEach((filter) => {
					keys.push(...QueryParserHelpers.extractKeysFromWhere(filter));
				});
				break;
			case "NEGATION":
				keys.push(...QueryParserHelpers.extractKeysFromWhere(where.value));
				break;
		}

		return keys;
	}
}
