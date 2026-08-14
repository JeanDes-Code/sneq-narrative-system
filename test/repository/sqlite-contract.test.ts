import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { repositoryContract, DIM } from "./contract.js";

repositoryContract("sqlite", () => new SqliteRepository({ path: ":memory:", embeddingDim: DIM }));
import { ledgerContract } from "./ledger-contract.js";
ledgerContract("sqlite", () => new SqliteRepository({ path: ":memory:", embeddingDim: DIM }));
