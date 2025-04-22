import { InsightError, InsightResult } from "./IInsightFacade";
import {
	ParsedQuery,
	WhereClause,
	Data,
	OptionsClause,
	MComparison,
	SComparison,
	TransformationsClause,
	ApplyRule,
	OrderClause,
} from "./QueryTypes";
import Decimal from "decimal.js";
const MAGIC_NUM = 2;
export class QueryCollector {
	private dataset: Data[];

	constructor(dataset: Data[]) {
		this.dataset = dataset;
	}

	public collect(parsedQuery: ParsedQuery): InsightResult[] {
		let results = this.applyWhere(parsedQuery.where);

		if (parsedQuery.transformations) {
			results = this.applyTransformations(results, parsedQuery.transformations);
		}

		return this.applyOptions(results, parsedQuery.options);
	}

	private applyWhere(whereClause: WhereClause): Data[] {
		if (whereClause.type === "FILTER") {
			return this.dataset;
		}
		return this.dataset.filter((section) => this.evaluateFilter(whereClause, section));
	}

	private evaluateFilter(filter: WhereClause, section: Data): boolean {
		switch (filter.type) {
			case "LOGICCOMPARISON":
				return filter.value.operator === "AND"
					? filter.value.filters.every((f) => this.evaluateFilter(f, section))
					: filter.value.filters.some((f) => this.evaluateFilter(f, section));

			case "MCOMPARISON":
				return this.evaluateMComparison(filter.value, section);

			case "SCOMPARISON":
				return this.evaluateSComparison(filter.value, section);

			case "NEGATION":
				return !this.evaluateFilter(filter.value, section);

			default:
				return true;
		}
	}

	private evaluateMComparison(comparison: MComparison, section: Data): boolean {
		const sectionValue = section[comparison.key] as number;
		switch (comparison.operator) {
			case "LT":
				return sectionValue < comparison.value;
			case "GT":
				return sectionValue > comparison.value;
			case "EQ":
				return sectionValue === comparison.value;
			default:
				return false;
		}
	}

	private evaluateSComparison(comparison: SComparison, section: Data): boolean {
		const sectionValue = section[comparison.key] as string;
		let pattern = comparison.pattern;

		// Handle wildcards properly
		if (pattern === "*") {
			return true; // Match everything
		}

		// Convert the pattern to proper regex
		if (pattern.startsWith("*") && pattern.endsWith("*")) {
			pattern = pattern.slice(1, -1);
			return sectionValue.includes(pattern);
		} else if (pattern.startsWith("*")) {
			pattern = pattern.slice(1);
			return sectionValue.endsWith(pattern);
		} else if (pattern.endsWith("*")) {
			pattern = pattern.slice(0, -1);
			return sectionValue.startsWith(pattern);
		} else {
			return sectionValue === pattern;
		}
	}

	private applyTransformations(results: Data[], transformations: TransformationsClause): Data[] {
		// First group the results
		const groups = this.groupResults(results, transformations.group);
		// Then apply operations on each group
		return this.applyOperations(groups, transformations);
	}

	private groupResults(results: Data[], groupKeys: string[]): Map<string, Data[]> {
		const groups = new Map<string, Data[]>();

		results.forEach((result) => {
			// Create key combining all group values
			const keyParts = groupKeys.map((key) => {
				const value = result[key];
				return value; // Just use the value itself
			});
			const groupKey = keyParts.join("_"); // Simple join, no extra formatting

			if (!groups.has(groupKey)) {
				groups.set(groupKey, []);
			}
			groups.get(groupKey)!.push(result);
		});

		return groups;
	}

	private applyOperations(groups: Map<string, Data[]>, transformations: TransformationsClause): Data[] {
		return Array.from(groups).map(([, groupResults]) => {
			const result: Data = {};

			// Add the original group key values from the first result
			transformations.group.forEach((groupKey) => {
				result[groupKey] = groupResults[0][groupKey];
			});

			// Apply the aggregation rules
			transformations.apply.forEach((rule) => {
				result[rule.name] = this.computeApplyOperation(rule, groupResults);
			});

			return result;
		});
	}

	private computeApplyOperation(rule: ApplyRule, group: Data[]): number {
		const values = group.map((result) => result[rule.operation.field]);

		switch (rule.operation.operator) {
			case "MAX":
				return Math.max(...(values as number[]));
			case "MIN":
				return Math.min(...(values as number[]));
			case "AVG":
				return this.calculateAverage(values as number[]);
			case "SUM":
				return this.calculateSum(values as number[]);
			case "COUNT":
				return new Set(values).size;
			default:
				throw new InsightError(`Unknown apply operator: ${rule.operation.operator}`);
		}
	}

	private calculateAverage(values: number[]): number {
		if (values.length === 0) {
			return 0;
		}

		const sum = values.reduce((acc, val) => new Decimal(acc).plus(val), new Decimal(0));
		const avg = sum.toNumber() / values.length;
		return Number(avg.toFixed(MAGIC_NUM));
	}

	private calculateSum(values: number[]): number {
		if (values.length === 0) {
			return 0;
		}

		const sum = values.reduce((acc, val) => new Decimal(acc).plus(val), new Decimal(0));
		return Number(sum.toFixed(MAGIC_NUM));
	}

	private applyOptions(results: Data[], options: OptionsClause): InsightResult[] {
		let filteredResults = this.selectColumns(results, options.columns);

		if (options.order) {
			filteredResults = this.sortResults(filteredResults, options.order);
		}

		return filteredResults;
	}

	private selectColumns(results: Data[], columns: string[]): InsightResult[] {
		return results.map((result) => {
			const filteredResult: InsightResult = {};
			columns.forEach((column) => {
				filteredResult[column] = result[column];
			});
			return filteredResult;
		});
	}

	private sortResults(results: InsightResult[], order: string | OrderClause): InsightResult[] {
		if (typeof order === "string") {
			return results.sort((a, b) => {
				const aVal = a[order];
				const bVal = b[order];

				if (aVal === bVal) {
					const aName = a.rooms_shortname as string;
					const bName = b.rooms_shortname as string;
					return aName < bName ? -1 : aName > bName ? 1 : 0;
				}

				return aVal < bVal ? -1 : 1;
			});
		}

		return results.sort((a, b) => {
			for (const key of order.keys) {
				const aVal = a[key];
				const bVal = b[key];

				if (aVal !== bVal) {
					// For DOWN direction, swap the comparison
					if (order.dir === "DOWN") {
						return aVal < bVal ? 1 : -1;
					}
					return aVal < bVal ? -1 : 1;
				}
			}

			// If all keys are equal, sort by rooms_shortname
			const aName = a.rooms_shortname as string;
			const bName = b.rooms_shortname as string;
			return aName < bName ? -1 : aName > bName ? 1 : 0;
		});
	}
}
