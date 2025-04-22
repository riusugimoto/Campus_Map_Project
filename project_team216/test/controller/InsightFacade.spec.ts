import {
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import JSZip from "jszip";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: InsightFacade;
	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let rooms: string;
	//let smallSections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		rooms = await getContentFromArchives("campus.zip");
		//smallSections = await getContentFromArchives("sections.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with  an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with  an whitespace dataset id", async function () {
			try {
				await facade.addDataset("   ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with  an underscore in the dataset id", async function () {
			try {
				await facade.addDataset("with_underscore", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when adding the same dataset twice", async function () {
			try {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should add a valid dataset", async function () {
			const response = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);

			expect(response).to.deep.equal(["sections"]);
		});

		it("should reject for invalid content not a base64 string", async function () {
			try {
				await facade.addDataset("invalid", "not base64", InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid content not a ZIP file", async function () {
			const invalidContent = Buffer.from("This is NOT EPIC!!!").toString("base64");
			try {
				await facade.addDataset("invalid", invalidContent, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
		//ahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh not workie!?!?!
		it("should reject for invalid content empty ZIP file", async function () {
			const emptyZip = await JSZip().generateAsync({ type: "base64" });
			try {
				await facade.addDataset("empty", emptyZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for an invalid dataset kind", async function () {
			try {
				// got assistance from gpt here for syntax; 'rooms' wasn't being accepted, which is what I wanted, and it caused yarn build to fail
				// @ts-ignore
				await facade.addDataset("invalid", sections, "rooms");
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
		it("should reject for invalid content not in /courses folder", async function () {
			//got assistance from gpt here and the test below
			const invalidZipContent = await getContentFromArchives("fail.zip");
			try {
				await facade.addDataset("CPSC10", invalidZipContent, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid content not in /courses folder part2..ig?", async function () {
			const invalidZipContent = await getContentFromArchives("fail_2.zip");
			try {
				await facade.addDataset("CPSC310", invalidZipContent, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid content no closeing brackets", async function () {
			const malformedJSON = Buffer.from('{"result": [{"Subject": "CPSC", "Course": "310", "Avg": 90,').toString(
				"base64"
			);
			try {
				await facade.addDataset("malformed", malformedJSON, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid content no json", async function () {
			const plainText = Buffer.from("This is not JSON").toString("base64");
			try {
				await facade.addDataset("plainText", plainText, InsightDatasetKind.Sections);
				expect.fail("Should have thrown.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject for an empty dataset id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for a dataset id with only spaces", async function () {
			try {
				await facade.removeDataset("   ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for a non-existent dataset id", async function () {
			try {
				await facade.removeDataset("nonExistent");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should successfully remove an existing dataset", async function () {
			await facade.addDataset("validId", sections, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("validId");
			expect(result).to.equal("validId");
		});

		it("should reject when trying to remove the same dataset twice", async function () {
			await facade.addDataset("validId", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("validId");
			try {
				await facade.removeDataset("validId");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});
	});

	describe("ListDataset", function () {
		beforeEach(async function () {
			facade = new InsightFacade();
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("should list no datasets", async function () {
			await clearDisk();
			facade = new InsightFacade();
			const response = await facade.listDatasets();
			expect(response).to.be.an("array");
			expect(response).to.have.length(0);
		});

		it("should list all datasets", async function () {
			const response = await facade.listDatasets();
			expect(response).to.be.an("array");
			expect(response).to.have.length(1);

			const [dataset] = response;

			expect(dataset).to.have.property("id", "sections");
			expect(dataset).to.have.property("kind", InsightDatasetKind.Sections);
			expect(dataset).to.have.property("numRows");
			expect(dataset.numRows).to.be.a("number");
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected }: ITestQuery = await loadTestQuery(this.test.title);

			let result: any[];
			if (!errorExpected) {
				try {
					result = await facade.performQuery(input);
				} catch (err) {
					// Should not have rejected, but it did!
					expect.fail(`Query unexpectedly rejected: ${JSON.stringify(input)}` + err);
				}
				// Compare the query result to the expected result.
				expect(result).to.have.deep.members(expected);
			} else {
				try {
					//got assistance from gpt here
					result = await facade.performQuery(input);
					expect.fail("Query should have rejected, but it resolved instead.");
				} catch (err) {
					if (expected === "InsightError") {
						expect(err).to.be.instanceOf(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(err).to.be.instanceOf(ResultTooLargeError);
					} else if (expected === "NotFoundError") {
						expect(err).to.be.instanceOf(NotFoundError);
					} else {
						expect.fail(`performQuery threw unexpected error: ${err}`);
					}
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.

		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/missing-where.json] Query missing WHERE", checkQuery);
		it("[valid/eq.json] valid test 2", checkQuery);
		it("[valid/gT.json] valid test 3", checkQuery);
		it("[valid/is.json] valid test 4", checkQuery);
		it("[valid/LT.json] valid test 5", checkQuery);
		it("[valid/not.json] valid test 6", checkQuery);
		it("[valid/or.json] valid test 7", checkQuery);
		it("[valid/and_or.json] valid test 1", checkQuery);
		it("[valid/wildcard_valid_3.json] True test 3", checkQuery);
		it("[valid/wildcard_valid_2.json] True test 2", checkQuery);
		it("[valid/wildcard_valid.json] True test 1", checkQuery);

		it("[invalid/broken_NOT.json] Broken NOT", checkQuery);
		it("[invalid/empty.json] Empty query", checkQuery);
		it("[invalid/empty_AND.json] Empty AND", checkQuery);
		it("[invalid/empty_OR.json] Empty OR", checkQuery);
		it("[invalid/invalid-col-nm.json] Invalid column name", checkQuery);
		it("[invalid/invalid_key.json] Invalid key", checkQuery);
		it("[invalid/invalid_val_in_GT.json] Invalid value in GT", checkQuery);
		it("[invalid/multiple_Where.json] multiple_Where", checkQuery);
		it("[invalid/wrong_order.json] wrong order", checkQuery);
		it("[invalid/invalid.json] Query missing", checkQuery);
		it("[invalid/no-object.json] Query invalid", checkQuery);
		it("[invalid/no-columns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/missing-options.json] Query missing OPTIONS", checkQuery);
		it("[invalid/negation-where.json] Missing FILTER in NEGATION", checkQuery);

		it("[invalid/result-too-large.json] Result Too Large (GT 5000)", checkQuery);
		it("[valid/roomTest.json] Complex Room Test", checkQuery);
	});

	describe("MockQuery", function () {
		const HIGH_GRADE_THRESHOLD = 97;
		before(async function () {
			facade = new InsightFacade();
			const mockZip = await getContentFromArchives("test500.zip");
			await facade.addDataset("sections", mockZip, InsightDatasetKind.Sections);
		});

		it("should return correct results for query with correct field names", async function () {
			const query = {
				WHERE: {
					GT: {
						sections_avg: HIGH_GRADE_THRESHOLD,
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			const results = await facade.performQuery(query);
			expect(results).to.be.an("array");
			expect(results.length).to.be.at.least(1);
			results.forEach((result) => {
				expect(result).to.have.property("sections_dept");
				expect(result).to.have.property("sections_avg");
				expect(Number(result.sections_avg)).to.be.above(HIGH_GRADE_THRESHOLD);
			});
			// Check if results are ordered
			for (let i = 1; i < results.length; i++) {
				const prev = Number(results[i - 1].sections_avg);
				const current = Number(results[i].sections_avg);
				expect(current).to.be.at.least(prev);
			}
		});

		it("should handle queries with different fields correctly", async function () {
			const query = {
				WHERE: {
					AND: [{ GT: { sections_avg: HIGH_GRADE_THRESHOLD } }, { IS: { sections_instructor: "*" } }],
				},
				OPTIONS: {
					COLUMNS: ["sections_id", "sections_instructor", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			const results = await facade.performQuery(query);
			expect(results).to.be.an("array");
			expect(results.length).to.be.at.least(1);
			results.forEach((result) => {
				expect(result).to.have.property("sections_id");
				expect(result).to.have.property("sections_instructor");
				expect(result).to.have.property("sections_avg");
				expect(Number(result.sections_avg)).to.be.above(HIGH_GRADE_THRESHOLD);
			});
		});

		it("should handle 'overall' sections with year 1900", async function () {
			const query = {
				WHERE: {
					EQ: { sections_year: 1900 },
				},
				OPTIONS: {
					COLUMNS: ["sections_id", "sections_year", "sections_avg"],
				},
			};
			const KEY = 1900;
			const results = await facade.performQuery(query);
			expect(results).to.be.an("array");
			results.forEach((result) => {
				expect(result).to.have.property("sections_id");
				expect(result).to.have.property("sections_year");
				expect(result).to.have.property("sections_avg");
				expect(result.sections_year).to.equal(KEY);
			});
		});
	});

	describe("Caching", function () {
		//let sections: string;
		before(async function () {
			facade = new InsightFacade();
			sections = await getContentFromArchives("test500.zip");
		});

		it("should persist dataset between InsightFacade instances", async function () {
			facade = new InsightFacade();
			await facade.addDataset("caching1", sections, InsightDatasetKind.Sections);

			// Check if the dataset was added successfully
			const datasetsAfterAdd = await facade.listDatasets();
			expect(datasetsAfterAdd.some((dataset) => dataset.id === "caching1")).to.equal(
				true,
				"Dataset was not added successfully"
			);

			facade = new InsightFacade();
			const datasets = await facade.listDatasets();
			expect(datasets.some((dataset) => dataset.id === "caching1")).to.equal(
				true,
				"Dataset was not persisted between instances"
			);

			// Clean up
			await facade.removeDataset("caching1");
		});

		it("should be able to query dataset added in previous instance", async function () {
			const facadeInstance3 = new InsightFacade();
			await facadeInstance3.addDataset("caching2", sections, InsightDatasetKind.Sections);

			// Check if the dataset was added successfully
			const datasetsAfterAdd = await facadeInstance3.listDatasets();
			expect(datasetsAfterAdd.some((dataset) => dataset.id === "caching2")).to.equal(
				true,
				"Dataset was not added successfully"
			);

			const facadeInstance4 = new InsightFacade();

			const query = {
				WHERE: {
					GT: {
						caching2_avg: 97,
					},
				},
				OPTIONS: {
					COLUMNS: ["caching2_dept", "caching2_avg"],
					ORDER: "caching2_avg",
				},
			};

			try {
				const results = await facadeInstance4.performQuery(query);
				expect(results).to.be.an("array");
				expect(results.length).to.be.at.least(1, "Query returned no results");
			} catch (error) {
				throw new InsightError(`Error ${error instanceof Error ? error.message : String(error)}`);
			}

			// Clean up
			await facadeInstance4.removeDataset("caching2");
		});

		it("should be able to remove dataset added in previous instance", async function () {
			const facadeInstance5 = new InsightFacade();
			await facadeInstance5.addDataset("caching3", sections, InsightDatasetKind.Sections);
			const facadeInstance6 = new InsightFacade();
			const initialDatasets = await facadeInstance6.listDatasets();
			const initialCount = initialDatasets.length;

			try {
				const removedId = await facadeInstance6.removeDataset("caching3");
				expect(removedId).to.equal("caching3", "Removed dataset ID doesn't match");
				const finalDatasets = await facadeInstance6.listDatasets();
				expect(finalDatasets.length).to.equal(initialCount - 1, "Dataset count didn't decrease after removal");
				expect(finalDatasets.some((dataset) => dataset.id === "caching3")).to.equal(
					false,
					"Removed dataset still present"
				);
			} catch (error) {
				throw new InsightError(`Error ${error instanceof Error ? error.message : String(error)}`);
			}
		});

		it("should load datasets lazily", async function () {
			const facadeInstance7 = new InsightFacade();
			await facadeInstance7.addDataset("caching4", sections, InsightDatasetKind.Sections);
			await facadeInstance7.addDataset("caching5", sections, InsightDatasetKind.Sections);
			const facadeInstance8 = new InsightFacade();
			const datasets = await facadeInstance8.listDatasets();
			expect(datasets.some((dataset) => dataset.id === "caching4")).to.equal(true, "caching4 dataset not found");
			expect(datasets.some((dataset) => dataset.id === "caching5")).to.equal(true, "caching5 dataset not found");

			const query = {
				WHERE: {
					GT: {
						caching4_avg: 97,
					},
				},
				OPTIONS: {
					COLUMNS: ["caching4_dept", "caching4_avg"],
					ORDER: "caching4_avg",
				},
			};

			try {
				const results = await facadeInstance8.performQuery(query);
				expect(results).to.be.an("array");
				expect(results.length).to.be.at.least(1, "Query returned no results");
			} catch (error) {
				throw new InsightError(`Error ${error instanceof Error ? error.message : String(error)}`);
			}

			await facadeInstance8.removeDataset("caching4");
			await facadeInstance8.removeDataset("caching5");
		});
	});

	describe("Room Dataset Operations", function () {
		before(async function () {
			rooms = await getContentFromArchives("campus.zip");
			await clearDisk();
		});

		beforeEach(async function () {
			facade = new InsightFacade();

			await clearDisk();
		});

		it("should add a valid room dataset", async function () {
			const result = await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			expect(result).to.deep.equal(["rooms"]);
		});

		/*it("should debug room dataset content", async function() { //no longer needed
			const zip = new JSZip();
			await zip.loadAsync(rooms, {base64: true});

			// Check if index.htm exists
			const indexFile = zip.file("index.htm");
			expect(indexFile).to.exist;

			// Check index.htm content
			if (indexFile) {
				const content = await indexFile.async("string");
				expect(content).to.include("table");
				expect(content).to.include("views-field-title");
			}

			// List all files in the zip
			const files = Object.keys(zip.files);
			console.log("Files in zip:", files);
		}); */

		it("should reject an invalid room dataset", async function () {
			const emptyZip = await JSZip().generateAsync({ type: "base64" });
			try {
				await facade.addDataset("rooms", emptyZip, InsightDatasetKind.Rooms);
				expect.fail("Should have rejected invalid room dataset");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should list room dataset after adding", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const datasets = await facade.listDatasets();
			expect(datasets).to.have.length(1);
			const [dataset] = datasets;
			expect(dataset).to.have.property("id", "rooms");
			expect(dataset).to.have.property("kind", InsightDatasetKind.Rooms);
			expect(dataset).to.have.property("numRows").that.is.greaterThan(0);
		});
		const K = 100;
		it("should perform a simple room query", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const query = {
				WHERE: {
					GT: {
						rooms_seats: 100,
					},
				},
				OPTIONS: {
					COLUMNS: ["rooms_shortname", "rooms_number", "rooms_seats"],
				},
			};

			const results = await facade.performQuery(query);
			expect(results).to.be.an.instanceOf(Array);
			expect(results.length).to.be.greaterThan(0);
			results.forEach((room) => {
				expect(room).to.have.property("rooms_shortname");
				expect(room).to.have.property("rooms_number");
				expect(room).to.have.property("rooms_seats").that.is.greaterThan(K);
			});
		});

		it("should query rooms with furniture type", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const query = {
				WHERE: {
					IS: {
						rooms_furniture: "*Tables*",
					},
				},
				OPTIONS: {
					COLUMNS: ["rooms_shortname", "rooms_furniture"],
				},
			};

			const results = await facade.performQuery(query);
			//console.log(results);
			expect(results).to.be.an.instanceOf(Array);
			expect(results.length).to.be.greaterThan(0);
			results.forEach((room) => {
				expect(room).to.have.property("rooms_shortname");
				expect(room).to.have.property("rooms_furniture").that.includes("Tables");
			});
		});

		it("should reject query with invalid room key", async function () {
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const query = {
				WHERE: {
					GT: {
						rooms_invalid: 100, //some invlid key
					},
				},
				OPTIONS: {
					COLUMNS: ["rooms_shortname"],
				},
			};

			try {
				await facade.performQuery(query);
				expect.fail("Should have rejected invalid room key");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});
});
