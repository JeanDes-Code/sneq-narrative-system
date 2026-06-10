import { jsonSchemas } from "./json-schema.js";
import { toolDescriptions, ToolNames, type ToolName } from "./schemas.js";

/** Tools advertised to LLMs. collapse_attribute is excluded until it is actually
 *  wired (V2 throws) — advertising a tool that always fails trains the model on traps. */
export const ADVERTISED_TOOL_NAMES: readonly ToolName[] =
  ToolNames.filter(n => n !== "sneq__collapse_attribute");

export function anthropicTools(): Array<{ name: string; description: string; input_schema: object }> {
  return ADVERTISED_TOOL_NAMES.map(name => ({
    name,
    description: toolDescriptions[name],
    input_schema: jsonSchemas[name]
  }));
}

export function openAITools(): Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> {
  return ADVERTISED_TOOL_NAMES.map(name => ({
    type: "function" as const,
    function: { name, description: toolDescriptions[name], parameters: jsonSchemas[name] }
  }));
}

export function geminiTools(): Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: object }> }> {
  return [{
    functionDeclarations: ADVERTISED_TOOL_NAMES.map(name => ({
      name,
      description: toolDescriptions[name],
      parameters: jsonSchemas[name]
    }))
  }];
}

export function genericTools(): Array<{ name: ToolName; description: string; inputSchema: object }> {
  return ADVERTISED_TOOL_NAMES.map(name => ({ name, description: toolDescriptions[name], inputSchema: jsonSchemas[name] }));
}
