export interface ParsedQuery {
	where: WhereClause;
	options: OptionsClause;
	transformations?: TransformationsClause;
}

export type WhereClause =
	| { type: "FILTER"; value: {} }
	| { type: "LOGICCOMPARISON"; value: LogicComparison }
	| { type: "MCOMPARISON"; value: MComparison }
	| { type: "SCOMPARISON"; value: SComparison }
	| { type: "NEGATION"; value: WhereClause };

interface LogicComparison {
	operator: "AND" | "OR";
	filters: WhereClause[];
}

export interface MComparison {
	operator: "LT" | "GT" | "EQ";
	key: string;
	value: number;
}

export interface SComparison {
	key: string;
	pattern: string;
}

export interface OptionsClause {
	columns: string[];
	order?: string | OrderClause;
}

export interface OrderClause {
	dir: "UP" | "DOWN";
	keys: string[];
}

export interface TransformationsClause {
	group: string[];
	apply: ApplyRule[];
}

export interface ApplyRule {
	name: string;
	operation: {
		operator: "MAX" | "MIN" | "AVG" | "COUNT" | "SUM";
		field: string;
	};
}

export type Data = Record<string, string | number>;

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
}

export interface BuildingInfo {
	fullname: string;
	shortname: string;
	address: string;
	href: string;
}

export interface RoomData {
	rooms: Room[];
	buildingData: BuildingInfo[];
	geolocations: Map<string, { lat: number; lon: number }>;
}

export type InsightResult = Record<string, string | number>;

export interface ValidFields {
	mfields: string[];
	sfields: string[];
}

// Constants for valid fields
export const SECTIONS_FIELDS: ValidFields = {
	mfields: ["avg", "pass", "fail", "audit", "year"],
	sfields: ["dept", "id", "instructor", "title", "uuid"],
};

export const ROOMS_FIELDS: ValidFields = {
	mfields: ["lat", "lon", "seats"],
	sfields: ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"],
};

export type QueryDataKind = "sections" | "rooms";
