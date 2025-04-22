import Server from "../../src/rest/Server";
import { expect } from "chai";
import request from "supertest";
import * as fs from "fs-extra";
import { StatusCodes } from "http-status-codes";

const temp = 2;
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;
const STATUS = {
	OK: StatusCodes.OK,
	BAD_REQUEST: StatusCodes.BAD_REQUEST,
	NOT_FOUND: StatusCodes.NOT_FOUND,
};

let rooms: Buffer;

beforeEach(async function () {
	rooms = await fs.readFile("test/resources/archives/campus.zip");
});

describe("Server", function () {
	describe("General Server Operations", function () {
		let testServer: Server;

		afterEach(async function () {
			if (testServer && (testServer as any).server !== undefined) {
				try {
					await testServer.stop();
				} catch (err) {
					throw new Error("Failed to stop server: " + (err instanceof Error ? err.message : String(err)));
				}
			}
		});

		it("should reject stopping an unstarted server", async function () {
			testServer = new Server(PORT);
			await expect(testServer.stop()).to.be.rejectedWith("Server not started");
		});

		it("should reject starting an already started server", async function () {
			testServer = new Server(PORT);
			await testServer.start();
			try {
				await testServer.start();
				expect.fail("Should have rejected");
			} catch (err) {
				expect(err).to.be.instanceOf(Error);
				if (err instanceof Error) {
					expect(err.message).to.equal("Server already listening");
				}
			}
		});
	});

	describe("Dataset Operations", function () {
		let server: Server;

		before(async function () {
			server = new Server(PORT);
			await server.start();
		});

		after(async function () {
			await server.stop();
		});

		beforeEach(async function () {
			try {
				const existingDatasets = await request(BASE_URL).get("/datasets");
				const deletePromises = existingDatasets.body.result.map(async (dataset: any) =>
					request(BASE_URL).delete(`/dataset/${dataset.id}`)
				);
				await Promise.all(deletePromises);
			} catch (err) {
				throw new Error("Failed to load data: " + (err instanceof Error ? err.message : String(err)));
			}
		});

		// PUT tests
		it("PUT /dataset/:id/:kind - should add rooms dataset", async function () {
			const response = await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
			expect(response.status).to.equal(STATUS.OK);
		});

		it("PUT /dataset/:id/:kind - should reject dataset with duplicate ID", async function () {
			await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");

			const response = await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("PUT /dataset/:id/:kind - should handle invalid content", async function () {
			const invalidData = Buffer.from("invalid data");
			const response = await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(invalidData)
				.set("Content-Type", "application/x-zip-compressed");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		// DELETE tests
		it("DELETE /dataset/:id - should delete existing dataset", async function () {
			await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");

			const response = await request(BASE_URL).delete("/dataset/test");
			expect(response.status).to.equal(STATUS.OK);
		});

		it("DELETE /dataset/:id - should handle non-existent dataset", async function () {
			const response = await request(BASE_URL).delete("/dataset/nonexistent");
			expect(response.status).to.equal(STATUS.NOT_FOUND);
		});

		// GET tests
		it("GET /datasets - should handle empty dataset list", async function () {
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
			expect(response.body.result).to.have.lengthOf(0);
		});

<<<<<<< HEAD
=======
		
		it("GET /datasets - should return an empty array when no datasets are added", async function () {
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array").that.is.empty;
		});
		

>>>>>>> bd0267b27682ab8f4f4193dbdfb6d1c2fc93d3d9
		it("GET /datasets - should list added datasets", async function () {
			await request(BASE_URL)
				.put("/dataset/test1/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");

			await request(BASE_URL)
				.put("/dataset/test2/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");

			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
			expect(response.body.result).to.have.lengthOf(temp);
		});
	});
	describe("Query Operations", function () {
		let server: Server;

<<<<<<< HEAD
=======
		it("GET /datasets - should return datasets with correct properties", async function () {
			// Add a dataset
			await request(BASE_URL)
				.put("/dataset/rooms/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
		
			const datasets = response.body.result;
			expect(datasets).to.be.an("array").with.lengthOf(1);
		
			const dataset = datasets[0];
			expect(dataset).to.have.property("id", "rooms");
			expect(dataset).to.have.property("kind", "rooms");
			expect(dataset).to.have.property("numRows").that.is.a("number");
		});


		it("GET /datasets - should list multiple datasets with different IDs", async function () {
			
			await request(BASE_URL)
				.put("/dataset/rooms1/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		
			await request(BASE_URL)
				.put("/dataset/rooms2/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
		
			const datasets = response.body.result;
			expect(datasets).to.be.an("array").with.lengthOf(2);
		
			const rooms1Dataset = datasets.find((d: any) => d.id === "rooms1");
			const rooms2Dataset = datasets.find((d: any) => d.id === "rooms2");
		
			expect(rooms1Dataset).to.have.property("id", "rooms1");
			expect(rooms1Dataset).to.have.property("kind", "rooms");
			expect(rooms1Dataset).to.have.property("numRows").that.is.a("number");
		
			expect(rooms2Dataset).to.have.property("id", "rooms2");
			expect(rooms2Dataset).to.have.property("kind", "rooms");
			expect(rooms2Dataset).to.have.property("numRows").that.is.a("number");
		});
		
		it("GET /datasets - should handle dataset IDs with special characters", async function () {
	
			const specialId = "special!@#";
			await request(BASE_URL)
				.put(`/dataset/${encodeURIComponent(specialId)}/rooms`)
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
		
			const datasets = response.body.result;
			expect(datasets).to.be.an("array").with.lengthOf(1);
		
			const dataset = datasets[0];
			expect(dataset).to.have.property("id", specialId);
			expect(dataset).to.have.property("kind", "rooms");
			expect(dataset).to.have.property("numRows").that.is.a("number");
		});

//////////////////////////////////////////////////////////////////////////////////////////////////////
		it("GET /datasets - should not list datasets after they are deleted", async function () {
			await fs.remove("./data");
			// Add a dataset
			await request(BASE_URL)
				.put("/dataset/rooms1/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		
			// Delete the dataset
			const deleteResponse = await request(BASE_URL).delete("/dataset/rooms1");
			expect(deleteResponse.status).to.equal(STATUS.OK);
		
			// Verify dataset list is empty
			const response = await request(BASE_URL).get("/datasets");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array").that.is.empty;
		});
		

		it("PUT /dataset/:id/:kind - should reject datasets with invalid IDs", async function () {
			const invalidIds = ["", " ", null, undefined, "   "];

			for (const id of invalidIds) {
				const idParam = id === null || id === undefined ? "" : encodeURIComponent(id);
				const response = await request(BASE_URL)
					.put(`/dataset/${idParam}/rooms`)
					.send(rooms)
					.set("Content-Type", "application/x-zip-compressed");
				expect(response.status).to.equal(STATUS.BAD_REQUEST);
				expect(response.body).to.have.property("error");
			}
		});
		
//////////////////////////////////////////////////////////////////////////////////////////////////////
	
		
		
	});



	
	describe("Query Operations", function () {
		let server: Server;

>>>>>>> bd0267b27682ab8f4f4193dbdfb6d1c2fc93d3d9
		before(async function () {
			server = new Server(PORT);
			await server.start();
		});

		after(async function () {
			await server.stop();
		});

		beforeEach(async function () {
			await request(BASE_URL)
				.put("/dataset/test/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		});

		afterEach(async function () {
			try {
				await request(BASE_URL).delete("/dataset/test");
			} catch (err) {
				throw new Error("Failed to load data: " + (err instanceof Error ? err.message : String(err)));
			}
		});

		it("POST /query - should handle valid query", async function () {
			const query = {
				WHERE: {
					GT: {
						test_seats: 100,
					},
				},
				OPTIONS: {
					COLUMNS: ["test_fullname", "test_number", "test_seats"],
				},
			};

			const response = await request(BASE_URL).post("/query").send(query).set("Content-Type", "application/json");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
		});

		it("POST /query - should handle invalid query format", async function () {
			const response = await request(BASE_URL).post("/query").send({}).set("Content-Type", "application/json");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("POST /query - should handle missing query", async function () {
			const response = await request(BASE_URL).post("/query").send().set("Content-Type", "application/json");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("POST /query - should handle malformed JSON", async function () {
			const response = await request(BASE_URL)
				.post("/query")
				.set("Content-Type", "text/plain")
				.send('{"incomplete": "json"');
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("POST /query - should handle non-JSON input", async function () {
			const response = await request(BASE_URL).post("/query").set("Content-Type", "text/plain").send("not json at all");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("POST /query - should handle complex room query", async function () {
			const query = {
				WHERE: {
					AND: [{ IS: { test_shortname: "DMP" } }, { IS: { test_number: "310" } }],
				},
				OPTIONS: {
					COLUMNS: ["test_fullname", "test_shortname", "test_number", "test_address", "test_seats"],
				},
			};

			const response = await request(BASE_URL).post("/query").send(query).set("Content-Type", "application/json");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
		});
	});

	describe("Buildings Endpoint", function () {
		let server: Server;

		before(async function () {
			server = new Server(PORT);
			await server.start();
		});

		after(async function () {
			await server.stop();
		});

		beforeEach(async function () {
			await request(BASE_URL)
				.put("/dataset/rooms/rooms")
				.send(rooms)
				.set("Content-Type", "application/x-zip-compressed");
		});

		afterEach(async function () {
			try {
				await request(BASE_URL).delete("/dataset/rooms");
			} catch (err) {
				throw new Error("Failed to load building data: " + (err instanceof Error ? err.message : String(err)));
			}
		});

		it("GET /buildings - should return a list of buildings", async function () {
			const response = await request(BASE_URL).get("/buildings");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
			expect(response.body.result.length).to.be.greaterThan(0);
		});

		it("GET /buildings - should include required building properties", async function () {
			const response = await request(BASE_URL).get("/buildings");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body.result).to.be.an("array");
			expect(response.body.result.length).to.be.greaterThan(0);

			const building = response.body.result[0];
			expect(building).to.have.property("fullname");
			expect(building).to.have.property("shortname");
			expect(building).to.have.property("address");
			expect(building).to.have.property("lat");
			expect(building).to.have.property("lon");
		});

		it("GET /buildings - should handle no dataset", async function () {
			await request(BASE_URL).delete("/dataset/rooms");
			const response = await request(BASE_URL).get("/buildings");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});
	});

	describe("Echo Endpoint", function () {
		let server: Server;

		before(async function () {
			server = new Server(PORT);
			await server.start();
		});

		after(async function () {
			await server.stop();
		});

		it("GET /echo/ - should handle missing message", async function () {
			const response = await request(BASE_URL).get("/echo/");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});

		it("GET /echo/:msg - should echo message", async function () {
			const response = await request(BASE_URL).get("/echo/hello");
			expect(response.status).to.equal(STATUS.OK);
			expect(response.body).to.deep.equal({ result: "hello...hello" });
		});

		it("GET /echo - should handle empty message", async function () {
			const response = await request(BASE_URL).get("/echo/ ");
			expect(response.status).to.equal(STATUS.BAD_REQUEST);
		});
	});
<<<<<<< HEAD
});
=======
});
>>>>>>> bd0267b27682ab8f4f4193dbdfb6d1c2fc93d3d9
