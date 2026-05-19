import { zodToJsonSchema } from "zod-to-json-schema";
import { schemas, type ToolName, ToolNames } from "./schemas.js";

export const jsonSchemas: Record<ToolName, object> = Object.fromEntries(
  ToolNames.map(name => [name, zodToJsonSchema(schemas[name], name)])
) as Record<ToolName, object>;
