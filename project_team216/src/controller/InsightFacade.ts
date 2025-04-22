import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import * as fs from "fs-extra";
import path from "path";
import { QueryParser } from "./QueryParser";
import { QueryCollector } from "./QueryCollector";
import { Data, ParsedQuery } from "./QueryTypes";
import { DataProcessor } from "./DataProcessor";

const DATA_DIR = "./data";
const MAX_RESULTS = 5000;

export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Data[]>;
	private datasetMetadata: Map<string, InsightDataset>;
	private dataProcessor: DataProcessor;

	constructor() {
		this.datasets = new Map();
		this.datasetMetadata = new Map();
		this.dataProcessor = new DataProcessor();
	}

	private async ensureDataDirectory(): Promise<void> {
		try {
			await fs.ensureDir(DATA_DIR);
		} catch (error) {
			throw new InsightError(`Error adding dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			await this.ensureDataDirectory();

			this.validateDatasetId(id);
			await this.checkDatasetExists(id);

			let sections: Data[];
			if (kind === InsightDatasetKind.Sections) {
				sections = await this.dataProcessor.processCourseSections(content, id);
			} else if (kind === InsightDatasetKind.Rooms) {
				sections = await this.dataProcessor.processRooms(content, id);
			} else {
				throw new InsightError("Unsupported dataset kind");
			}

			if (sections.length === 0) {
				throw new InsightError("No valid sections found in dataset");
			}

			const metadata: InsightDataset = {
				id,
				kind,
				numRows: sections.length,
			};

			await this.persistDataset(id, sections, metadata);
			this.datasets.set(id, sections);
			this.datasetMetadata.set(id, metadata);

			return Array.from(this.datasetMetadata.keys());
		} catch (error) {
			if (error instanceof InsightError) {
				throw error;
			}
			throw new InsightError(`Error adding dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			this.validateDatasetId(id);

			if (!(await this.datasetExistsOnDisk(id))) {
				throw new NotFoundError(`Dataset ${id} not found`);
			}

			await this.removePersistedDataset(id);
			this.datasets.delete(id);
			this.datasetMetadata.delete(id);

			return id;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			throw new InsightError(`Error removing dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			const parser = new QueryParser(query);
			const parsedQuery = parser.parseAndValidate();
			const datasetId = this.extractDatasetId(parsedQuery);

			const dataset = await this.getDataset(datasetId);
			const collector = new QueryCollector(dataset);
			const results = collector.collect(parsedQuery);

			if (results.length > MAX_RESULTS) {
				throw new ResultTooLargeError(`Query returned more than ${MAX_RESULTS} results`);
			}

			return results;
		} catch (error) {
			if (error instanceof InsightError || error instanceof ResultTooLargeError) {
				throw error;
			}
			throw new InsightError(`Error performing query: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.loadAllDatasetMetadata();
		return Array.from(this.datasetMetadata.values());
	}

	private async persistDataset(id: string, data: Data[], metadata: InsightDataset): Promise<void> {
		try {
			const datasetDir = path.join(DATA_DIR, id);
			await fs.ensureDir(datasetDir);

			await Promise.all([
				fs.writeJSON(path.join(datasetDir, "data.json"), data),
				fs.writeJSON(path.join(datasetDir, "metadata.json"), metadata),
			]);
		} catch (error) {
			throw new InsightError(`Failed to persist: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async loadAllDatasetMetadata(): Promise<void> {
		try {
			await this.ensureDataDirectory();
			const datasetDirs = await fs.readdir(DATA_DIR);

			const loadPromises = datasetDirs.map(async (id) => {
				if (!this.datasetMetadata.has(id)) {
					const metadataPath = path.join(DATA_DIR, id, "metadata.json");

					if (await fs.pathExists(metadataPath)) {
						const metadata = (await fs.readJSON(metadataPath)) as InsightDataset;
						this.datasetMetadata.set(id, metadata);
					}
				}
			});

			await Promise.all(loadPromises);
		} catch (error) {
			throw new InsightError(`Error adding dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async getDataset(id: string): Promise<Data[]> {
		if (this.datasets.has(id)) {
			return this.datasets.get(id)!;
		}

		const dataPath = path.join(DATA_DIR, id, "data.json");
		if (!(await fs.pathExists(dataPath))) {
			throw new InsightError(`Dataset ${id} not found`);
		}

		try {
			const data = (await fs.readJSON(dataPath)) as Data[];
			this.datasets.set(id, data);
			return data;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async removePersistedDataset(id: string): Promise<void> {
		const datasetDir = path.join(DATA_DIR, id);
		try {
			await fs.remove(datasetDir);
		} catch (error) {
			throw new InsightError(`Failed to remove: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async datasetExistsOnDisk(id: string): Promise<boolean> {
		return await fs.pathExists(path.join(DATA_DIR, id));
	}

	private async checkDatasetExists(id: string): Promise<void> {
		if (this.datasetMetadata.has(id) || (await this.datasetExistsOnDisk(id))) {
			throw new InsightError(`Dataset ${id} already exists`);
		}
	}

	private validateDatasetId(id: string): void {
		if (!id || id.includes("_") || id.trim().length === 0 || id.trim() !== id) {
			throw new InsightError("Invalid dataset ID");
		}
	}

	private extractDatasetId(parsedQuery: ParsedQuery): string {
		const keys = new Set<string>();

		parsedQuery.options.columns.filter((col) => col.includes("_")).forEach((col) => keys.add(col.split("_")[0]));

		if (parsedQuery.transformations) {
			parsedQuery.transformations.group
				.filter((key) => key.includes("_"))
				.forEach((key) => keys.add(key.split("_")[0]));

			parsedQuery.transformations.apply.forEach((rule) => {
				if (rule.operation.field.includes("_")) {
					keys.add(rule.operation.field.split("_")[0]);
				}
			});
		}

		this.extractKeysFromWhere(parsedQuery.where).forEach((key) => keys.add(key.split("_")[0]));

		if (keys.size === 0) {
			throw new InsightError("No valid dataset ID found in query");
		}
		if (keys.size > 1) {
			throw new InsightError("Query references multiple datasets");
		}

		return Array.from(keys)[0];
	}

	private extractKeysFromWhere(where: any): string[] {
		const keys: string[] = [];

		switch (where.type) {
			case "MCOMPARISON":
			case "SCOMPARISON":
				keys.push(where.value.key);
				break;
			case "LOGICCOMPARISON":
				where.value.filters.forEach((filter: any) => {
					keys.push(...this.extractKeysFromWhere(filter));
				});
				break;
			case "NEGATION":
				keys.push(...this.extractKeysFromWhere(where.value));
				break;
			case "FILTER":
				break;
		}

		return keys;
	}

	public async getBuildings(): Promise<Building[]> {
		try {
			// Use process.cwd() to get the correct path
			const dataPath = path.join(process.cwd(), "data", "rooms", "data.json");
			if (!(await fs.pathExists(dataPath))) {
				throw new Error("Rooms dataset not found at " + dataPath);
			}

			const data = await fs.readJSON(dataPath);
			const buildings = this.extractBuildingsFromData(data);
			return buildings;
		} catch (error) {
			throw new Error("Failed to load building data: " + (error instanceof Error ? error.message : String(error)));
		}
	}

	private extractBuildingsFromData(data: any[]): Building[] {
		const buildingMap: Record<string, Building> = {};

		data.forEach((room: any) => {
			const shortname = room.rooms_shortname;
			if (!buildingMap[shortname]) {
				buildingMap[shortname] = {
					fullname: room.rooms_fullname,
					shortname: room.rooms_shortname,
					address: room.rooms_address,
					lat: room.rooms_lat,
					lon: room.rooms_lon,
				};
			}
		});

		return Object.values(buildingMap);
	}
}

// Define the Building interface
export interface Building {
	fullname: string;
	shortname: string;
	address: string;
	lat: number;
	lon: number;
}
