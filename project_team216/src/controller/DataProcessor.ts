import JSZip from "jszip";
import { Data, Room, BuildingInfo } from "./QueryTypes";
import { InsightError } from "./IInsightFacade";
import { GeolocationService } from "./GeolocationService";
import { HTMLParser } from "./HTMLParser";

export class DataProcessor {
	private geoService: GeolocationService;
	private htmlParser: HTMLParser;

	constructor() {
		this.geoService = new GeolocationService("216");
		this.htmlParser = new HTMLParser();
	}

	private async processBuilding(building: BuildingInfo, zip: JSZip, id: string, sections: Data[]): Promise<void> {
		try {
			const buildingPath = `campus/discover/buildings-and-classrooms/${building.href}`;
			const buildingFile = zip.file(buildingPath);

			if (!buildingFile) {
				//console.warn(`Building file not found: ${buildingPath}`);
				return;
			}

			const buildingContent = await buildingFile.async("string");
			const rooms = this.htmlParser.parseBuilding(buildingContent, building);
			const geoResponse = await this.geoService.getLocation(building.address);

			if (!geoResponse.lat || !geoResponse.lon) {
				//console.warn(`No geolocation data for building: ${building.shortname}`);
				return;
			}

			rooms.forEach((room) =>
				sections.push(
					this.transformRoomToSection(room, id, {
						lat: geoResponse.lat!,
						lon: geoResponse.lon!,
					})
				)
			);
		} catch (error) {
			throw new InsightError(`Error loading: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	public async processRooms(content: string, id: string): Promise<Data[]> {
		const zip = await JSZip.loadAsync(content, { base64: true });
		const indexFile = zip.file("index.htm");

		if (!indexFile) {
			throw new InsightError("index.htm not found in dataset");
		}

		const indexContent = await indexFile.async("string");
		const buildings = this.htmlParser.parseIndex(indexContent);

		if (buildings.length === 0) {
			throw new InsightError("No valid buildings found in index");
		}

		const sections: Data[] = [];
		const roomsPromises = buildings.map(async (building) => this.processBuilding(building, zip, id, sections));

		await Promise.all(roomsPromises);

		if (sections.length === 0) {
			throw new InsightError("No valid rooms found in dataset");
		}

		return sections;
	}

	public async processCourseSections(content: string, id: string): Promise<Data[]> {
		const zip = await JSZip.loadAsync(content, { base64: true });
		const sections: Data[] = [];

		const courseFiles = Object.values(zip.files).filter((file) => !file.dir && file.name.startsWith("courses/"));

		if (courseFiles.length === 0) {
			throw new InsightError("No course files found in dataset");
		}

		const filePromises = courseFiles.map(async (file) => {
			try {
				const fileContent = await file.async("string");
				const courseData = JSON.parse(fileContent);

				if (!Array.isArray(courseData.result)) {
					return;
				}

				courseData.result.forEach((section: any) => {
					if (this.isValidSection(section)) {
						sections.push(this.transformSection(section, id));
					}
				});
			} catch (error) {
				throw new InsightError(`Error loading: ${error instanceof Error ? error.message : String(error)}`);
			}
		});

		await Promise.all(filePromises);

		if (sections.length === 0) {
			throw new InsightError("No valid sections found in dataset");
		}

		return sections;
	}

	private transformRoomToSection(room: Room, id: string, geo: { lat: number; lon: number }): Data {
		return {
			[`${id}_fullname`]: room.fullname,
			[`${id}_shortname`]: room.shortname,
			[`${id}_number`]: room.number,
			[`${id}_name`]: room.name,
			[`${id}_address`]: room.address,
			[`${id}_lat`]: geo.lat,
			[`${id}_lon`]: geo.lon,
			[`${id}_seats`]: room.seats,
			[`${id}_type`]: room.type,
			[`${id}_furniture`]: room.furniture,
			[`${id}_href`]: room.href,
		};
	}

	private transformSection(section: any, id: string): Data {
		const K = 1900;
		const year = section.Section === "overall" ? K : parseInt(section.Year, 10);

		return {
			[`${id}_uuid`]: section.id.toString(),
			[`${id}_id`]: section.Course,
			[`${id}_title`]: section.Title,
			[`${id}_instructor`]: section.Professor,
			[`${id}_dept`]: section.Subject,
			[`${id}_year`]: year,
			[`${id}_avg`]: parseFloat(section.Avg),
			[`${id}_pass`]: parseInt(section.Pass, 10),
			[`${id}_fail`]: parseInt(section.Fail, 10),
			[`${id}_audit`]: parseInt(section.Audit, 10),
		};
	}

	private isValidSection(section: any): boolean {
		const requiredFields = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];

		return requiredFields.every((field) => {
			const value = section[field];
			return (
				value !== undefined &&
				value !== null &&
				(field === "Avg"
					? !isNaN(parseFloat(value))
					: ["Year", "Pass", "Fail", "Audit"].includes(field)
					? !isNaN(parseInt(value, 10))
					: true)
			);
		});
	}
}
