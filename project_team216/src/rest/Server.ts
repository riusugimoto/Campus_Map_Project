
import express, { Application, Request, Response } from "express";
import * as http from "http";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import InsightFacade from "../controller/InsightFacade";
import { InsightDatasetKind, NotFoundError } from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insightFacade: InsightFacade;

	constructor(port: number) {
		this.port = port;
		this.express = express();
		this.insightFacade = new InsightFacade();
		this.registerMiddleware();
		this.registerRoutes();
	}

	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.server !== undefined) {
				reject(new Error("Server already listening"));
				return;
			}
			this.server = this.express
				.listen(this.port, () => {
					resolve();
				})
				.on("error", (err) => {
					reject(err);
				});
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				reject(new Error("Server not started"));
				return;
			}
			this.server.close((err) => {
				if (err) {
					reject(err);
				} else {
					this.server = undefined;
					resolve();
				}
			});
		});
	}

	private registerMiddleware(): void {
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));
		this.express.use(cors());
	}

	private registerRoutes(): void {
		this.express.put("/dataset/:id/:kind", this.putDataset.bind(this));
		this.express.delete("/dataset/:id", this.deleteDataset.bind(this));
		this.express.post("/query", this.performQuery.bind(this));
		this.express.get("/datasets", this.listDatasets.bind(this));
		this.express.get("/buildings", this.getBuildings.bind(this));
		this.express.get("/echo/:msg?", Server.echo);
	}

	private async putDataset(req: Request, res: Response): Promise<void> {
		try {
			const id = req.params.id;
			const kind = req.params.kind === "rooms" ? InsightDatasetKind.Rooms : InsightDatasetKind.Sections;
			const content = Buffer.from(req.body).toString("base64");

			const result = await this.insightFacade.addDataset(id, content, kind);
			res.status(StatusCodes.OK).json({ result });
		} catch (error) {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error instanceof Error ? error.message : "Failed to add dataset",
			});
		}
	}

	private async deleteDataset(req: Request, res: Response): Promise<void> {
		try {
			const id = req.params.id;
			const result = await this.insightFacade.removeDataset(id);
			res.status(StatusCodes.OK).json({ result });
		} catch (error) {
			const statusCode = error instanceof NotFoundError ? StatusCodes.NOT_FOUND : StatusCodes.BAD_REQUEST;
			res.status(statusCode).json({
				error: error instanceof Error ? error.message : "Failed to remove dataset",
			});
		}
	}

	private async performQuery(req: Request, res: Response): Promise<void> {
		try {
			const query = req.body;
			const result = await this.insightFacade.performQuery(query);
			res.status(StatusCodes.OK).json({ result });
		} catch (error) {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error instanceof Error ? error.message : "Failed to perform query",
			});
		}
	}

	private async listDatasets(_: Request, res: Response): Promise<void> {
		try {
			const result = await this.insightFacade.listDatasets();
			res.status(StatusCodes.OK).json({ result });
		} catch (error) {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error instanceof Error ? error.message : "Failed to list datasets",
			});
		}
	}

	private async getBuildings(_req: Request, res: Response): Promise<void> {
		try {
			const buildings = await this.insightFacade.getBuildings();
			res.status(StatusCodes.OK).json({ result: buildings });
		} catch (error) {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error instanceof Error ? error.message : "Failed to get buildings",
			});
		}
	}

	private static echo(req: Request, res: Response): void {
		try {
			const msg = req.params.msg;
			if (!msg || msg.trim().length === 0) {
				res.status(StatusCodes.BAD_REQUEST).json({
					error: "Message not provided",
				});
			} else {
				res.status(StatusCodes.OK).json({
					result: `${msg}...${msg}`,
				});
			}
		} catch (error) {
			res.status(StatusCodes.BAD_REQUEST).json({
				error: error instanceof Error ? error.message : "Echo failed",
			});
		}
	}
}
