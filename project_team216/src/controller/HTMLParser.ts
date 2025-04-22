import { BuildingInfo, Room } from "./QueryTypes";
import { InsightError } from "./IInsightFacade";
import { parse } from "parse5";

export class HTMLParser {
	public parseIndex(content: string): BuildingInfo[] {
		const document = parse(content);
		const buildings: BuildingInfo[] = [];

		// Find first td with views-field class
		const tds = this.getElementsByTagName(document, "td");
		const validCell = tds.find((td) => this.getAttribute(td, "class")?.includes("views-field"));

		if (!validCell) {
			throw new Error("No cell found with views-field class");
		}

		// Get parent table
		const table = this.findParentByTagName(validCell, "table");
		if (!table) {
			throw new InsightError("Could not find parent table");
		}

		// Process rows
		const rows = this.getElementsByTagName(table, "tr");
		for (const row of rows) {
			const buildingInfo = this.extractBuildingInfo(row);
			if (buildingInfo) {
				buildings.push(buildingInfo);
			}
		}

		if (buildings.length === 0) {
			throw new InsightError("No valid buildings found");
		}

		return buildings;
	}

	public parseBuilding(content: string, buildingInfo: BuildingInfo): Room[] {
		const document = parse(content);

		// Find first td with views-field class
		const tds = this.getElementsByTagName(document, "td");
		const validCell = tds.find((td) => this.getAttribute(td, "class")?.includes("views-field"));

		if (!validCell) {
			return [];
		}

		// Get parent table
		const table = this.findParentByTagName(validCell, "table");
		if (!table) {
			return [];
		}

		// Process rows
		const rooms: Room[] = [];
		const rows = this.getElementsByTagName(table, "tr");
		for (const row of rows) {
			const roomInfo = this.extractRoomInfo(row, buildingInfo);
			if (roomInfo) {
				rooms.push(roomInfo);
			}
		}

		return rooms;
	}

	private getElementsByTagName(node: any, tagName: string): any[] {
		const elements: any[] = [];

		const traverse = (current: any): void => {
			if (current.nodeName && current.nodeName.toLowerCase() === tagName.toLowerCase()) {
				elements.push(current);
			}

			if (current.childNodes) {
				current.childNodes.forEach((child: any) => traverse(child));
			}
		};

		traverse(node);
		return elements;
	}

	private findParentByTagName(node: any, tagName: string): any {
		let current = node;
		while (current && current.nodeName.toLowerCase() !== tagName.toLowerCase()) {
			current = current.parentNode;
		}
		return current;
	}

	private getAttribute(element: any, attributeName: string): string | null {
		if (!element?.attrs) {
			return null;
		}
		const attr = element.attrs.find((a: any) => a.name === attributeName);
		return attr ? attr.value : null;
	}

	private getTextContent(node: any): string {
		if (node.nodeName === "#text") {
			return node.value || "";
		}

		if (node.childNodes) {
			return node.childNodes
				.map((child: any) => this.getTextContent(child))
				.join("")
				.trim();
		}

		return "";
	}

	private extractBuildingInfo(row: any): BuildingInfo | null {
		const cells = this.getElementsByTagName(row, "td");

		const titleCell = cells.find((cell) => this.getAttribute(cell, "class")?.includes("views-field-title"));

		const addressCell = cells.find((cell) =>
			this.getAttribute(cell, "class")?.includes("views-field-field-building-address")
		);

		const codeCell = cells.find((cell) =>
			this.getAttribute(cell, "class")?.includes("views-field-field-building-code")
		);

		if (!titleCell || !addressCell || !codeCell) {
			return null;
		}

		const anchors = this.getElementsByTagName(titleCell, "a");

		const href = this.getAttribute(anchors[0], "href");
		if (!href) {
			return null;
		}

		// Extract just the building file name from the href
		const buildingFile = href.split("/").pop(); // Get last part of path
		if (!buildingFile) {
			return null;
		}

		return {
			fullname: this.getTextContent(titleCell),
			shortname: this.getTextContent(codeCell),
			address: this.getTextContent(addressCell),
			href: buildingFile, // Just store the file name
		};
	}

	private extractRoomInfo(row: any, buildingInfo: BuildingInfo): Room | null {
		const cells = this.getElementsByTagName(row, "td");

		const numberCell = this.findCellByClass(cells, "views-field-field-room-number");
		const capacityCell = this.findCellByClass(cells, "views-field-field-room-capacity");
		const furnitureCell = this.findCellByClass(cells, "views-field-field-room-furniture");
		const typeCell = this.findCellByClass(cells, "views-field-field-room-type");

		if (!numberCell || !capacityCell || !furnitureCell || !typeCell) {
			return null;
		}

		const href = this.extractHref(numberCell);
		const number = this.getTextContent(numberCell);
		const seats = this.extractSeats(capacityCell);

		if (!href || !number || isNaN(seats)) {
			return null;
		}

		return this.createRoomObject(buildingInfo, number, seats, href, typeCell, furnitureCell);
	}

	private findCellByClass(cells: any[], className: string): any | null {
		return cells.find((cell) => this.getAttribute(cell, "class")?.includes(className)) || null;
	}

	private extractHref(numberCell: any): string | null {
		const anchor = this.getElementsByTagName(numberCell, "a")[0];
		return this.getAttribute(anchor, "href") || null;
	}

	private extractSeats(capacityCell: any): number {
		return parseInt(this.getTextContent(capacityCell), 10);
	}

	private createRoomObject(
		buildingInfo: BuildingInfo,
		number: string,
		seats: number,
		href: string,
		typeCell: any,
		furnitureCell: any
	): Room {
		return {
			fullname: buildingInfo.fullname,
			shortname: buildingInfo.shortname,
			number,
			name: `${buildingInfo.shortname}_${number}`,
			address: buildingInfo.address,
			lat: 0,
			lon: 0,
			seats,
			type: this.getTextContent(typeCell),
			furniture: this.getTextContent(furnitureCell),
			href,
		};
	}
}
