import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { repositoryContract, DIM } from "./contract.js";

repositoryContract("sqlite", () => new SqliteRepository({ path: ":memory:", embeddingDim: DIM }));
