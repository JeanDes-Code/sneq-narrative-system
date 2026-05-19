**@sneq/engine API**

***

# @sneq/engine API

## Classes

- [CampaignContext](classes/CampaignContext.md)
- [Engine](classes/Engine.md)
- [PreGenerationRegistry](classes/PreGenerationRegistry.md)
- [ProviderHttpError](classes/ProviderHttpError.md)
- [Resolver](classes/Resolver.md)
- [Router](classes/Router.md)
- [RouterExhaustedError](classes/RouterExhaustedError.md)
- [SneqContradictionError](classes/SneqContradictionError.md)
- [SneqProviderError](classes/SneqProviderError.md)
- [SneqValidationError](classes/SneqValidationError.md)
- [UserPromptRegistry](classes/UserPromptRegistry.md)

## Interfaces

- [Alias](interfaces/Alias.md)
- [AreteGCN](interfaces/AreteGCN.md)
- [AskUserArgs](interfaces/AskUserArgs.md)
- [AttributFige](interfaces/AttributFige.md)
- [CampaignMeta](interfaces/CampaignMeta.md)
- [ChatRequest](interfaces/ChatRequest.md)
- [ChatResponse](interfaces/ChatResponse.md)
- [ContexteGeneratif](interfaces/ContexteGeneratif.md)
- [Contrainte](interfaces/Contrainte.md)
- [DefaultDepsOptions](interfaces/DefaultDepsOptions.md)
- [Embedder](interfaces/Embedder.md)
- [EmbeddingRequest](interfaces/EmbeddingRequest.md)
- [EmbeddingResponse](interfaces/EmbeddingResponse.md)
- [EngineConfig](interfaces/EngineConfig.md)
- [Entity](interfaces/Entity.md)
- [EntityWithScore](interfaces/EntityWithScore.md)
- [FactQuery](interfaces/FactQuery.md)
- [Logger](interfaces/Logger.md)
- [MentionInput](interfaces/MentionInput.md)
- [NewCampaignInput](interfaces/NewCampaignInput.md)
- [NoeudGCN](interfaces/NoeudGCN.md)
- [Observation](interfaces/Observation.md)
- [Potentialite](interfaces/Potentialite.md)
- [PredictionEvent](interfaces/PredictionEvent.md)
- [PreGenerationHook](interfaces/PreGenerationHook.md)
- [Provider](interfaces/Provider.md)
- [ProviderChain](interfaces/ProviderChain.md)
- [ProviderRef](interfaces/ProviderRef.md)
- [RegisterFactInput](interfaces/RegisterFactInput.md)
- [ReglePropagation](interfaces/ReglePropagation.md)
- [Repository](interfaces/Repository.md)
- [ResolutionResult](interfaces/ResolutionResult.md)
- [ResolveOptions](interfaces/ResolveOptions.md)
- [ResolverThresholds](interfaces/ResolverThresholds.md)
- [RouterConfig](interfaces/RouterConfig.md)
- [RouterDeps](interfaces/RouterDeps.md)
- [Scene](interfaces/Scene.md)
- [SuggestionResult](interfaces/SuggestionResult.md)
- [Tendance](interfaces/Tendance.md)
- [ToolCallContext](interfaces/ToolCallContext.md)
- [Turn](interfaces/Turn.md)
- [ValidationFailureDetail](interfaces/ValidationFailureDetail.md)
- [VectorSearchOpts](interfaces/VectorSearchOpts.md)

## Type Aliases

- [AliasSource](type-aliases/AliasSource.md)
- [AskUserFn](type-aliases/AskUserFn.md)
- [AttributValue](type-aliases/AttributValue.md)
- [CampaignId](type-aliases/CampaignId.md)
- [CategorieAttribut](type-aliases/CategorieAttribut.md)
- [ContrainteSource](type-aliases/ContrainteSource.md)
- [ContraintId](type-aliases/ContraintId.md)
- [EntityID](type-aliases/EntityID.md)
- [EntityType](type-aliases/EntityType.md)
- [EtatAttribut](type-aliases/EtatAttribut.md)
- [FactId](type-aliases/FactId.md)
- [Fiabilite](type-aliases/Fiabilite.md)
- [ObservationMethod](type-aliases/ObservationMethod.md)
- [ObservationSource](type-aliases/ObservationSource.md)
- [ProviderErrorCode](type-aliases/ProviderErrorCode.md)
- [ProviderKind](type-aliases/ProviderKind.md)
- [RegleContrainte](type-aliases/RegleContrainte.md)
- [SceneId](type-aliases/SceneId.md)
- [Tier](type-aliases/Tier.md)
- [ToolName](type-aliases/ToolName.md)
- [TypeRelation](type-aliases/TypeRelation.md)

## Variables

- [noopLogger](variables/noopLogger.md)
- [noopPreGenerationHook](variables/noopPreGenerationHook.md)
- [SNEQ\_ENGINE\_VERSION](variables/SNEQ_ENGINE_VERSION.md)
- [toolDescriptions](variables/toolDescriptions.md)
- [toolJsonSchemas](variables/toolJsonSchemas.md)
- [ToolNames](variables/ToolNames.md)
- [toolSchemas](variables/toolSchemas.md)

## Functions

- [anthropicTools](functions/anthropicTools.md)
- [asCampaignId](functions/asCampaignId.md)
- [asContraintId](functions/asContraintId.md)
- [asEntityID](functions/asEntityID.md)
- [asFactId](functions/asFactId.md)
- [asSceneId](functions/asSceneId.md)
- [createDefaultDeps](functions/createDefaultDeps.md)
- [defaultRouterConfig](functions/defaultRouterConfig.md)
- [dispatchToolCall](functions/dispatchToolCall.md)
- [geminiTools](functions/geminiTools.md)
- [genericTools](functions/genericTools.md)
- [loadConfigFromFile](functions/loadConfigFromFile.md)
- [openAITools](functions/openAITools.md)


## classes

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / CampaignContext

# Class: CampaignContext

## Implements

- [`ToolCallContext`](../interfaces/ToolCallContext.md)

## Constructors

### Constructor

> **new CampaignContext**(`deps`): `CampaignContext`

#### Parameters

##### deps

`CampaignContextDeps`

#### Returns

`CampaignContext`

## Properties

### id

> `readonly` **id**: [`CampaignId`](../type-aliases/CampaignId.md)

## Methods

### addConstraint()

