import { jsonSchemas } from "./json-schema.js";
import { toolDescriptions, ToolNames, type ToolName } from "./schemas.js";

export function anthropicTools(): Array<{ name: string; description: string; input_schema: object }> {
  return ToolNames.map(name => ({
    name,
    description: toolDescriptions[name],
    input_schema: jsonSchemas[name]
  }));
}

export function openAITools(): Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> {
  return ToolNames.map(name => ({
    type: "function" as const,
    function: { name, description: toolDescriptions[name], parameters: jsonSchemas[name] }
  }));
}

export function geminiTools(): Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: object }> }> {
  return [{
    functionDeclarations: ToolNames.map(name => ({
      name,
      description: toolDescriptions[name],
      parameters: jsonSchemas[name]
    }))
  }];
}

export function genericTools(): Array<{ name: ToolName; description: string; inputSchema: object }> {
  return ToolNames.map(name => ({ name, description: toolDescriptions[name], inputSchema: jsonSchemas[name] }));
}
