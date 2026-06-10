import { z } from "zod";
import { schemas, type ToolName, ToolNames } from "./schemas.js";

export const jsonSchemas: Record<ToolName, object> = Object.fromEntries(
  ToolNames.map(name => {
    const { $schema: _omit, ...schema } = z.toJSONSchema(schemas[name]) as Record<string, unknown>;
    return [name, schema];
  })
) as Record<ToolName, object>;
