import { InMemoryRepository } from "../../src/repository/memory/index.js";
import { repositoryContract, DIM } from "./contract.js";

repositoryContract("memory", () => new InMemoryRepository({ embeddingDim: DIM }));
