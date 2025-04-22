import http from "http";
import { InsightError } from "./IInsightFacade";

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export class GeolocationService {
	private readonly baseUrl: string;
	private cache: Map<string, GeoResponse>;

	constructor(teamNumber: string) {
		this.baseUrl = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${teamNumber}`;
		this.cache = new Map();
	}

	private validateAddress(address: string): void {
		if (!address) {
			throw new InsightError("Invalid address provided");
		}
	}

	private checkCache(address: string): GeoResponse | null {
		return this.cache.has(address) ? this.cache.get(address)! : null;
	}

	private validateGeoResponse(response: GeoResponse): void {
		if (response.lat === undefined || response.lon === undefined) {
			throw new InsightError("Invalid geolocation response format");
		}
	}

	private handleResponseData(data: string, statusCode: number, address: string): GeoResponse {
		const CODE = 200;
		if (statusCode !== CODE) {
			throw new InsightError(`Geolocation failed with status: ${statusCode}`);
		}

		try {
			const response = JSON.parse(data) as GeoResponse;
			this.validateGeoResponse(response);
			this.cache.set(address, response);
			return response;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async makeHttpRequest(url: string, address: string): Promise<GeoResponse> {
		return new Promise((resolve, reject) => {
			let data = "";
			const TIME = 5000;

			const request = http.get(url, (res) => {
				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					try {
						const response = this.handleResponseData(data, res.statusCode!, address);
						resolve(response);
					} catch (error) {
						reject(error);
					}
				});
			});

			request.on("error", (error) => {
				reject(new InsightError(`Geolocation request failed: ${error.message}`));
			});

			request.setTimeout(TIME, () => {
				request.destroy();
				reject(new InsightError("Geolocation request timed out"));
			});
		});
	}

	public async getLocation(address: string): Promise<GeoResponse> {
		this.validateAddress(address);

		const cachedResponse = this.checkCache(address);
		if (cachedResponse) {
			return cachedResponse;
		}

		const encodedAddress = encodeURIComponent(address);
		const url = `${this.baseUrl}/${encodedAddress}`;
		return this.makeHttpRequest(url, address);
	}
}
