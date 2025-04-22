// QueryParser.ts
import { InsightError } from "./IInsightFacade";
import {
	ParsedQuery,
	WhereClause,
	OptionsClause,
	TransformationsClause,
	ValidFields,
	SECTIONS_FIELDS,
	ROOMS_FIELDS,
} from "./QueryTypes";
import { QueryParserHelpers } from "./QueryParserHelpers";

export class QueryParser {
	private query: any;
	private datasetId: string | null = null;
	private datasetFields: ValidFields | null = null;

	constructor(query: unknown) {
		this.query = query;
	}

	public parseAndValidate(): ParsedQuery {
		if (!QueryParserHelpers.isValidQueryStructure(this.query)) {
			throw new InsightError("Invalid query structure");
		}

		const where = this.parseWhere();
		const options = this.parseOptions();
		const transformations = this.parseTransformations();

		this.validateDatasetConsistency(where, options, transformations);

		if (transformations) {
			QueryParserHelpers.validateColumnsWithTransformations(options.columns, transformations);
		}

		return { where, options, transformations };
	}

	private parseWhere(): WhereClause {
		const whereClause = this.query.WHERE;
		if (Object.keys(whereClause).length === 0) {
			return { type: "FILTER", value: {} };
		}
		return QueryParserHelpers.parseFilter(whereClause, this.updateDatasetInfo.bind(this));
	}

	private parseOptions(): OptionsClause {
		const options = this.query.OPTIONS;
		if (!this.isValidOptionsStructure(options)) {
			throw new InsightError("Invalid OPTIONS structure");
		}

		const columns = QueryParserHelpers.parseColumns(options.COLUMNS, this.query, this.updateDatasetInfo.bind(this));
		const order = QueryParserHelpers.parseOrder(options.ORDER, columns);

		return { columns, order };
	}

	private parseTransformations(): TransformationsClause | undefined {
		if (!("TRANSFORMATIONS" in this.query)) {
			return undefined;
		}

		const trans = this.query.TRANSFORMATIONS;
		if (!trans || typeof trans !== "object" || !("GROUP" in trans) || !("APPLY" in trans)) {
			throw new InsightError("Invalid TRANSFORMATIONS structure");
		}

		const group = QueryParserHelpers.parseGroup(trans.GROUP, this.updateDatasetInfo.bind(this));
		const apply = QueryParserHelpers.parseApply(trans.APPLY, this.updateDatasetInfo.bind(this));

		return { group, apply };
	}

	private isValidOptionsStructure(options: any): boolean {
		return (
			typeof options === "object" &&
			options !== null &&
			Array.isArray(options.COLUMNS) &&
			(!options.ORDER || typeof options.ORDER === "string" || typeof options.ORDER === "object")
		);
	}

	private updateDatasetInfo(key: string): void {
		const [dataset] = key.split("_");

		if (this.datasetId === null) {
			this.datasetId = dataset;
			const isSectionsKey =
				SECTIONS_FIELDS.mfields.includes(key.split("_")[1]) || SECTIONS_FIELDS.sfields.includes(key.split("_")[1]);
			this.datasetFields = isSectionsKey ? SECTIONS_FIELDS : ROOMS_FIELDS;
		} else if (this.datasetId !== dataset) {
			throw new InsightError("Query cannot reference multiple datasets");
		}
	}

	private validateDatasetConsistency(
		where: WhereClause,
		options: OptionsClause,
		transformations?: TransformationsClause
	): void {
		const keys: string[] = [];

		// Collect keys from WHERE clause
		const whereKeys = QueryParserHelpers.extractKeysFromWhere(where);
		keys.push(...whereKeys);

		// Collect keys from OPTIONS
		const optionsKeys = options.columns.filter((col) => col.includes("_"));
		keys.push(...optionsKeys);

		// Collect keys from TRANSFORMATIONS
		if (transformations) {
			keys.push(...transformations.group);
			transformations.apply.forEach((rule) => {
				if (rule.operation.field.includes("_")) {
					keys.push(rule.operation.field);
				}
			});
		}

		// Validate all keys belong to same dataset
		const datasets = new Set(keys.map((key) => key.split("_")[0]));
		if (datasets.size > 1) {
			throw new InsightError("Query references multiple datasets");
		}
	}
}
