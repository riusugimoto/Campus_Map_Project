export interface Room {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	seats: number;
	type: string;
	furniture: string;
	href: string;
	rooms_lat?: number;
	rooms_lon?: number;
}

export interface BuildingInfo {
	fullname: string;
	shortname: string;
	address: string;
	href?: string;
}

// Extended interface for buildings with coordinates
export interface BuildingWithCoords extends BuildingInfo {
	lat: number;
	lon: number;
}

export type InsightResult = Record<string, string | number>;