> **addConstraint**(`input`): `Promise`\<\{ `constraintId`: [`ContraintId`](../type-aliases/ContraintId.md); \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### entityId

[`EntityID`](../type-aliases/EntityID.md)

###### justification

`string`

###### rule

[`RegleContrainte`](../type-aliases/RegleContrainte.md)

#### Returns

`Promise`\<\{ `constraintId`: [`ContraintId`](../type-aliases/ContraintId.md); \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`addConstraint`](../interfaces/ToolCallContext.md#addconstraint)

***

### advanceTurn()

> **advanceTurn**(`summary?`): `Promise`\<\{ `turnNumber`: `number`; \}\>

#### Parameters

##### summary?

`string`

#### Returns

`Promise`\<\{ `turnNumber`: `number`; \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`advanceTurn`](../interfaces/ToolCallContext.md#advanceturn)

***

### collapseAttribute()

> **collapseAttribute**(`_entityId`, `_attributeKey`, `_opts?`): `Promise`\<\{ `propagation`: \{ `entitesImpactees`: [`EntityID`](../type-aliases/EntityID.md)[]; \}; `reasoning`: `string`; `value`: [`AttributValue`](../type-aliases/AttributValue.md); \}\>

#### Parameters

##### \_entityId

[`EntityID`](../type-aliases/EntityID.md)

##### \_attributeKey

`string`

##### \_opts?

###### profondeur?

`"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`

###### registre?

`"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`

#### Returns

`Promise`\<\{ `propagation`: \{ `entitesImpactees`: [`EntityID`](../type-aliases/EntityID.md)[]; \}; `reasoning`: `string`; `value`: [`AttributValue`](../type-aliases/AttributValue.md); \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`collapseAttribute`](../interfaces/ToolCallContext.md#collapseattribute)

***

### currentScene()

> **currentScene**(): `Promise`\<[`Scene`](../interfaces/Scene.md) \| `null`\>

#### Returns

`Promise`\<[`Scene`](../interfaces/Scene.md) \| `null`\>

***

### getEntity()

> **getEntity**(`entityId`): `Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

#### Parameters

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

#### Returns

`Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`getEntity`](../interfaces/ToolCallContext.md#getentity)

***

### getRelevantFacts()

> **getRelevantFacts**(`entityId`, `opts?`): `Promise`\<[`AttributFige`](../interfaces/AttributFige.md)[]\>

#### Parameters

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### opts?

###### attributeKeys?

`string`[]

###### depth?

`number`

#### Returns

`Promise`\<[`AttributFige`](../interfaces/AttributFige.md)[]\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`getRelevantFacts`](../interfaces/ToolCallContext.md#getrelevantfacts)

***

### handleToolCall()

> **handleToolCall**(`name`, `args`): `Promise`\<`unknown`\>

#### Parameters

##### name

`string`

##### args

`unknown`

#### Returns

`Promise`\<`unknown`\>

***

### mentionEntity()

> **mentionEntity**(`input`): `Promise`\<\{ `entityId`: [`EntityID`](../type-aliases/EntityID.md); `isNew`: `boolean`; `resolvedTo?`: [`EntityID`](../type-aliases/EntityID.md); \}\>

#### Parameters

##### input

[`MentionInput`](../interfaces/MentionInput.md)

#### Returns

`Promise`\<\{ `entityId`: [`EntityID`](../type-aliases/EntityID.md); `isNew`: `boolean`; `resolvedTo?`: [`EntityID`](../type-aliases/EntityID.md); \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`mentionEntity`](../interfaces/ToolCallContext.md#mentionentity)

***

### registerFact()

> **registerFact**(`input`): `Promise`\<\{ `contradictions`: [`AttributFige`](../interfaces/AttributFige.md)[]; `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

#### Parameters

##### input

[`RegisterFactInput`](../interfaces/RegisterFactInput.md)

#### Returns

`Promise`\<\{ `contradictions`: [`AttributFige`](../interfaces/AttributFige.md)[]; `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`registerFact`](../interfaces/ToolCallContext.md#registerfact)

***

### registerPreGenerationHook()

> **registerPreGenerationHook**(`hook`): `object`

#### Parameters

##### hook

[`PreGenerationHook`](../interfaces/PreGenerationHook.md)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### registerUserPromptHandler()

> **registerUserPromptHandler**(`fn`): `object`

#### Parameters

##### fn

[`AskUserFn`](../type-aliases/AskUserFn.md)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### resolveEntity()

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](../interfaces/ResolutionResult.md)\>

#### Parameters

##### opts

###### mention

`string`

###### sceneId?

`string`

###### type?

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`ResolutionResult`](../interfaces/ResolutionResult.md)\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`resolveEntity`](../interfaces/ToolCallContext.md#resolveentity)

***

### setScene()

> **setScene**(`input`): `Promise`\<\{ `sceneId`: [`SceneId`](../type-aliases/SceneId.md); `turnNumber`: `number`; \}\>

#### Parameters

##### input

###### description

`string`

###### locationEntityId

[`EntityID`](../type-aliases/EntityID.md)

###### presentEntityIds

[`EntityID`](../type-aliases/EntityID.md)[]

#### Returns

`Promise`\<\{ `sceneId`: [`SceneId`](../type-aliases/SceneId.md); `turnNumber`: `number`; \}\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`setScene`](../interfaces/ToolCallContext.md#setscene)

***

### suggestExisting()

> **suggestExisting**(`mention`, `type`): `Promise`\<[`SuggestionResult`](../interfaces/SuggestionResult.md)\>

#### Parameters

##### mention

`string`

##### type

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`SuggestionResult`](../interfaces/SuggestionResult.md)\>

#### Implementation of

[`ToolCallContext`](../interfaces/ToolCallContext.md).[`suggestExisting`](../interfaces/ToolCallContext.md#suggestexisting)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Engine

# Class: Engine

## Constructors

### Constructor

> **new Engine**(`cfg`): `Engine`

#### Parameters

##### cfg

[`EngineConfig`](../interfaces/EngineConfig.md)

#### Returns

`Engine`

## Properties

### tools

> `readonly` `static` **tools**: `object`

#### anthropic

> `readonly` **anthropic**: `object`[]

#### gemini

> `readonly` **gemini**: `object`[]

#### generic

> `readonly` **generic**: `object`[]

#### jsonSchema

> `readonly` **jsonSchema**: `Record`\<`"sneq__lookup_entity"` \| `"sneq__get_entity"` \| `"sneq__get_relevant_facts"` \| `"sneq__suggest_existing"` \| `"sneq__mention_entity"` \| `"sneq__register_fact"` \| `"sneq__add_constraint"` \| `"sneq__collapse_attribute"` \| `"sneq__set_scene"` \| `"sneq__advance_turn"`, `object`\> = `jsonSchemas`

#### openai

> `readonly` **openai**: `object`[]

#### zod

> `readonly` **zod**: `object` = `zodSchemas`

##### zod.sneq\_\_add\_constraint

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `rule`: `ZodUnknown`; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `entityId`: `string`; `justification`: `string`; `rule?`: `unknown`; \}, \{ `attributeKey`: `string`; `entityId`: `string`; `justification`: `string`; `rule?`: `unknown`; \}\>

##### zod.sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `summary`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `summary?`: `string`; \}, \{ `summary?`: `string`; \}\>

##### zod.sneq\_\_collapse\_attribute

> `readonly` **sneq\_\_collapse\_attribute**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `profondeur`: `ZodOptional`\<`ZodEnum`\<\[`"MINIMAL"`, `"STANDARD"`, `"DETAILLE"`\]\>\>; `registre`: `ZodOptional`\<`ZodEnum`\<\[`"NEUTRE"`, `"DRAMATIQUE"`, `"HUMORISTIQUE"`, `"SOMBRE"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `entityId`: `string`; `profondeur?`: `"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`; `registre?`: `"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`; \}, \{ `attributeKey`: `string`; `entityId`: `string`; `profondeur?`: `"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`; `registre?`: `"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`; \}\>

##### zod.sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `entityId`: `string`; \}, \{ `entityId`: `string`; \}\>

##### zod.sneq\_\_get\_relevant\_facts

> `readonly` **sneq\_\_get\_relevant\_facts**: `ZodObject`\<\{ `attributeKeys`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `depth`: `ZodOptional`\<`ZodNumber`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKeys?`: `string`[]; `depth?`: `number`; `entityId`: `string`; \}, \{ `attributeKeys?`: `string`[]; `depth?`: `number`; `entityId`: `string`; \}\>

##### zod.sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `sceneId`: `ZodOptional`\<`ZodString`\>; `type`: `ZodOptional`\<`ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `mention`: `string`; `sceneId?`: `string`; `type?`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `mention`: `string`; `sceneId?`: `string`; `type?`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>

##### zod.sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `sceneId`: `ZodOptional`\<`ZodString`\>; `type`: `ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `aliases?`: `string`[]; `canonicalName`: `string`; `description`: `string`; `sceneId?`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `aliases?`: `string`[]; `canonicalName`: `string`; `description`: `string`; `sceneId?`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>

##### zod.sneq\_\_register\_fact

> `readonly` **sneq\_\_register\_fact**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\[`"IDENTITE"`, `"PSYCHOLOGIE"`, `"HISTORIQUE"`, `"SOCIAL"`, `"COMPETENCE"`, `"SECRET"`, `"ETAT"`, `"POSSESSION"`\]\>; `entityId`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<`ZodString`\>; `excerpt`: `ZodOptional`\<`ZodString`\>; `fiabilite`: `ZodEnum`\<\[`"CERTAINE"`, `"TEMOIGNAGE"`, `"RUMEUR_CONFIRMEE"`\]\>; `method`: `ZodEnum`\<\[`"DIALOGUE_DIRECT"`, `"DOCUMENT"`, `"OBSERVATION_VISUELLE"`, `"DEDUCTION_CONFIRMEE"`, `"AVEU"`, `"DEMONSTRATION"`\]\>; `sceneId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\[`"GM_NARRATION"`, `"PLAYER_UTTERANCE"`, `"DICE_ROLL"`, `"SYSTEM"`\]\>; `timestamp`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}, \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}\>; `value`: `ZodType`\<`unknown`, `ZodTypeDef`, `unknown`\>; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `category`: `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`; `entityId`: `string`; `observation`: \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}; `value?`: `unknown`; \}, \{ `attributeKey`: `string`; `category`: `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`; `entityId`: `string`; `observation`: \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}; `value?`: `unknown`; \}\>

##### zod.sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `description`: `string`; `locationEntityId`: `string`; `presentEntityIds`: `string`[]; \}, \{ `description`: `string`; `locationEntityId`: `string`; `presentEntityIds`: `string`[]; \}\>

##### zod.sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `mention`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `mention`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>

## Methods

### campaign()

> **campaign**(`id`): [`CampaignContext`](CampaignContext.md)

#### Parameters

##### id

[`CampaignId`](../type-aliases/CampaignId.md)

#### Returns

[`CampaignContext`](CampaignContext.md)

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createCampaign()

> **createCampaign**(`input`): `Promise`\<[`CampaignContext`](CampaignContext.md)\>

#### Parameters

##### input

[`NewCampaignInput`](../interfaces/NewCampaignInput.md)

#### Returns

`Promise`\<[`CampaignContext`](CampaignContext.md)\>

***

### deleteCampaign()

> **deleteCampaign**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

[`CampaignId`](../type-aliases/CampaignId.md)

#### Returns

`Promise`\<`void`\>

***

### listCampaigns()

> **listCampaigns**(): `Promise`\<[`CampaignMeta`](../interfaces/CampaignMeta.md)[]\>

#### Returns

`Promise`\<[`CampaignMeta`](../interfaces/CampaignMeta.md)[]\>

***

### defaultRouterConfig()

> `static` **defaultRouterConfig**(): [`RouterConfig`](../interfaces/RouterConfig.md)

#### Returns

[`RouterConfig`](../interfaces/RouterConfig.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / PreGenerationRegistry

# Class: PreGenerationRegistry

## Constructors

### Constructor

> **new PreGenerationRegistry**(): `PreGenerationRegistry`

#### Returns

`PreGenerationRegistry`

## Methods

### emit()

> **emit**(`e`): `void`

#### Parameters

##### e

[`PredictionEvent`](../interfaces/PredictionEvent.md)

#### Returns

`void`

***

### register()

> **register**(`h`): `object`

#### Parameters

##### h

[`PreGenerationHook`](../interfaces/PreGenerationHook.md)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ProviderHttpError

# Class: ProviderHttpError

## Extends

- `Error`

## Constructors

### Constructor

> **new ProviderHttpError**(`code`, `status`, `message`): `ProviderHttpError`

#### Parameters

##### code

[`ProviderErrorCode`](../type-aliases/ProviderErrorCode.md)

##### status

`number` \| `null`

##### message

`string`

#### Returns

`ProviderHttpError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### code

> **code**: [`ProviderErrorCode`](../type-aliases/ProviderErrorCode.md)

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

***

### status

> **status**: `number` \| `null`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

***

### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Resolver

# Class: Resolver

## Constructors

### Constructor

> **new Resolver**(`deps`): `Resolver`

#### Parameters

##### deps

`ResolverDeps`

#### Returns

`Resolver`

## Methods

### resolveEntity()

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](../interfaces/ResolutionResult.md)\>

#### Parameters

##### opts

[`ResolveOptions`](../interfaces/ResolveOptions.md)

#### Returns

`Promise`\<[`ResolutionResult`](../interfaces/ResolutionResult.md)\>

***

### suggestExisting()

> **suggestExisting**(`opts`): `Promise`\<[`SuggestionResult`](../interfaces/SuggestionResult.md)\>

#### Parameters

##### opts

###### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

###### mention

`string`

###### type

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`SuggestionResult`](../interfaces/SuggestionResult.md)\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Router

# Class: Router

## Constructors

### Constructor

> **new Router**(`cfg`, `deps`): `Router`

#### Parameters

##### cfg

[`RouterConfig`](../interfaces/RouterConfig.md)

##### deps

[`RouterDeps`](../interfaces/RouterDeps.md)

#### Returns

`Router`

## Methods

### chat()

> **chat**(`tier`, `req`): `Promise`\<[`ChatResponse`](../interfaces/ChatResponse.md)\>

#### Parameters

##### tier

[`Tier`](../type-aliases/Tier.md)

##### req

[`ChatRequest`](../interfaces/ChatRequest.md)

#### Returns

`Promise`\<[`ChatResponse`](../interfaces/ChatResponse.md)\>

***

### embed()

> **embed**(`req`): `Promise`\<[`EmbeddingResponse`](../interfaces/EmbeddingResponse.md)\>

#### Parameters

##### req

[`EmbeddingRequest`](../interfaces/EmbeddingRequest.md)

#### Returns

`Promise`\<[`EmbeddingResponse`](../interfaces/EmbeddingResponse.md)\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / RouterExhaustedError

# Class: RouterExhaustedError

## Extends

- `Error`

## Constructors

### Constructor

> **new RouterExhaustedError**(`tier`, `attempts`): `RouterExhaustedError`

#### Parameters

##### tier

[`Tier`](../type-aliases/Tier.md)

##### attempts

`object`[]

#### Returns

`RouterExhaustedError`

#### Overrides

`Error.constructor`

## Properties

### attempts

> **attempts**: `object`[]

#### error

> **error**: `string`

#### model

> **model**: `string`

#### provider

> **provider**: `string`

***

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

***

### tier

> **tier**: [`Tier`](../type-aliases/Tier.md)

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

***

### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SneqContradictionError

# Class: SneqContradictionError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqContradictionError**(`contradictions`): `SneqContradictionError`

#### Parameters

##### contradictions

[`AttributFige`](../interfaces/AttributFige.md)[]

#### Returns

`SneqContradictionError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### contradictions

> `readonly` **contradictions**: [`AttributFige`](../interfaces/AttributFige.md)[]

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

***

### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SneqProviderError

# Class: SneqProviderError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqProviderError**(`tier`, `exhausted`, `message`): `SneqProviderError`

#### Parameters

##### tier

[`Tier`](../type-aliases/Tier.md)

##### exhausted

`boolean`

##### message

`string`

#### Returns

`SneqProviderError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### exhausted

> `readonly` **exhausted**: `boolean`

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

***

### tier

> `readonly` **tier**: [`Tier`](../type-aliases/Tier.md)

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

***

### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SneqValidationError

# Class: SneqValidationError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqValidationError**(`details`): `SneqValidationError`

#### Parameters

##### details

[`ValidationFailureDetail`](../interfaces/ValidationFailureDetail.md)[]

#### Returns

`SneqValidationError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### details

> `readonly` **details**: [`ValidationFailureDetail`](../interfaces/ValidationFailureDetail.md)[]

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

#### Inherited from

`Error.stackTraceLimit`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

##### targetObject

`object`

##### constructorOpt?

`Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

***

### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

#### Parameters

##### err

`Error`

##### stackTraces

`CallSite`[]

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

`Error.prepareStackTrace`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / UserPromptRegistry

# Class: UserPromptRegistry

## Constructors

### Constructor

> **new UserPromptRegistry**(): `UserPromptRegistry`

#### Returns

`UserPromptRegistry`

## Methods

### ask()

> **ask**(`args`): `Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

#### Parameters

##### args

[`AskUserArgs`](../interfaces/AskUserArgs.md)

#### Returns

`Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

***

### hasHandler()

> **hasHandler**(): `boolean`

#### Returns

`boolean`

***

### register()

> **register**(`fn`): `object`

#### Parameters

##### fn

[`AskUserFn`](../type-aliases/AskUserFn.md)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`


## interfaces

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Alias

# Interface: Alias

## Properties

### observedAt

> **observedAt**: `number`

***

### source

> **source**: [`AliasSource`](../type-aliases/AliasSource.md)

***

### text

> **text**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AreteGCN

# Interface: AreteGCN

## Properties

### attributs

> **attributs**: `Record`\<`string`, [`AttributValue`](../type-aliases/AttributValue.md)\>

***

### cible

> **cible**: [`EntityID`](../type-aliases/EntityID.md)

***

### directionnalite

> **directionnalite**: `"UNIDIRECTIONNELLE"` \| `"BIDIRECTIONNELLE"`

***

### etatArete

> **etatArete**: `EtatArete`

***

### forcePropagation

> **forcePropagation**: `number`

***

### key

> **key**: `string`

***

### source

> **source**: [`EntityID`](../type-aliases/EntityID.md)

***

### typeRelation

> **typeRelation**: [`TypeRelation`](../type-aliases/TypeRelation.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AskUserArgs

# Interface: AskUserArgs

## Properties

### candidates

> **candidates**: [`Entity`](Entity.md)[]

***

### mention

> **mention**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AttributFige

# Interface: AttributFige

## Properties

### category

> **category**: [`CategorieAttribut`](../type-aliases/CategorieAttribut.md)

***

### entityId

> **entityId**: [`EntityID`](../type-aliases/EntityID.md)

***

### factId

> **factId**: [`FactId`](../type-aliases/FactId.md)

***

### key

> **key**: `string`

***

### observation

> **observation**: [`Observation`](Observation.md)

***

### turn

> **turn**: `number`

***

### value

> **value**: [`AttributValue`](../type-aliases/AttributValue.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / CampaignMeta

# Interface: CampaignMeta

## Properties

### createdAt

> **createdAt**: `number`

***

### embeddingDim

> **embeddingDim**: `number`

***

### id

> **id**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### name

> **name**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ChatRequest

# Interface: ChatRequest

## Properties

### maxTokens?

> `optional` **maxTokens?**: `number`

***

### messages

> **messages**: `object`[]

#### content

> **content**: `string`

#### role

> **role**: `"user"` \| `"assistant"`

***

### responseFormat?

> `optional` **responseFormat?**: `"text"` \| `"json"`

***

### system?

> `optional` **system?**: `string`

***

### temperature?

> `optional` **temperature?**: `number`

***

### tools?

> `optional` **tools?**: `object`[]

#### description

> **description**: `string`

#### inputSchema

> **inputSchema**: `object`

#### name

> **name**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ChatResponse

# Interface: ChatResponse

## Properties

### modelUsed

> **modelUsed**: `string`

***

### providerUsed

> **providerUsed**: `string`

***

### text

> **text**: `string`

***

### toolCalls

> **toolCalls**: `object`[]

#### arguments

> **arguments**: `unknown`

#### name

> **name**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ContexteGeneratif

# Interface: ContexteGeneratif

## Properties

### categorieAttribut

> **categorieAttribut**: [`CategorieAttribut`](../type-aliases/CategorieAttribut.md)

***

### tendances

> **tendances**: [`Tendance`](Tendance.md)[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Contrainte

# Interface: Contrainte

## Properties

### createdAt

> **createdAt**: `number`

***

### id

> **id**: [`ContraintId`](../type-aliases/ContraintId.md)

***

### justificationNarrative

> **justificationNarrative**: `string`

***

### regle

> **regle**: [`RegleContrainte`](../type-aliases/RegleContrainte.md)

***

### source

> **source**: [`ContrainteSource`](../type-aliases/ContrainteSource.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / DefaultDepsOptions

# Interface: DefaultDepsOptions

## Properties

### customChat?

> `optional` **customChat?**: `CustomChatFn`

***

### customEmbed?

> `optional` **customEmbed?**: `CustomEmbedFn`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Embedder

# Interface: Embedder

## Methods

### embed()

> **embed**(`text`): `Promise`\<`Float32Array`\<`ArrayBufferLike`\>\>

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`Float32Array`\<`ArrayBufferLike`\>\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EmbeddingRequest

# Interface: EmbeddingRequest

## Properties

### texts

> **texts**: `string`[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EmbeddingResponse

# Interface: EmbeddingResponse

## Properties

### dim

> **dim**: `number`

***

### modelUsed

> **modelUsed**: `string`

***

### providerUsed

> **providerUsed**: `string`

***

### vectors

> **vectors**: `Float32Array`\<`ArrayBufferLike`\>[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EngineConfig

# Interface: EngineConfig

## Properties

### logger?

> `optional` **logger?**: [`Logger`](Logger.md)

***

### repository

> **repository**: [`Repository`](Repository.md)

***

### resolver?

> `optional` **resolver?**: `Partial`\<[`ResolverThresholds`](ResolverThresholds.md)\>

***

### router

> **router**: [`RouterConfig`](RouterConfig.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Entity

# Interface: Entity

## Properties

### aliases

> **aliases**: [`Alias`](Alias.md)[]

***

### campaignId

> **campaignId**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### createdAt

> **createdAt**: `number`

***

### embedding

> **embedding**: `Float32Array`\<`ArrayBufferLike`\> \| `null`

***

### embeddingRefreshedAt

> **embeddingRefreshedAt**: `number` \| `null`

***

### id

> **id**: [`EntityID`](../type-aliases/EntityID.md)

***

### name

> **name**: `string`

***

### nomConnu

> **nomConnu**: `boolean`

***

### tags

> **tags**: `string`[]

***

### type

> **type**: [`EntityType`](../type-aliases/EntityType.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EntityWithScore

# Interface: EntityWithScore

## Properties

### entity

> **entity**: [`Entity`](Entity.md)

***

### score

> **score**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / FactQuery

# Interface: FactQuery

## Properties

### attributeKey?

> `optional` **attributeKey?**: `string`

***

### category?

> `optional` **category?**: [`CategorieAttribut`](../type-aliases/CategorieAttribut.md)

***

### entityId?

> `optional` **entityId?**: [`EntityID`](../type-aliases/EntityID.md)

***

### maxTurn?

> `optional` **maxTurn?**: `number`

***

### minTurn?

> `optional` **minTurn?**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Logger

# Interface: Logger

## Methods

### debug()

> **debug**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### error()

> **error**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### info()

> **info**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

***

### warn()

> **warn**(`msg`, `fields?`): `void`

#### Parameters

##### msg

`string`

##### fields?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / MentionInput

# Interface: MentionInput

## Properties

### aliases?

> `optional` **aliases?**: `string`[]

***

### canonicalName

> **canonicalName**: `string`

***

### description

> **description**: `string`

***

### sceneId?

> `optional` **sceneId?**: `string`

***

### type

> **type**: [`EntityType`](../type-aliases/EntityType.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / NewCampaignInput

# Interface: NewCampaignInput

## Properties

### embeddingDim

> **embeddingDim**: `number`

***

### id

> **id**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### name

> **name**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / NoeudGCN

# Interface: NoeudGCN

## Properties

### entityId

> **entityId**: [`EntityID`](../type-aliases/EntityID.md)

***

### etatActuel

> **etatActuel**: `"INCONNU"` \| `"PARTIELLEMENT_CONNU"` \| `"BIEN_CONNU"`

***

### poidsNarratif

> **poidsNarratif**: `number`

***

### tags

> **tags**: `string`[]

***

### type

> **type**: [`EntityType`](../type-aliases/EntityType.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Observation

# Interface: Observation

## Properties

### emittedBy?

> `optional` **emittedBy?**: [`EntityID`](../type-aliases/EntityID.md)

***

### excerpt?

> `optional` **excerpt?**: `string`

***

### fiabilite

> **fiabilite**: [`Fiabilite`](../type-aliases/Fiabilite.md)

***

### method

> **method**: [`ObservationMethod`](../type-aliases/ObservationMethod.md)

***

### sceneId?

> `optional` **sceneId?**: [`SceneId`](../type-aliases/SceneId.md)

***

### source

> **source**: [`ObservationSource`](../type-aliases/ObservationSource.md)

***

### timestamp

> **timestamp**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Potentialite

# Interface: Potentialite

## Properties

### attribut

> **attribut**: `string`

***

### contexteGeneratif

> **contexteGeneratif**: [`ContexteGeneratif`](ContexteGeneratif.md)

***

### contraintes

> **contraintes**: [`Contrainte`](Contrainte.md)[]

***

### entiteId

> **entiteId**: [`EntityID`](../type-aliases/EntityID.md)

***

### etat

> **etat**: `"INDEFINI"` \| `"CONTRAINT"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / PreGenerationHook

# Interface: PreGenerationHook

## Methods

### onEvent()

> **onEvent**(`e`): `void` \| `Promise`\<`void`\>

#### Parameters

##### e

[`PredictionEvent`](PredictionEvent.md)

#### Returns

`void` \| `Promise`\<`void`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / PredictionEvent

# Interface: PredictionEvent

## Properties

### campaignId

> **campaignId**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### hint

> **hint**: `object`

#### attribute?

> `optional` **attribute?**: `string`

#### entityId?

> `optional` **entityId?**: [`EntityID`](../type-aliases/EntityID.md)

***

### triggerKind

> **triggerKind**: `"ENTRY_TO_SCENE"` \| `"DIALOGUE_OPENED"` \| `"TURN_ADVANCED"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Provider

# Interface: Provider

## Properties

### ref

> `readonly` **ref**: [`ProviderRef`](ProviderRef.md)

## Methods

### chat()

> **chat**(`req`, `signal`): `Promise`\<[`ChatResponse`](ChatResponse.md)\>

#### Parameters

##### req

[`ChatRequest`](ChatRequest.md)

##### signal

`AbortSignal`

#### Returns

`Promise`\<[`ChatResponse`](ChatResponse.md)\>

***

### embed()

> **embed**(`req`, `signal`): `Promise`\<[`EmbeddingResponse`](EmbeddingResponse.md)\>

#### Parameters

##### req

[`EmbeddingRequest`](EmbeddingRequest.md)

##### signal

`AbortSignal`

#### Returns

`Promise`\<[`EmbeddingResponse`](EmbeddingResponse.md)\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ProviderChain

# Interface: ProviderChain

## Properties

### fallbacks

> **fallbacks**: [`ProviderRef`](ProviderRef.md)[]

***

### primary

> **primary**: [`ProviderRef`](ProviderRef.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ProviderRef

# Interface: ProviderRef

## Properties

### apiKeyEnv

> **apiKeyEnv**: `string`

***

### baseUrl?

> `optional` **baseUrl?**: `string`

***

### maxTokens?

> `optional` **maxTokens?**: `number`

***

### model

> **model**: `string`

***

### provider

> **provider**: [`ProviderKind`](../type-aliases/ProviderKind.md)

***

### quotaHint?

> `optional` **quotaHint?**: `object`

#### isFreeTier?

> `optional` **isFreeTier?**: `boolean`

#### requestsPerDay?

> `optional` **requestsPerDay?**: `number`

#### requestsPerMinute?

> `optional` **requestsPerMinute?**: `number`

***

### temperature?

> `optional` **temperature?**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / RegisterFactInput

# Interface: RegisterFactInput

## Properties

### attributeKey

> **attributeKey**: `string`

***

### category

> **category**: [`CategorieAttribut`](../type-aliases/CategorieAttribut.md)

***

### entityId

> **entityId**: [`EntityID`](../type-aliases/EntityID.md)

***

### observation

> **observation**: [`Observation`](Observation.md)

***

### value

> **value**: [`AttributValue`](../type-aliases/AttributValue.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ReglePropagation

# Interface: ReglePropagation

## Properties

### actionType

> **actionType**: `ActionTypePropagation`

***

### cibleParams

> **cibleParams**: `Record`\<`string`, `unknown`\>

***

### cibleType

> **cibleType**: `"RELATION_DIRECTE"` \| `"CHEMIN"` \| `"TAG"`

***

### declencheur

> **declencheur**: `DeclencheurPropagation`

***

### id

> **id**: `string`

***

### nom

> **nom**: `string`

***

### priorite

> **priorite**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Repository

# Interface: Repository

## Methods

### appendFact()

> **appendFact**(`f`): `Promise`\<\{ `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

#### Parameters

##### f

[`AttributFige`](AttributFige.md) & `object`

#### Returns

`Promise`\<\{ `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

***

### appendTurn()

> **appendTurn**(`t`): `Promise`\<`void`\>

#### Parameters

##### t

[`Turn`](Turn.md)

#### Returns

`Promise`\<`void`\>

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createCampaign()

> **createCampaign**(`meta`): `Promise`\<`void`\>

#### Parameters

##### meta

[`CampaignMeta`](CampaignMeta.md)

#### Returns

`Promise`\<`void`\>

***

### currentScene()

> **currentScene**(`campaignId`): `Promise`\<[`Scene`](Scene.md) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

#### Returns

`Promise`\<[`Scene`](Scene.md) \| `null`\>

***

### deleteCampaign()

> **deleteCampaign**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

[`CampaignId`](../type-aliases/CampaignId.md)

#### Returns

`Promise`\<`void`\>

***

### findEntitiesByAlias()

> **findEntitiesByAlias**(`campaignId`, `aliasNormalized`, `type?`): `Promise`\<[`Entity`](Entity.md)[]\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### aliasNormalized

`string`

##### type?

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`Entity`](Entity.md)[]\>

***

### getEntity()

> **getEntity**(`campaignId`, `entityId`): `Promise`\<[`Entity`](Entity.md) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

#### Returns

`Promise`\<[`Entity`](Entity.md) \| `null`\>

***

### getFigedAttributes()

> **getFigedAttributes**(`campaignId`, `entityId`): `Promise`\<[`AttributFige`](AttributFige.md)[]\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

#### Returns

`Promise`\<[`AttributFige`](AttributFige.md)[]\>

***

### getPotentialite()

> **getPotentialite**(`campaignId`, `entityId`, `attribut`): `Promise`\<[`Potentialite`](Potentialite.md) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### attribut

`string`

#### Returns

`Promise`\<[`Potentialite`](Potentialite.md) \| `null`\>

***

### latestTurn()

> **latestTurn**(`campaignId`): `Promise`\<[`Turn`](Turn.md) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

#### Returns

`Promise`\<[`Turn`](Turn.md) \| `null`\>

***

### listCampaigns()

> **listCampaigns**(): `Promise`\<[`CampaignMeta`](CampaignMeta.md)[]\>

#### Returns

`Promise`\<[`CampaignMeta`](CampaignMeta.md)[]\>

***

### neighbors()

> **neighbors**(`campaignId`, `entityId`, `depth`): `Promise`\<`object`[]\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### depth

`number`

#### Returns

`Promise`\<`object`[]\>

***

### queryFacts()

> **queryFacts**(`campaignId`, `query`): `Promise`\<[`AttributFige`](AttributFige.md)[]\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### query

[`FactQuery`](FactQuery.md)

#### Returns

`Promise`\<[`AttributFige`](AttributFige.md)[]\>

***

### removePotentialite()

> **removePotentialite**(`campaignId`, `entityId`, `attribut`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### attribut

`string`

#### Returns

`Promise`\<`void`\>

***

### searchEntitiesByVector()

> **searchEntitiesByVector**(`campaignId`, `vec`, `opts`): `Promise`\<[`EntityWithScore`](EntityWithScore.md)[]\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### vec

`Float32Array`

##### opts

[`VectorSearchOpts`](VectorSearchOpts.md)

#### Returns

`Promise`\<[`EntityWithScore`](EntityWithScore.md)[]\>

***

### transaction()

> **transaction**\<`T`\>(`fn`): `Promise`\<`T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

(`tx`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### upsertEdge()

> **upsertEdge**(`campaignId`, `a`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### a

[`AreteGCN`](AreteGCN.md)

#### Returns

`Promise`\<`void`\>

***

### upsertEntity()

> **upsertEntity**(`e`): `Promise`\<`void`\>

#### Parameters

##### e

[`Entity`](Entity.md)

#### Returns

`Promise`\<`void`\>

***

### upsertNode()

> **upsertNode**(`campaignId`, `n`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### n

[`NoeudGCN`](NoeudGCN.md)

#### Returns

`Promise`\<`void`\>

***

### upsertPotentialite()

> **upsertPotentialite**(`campaignId`, `p`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](../type-aliases/CampaignId.md)

##### p

[`Potentialite`](Potentialite.md)

#### Returns

`Promise`\<`void`\>

***

### upsertScene()

> **upsertScene**(`s`): `Promise`\<`void`\>

#### Parameters

##### s

[`Scene`](Scene.md)

#### Returns

`Promise`\<`void`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ResolutionResult

# Interface: ResolutionResult

## Properties

### candidates

> **candidates**: [`Entity`](Entity.md)[]

***

### confidence

> **confidence**: `number`

***

### layerUsed

> **layerUsed**: `"alias"` \| `"vector"` \| `"judge"` \| `"user-prompt"` \| `"none"`

***

### match

> **match**: [`Entity`](Entity.md) \| `null`

***

### reasoning?

> `optional` **reasoning?**: `string`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ResolveOptions

# Interface: ResolveOptions

## Properties

### campaignId

> **campaignId**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### mention

> **mention**: `string`

***

### sceneDescription?

> `optional` **sceneDescription?**: `string`

***

### type?

> `optional` **type?**: [`EntityType`](../type-aliases/EntityType.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ResolverThresholds

# Interface: ResolverThresholds

## Properties

### embeddingRefreshThreshold

> **embeddingRefreshThreshold**: `number`

***

### gapDelta

> **gapDelta**: `number`

***

### tauHigh

> **tauHigh**: `number`

***

### tauLow

> **tauLow**: `number`

***

### topK

> **topK**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / RouterConfig

# Interface: RouterConfig

## Properties

### defaults?

> `optional` **defaults?**: `object`

#### backoff?

> `optional` **backoff?**: `object`

##### backoff.baseMs

> **baseMs**: `number`

##### backoff.strategy

> **strategy**: `"exponential"` \| `"fixed"`

#### maxRetries?

> `optional` **maxRetries?**: `number`

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

***

### tiers

> **tiers**: `Record`\<[`Tier`](../type-aliases/Tier.md), [`ProviderChain`](ProviderChain.md)\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / RouterDeps

# Interface: RouterDeps

## Methods

### resolveProvider()

> **resolveProvider**(`ref`): [`Provider`](Provider.md)

#### Parameters

##### ref

[`ProviderRef`](ProviderRef.md)

#### Returns

[`Provider`](Provider.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Scene

# Interface: Scene

## Properties

### campaignId

> **campaignId**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### createdAtTurn

> **createdAtTurn**: `number`

***

### description

> **description**: `string`

***

### id

> **id**: [`SceneId`](../type-aliases/SceneId.md)

***

### locationId

> **locationId**: [`EntityID`](../type-aliases/EntityID.md)

***

### presentEntityIds

> **presentEntityIds**: [`EntityID`](../type-aliases/EntityID.md)[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SuggestionResult

# Interface: SuggestionResult

## Properties

### candidates

> **candidates**: [`Entity`](Entity.md)[]

***

### recommendsNew

> **recommendsNew**: `boolean`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Tendance

# Interface: Tendance

## Properties

### description

> **description**: `string`

***

### poids

> **poids**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ToolCallContext

# Interface: ToolCallContext

## Methods

### addConstraint()

> **addConstraint**(`input`): `Promise`\<\{ `constraintId`: [`ContraintId`](../type-aliases/ContraintId.md); \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### entityId

[`EntityID`](../type-aliases/EntityID.md)

###### justification

`string`

###### rule

[`RegleContrainte`](../type-aliases/RegleContrainte.md)

#### Returns

`Promise`\<\{ `constraintId`: [`ContraintId`](../type-aliases/ContraintId.md); \}\>

***

### advanceTurn()

> **advanceTurn**(`summary?`): `Promise`\<\{ `turnNumber`: `number`; \}\>

#### Parameters

##### summary?

`string`

#### Returns

`Promise`\<\{ `turnNumber`: `number`; \}\>

***

### collapseAttribute()

> **collapseAttribute**(`entityId`, `attributeKey`, `opts?`): `Promise`\<\{ `propagation`: \{ `entitesImpactees`: [`EntityID`](../type-aliases/EntityID.md)[]; \}; `reasoning`: `string`; `value`: [`AttributValue`](../type-aliases/AttributValue.md); \}\>

#### Parameters

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### attributeKey

`string`

##### opts?

###### profondeur?

`"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`

###### registre?

`"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`

#### Returns

`Promise`\<\{ `propagation`: \{ `entitesImpactees`: [`EntityID`](../type-aliases/EntityID.md)[]; \}; `reasoning`: `string`; `value`: [`AttributValue`](../type-aliases/AttributValue.md); \}\>

***

### getEntity()

> **getEntity**(`entityId`): `Promise`\<[`Entity`](Entity.md) \| `null`\>

#### Parameters

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

#### Returns

`Promise`\<[`Entity`](Entity.md) \| `null`\>

***

### getRelevantFacts()

> **getRelevantFacts**(`entityId`, `opts?`): `Promise`\<[`AttributFige`](AttributFige.md)[]\>

#### Parameters

##### entityId

[`EntityID`](../type-aliases/EntityID.md)

##### opts?

###### attributeKeys?

`string`[]

###### depth?

`number`

#### Returns

`Promise`\<[`AttributFige`](AttributFige.md)[]\>

***

### mentionEntity()

> **mentionEntity**(`input`): `Promise`\<\{ `entityId`: [`EntityID`](../type-aliases/EntityID.md); `isNew`: `boolean`; `resolvedTo?`: [`EntityID`](../type-aliases/EntityID.md); \}\>

#### Parameters

##### input

###### aliases?

`string`[]

###### canonicalName

`string`

###### description

`string`

###### sceneId?

`string`

###### type

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<\{ `entityId`: [`EntityID`](../type-aliases/EntityID.md); `isNew`: `boolean`; `resolvedTo?`: [`EntityID`](../type-aliases/EntityID.md); \}\>

***

### registerFact()

> **registerFact**(`input`): `Promise`\<\{ `contradictions`: [`AttributFige`](AttributFige.md)[]; `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### category

[`CategorieAttribut`](../type-aliases/CategorieAttribut.md)

###### entityId

[`EntityID`](../type-aliases/EntityID.md)

###### observation

[`Observation`](Observation.md)

###### value

[`AttributValue`](../type-aliases/AttributValue.md)

#### Returns

`Promise`\<\{ `contradictions`: [`AttributFige`](AttributFige.md)[]; `factId`: [`FactId`](../type-aliases/FactId.md); \}\>

***

### resolveEntity()

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](ResolutionResult.md)\>

#### Parameters

##### opts

###### mention

`string`

###### sceneId?

`string`

###### type?

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`ResolutionResult`](ResolutionResult.md)\>

***

### setScene()

> **setScene**(`input`): `Promise`\<\{ `sceneId`: [`SceneId`](../type-aliases/SceneId.md); `turnNumber`: `number`; \}\>

#### Parameters

##### input

###### description

`string`

###### locationEntityId

[`EntityID`](../type-aliases/EntityID.md)

###### presentEntityIds

[`EntityID`](../type-aliases/EntityID.md)[]

#### Returns

`Promise`\<\{ `sceneId`: [`SceneId`](../type-aliases/SceneId.md); `turnNumber`: `number`; \}\>

***

### suggestExisting()

> **suggestExisting**(`mention`, `type`): `Promise`\<[`SuggestionResult`](SuggestionResult.md)\>

#### Parameters

##### mention

`string`

##### type

[`EntityType`](../type-aliases/EntityType.md)

#### Returns

`Promise`\<[`SuggestionResult`](SuggestionResult.md)\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Turn

# Interface: Turn

## Properties

### campaignId

> **campaignId**: [`CampaignId`](../type-aliases/CampaignId.md)

***

### createdAt

> **createdAt**: `number`

***

### sceneId

> **sceneId**: [`SceneId`](../type-aliases/SceneId.md) \| `null`

***

### summary

> **summary**: `string` \| `null`

***

### turnNumber

> **turnNumber**: `number`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ValidationFailureDetail

# Interface: ValidationFailureDetail

## Properties

### message

> **message**: `string`

***

### type

> **type**: `"FORMAT"` \| `"CONTRAINTE_STRICTE"` \| `"CONTRADICTION_RC"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / VectorSearchOpts

# Interface: VectorSearchOpts

## Properties

### excludeEntityIds?

> `optional` **excludeEntityIds?**: [`EntityID`](../type-aliases/EntityID.md)[]

***

### filterType?

> `optional` **filterType?**: [`EntityType`](../type-aliases/EntityType.md)

***

### topK

> **topK**: `number`


## type-aliases

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AliasSource

# Type Alias: AliasSource

> **AliasSource** = \{ `kind`: `"PLAYER"`; \} \| \{ `kind`: `"GM_NARRATION"`; \} \| \{ `documentId`: [`EntityID`](EntityID.md); `kind`: `"DOCUMENT"`; \} \| \{ `kind`: `"INFERENCE"`; \}

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AskUserFn

# Type Alias: AskUserFn

> **AskUserFn** = (`args`) => `Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

## Parameters

### args

[`AskUserArgs`](../interfaces/AskUserArgs.md)

## Returns

`Promise`\<[`Entity`](../interfaces/Entity.md) \| `null`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / AttributValue

# Type Alias: AttributValue

> **AttributValue** = \{ `type`: `"STRING"`; `value`: `string`; \} \| \{ `type`: `"NUMBER"`; `value`: `number`; \} \| \{ `type`: `"BOOLEAN"`; `value`: `boolean`; \} \| \{ `id`: [`EntityID`](EntityID.md); `type`: `"ENTITY_REF"`; \} \| \{ `ids`: [`EntityID`](EntityID.md)[]; `type`: `"ENTITY_SET"`; \} \| \{ `enumType`: `string`; `type`: `"ENUM"`; `value`: `string`; \} \| \{ `fields`: `Record`\<`string`, `AttributValue`\>; `type`: `"COMPOSITE"`; \}

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / CampaignId

# Type Alias: CampaignId

> **CampaignId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"CampaignId"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / CategorieAttribut

# Type Alias: CategorieAttribut

> **CategorieAttribut** = `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ContraintId

# Type Alias: ContraintId

> **ContraintId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"ContraintId"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ContrainteSource

# Type Alias: ContrainteSource

> **ContrainteSource** = \{ `factId`: [`FactId`](FactId.md); `kind`: `"FAIT_CANONIQUE"`; \} \| \{ `edgeKey`: `string`; `kind`: `"RELATION"`; \} \| \{ `kind`: `"REGLE_MONDE"`; `ruleId`: `string`; \} \| \{ `confidence`: `number`; `kind`: `"INFERENCE_IA"`; \}

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EntityID

# Type Alias: EntityID

> **EntityID** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"EntityID"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EntityType

# Type Alias: EntityType

> **EntityType** = `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / EtatAttribut

# Type Alias: EtatAttribut

> **EtatAttribut** = `"INDEFINI"` \| `"CONTRAINT"` \| `"FIGE"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / FactId

# Type Alias: FactId

> **FactId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"FactId"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Fiabilite

# Type Alias: Fiabilite

> **Fiabilite** = `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ObservationMethod

# Type Alias: ObservationMethod

> **ObservationMethod** = `"DIALOGUE_DIRECT"` \| `"DOCUMENT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ObservationSource

# Type Alias: ObservationSource

> **ObservationSource** = `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ProviderErrorCode

# Type Alias: ProviderErrorCode

> **ProviderErrorCode** = `"QUOTA"` \| `"AUTH"` \| `"SERVER"` \| `"TIMEOUT"` \| `"MALFORMED"` \| `"NETWORK"` \| `"UNSUPPORTED"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ProviderKind

# Type Alias: ProviderKind

> **ProviderKind** = `"openai-compatible"` \| `"anthropic"` \| `"google-genai"` \| `"custom"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / RegleContrainte

# Type Alias: RegleContrainte

> **RegleContrainte** = \{ `type`: `"DOIT_ETRE"`; `valeurs`: [`AttributValue`](AttributValue.md)[]; \} \| \{ `type`: `"NE_PEUT_PAS_ETRE"`; `valeurs`: [`AttributValue`](AttributValue.md)[]; \} \| \{ `condition`: `string`; `consequence`: `string`; `type`: `"IMPLIQUE"`; \} \| \{ `autreAttribut`: `string`; `autreEntite`: [`EntityID`](EntityID.md); `type`: `"CORRELE_AVEC"`; \} \| \{ `max?`: `number`; `min?`: `number`; `type`: `"RANGE_NUMERIQUE"`; \} \| \{ `pattern`: `string`; `type`: `"REGEX"`; \}

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SceneId

# Type Alias: SceneId

> **SceneId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"SceneId"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / Tier

# Type Alias: Tier

> **Tier** = `"heavy"` \| `"light"` \| `"embeddings"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ToolName

# Type Alias: ToolName

> **ToolName** = *typeof* [`ToolNames`](../variables/ToolNames.md)\[`number`\]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / TypeRelation

# Type Alias: TypeRelation

> **TypeRelation** = \{ `categorie`: `"SOCIAL"`; `sousType`: `RelationSociale`; \} \| \{ `categorie`: `"CAUSAL"`; `sousType`: `RelationCausale`; \} \| \{ `categorie`: `"SPATIAL"`; `sousType`: `RelationSpatiale`; \} \| \{ `categorie`: `"TEMPOREL"`; `sousType`: `RelationTemporelle`; \} \| \{ `categorie`: `"CONCEPTUEL"`; `sousType`: `RelationConceptuelle`; \}


## functions

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / anthropicTools

# Function: anthropicTools()

> **anthropicTools**(): `object`[]

## Returns

`object`[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / asCampaignId

# Function: asCampaignId()

> **asCampaignId**(`s`): [`CampaignId`](../type-aliases/CampaignId.md)

## Parameters

### s

`string`

## Returns

[`CampaignId`](../type-aliases/CampaignId.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / asContraintId

# Function: asContraintId()

> **asContraintId**(`s`): [`ContraintId`](../type-aliases/ContraintId.md)

## Parameters

### s

`string`

## Returns

[`ContraintId`](../type-aliases/ContraintId.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / asEntityID

# Function: asEntityID()

> **asEntityID**(`s`): [`EntityID`](../type-aliases/EntityID.md)

## Parameters

### s

`string`

## Returns

[`EntityID`](../type-aliases/EntityID.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / asFactId

# Function: asFactId()

> **asFactId**(`s`): [`FactId`](../type-aliases/FactId.md)

## Parameters

### s

`string`

## Returns

[`FactId`](../type-aliases/FactId.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / asSceneId

# Function: asSceneId()

> **asSceneId**(`s`): [`SceneId`](../type-aliases/SceneId.md)

## Parameters

### s

`string`

## Returns

[`SceneId`](../type-aliases/SceneId.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / createDefaultDeps

# Function: createDefaultDeps()

> **createDefaultDeps**(`opts?`): [`RouterDeps`](../interfaces/RouterDeps.md)

## Parameters

### opts?

[`DefaultDepsOptions`](../interfaces/DefaultDepsOptions.md) = `{}`

## Returns

[`RouterDeps`](../interfaces/RouterDeps.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / defaultRouterConfig

# Function: defaultRouterConfig()

> **defaultRouterConfig**(): [`RouterConfig`](../interfaces/RouterConfig.md)

## Returns

[`RouterConfig`](../interfaces/RouterConfig.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / dispatchToolCall

# Function: dispatchToolCall()

> **dispatchToolCall**(`name`, `rawArgs`, `ctx`): `Promise`\<`unknown`\>

## Parameters

### name

`string`

### rawArgs

`unknown`

### ctx

[`ToolCallContext`](../interfaces/ToolCallContext.md)

## Returns

`Promise`\<`unknown`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / geminiTools

# Function: geminiTools()

> **geminiTools**(): `object`[]

## Returns

`object`[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / genericTools

# Function: genericTools()

> **genericTools**(): `object`[]

## Returns

`object`[]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / loadConfigFromFile

# Function: loadConfigFromFile()

> **loadConfigFromFile**(`path`): `object`

## Parameters

### path

`string`

## Returns

`object`

### resolver?

> `optional` **resolver?**: `Partial`\<[`ResolverThresholds`](../interfaces/ResolverThresholds.md)\>

### router

> **router**: [`RouterConfig`](../interfaces/RouterConfig.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / openAITools

# Function: openAITools()

> **openAITools**(): `object`[]

## Returns

`object`[]


## variables

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / SNEQ\_ENGINE\_VERSION

# Variable: SNEQ\_ENGINE\_VERSION

> `const` **SNEQ\_ENGINE\_VERSION**: `"0.0.0"` = `"0.0.0"`

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / ToolNames

# Variable: ToolNames

> `const` **ToolNames**: readonly \[`"sneq__lookup_entity"`, `"sneq__get_entity"`, `"sneq__get_relevant_facts"`, `"sneq__suggest_existing"`, `"sneq__mention_entity"`, `"sneq__register_fact"`, `"sneq__add_constraint"`, `"sneq__collapse_attribute"`, `"sneq__set_scene"`, `"sneq__advance_turn"`\]

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / noopLogger

# Variable: noopLogger

> `const` **noopLogger**: [`Logger`](../interfaces/Logger.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / noopPreGenerationHook

# Variable: noopPreGenerationHook

> `const` **noopPreGenerationHook**: [`PreGenerationHook`](../interfaces/PreGenerationHook.md)

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / toolDescriptions

# Variable: toolDescriptions

> `const` **toolDescriptions**: `Record`\<[`ToolName`](../type-aliases/ToolName.md), `string`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / toolJsonSchemas

# Variable: toolJsonSchemas

> `const` **toolJsonSchemas**: `Record`\<[`ToolName`](../type-aliases/ToolName.md), `object`\>

[**@sneq/engine API**](../README.md)

***

[@sneq/engine API](../README.md) / toolSchemas

# Variable: toolSchemas

> `const` **toolSchemas**: `object`

## Type Declaration

### sneq\_\_add\_constraint

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `rule`: `ZodUnknown`; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `entityId`: `string`; `justification`: `string`; `rule?`: `unknown`; \}, \{ `attributeKey`: `string`; `entityId`: `string`; `justification`: `string`; `rule?`: `unknown`; \}\>

### sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `summary`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `summary?`: `string`; \}, \{ `summary?`: `string`; \}\>

### sneq\_\_collapse\_attribute

> `readonly` **sneq\_\_collapse\_attribute**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `profondeur`: `ZodOptional`\<`ZodEnum`\<\[`"MINIMAL"`, `"STANDARD"`, `"DETAILLE"`\]\>\>; `registre`: `ZodOptional`\<`ZodEnum`\<\[`"NEUTRE"`, `"DRAMATIQUE"`, `"HUMORISTIQUE"`, `"SOMBRE"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `entityId`: `string`; `profondeur?`: `"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`; `registre?`: `"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`; \}, \{ `attributeKey`: `string`; `entityId`: `string`; `profondeur?`: `"MINIMAL"` \| `"STANDARD"` \| `"DETAILLE"`; `registre?`: `"NEUTRE"` \| `"DRAMATIQUE"` \| `"HUMORISTIQUE"` \| `"SOMBRE"`; \}\>

### sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `entityId`: `string`; \}, \{ `entityId`: `string`; \}\>

### sneq\_\_get\_relevant\_facts

> `readonly` **sneq\_\_get\_relevant\_facts**: `ZodObject`\<\{ `attributeKeys`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `depth`: `ZodOptional`\<`ZodNumber`\>; `entityId`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKeys?`: `string`[]; `depth?`: `number`; `entityId`: `string`; \}, \{ `attributeKeys?`: `string`[]; `depth?`: `number`; `entityId`: `string`; \}\>

### sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `sceneId`: `ZodOptional`\<`ZodString`\>; `type`: `ZodOptional`\<`ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `mention`: `string`; `sceneId?`: `string`; `type?`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `mention`: `string`; `sceneId?`: `string`; `type?`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>

### sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `sceneId`: `ZodOptional`\<`ZodString`\>; `type`: `ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `aliases?`: `string`[]; `canonicalName`: `string`; `description`: `string`; `sceneId?`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `aliases?`: `string`[]; `canonicalName`: `string`; `description`: `string`; `sceneId?`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>

### sneq\_\_register\_fact

> `readonly` **sneq\_\_register\_fact**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\[`"IDENTITE"`, `"PSYCHOLOGIE"`, `"HISTORIQUE"`, `"SOCIAL"`, `"COMPETENCE"`, `"SECRET"`, `"ETAT"`, `"POSSESSION"`\]\>; `entityId`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<`ZodString`\>; `excerpt`: `ZodOptional`\<`ZodString`\>; `fiabilite`: `ZodEnum`\<\[`"CERTAINE"`, `"TEMOIGNAGE"`, `"RUMEUR_CONFIRMEE"`\]\>; `method`: `ZodEnum`\<\[`"DIALOGUE_DIRECT"`, `"DOCUMENT"`, `"OBSERVATION_VISUELLE"`, `"DEDUCTION_CONFIRMEE"`, `"AVEU"`, `"DEMONSTRATION"`\]\>; `sceneId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\[`"GM_NARRATION"`, `"PLAYER_UTTERANCE"`, `"DICE_ROLL"`, `"SYSTEM"`\]\>; `timestamp`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}, \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}\>; `value`: `ZodType`\<`unknown`, `ZodTypeDef`, `unknown`\>; \}, `"strip"`, `ZodTypeAny`, \{ `attributeKey`: `string`; `category`: `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`; `entityId`: `string`; `observation`: \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}; `value?`: `unknown`; \}, \{ `attributeKey`: `string`; `category`: `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`; `entityId`: `string`; `observation`: \{ `emittedBy?`: `string`; `excerpt?`: `string`; `fiabilite`: `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`; `method`: `"DOCUMENT"` \| `"DIALOGUE_DIRECT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`; `sceneId?`: `string`; `source`: `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`; `timestamp`: `number`; \}; `value?`: `unknown`; \}\>

### sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`, `"many"`\>; \}, `"strip"`, `ZodTypeAny`, \{ `description`: `string`; `locationEntityId`: `string`; `presentEntityIds`: `string`[]; \}, \{ `description`: `string`; `locationEntityId`: `string`; `presentEntityIds`: `string`[]; \}\>

### sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\[`"PERSONNAGE"`, `"LIEU"`, `"OBJET"`, `"FACTION"`, `"EVENEMENT"`, `"RELATION"`, `"SCENE"`, `"WORLD"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `mention`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}, \{ `mention`: `string`; `type`: `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`; \}\>
