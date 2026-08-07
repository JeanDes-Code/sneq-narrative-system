**sneq-engine API**

***

# sneq-engine API

## Classes

- [CampaignContext](#class-campaigncontext)
- [Engine](#class-engine)
- [NarrationGateRegistry](#class-narrationgateregistry)
- [PreGenerationRegistry](#class-pregenerationregistry)
- [ProviderHttpError](#class-providerhttperror)
- [Resolver](#class-resolver)
- [Router](#class-router)
- [RouterExhaustedError](#class-routerexhaustederror)
- [SneqCampaignContextInvalidatedError](#class-sneqcampaigncontextinvalidatederror)
- [SneqCampaignNotFoundError](#class-sneqcampaignnotfounderror)
- [SneqConcurrentEntityCreationError](#class-sneqconcurrententitycreationerror)
- [SneqContradictionError](#class-sneqcontradictionerror)
- [SneqProviderError](#class-sneqprovidererror)
- [SneqUnknownEntityError](#class-snequnknownentityerror)
- [SneqValidationError](#class-sneqvalidationerror)
- [UserPromptRegistry](#class-userpromptregistry)
- [Validator](#class-validator)

## Interfaces

- [AddConstraintCommand](#interface-addconstraintcommand)
- [AddConstraintDecision](#interface-addconstraintdecision)
- [AddConstraintDecisionInput](#interface-addconstraintdecisioninput)
- [AddConstraintResult](#interface-addconstraintresult)
- [AdvanceTurnCommand](#interface-advanceturncommand)
- [AdvanceTurnDecision](#interface-advanceturndecision)
- [AdvanceTurnDecisionInput](#interface-advanceturndecisioninput)
- [AdvanceTurnResult](#interface-advanceturnresult)
- [Alias](#interface-alias)
- [AreteGCN](#interface-aretegcn)
- [AskUserArgs](#interface-askuserargs)
- [AtomicCommand](#interface-atomiccommand)
- [AtomicWriteStrategy](#interface-atomicwritestrategy)
- [AttributFige](#interface-attributfige)
- [Avertissement](#interface-avertissement)
- [CampaignMeta](#interface-campaignmeta)
- [ChatRequest](#interface-chatrequest)
- [ChatResponse](#interface-chatresponse)
- [ConfirmEntityMatchCommand](#interface-confirmentitymatchcommand)
- [ConfirmEntityMatchDecision](#interface-confirmentitymatchdecision)
- [ConfirmEntityMatchDecisionInput](#interface-confirmentitymatchdecisioninput)
- [ConfirmEntityMatchInput](#interface-confirmentitymatchinput)
- [ConfirmEntityMatchResult](#interface-confirmentitymatchresult)
- [ContexteGeneratif](#interface-contextegeneratif)
- [Contrainte](#interface-contrainte)
- [ContraintePropagee](#interface-contraintepropagee)
- [CreateEntityCommand](#interface-createentitycommand)
- [CreateEntityDecision](#interface-createentitydecision)
- [CreateEntityDecisionInput](#interface-createentitydecisioninput)
- [DefaultDepsOptions](#interface-defaultdepsoptions)
- [Embedder](#interface-embedder)
- [EmbeddingRequest](#interface-embeddingrequest)
- [EmbeddingResponse](#interface-embeddingresponse)
- [EngineConfig](#interface-engineconfig)
- [Entity](#interface-entity)
- [EntityCandidateSummary](#interface-entitycandidatesummary)
- [EntityWithScore](#interface-entitywithscore)
- [FactQuery](#interface-factquery)
- [Logger](#interface-logger)
- [MentionInput](#interface-mentioninput)
- [NarrationGateContext](#interface-narrationgatecontext)
- [NarrationGateHook](#interface-narrationgatehook)
- [NarrationGateInput](#interface-narrationgateinput)
- [NarrationIssue](#interface-narrationissue)
- [NewCampaignInput](#interface-newcampaigninput)
- [NoeudGCN](#interface-noeudgcn)
- [Observation](#interface-observation)
- [Potentialite](#interface-potentialite)
- [PredictionEvent](#interface-predictionevent)
- [PreGenerationHook](#interface-pregenerationhook)
- [PropagationInput](#interface-propagationinput)
- [PropagationResult](#interface-propagationresult)
- [Provider](#interface-provider)
- [ProviderChain](#interface-providerchain)
- [ProviderRef](#interface-providerref)
- [ProviderUsage](#interface-providerusage)
- [RegisterFactCommand](#interface-registerfactcommand)
- [RegisterFactDecision](#interface-registerfactdecision)
- [RegisterFactDecisionInput](#interface-registerfactdecisioninput)
- [RegisterFactInput](#interface-registerfactinput)
- [RegisterFactResult](#interface-registerfactresult)
- [ReglePropagation](#interface-reglepropagation)
- [Repository](#interface-repository)
- [ResolutionResult](#interface-resolutionresult)
- [ResolvedCandidate](#interface-resolvedcandidate)
- [ResolveOptions](#interface-resolveoptions)
- [ResolverThresholds](#interface-resolverthresholds)
- [RouterConfig](#interface-routerconfig)
- [RouterDeps](#interface-routerdeps)
- [RouterTiers](#interface-routertiers)
- [Scene](#interface-scene)
- [SetSceneCommand](#interface-setscenecommand)
- [SetSceneDecision](#interface-setscenedecision)
- [SetSceneDecisionInput](#interface-setscenedecisioninput)
- [SetSceneResult](#interface-setsceneresult)
- [SuggestionResult](#interface-suggestionresult)
- [Tendance](#interface-tendance)
- [ToolCallContext](#interface-toolcallcontext)
- [Turn](#interface-turn)
- [ValidationContext](#interface-validationcontext)
- [ValidationFailure](#interface-validationfailure)
- [ValidationFailureDetail](#interface-validationfailuredetail)
- [ValidationReport](#interface-validationreport)
- [ValidationResult](#interface-validationresult)
- [ValidatorOptions](#interface-validatoroptions)
- [VectorSearchOpts](#interface-vectorsearchopts)

## Type Aliases

- [AliasSource](#type-alias-aliassource)
- [AskUserFn](#type-alias-askuserfn)
- [AttributValue](#type-alias-attributvalue)
- [CampaignContextInvalidationReason](#type-alias-campaigncontextinvalidationreason)
- [CampaignId](#type-alias-campaignid)
- [CategorieAttribut](#type-alias-categorieattribut)
- [ConstraintId](#type-alias-constraintid)
- [ContrainteSource](#type-alias-contraintesource)
- [CreateEntityResult](#type-alias-createentityresult)
- [EntityID](#type-alias-entityid)
- [EntityType](#type-alias-entitytype)
- [EtatAttribut](#type-alias-etatattribut)
- [FactId](#type-alias-factid)
- [Fiabilite](#type-alias-fiabilite)
- [MentionResult](#type-alias-mentionresult)
- [ObservationMethod](#type-alias-observationmethod)
- [ObservationSource](#type-alias-observationsource)
- [ProviderErrorCode](#type-alias-providererrorcode)
- [ProviderKind](#type-alias-providerkind)
- [RegleContrainte](#type-alias-reglecontrainte)
- [RepositoryAccess](#type-alias-repositoryaccess)
- [SceneId](#type-alias-sceneid)
- [Tier](#type-alias-tier)
- [ToolName](#type-alias-toolname)
- [TypeRelation](#type-alias-typerelation)

## Variables

- [ADVERTISED\_TOOL\_NAMES](#variable-advertised_tool_names)
- [defaultNarrationGateHook](#variable-defaultnarrationgatehook)
- [noopLogger](#variable-nooplogger)
- [noopPreGenerationHook](#variable-nooppregenerationhook)
- [SNEQ\_ENGINE\_VERSION](#variable-sneq_engine_version)
- [toolDescriptions](#variable-tooldescriptions)
- [toolJsonSchemas](#variable-tooljsonschemas)
- [ToolNames](#variable-toolnames)
- [toolSchemas](#variable-toolschemas)

## Functions

- [anthropicTools](#function-anthropictools)
- [asCampaignId](#function-ascampaignid)
- [asConstraintId](#function-asconstraintid)
- [asEntityID](#function-asentityid)
- [asFactId](#function-asfactid)
- [asSceneId](#function-assceneid)
- [createDefaultDeps](#function-createdefaultdeps)
- [decideAddConstraint](#function-decideaddconstraint)
- [decideAdvanceTurn](#function-decideadvanceturn)
- [decideConfirmEntityMatch](#function-decideconfirmentitymatch)
- [decideCreateEntity](#function-decidecreateentity)
- [decideRegisterFact](#function-decideregisterfact)
- [decideSetScene](#function-decidesetscene)
- [defaultRouterConfig](#function-defaultrouterconfig)
- [dispatchToolCall](#function-dispatchtoolcall)
- [geminiTools](#function-geminitools)
- [genericTools](#function-generictools)
- [loadConfigFromFile](#function-loadconfigfromfile)
- [openAITools](#function-openaitools)
- [propagate](#function-propagate)
- [validateValue](#function-validatevalue)


## classes

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CampaignContext

# Class: CampaignContext

## Implements

- [`ToolCallContext`](#interface-toolcallcontext)

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

> `readonly` **id**: [`CampaignId`](#type-alias-campaignid)

## Methods

### addConstraint()

> **addConstraint**(`input`): `Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### entityId

[`EntityID`](#type-alias-entityid)

###### justification

`string`

###### rule

[`RegleContrainte`](#type-alias-reglecontrainte)

#### Returns

`Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`addConstraint`](#interface-toolcallcontext)

***

### advanceTurn()

> **advanceTurn**(`summary?`): `Promise`\<\{ `turnNumber`: `number`; \}\>

#### Parameters

##### summary?

`string`

#### Returns

`Promise`\<\{ `turnNumber`: `number`; \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`advanceTurn`](#interface-toolcallcontext)

***

### confirmEntityMatch()

> **confirmEntityMatch**(`input`): `Promise`\<\{ `aliasAdded`: `boolean`; `entityId`: [`EntityID`](#type-alias-entityid); \}\>

#### Parameters

##### input

[`ConfirmEntityMatchInput`](#interface-confirmentitymatchinput)

#### Returns

`Promise`\<\{ `aliasAdded`: `boolean`; `entityId`: [`EntityID`](#type-alias-entityid); \}\>

***

### currentScene()

> **currentScene**(): `Promise`\<[`Scene`](#interface-scene) \| `null`\>

#### Returns

`Promise`\<[`Scene`](#interface-scene) \| `null`\>

***

### getEntity()

> **getEntity**(`entityId`): `Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Parameters

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`getEntity`](#interface-toolcallcontext)

***

### getRelevantFacts()

> **getRelevantFacts**(`entityId`, `opts?`): `Promise`\<[`AttributFige`](#interface-attributfige)[]\>

#### Parameters

##### entityId

[`EntityID`](#type-alias-entityid)

##### opts?

###### attributeKeys?

`string`[]

###### depth?

`0` \| `1`

#### Returns

`Promise`\<[`AttributFige`](#interface-attributfige)[]\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`getRelevantFacts`](#interface-toolcallcontext)

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

> **mentionEntity**(`input`): `Promise`\<[`MentionResult`](#type-alias-mentionresult)\>

#### Parameters

##### input

[`MentionInput`](#interface-mentioninput)

#### Returns

`Promise`\<[`MentionResult`](#type-alias-mentionresult)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`mentionEntity`](#interface-toolcallcontext)

***

### prepareTurn()

> **prepareTurn**(): `Promise`\<\{ `presentEntities`: `object`[]; `scene`: [`Scene`](#interface-scene) \| `null`; \}\>

#### Returns

`Promise`\<\{ `presentEntities`: `object`[]; `scene`: [`Scene`](#interface-scene) \| `null`; \}\>

***

### registerFact()

> **registerFact**(`input`): `Promise`\<\{ `contradictions`: [`AttributFige`](#interface-attributfige)[]; `factId`: [`FactId`](#type-alias-factid) \| `null`; \}\>

#### Parameters

##### input

[`RegisterFactInput`](#interface-registerfactinput)

#### Returns

`Promise`\<\{ `contradictions`: [`AttributFige`](#interface-attributfige)[]; `factId`: [`FactId`](#type-alias-factid) \| `null`; \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`registerFact`](#interface-toolcallcontext)

***

### registerNarrationGate()

> **registerNarrationGate**(`hook`): `object`

#### Parameters

##### hook

[`NarrationGateHook`](#interface-narrationgatehook)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### registerPreGenerationHook()

> **registerPreGenerationHook**(`hook`): `object`

#### Parameters

##### hook

[`PreGenerationHook`](#interface-pregenerationhook)

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

[`AskUserFn`](#type-alias-askuserfn)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### resolveEntity()

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

#### Parameters

##### opts

###### mention

`string`

###### type?

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`resolveEntity`](#interface-toolcallcontext)

***

### setScene()

> **setScene**(`input`): `Promise`\<\{ `sceneId`: [`SceneId`](#type-alias-sceneid); `turnNumber`: `number`; \}\>

#### Parameters

##### input

###### description

`string`

###### locationEntityId

[`EntityID`](#type-alias-entityid)

###### presentEntityIds

[`EntityID`](#type-alias-entityid)[]

#### Returns

`Promise`\<\{ `sceneId`: [`SceneId`](#type-alias-sceneid); `turnNumber`: `number`; \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`setScene`](#interface-toolcallcontext)

***

### suggestExisting()

> **suggestExisting**(`mention`, `type`): `Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

#### Parameters

##### mention

`string`

##### type

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`suggestExisting`](#interface-toolcallcontext)

***

### validateNarration()

> **validateNarration**(`input`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

#### Parameters

##### input

[`NarrationGateInput`](#interface-narrationgateinput)

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`validateNarration`](#interface-toolcallcontext)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Engine

# Class: Engine

## Constructors

### Constructor

> **new Engine**(`cfg`): `Engine`

#### Parameters

##### cfg

[`EngineConfig`](#interface-engineconfig)

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

> `readonly` **jsonSchema**: `Record`\<`"sneq__lookup_entity"` \| `"sneq__get_entity"` \| `"sneq__get_relevant_facts"` \| `"sneq__suggest_existing"` \| `"sneq__mention_entity"` \| `"sneq__register_fact"` \| `"sneq__add_constraint"` \| `"sneq__set_scene"` \| `"sneq__advance_turn"` \| `"sneq__validate_narration"`, `object`\> = `jsonSchemas`

#### openai

> `readonly` **openai**: `object`[]

#### zod

> `readonly` **zod**: `object` = `zodSchemas`

##### zod.sneq\_\_add\_constraint

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `rule`: `ZodUnknown`; \}, `$strip`\>

##### zod.sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `summary`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

##### zod.sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `$strip`\>

##### zod.sneq\_\_get\_relevant\_facts

> `readonly` **sneq\_\_get\_relevant\_facts**: `ZodObject`\<\{ `attributeKeys`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `depth`: `ZodOptional`\<`ZodUnion`\<readonly \[`ZodLiteral`\<`0`\>, `ZodLiteral`\<`1`\>\]\>\>; `entityId`: `ZodString`; \}, `$strip`\>

##### zod.sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

##### zod.sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `force`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

##### zod.sneq\_\_register\_fact

> `readonly` **sneq\_\_register\_fact**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `entityId`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<`ZodString`\>; `excerpt`: `ZodOptional`\<`ZodString`\>; `fiabilite`: `ZodEnum`\<\{ `CERTAINE`: `"CERTAINE"`; `RUMEUR_CONFIRMEE`: `"RUMEUR_CONFIRMEE"`; `TEMOIGNAGE`: `"TEMOIGNAGE"`; \}\>; `method`: `ZodEnum`\<\{ `AVEU`: `"AVEU"`; `DEDUCTION_CONFIRMEE`: `"DEDUCTION_CONFIRMEE"`; `DEMONSTRATION`: `"DEMONSTRATION"`; `DIALOGUE_DIRECT`: `"DIALOGUE_DIRECT"`; `DOCUMENT`: `"DOCUMENT"`; `OBSERVATION_VISUELLE`: `"OBSERVATION_VISUELLE"`; \}\>; `sceneId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\{ `DICE_ROLL`: `"DICE_ROLL"`; `GM_NARRATION`: `"GM_NARRATION"`; `PLAYER_UTTERANCE`: `"PLAYER_UTTERANCE"`; `SYSTEM`: `"SYSTEM"`; \}\>; `timestamp`: `ZodNumber`; \}, `$strip`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>

##### zod.sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>

##### zod.sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

##### zod.sneq\_\_validate\_narration

> `readonly` **sneq\_\_validate\_narration**: `ZodObject`\<\{ `narration`: `ZodString`; `strict`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

## Methods

### campaign()

> **campaign**(`id`): [`CampaignContext`](#class-campaigncontext)

#### Parameters

##### id

[`CampaignId`](#type-alias-campaignid)

#### Returns

[`CampaignContext`](#class-campaigncontext)

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createCampaign()

> **createCampaign**(`input`): `Promise`\<[`CampaignContext`](#class-campaigncontext)\>

#### Parameters

##### input

[`NewCampaignInput`](#interface-newcampaigninput)

#### Returns

`Promise`\<[`CampaignContext`](#class-campaigncontext)\>

***

### deleteCampaign()

> **deleteCampaign**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<`void`\>

***

### listCampaigns()

> **listCampaigns**(): `Promise`\<[`CampaignMeta`](#interface-campaignmeta)[]\>

#### Returns

`Promise`\<[`CampaignMeta`](#interface-campaignmeta)[]\>

***

### routerClient()

> **routerClient**(): [`Router`](#class-router)

#### Returns

[`Router`](#class-router)

***

### defaultRouterConfig()

> `static` **defaultRouterConfig**(): [`RouterConfig`](#interface-routerconfig)

#### Returns

[`RouterConfig`](#interface-routerconfig)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationGateRegistry

# Class: NarrationGateRegistry

## Constructors

### Constructor

> **new NarrationGateRegistry**(`fallback`): `NarrationGateRegistry`

#### Parameters

##### fallback

[`NarrationGateHook`](#interface-narrationgatehook)

#### Returns

`NarrationGateRegistry`

## Methods

### register()

> **register**(`h`): `object`

#### Parameters

##### h

[`NarrationGateHook`](#interface-narrationgatehook)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### validate()

> **validate**(`input`, `ctx`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

#### Parameters

##### input

[`NarrationGateInput`](#interface-narrationgateinput)

##### ctx

[`NarrationGateContext`](#interface-narrationgatecontext)

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PreGenerationRegistry

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

[`PredictionEvent`](#interface-predictionevent)

#### Returns

`void`

***

### register()

> **register**(`h`): `object`

#### Parameters

##### h

[`PreGenerationHook`](#interface-pregenerationhook)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

***

### setErrorHandler()

> **setErrorHandler**(`fn`): `void`

#### Parameters

##### fn

(`err`) => `void`

#### Returns

`void`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderHttpError

# Class: ProviderHttpError

## Extends

- `Error`

## Constructors

### Constructor

> **new ProviderHttpError**(`code`, `status`, `message`): `ProviderHttpError`

#### Parameters

##### code

[`ProviderErrorCode`](#type-alias-providererrorcode)

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

> **code**: [`ProviderErrorCode`](#type-alias-providererrorcode)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Resolver

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

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

#### Parameters

##### opts

[`ResolveOptions`](#interface-resolveoptions)

#### Returns

`Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

***

### suggestExisting()

> **suggestExisting**(`opts`): `Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

#### Parameters

##### opts

###### campaignId

[`CampaignId`](#type-alias-campaignid)

###### mention

`string`

###### type

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Router

# Class: Router

## Constructors

### Constructor

> **new Router**(`cfg`, `deps`): `Router`

#### Parameters

##### cfg

[`RouterConfig`](#interface-routerconfig)

##### deps

[`RouterDeps`](#interface-routerdeps)

#### Returns

`Router`

## Methods

### chat()

> **chat**(`tier`, `req`): `Promise`\<[`ChatResponse`](#interface-chatresponse)\>

#### Parameters

##### tier

[`Tier`](#type-alias-tier)

##### req

[`ChatRequest`](#interface-chatrequest)

#### Returns

`Promise`\<[`ChatResponse`](#interface-chatresponse)\>

***

### embed()

> **embed**(`req`): `Promise`\<[`EmbeddingResponse`](#interface-embeddingresponse)\>

#### Parameters

##### req

[`EmbeddingRequest`](#interface-embeddingrequest)

#### Returns

`Promise`\<[`EmbeddingResponse`](#interface-embeddingresponse)\>

***

### embeddingDim()

> **embeddingDim**(): `number` \| `undefined`

Declared dim of the embeddings primary, if annotated.

#### Returns

`number` \| `undefined`

***

### hasEmbeddings()

> **hasEmbeddings**(): `boolean`

#### Returns

`boolean`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RouterExhaustedError

# Class: RouterExhaustedError

## Extends

- `Error`

## Constructors

### Constructor

> **new RouterExhaustedError**(`tier`, `attempts`): `RouterExhaustedError`

#### Parameters

##### tier

[`Tier`](#type-alias-tier)

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

> **tier**: [`Tier`](#type-alias-tier)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqCampaignContextInvalidatedError

# Class: SneqCampaignContextInvalidatedError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqCampaignContextInvalidatedError**(`campaignId`, `reason`): `SneqCampaignContextInvalidatedError`

#### Parameters

##### campaignId

`string`

##### reason

[`CampaignContextInvalidationReason`](#type-alias-campaigncontextinvalidationreason)

#### Returns

`SneqCampaignContextInvalidatedError`

#### Overrides

`Error.constructor`

## Properties

### campaignId

> `readonly` **campaignId**: `string`

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

### reason

> `readonly` **reason**: [`CampaignContextInvalidationReason`](#type-alias-campaigncontextinvalidationreason)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqCampaignNotFoundError

# Class: SneqCampaignNotFoundError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqCampaignNotFoundError**(`campaignId`): `SneqCampaignNotFoundError`

#### Parameters

##### campaignId

`string`

#### Returns

`SneqCampaignNotFoundError`

#### Overrides

`Error.constructor`

## Properties

### campaignId

> `readonly` **campaignId**: `string`

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqConcurrentEntityCreationError

# Class: SneqConcurrentEntityCreationError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqConcurrentEntityCreationError**(`campaignId`, `attempts`): `SneqConcurrentEntityCreationError`

#### Parameters

##### campaignId

`string`

##### attempts

`number`

#### Returns

`SneqConcurrentEntityCreationError`

#### Overrides

`Error.constructor`

## Properties

### attempts

> `readonly` **attempts**: `number`

***

### campaignId

> `readonly` **campaignId**: `string`

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqContradictionError

# Class: SneqContradictionError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqContradictionError**(`contradictions`): `SneqContradictionError`

#### Parameters

##### contradictions

[`AttributFige`](#interface-attributfige)[]

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

> `readonly` **contradictions**: [`AttributFige`](#interface-attributfige)[]

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqProviderError

# Class: SneqProviderError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqProviderError**(`tier`, `exhausted`, `message`): `SneqProviderError`

#### Parameters

##### tier

[`Tier`](#type-alias-tier)

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

> `readonly` **tier**: [`Tier`](#type-alias-tier)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqUnknownEntityError

# Class: SneqUnknownEntityError

A tool call carried something that is not a known entity id where one is required —
typically a model typing a free-text name. `EntityID` is a compile-time brand, so
nothing stops such a value at runtime: the write used to "succeed" and every read
after it came back empty. This turns that silence into a message naming the fix.

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqUnknownEntityError**(`toolName`, `field`, `value`): `SneqUnknownEntityError`

#### Parameters

##### toolName

`string`

##### field

`string`

##### value

`string`

#### Returns

`SneqUnknownEntityError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### field

> `readonly` **field**: `string`

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

### toolName

> `readonly` **toolName**: `string`

***

### value

> `readonly` **value**: `string`

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SneqValidationError

# Class: SneqValidationError

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqValidationError**(`details`): `SneqValidationError`

#### Parameters

##### details

[`ValidationFailureDetail`](#interface-validationfailuredetail)[]

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

> `readonly` **details**: [`ValidationFailureDetail`](#interface-validationfailuredetail)[]

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / UserPromptRegistry

# Class: UserPromptRegistry

## Constructors

### Constructor

> **new UserPromptRegistry**(): `UserPromptRegistry`

#### Returns

`UserPromptRegistry`

## Methods

### ask()

> **ask**(`args`): `Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Parameters

##### args

[`AskUserArgs`](#interface-askuserargs)

#### Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

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

[`AskUserFn`](#type-alias-askuserfn)

#### Returns

`object`

##### dispose()

> **dispose**(): `void`

###### Returns

`void`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Validator

# Class: Validator

## Constructors

### Constructor

> **new Validator**(`resolver`, `router`, `opts?`): `Validator`

#### Parameters

##### resolver

[`Resolver`](#class-resolver)

##### router

[`Router`](#class-router)

##### opts?

[`ValidatorOptions`](#interface-validatoroptions) = `{}`

#### Returns

`Validator`

## Methods

### extract()

> **extract**(`text`): `string`[]

Stage 1 — regex extraction of capitalized name candidates.

#### Parameters

##### text

`string`

#### Returns

`string`[]

***

### llmPass()

> **llmPass**(`_campaignId`, `narration`, `resolved`, `topEntities`): `Promise`\<\{ `candidates`: [`ResolvedCandidate`](#interface-resolvedcandidate)[]; `partial`: `boolean`; \}\>

Stage 3 — light-tier LLM second opinion on NO-MATCH candidates.

#### Parameters

##### \_campaignId

[`CampaignId`](#type-alias-campaignid)

##### narration

`string`

##### resolved

[`ResolvedCandidate`](#interface-resolvedcandidate)[]

##### topEntities

[`Entity`](#interface-entity)[]

#### Returns

`Promise`\<\{ `candidates`: [`ResolvedCandidate`](#interface-resolvedcandidate)[]; `partial`: `boolean`; \}\>

***

### resolvePass()

> **resolvePass**(`campaignId`, `candidates`, `type?`): `Promise`\<[`ResolvedCandidate`](#interface-resolvedcandidate)[]\>

Stage 2 — alias/vector/judge pass via existing resolver.

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### candidates

`string`[]

##### type?

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`ResolvedCandidate`](#interface-resolvedcandidate)[]\>

***

### validate()

> **validate**(`input`, `campaignId`, `repo`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

Full pipeline: extract → resolve → llm → assemble.

#### Parameters

##### input

[`NarrationGateInput`](#interface-narrationgateinput)

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### repo

###### topEntities

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>


## interfaces

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AddConstraintCommand

# Interface: AddConstraintCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`AddConstraintDecisionInput`](#interface-addconstraintdecisioninput)

## Properties

### attributeKey

> **attributeKey**: `string`

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### constraintId

> **constraintId**: [`ConstraintId`](#type-alias-constraintid)

***

### createdAt

> **createdAt**: `number`

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### justification

> **justification**: `string`

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

***

### rule

> **rule**: [`RegleContrainte`](#type-alias-reglecontrainte)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AddConstraintDecision

# Interface: AddConstraintDecision

## Properties

### potentialite

> **potentialite**: [`Potentialite`](#interface-potentialite)

***

### result

> **result**: [`AddConstraintResult`](#interface-addconstraintresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AddConstraintDecisionInput

# Interface: AddConstraintDecisionInput

## Extends

- [`AddConstraintCommand`](#interface-addconstraintcommand)

## Properties

### attributeKey

> **attributeKey**: `string`

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`attributeKey`](#interface-addconstraintcommand)

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`campaignId`](#interface-addconstraintcommand)

***

### constraintId

> **constraintId**: [`ConstraintId`](#type-alias-constraintid)

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`constraintId`](#interface-addconstraintcommand)

***

### createdAt

> **createdAt**: `number`

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`createdAt`](#interface-addconstraintcommand)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`entityId`](#interface-addconstraintcommand)

***

### existing

> **existing**: [`Potentialite`](#interface-potentialite) \| `null`

***

### justification

> **justification**: `string`

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`justification`](#interface-addconstraintcommand)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`operationId`](#interface-addconstraintcommand)

***

### rule

> **rule**: [`RegleContrainte`](#type-alias-reglecontrainte)

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`rule`](#interface-addconstraintcommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AddConstraintResult

# Interface: AddConstraintResult

## Properties

### constraintId

> **constraintId**: [`ConstraintId`](#type-alias-constraintid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AdvanceTurnCommand

# Interface: AdvanceTurnCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`AdvanceTurnDecisionInput`](#interface-advanceturndecisioninput)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAt

> **createdAt**: `number`

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

***

### summary?

> `optional` **summary?**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AdvanceTurnDecision

# Interface: AdvanceTurnDecision

## Properties

### turn

> **turn**: [`Turn`](#interface-turn)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AdvanceTurnDecisionInput

# Interface: AdvanceTurnDecisionInput

## Extends

- [`AdvanceTurnCommand`](#interface-advanceturncommand)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`AdvanceTurnCommand`](#interface-advanceturncommand).[`campaignId`](#interface-advanceturncommand)

***

### createdAt

> **createdAt**: `number`

#### Inherited from

[`AdvanceTurnCommand`](#interface-advanceturncommand).[`createdAt`](#interface-advanceturncommand)

***

### latestTurn

> **latestTurn**: [`Turn`](#interface-turn) \| `null`

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AdvanceTurnCommand`](#interface-advanceturncommand).[`operationId`](#interface-advanceturncommand)

***

### summary?

> `optional` **summary?**: `string`

#### Inherited from

[`AdvanceTurnCommand`](#interface-advanceturncommand).[`summary`](#interface-advanceturncommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AdvanceTurnResult

# Interface: AdvanceTurnResult

## Properties

### turnNumber

> **turnNumber**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Alias

# Interface: Alias

## Properties

### observedAt

> **observedAt**: `number`

***

### source

> **source**: [`AliasSource`](#type-alias-aliassource)

***

### text

> **text**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AreteGCN

# Interface: AreteGCN

## Properties

### attributs

> **attributs**: `Record`\<`string`, [`AttributValue`](#type-alias-attributvalue)\>

***

### cible

> **cible**: [`EntityID`](#type-alias-entityid)

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

> **source**: [`EntityID`](#type-alias-entityid)

***

### typeRelation

> **typeRelation**: [`TypeRelation`](#type-alias-typerelation)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AskUserArgs

# Interface: AskUserArgs

## Properties

### candidates

> **candidates**: [`Entity`](#interface-entity)[]

***

### mention

> **mention**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AtomicCommand

# Interface: AtomicCommand

## Extended by

- [`AddConstraintCommand`](#interface-addconstraintcommand)
- [`CreateEntityCommand`](#interface-createentitycommand)
- [`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand)
- [`RegisterFactCommand`](#interface-registerfactcommand)
- [`SetSceneCommand`](#interface-setscenecommand)
- [`AdvanceTurnCommand`](#interface-advanceturncommand)

## Properties

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AtomicWriteStrategy

# Interface: AtomicWriteStrategy

## Methods

### addConstraint()

> **addConstraint**(`command`): `Promise`\<[`AddConstraintResult`](#interface-addconstraintresult)\>

#### Parameters

##### command

[`AddConstraintCommand`](#interface-addconstraintcommand)

#### Returns

`Promise`\<[`AddConstraintResult`](#interface-addconstraintresult)\>

***

### advanceTurn()

> **advanceTurn**(`command`): `Promise`\<[`AdvanceTurnResult`](#interface-advanceturnresult)\>

#### Parameters

##### command

[`AdvanceTurnCommand`](#interface-advanceturncommand)

#### Returns

`Promise`\<[`AdvanceTurnResult`](#interface-advanceturnresult)\>

***

### confirmEntityMatch()

> **confirmEntityMatch**(`command`): `Promise`\<[`ConfirmEntityMatchResult`](#interface-confirmentitymatchresult)\>

#### Parameters

##### command

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand)

#### Returns

`Promise`\<[`ConfirmEntityMatchResult`](#interface-confirmentitymatchresult)\>

***

### createEntity()

> **createEntity**(`command`): `Promise`\<[`CreateEntityResult`](#type-alias-createentityresult)\>

#### Parameters

##### command

[`CreateEntityCommand`](#interface-createentitycommand)

#### Returns

`Promise`\<[`CreateEntityResult`](#type-alias-createentityresult)\>

***

### registerFact()

> **registerFact**(`command`): `Promise`\<[`RegisterFactResult`](#interface-registerfactresult)\>

#### Parameters

##### command

[`RegisterFactCommand`](#interface-registerfactcommand)

#### Returns

`Promise`\<[`RegisterFactResult`](#interface-registerfactresult)\>

***

### setScene()

> **setScene**(`command`): `Promise`\<[`SetSceneResult`](#interface-setsceneresult)\>

#### Parameters

##### command

[`SetSceneCommand`](#interface-setscenecommand)

#### Returns

`Promise`\<[`SetSceneResult`](#interface-setsceneresult)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AttributFige

# Interface: AttributFige

## Properties

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### factId

> **factId**: [`FactId`](#type-alias-factid)

***

### key

> **key**: `string`

***

### observation

> **observation**: [`Observation`](#interface-observation)

***

### turn

> **turn**: `number`

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Avertissement

# Interface: Avertissement

## Properties

### contrainte

> **contrainte**: [`Contrainte`](#interface-contrainte)

***

### message

> **message**: `string`

***

### type

> **type**: `"CONTRAINTE_SOUPLE"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CampaignMeta

# Interface: CampaignMeta

## Properties

### createdAt

> **createdAt**: `number`

***

### embeddingDim

> **embeddingDim**: `number`

***

### id

> **id**: [`CampaignId`](#type-alias-campaignid)

***

### name

> **name**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ChatRequest

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ChatResponse

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

***

### usage?

> `optional` **usage?**: [`ProviderUsage`](#interface-providerusage)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConfirmEntityMatchCommand

# Interface: ConfirmEntityMatchCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`ConfirmEntityMatchDecisionInput`](#interface-confirmentitymatchdecisioninput)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### mention

> **mention**: `string`

***

### observedAt

> **observedAt**: `number`

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConfirmEntityMatchDecision

# Interface: ConfirmEntityMatchDecision

## Properties

### entity

> **entity**: [`Entity`](#interface-entity)

***

### result

> **result**: [`ConfirmEntityMatchResult`](#interface-confirmentitymatchresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConfirmEntityMatchDecisionInput

# Interface: ConfirmEntityMatchDecisionInput

## Extends

- [`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`campaignId`](#interface-confirmentitymatchcommand)

***

### entity

> **entity**: [`Entity`](#interface-entity) \| `null`

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`entityId`](#interface-confirmentitymatchcommand)

***

### mention

> **mention**: `string`

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`mention`](#interface-confirmentitymatchcommand)

***

### observedAt

> **observedAt**: `number`

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`observedAt`](#interface-confirmentitymatchcommand)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`operationId`](#interface-confirmentitymatchcommand)

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

#### Inherited from

[`ConfirmEntityMatchCommand`](#interface-confirmentitymatchcommand).[`type`](#interface-confirmentitymatchcommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConfirmEntityMatchInput

# Interface: ConfirmEntityMatchInput

## Properties

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### mention

> **mention**: `string`

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConfirmEntityMatchResult

# Interface: ConfirmEntityMatchResult

## Properties

### aliasAdded

> **aliasAdded**: `boolean`

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ContexteGeneratif

# Interface: ContexteGeneratif

## Properties

### categorieAttribut

> **categorieAttribut**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### tendances

> **tendances**: [`Tendance`](#interface-tendance)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Contrainte

# Interface: Contrainte

## Properties

### createdAt

> **createdAt**: `number`

***

### id

> **id**: [`ConstraintId`](#type-alias-constraintid)

***

### justificationNarrative

> **justificationNarrative**: `string`

***

### regle

> **regle**: [`RegleContrainte`](#type-alias-reglecontrainte)

***

### source

> **source**: [`ContrainteSource`](#type-alias-contraintesource)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ContraintePropagee

# Interface: ContraintePropagee

## Properties

### attributCible

> **attributCible**: `string`

***

### contrainte

> **contrainte**: [`Contrainte`](#interface-contrainte)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### forceAccumulee

> **forceAccumulee**: `number`

***

### hopDistance

> **hopDistance**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CreateEntityCommand

# Interface: CreateEntityCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`CreateEntityDecisionInput`](#interface-createentitydecisioninput)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### candidate

> **candidate**: [`Entity`](#interface-entity)

***

### expectedEntityRevision

> **expectedEntityRevision**: `number`

***

### force

> **force**: `boolean`

***

### identityKeys

> **identityKeys**: `string`[]

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CreateEntityDecision

# Interface: CreateEntityDecision

## Properties

### entity

> **entity**: [`Entity`](#interface-entity) \| `null`

***

### result

> **result**: [`CreateEntityResult`](#type-alias-createentityresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CreateEntityDecisionInput

# Interface: CreateEntityDecisionInput

## Extends

- [`CreateEntityCommand`](#interface-createentitycommand)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`campaignId`](#interface-createentitycommand)

***

### candidate

> **candidate**: [`Entity`](#interface-entity)

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`candidate`](#interface-createentitycommand)

***

### currentEntityRevision

> **currentEntityRevision**: `number`

***

### exactMatches

> **exactMatches**: [`Entity`](#interface-entity)[]

***

### expectedEntityRevision

> **expectedEntityRevision**: `number`

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`expectedEntityRevision`](#interface-createentitycommand)

***

### force

> **force**: `boolean`

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`force`](#interface-createentitycommand)

***

### identityKeys

> **identityKeys**: `string`[]

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`identityKeys`](#interface-createentitycommand)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`CreateEntityCommand`](#interface-createentitycommand).[`operationId`](#interface-createentitycommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DefaultDepsOptions

# Interface: DefaultDepsOptions

## Properties

### customChat?

> `optional` **customChat?**: `CustomChatFn`

***

### customEmbed?

> `optional` **customEmbed?**: `CustomEmbedFn`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Embedder

# Interface: Embedder

## Methods

### embed()

> **embed**(`text`): `Promise`\<`Float32Array`\<`ArrayBufferLike`\>\>

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`Float32Array`\<`ArrayBufferLike`\>\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EmbeddingRequest

# Interface: EmbeddingRequest

## Properties

### texts

> **texts**: `string`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EmbeddingResponse

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

### usage?

> `optional` **usage?**: [`ProviderUsage`](#interface-providerusage)

***

### vectors

> **vectors**: `Float32Array`\<`ArrayBufferLike`\>[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EngineConfig

# Interface: EngineConfig

## Properties

### \_routerDeps?

> `optional` **\_routerDeps?**: [`RouterDeps`](#interface-routerdeps)

Optional override for router provider resolution (useful in tests).

***

### logger?

> `optional` **logger?**: [`Logger`](#interface-logger)

***

### repository

> **repository**: [`Repository`](#interface-repository) \| [`RepositoryAccess`](#type-alias-repositoryaccess)

***

### resolver?

> `optional` **resolver?**: `Partial`\<[`ResolverThresholds`](#interface-resolverthresholds)\>

***

### router

> **router**: [`RouterConfig`](#interface-routerconfig)

***

### routerInstance?

> `optional` **routerInstance?**: [`Router`](#class-router)

Optional prebuilt Router shared with another consumer such as a GM brain.

***

### writeStrategy?

> `optional` **writeStrategy?**: [`AtomicWriteStrategy`](#interface-atomicwritestrategy)

Explicit write strategy for repositories without transaction(callback).

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Entity

# Interface: Entity

## Properties

### aliases

> **aliases**: [`Alias`](#interface-alias)[]

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAt

> **createdAt**: `number`

***

### description?

> `optional` **description?**: `string`

Human-readable description, persisted at mention time. Feeds the judge prompt and prepare-turn.

***

### embedding

> **embedding**: `Float32Array`\<`ArrayBufferLike`\> \| `null`

***

### embeddingRefreshedAt

> **embeddingRefreshedAt**: `number` \| `null`

***

### id

> **id**: [`EntityID`](#type-alias-entityid)

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

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EntityCandidateSummary

# Interface: EntityCandidateSummary

## Properties

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### name

> **name**: `string`

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EntityWithScore

# Interface: EntityWithScore

## Properties

### entity

> **entity**: [`Entity`](#interface-entity)

***

### score

> **score**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / FactQuery

# Interface: FactQuery

## Properties

### attributeKey?

> `optional` **attributeKey?**: `string`

***

### category?

> `optional` **category?**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### entityId?

> `optional` **entityId?**: [`EntityID`](#type-alias-entityid)

***

### maxTurn?

> `optional` **maxTurn?**: `number`

***

### minTurn?

> `optional` **minTurn?**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Logger

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / MentionInput

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

### force?

> `optional` **force?**: `boolean`

Create even when resolution is ambiguous (after the caller adjudicated).

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationGateContext

# Interface: NarrationGateContext

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### repo

> **repo**: [`RepositoryAccess`](#type-alias-repositoryaccess)

***

### resolver

> **resolver**: [`Resolver`](#class-resolver)

***

### router

> **router**: [`Router`](#class-router)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationGateHook

# Interface: NarrationGateHook

## Methods

### validate()

> **validate**(`input`, `ctx`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

#### Parameters

##### input

[`NarrationGateInput`](#interface-narrationgateinput)

##### ctx

[`NarrationGateContext`](#interface-narrationgatecontext)

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationGateInput

# Interface: NarrationGateInput

## Properties

### narration

> **narration**: `string`

***

### strict?

> `optional` **strict?**: `boolean`

***

### type?

> `optional` **type?**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationIssue

# Interface: NarrationIssue

## Properties

### kind

> **kind**: `"no-match"` \| `"below-threshold"` \| `"ambiguous"`

***

### llmReasoning?

> `optional` **llmReasoning?**: `string`

***

### noun

> **noun**: `string`

***

### suggestions

> **suggestions**: `object`[]

#### canonicalName

> **canonicalName**: `string`

#### confidence

> **confidence**: `number`

#### entityId

> **entityId**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NewCampaignInput

# Interface: NewCampaignInput

## Properties

### embeddingDim

> **embeddingDim**: `number`

***

### id

> **id**: [`CampaignId`](#type-alias-campaignid)

***

### name

> **name**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NoeudGCN

# Interface: NoeudGCN

## Properties

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

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

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Observation

# Interface: Observation

## Properties

### emittedBy?

> `optional` **emittedBy?**: [`EntityID`](#type-alias-entityid)

***

### excerpt?

> `optional` **excerpt?**: `string`

***

### fiabilite

> **fiabilite**: [`Fiabilite`](#type-alias-fiabilite)

***

### method

> **method**: [`ObservationMethod`](#type-alias-observationmethod)

***

### sceneId?

> `optional` **sceneId?**: [`SceneId`](#type-alias-sceneid)

***

### source

> **source**: [`ObservationSource`](#type-alias-observationsource)

***

### timestamp

> **timestamp**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Potentialite

# Interface: Potentialite

## Properties

### attribut

> **attribut**: `string`

***

### contexteGeneratif

> **contexteGeneratif**: [`ContexteGeneratif`](#interface-contextegeneratif)

***

### contraintes

> **contraintes**: [`Contrainte`](#interface-contrainte)[]

***

### entiteId

> **entiteId**: [`EntityID`](#type-alias-entityid)

***

### etat

> **etat**: `"INDEFINI"` \| `"CONTRAINT"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PreGenerationHook

# Interface: PreGenerationHook

## Methods

### onEvent()

> **onEvent**(`e`): `void` \| `Promise`\<`void`\>

#### Parameters

##### e

[`PredictionEvent`](#interface-predictionevent)

#### Returns

`void` \| `Promise`\<`void`\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PredictionEvent

# Interface: PredictionEvent

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### hint

> **hint**: `object`

#### attribute?

> `optional` **attribute?**: `string`

#### entityId?

> `optional` **entityId?**: [`EntityID`](#type-alias-entityid)

***

### triggerKind

> **triggerKind**: `"ENTRY_TO_SCENE"` \| `"DIALOGUE_OPENED"` \| `"TURN_ADVANCED"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PropagationInput

# Interface: PropagationInput

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAt?

> `optional` **createdAt?**: `number`

***

### edges

> **edges**: readonly [`AreteGCN`](#interface-aretegcn)[]

***

### fact

> **fact**: [`AttributFige`](#interface-attributfige)

***

### maxDepth

> **maxDepth**: `number`

***

### minForce

> **minForce**: `number`

***

### rules

> **rules**: readonly [`ReglePropagation`](#interface-reglepropagation)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PropagationResult

# Interface: PropagationResult

## Properties

### contraintesPropagees

> **contraintesPropagees**: [`ContraintePropagee`](#interface-contraintepropagee)[]

***

### entitesImpactees

> **entitesImpactees**: [`EntityID`](#type-alias-entityid)[]

***

### faitSource

> **faitSource**: [`AttributFige`](#interface-attributfige)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Provider

# Interface: Provider

## Properties

### ref

> `readonly` **ref**: [`ProviderRef`](#interface-providerref)

## Methods

### chat()

> **chat**(`req`, `signal`): `Promise`\<[`ChatResponse`](#interface-chatresponse)\>

#### Parameters

##### req

[`ChatRequest`](#interface-chatrequest)

##### signal

`AbortSignal`

#### Returns

`Promise`\<[`ChatResponse`](#interface-chatresponse)\>

***

### embed()

> **embed**(`req`, `signal`): `Promise`\<[`EmbeddingResponse`](#interface-embeddingresponse)\>

#### Parameters

##### req

[`EmbeddingRequest`](#interface-embeddingrequest)

##### signal

`AbortSignal`

#### Returns

`Promise`\<[`EmbeddingResponse`](#interface-embeddingresponse)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderChain

# Interface: ProviderChain

## Properties

### fallbacks

> **fallbacks**: [`ProviderRef`](#interface-providerref)[]

***

### primary

> **primary**: [`ProviderRef`](#interface-providerref)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderRef

# Interface: ProviderRef

## Properties

### apiKeyEnv

> **apiKeyEnv**: `string`

***

### baseUrl?

> `optional` **baseUrl?**: `string`

***

### embeddingDim?

> `optional` **embeddingDim?**: `number`

Output dimension of the embedding model. Embeddings refs only; lets the Router
 reject mixed-dim chains and lets the CLI derive a default campaign dim.

***

### maxTokens?

> `optional` **maxTokens?**: `number`

***

### model

> **model**: `string`

***

### provider

> **provider**: [`ProviderKind`](#type-alias-providerkind)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderUsage

# Interface: ProviderUsage

Token-usage metadata reported by the provider, camelCased from the wire format.
 Every field is optional: providers omit what they don't track. A missing field
 means "not reported", never zero.

## Properties

### completionTokens?

> `optional` **completionTokens?**: `number`

***

### promptCacheHitTokens?

> `optional` **promptCacheHitTokens?**: `number`

***

### promptCacheMissTokens?

> `optional` **promptCacheMissTokens?**: `number`

***

### promptTokens?

> `optional` **promptTokens?**: `number`

***

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

***

### totalTokens?

> `optional` **totalTokens?**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegisterFactCommand

# Interface: RegisterFactCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`RegisterFactDecisionInput`](#interface-registerfactdecisioninput)

## Properties

### attributeKey

> **attributeKey**: `string`

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### factId

> **factId**: [`FactId`](#type-alias-factid)

***

### observation

> **observation**: [`Observation`](#interface-observation)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegisterFactDecision

# Interface: RegisterFactDecision

## Properties

### contradictions

> **contradictions**: [`AttributFige`](#interface-attributfige)[]

***

### fact

> **fact**: [`AttributFige`](#interface-attributfige) & `object` \| `null`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegisterFactDecisionInput

# Interface: RegisterFactDecisionInput

## Extends

- [`RegisterFactCommand`](#interface-registerfactcommand)

## Properties

### attributeKey

> **attributeKey**: `string`

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`attributeKey`](#interface-registerfactcommand)

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`campaignId`](#interface-registerfactcommand)

***

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`category`](#interface-registerfactcommand)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`entityId`](#interface-registerfactcommand)

***

### existing

> **existing**: [`AttributFige`](#interface-attributfige)[]

***

### factId

> **factId**: [`FactId`](#type-alias-factid)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`factId`](#interface-registerfactcommand)

***

### latestTurnNumber

> **latestTurnNumber**: `number`

***

### observation

> **observation**: [`Observation`](#interface-observation)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`observation`](#interface-registerfactcommand)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`operationId`](#interface-registerfactcommand)

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

#### Inherited from

[`RegisterFactCommand`](#interface-registerfactcommand).[`value`](#interface-registerfactcommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegisterFactInput

# Interface: RegisterFactInput

## Properties

### attributeKey

> **attributeKey**: `string`

***

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### observation

> **observation**: [`Observation`](#interface-observation)

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegisterFactResult

# Interface: RegisterFactResult

## Properties

### contradictions

> **contradictions**: [`AttributFige`](#interface-attributfige)[]

***

### factId

> **factId**: [`FactId`](#type-alias-factid) \| `null`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ReglePropagation

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Repository

# Interface: Repository

## Methods

### appendFact()

> **appendFact**(`f`): `Promise`\<\{ `factId`: [`FactId`](#type-alias-factid); \}\>

#### Parameters

##### f

[`AttributFige`](#interface-attributfige) & `object`

#### Returns

`Promise`\<\{ `factId`: [`FactId`](#type-alias-factid); \}\>

***

### appendTurn()

> **appendTurn**(`t`): `Promise`\<`void`\>

#### Parameters

##### t

[`Turn`](#interface-turn)

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

[`CampaignMeta`](#interface-campaignmeta)

#### Returns

`Promise`\<`void`\>

***

### currentScene()

> **currentScene**(`campaignId`): `Promise`\<[`Scene`](#interface-scene) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`Scene`](#interface-scene) \| `null`\>

***

### deleteCampaign()

> **deleteCampaign**(`id`): `Promise`\<`void`\>

#### Parameters

##### id

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<`void`\>

***

### entityRevision()

> **entityRevision**(`campaignId`): `Promise`\<`number`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<`number`\>

***

### findEntitiesByAlias()

> **findEntitiesByAlias**(`campaignId`, `aliasNormalized`, `type?`): `Promise`\<[`Entity`](#interface-entity)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### aliasNormalized

`string`

##### type?

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`Entity`](#interface-entity)[]\>

***

### getEntity()

> **getEntity**(`campaignId`, `entityId`): `Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

***

### getFigedAttributes()

> **getFigedAttributes**(`campaignId`, `entityId`): `Promise`\<[`AttributFige`](#interface-attributfige)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`AttributFige`](#interface-attributfige)[]\>

***

### getPotentialite()

> **getPotentialite**(`campaignId`, `entityId`, `attribut`): `Promise`\<[`Potentialite`](#interface-potentialite) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId

[`EntityID`](#type-alias-entityid)

##### attribut

`string`

#### Returns

`Promise`\<[`Potentialite`](#interface-potentialite) \| `null`\>

***

### latestTurn()

> **latestTurn**(`campaignId`): `Promise`\<[`Turn`](#interface-turn) \| `null`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`Turn`](#interface-turn) \| `null`\>

***

### listCampaigns()

> **listCampaigns**(): `Promise`\<[`CampaignMeta`](#interface-campaignmeta)[]\>

#### Returns

`Promise`\<[`CampaignMeta`](#interface-campaignmeta)[]\>

***

### neighbors()

> **neighbors**(`campaignId`, `entityId`): `Promise`\<`object`[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<`object`[]\>

***

### queryFacts()

> **queryFacts**(`campaignId`, `query`): `Promise`\<[`AttributFige`](#interface-attributfige)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### query

[`FactQuery`](#interface-factquery)

#### Returns

`Promise`\<[`AttributFige`](#interface-attributfige)[]\>

***

### removePotentialite()

> **removePotentialite**(`campaignId`, `entityId`, `attribut`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId

[`EntityID`](#type-alias-entityid)

##### attribut

`string`

#### Returns

`Promise`\<`void`\>

***

### searchEntitiesByVector()

> **searchEntitiesByVector**(`campaignId`, `vec`, `opts`): `Promise`\<[`EntityWithScore`](#interface-entitywithscore)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### vec

`Float32Array`

##### opts

[`VectorSearchOpts`](#interface-vectorsearchopts)

#### Returns

`Promise`\<[`EntityWithScore`](#interface-entitywithscore)[]\>

***

### topEntities()

> **topEntities**(`campaignId`, `k`): `Promise`\<[`Entity`](#interface-entity)[]\>

Return up to `k` entities for the campaign, ordered by `embeddingRefreshedAt` descending.

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### k

`number`

#### Returns

`Promise`\<[`Entity`](#interface-entity)[]\>

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

[`CampaignId`](#type-alias-campaignid)

##### a

[`AreteGCN`](#interface-aretegcn)

#### Returns

`Promise`\<`void`\>

***

### upsertEntity()

> **upsertEntity**(`e`): `Promise`\<`void`\>

#### Parameters

##### e

[`Entity`](#interface-entity)

#### Returns

`Promise`\<`void`\>

***

### upsertNode()

> **upsertNode**(`campaignId`, `n`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### n

[`NoeudGCN`](#interface-noeudgcn)

#### Returns

`Promise`\<`void`\>

***

### upsertPotentialite()

> **upsertPotentialite**(`campaignId`, `p`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### p

[`Potentialite`](#interface-potentialite)

#### Returns

`Promise`\<`void`\>

***

### upsertScene()

> **upsertScene**(`s`): `Promise`\<`void`\>

#### Parameters

##### s

[`Scene`](#interface-scene)

#### Returns

`Promise`\<`void`\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ResolutionResult

# Interface: ResolutionResult

## Properties

### candidates

> **candidates**: [`Entity`](#interface-entity)[]

***

### confidence

> **confidence**: `number`

***

### layerUsed

> **layerUsed**: `"none"` \| `"alias"` \| `"vector"` \| `"judge"` \| `"user-prompt"`

***

### match

> **match**: [`Entity`](#interface-entity) \| `null`

***

### notFoundReason?

> `optional` **notFoundReason?**: `"no-match"` \| `"below-threshold"` \| `"ambiguous"`

***

### reasoning?

> `optional` **reasoning?**: `string`

***

### unavailableReason?

> `optional` **unavailableReason?**: `"embeddings"` \| `"vector-search"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ResolveOptions

# Interface: ResolveOptions

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### mention

> **mention**: `string`

***

### sceneDescription?

> `optional` **sceneDescription?**: `string`

***

### type?

> `optional` **type?**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ResolvedCandidate

# Interface: ResolvedCandidate

## Properties

### kind

> **kind**: `"no-match"` \| `"below-threshold"` \| `"ambiguous"`

***

### llmReasoning?

> `optional` **llmReasoning?**: `string`

***

### noun

> **noun**: `string`

***

### suggestions

> **suggestions**: `object`[]

#### canonicalName

> **canonicalName**: `string`

#### confidence

> **confidence**: `number`

#### entityId

> **entityId**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ResolverThresholds

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RouterConfig

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

> **tiers**: [`RouterTiers`](#interface-routertiers)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RouterDeps

# Interface: RouterDeps

## Methods

### resolveProvider()

> **resolveProvider**(`ref`): [`Provider`](#interface-provider) \| `Promise`\<[`Provider`](#interface-provider)\>

#### Parameters

##### ref

[`ProviderRef`](#interface-providerref)

#### Returns

[`Provider`](#interface-provider) \| `Promise`\<[`Provider`](#interface-provider)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RouterTiers

# Interface: RouterTiers

## Properties

### embeddings?

> `optional` **embeddings?**: [`ProviderChain`](#interface-providerchain)

Optional: omit entirely to run keyless / alias-only (no vector resolution).

***

### heavy

> **heavy**: [`ProviderChain`](#interface-providerchain)

***

### light

> **light**: [`ProviderChain`](#interface-providerchain)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Scene

# Interface: Scene

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAtTurn

> **createdAtTurn**: `number`

***

### description

> **description**: `string`

***

### id

> **id**: [`SceneId`](#type-alias-sceneid)

***

### locationId

> **locationId**: [`EntityID`](#type-alias-entityid)

***

### presentEntityIds

> **presentEntityIds**: [`EntityID`](#type-alias-entityid)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SetSceneCommand

# Interface: SetSceneCommand

## Extends

- [`AtomicCommand`](#interface-atomiccommand)

## Extended by

- [`SetSceneDecisionInput`](#interface-setscenedecisioninput)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAt

> **createdAt**: `number`

***

### description

> **description**: `string`

***

### locationEntityId

> **locationEntityId**: [`EntityID`](#type-alias-entityid)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`AtomicCommand`](#interface-atomiccommand).[`operationId`](#interface-atomiccommand)

***

### presentEntityIds

> **presentEntityIds**: [`EntityID`](#type-alias-entityid)[]

***

### sceneId

> **sceneId**: [`SceneId`](#type-alias-sceneid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SetSceneDecision

# Interface: SetSceneDecision

## Properties

### scene

> **scene**: [`Scene`](#interface-scene)

***

### turn

> **turn**: [`Turn`](#interface-turn)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SetSceneDecisionInput

# Interface: SetSceneDecisionInput

## Extends

- [`SetSceneCommand`](#interface-setscenecommand)

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`campaignId`](#interface-setscenecommand)

***

### createdAt

> **createdAt**: `number`

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`createdAt`](#interface-setscenecommand)

***

### description

> **description**: `string`

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`description`](#interface-setscenecommand)

***

### latestTurnNumber

> **latestTurnNumber**: `number`

***

### locationEntityId

> **locationEntityId**: [`EntityID`](#type-alias-entityid)

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`locationEntityId`](#interface-setscenecommand)

***

### operationId

> **operationId**: `string`

Stable token identifying one logical write, generated once per engine call and
reused across its retries.

The engine does NOT deduplicate on it. The built-in repository-backed strategy
ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
exactly-once semantics has to implement the dedup itself, keyed on this token —
that is what it is here for. Do not read it as a guarantee the engine provides.

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`operationId`](#interface-setscenecommand)

***

### presentEntityIds

> **presentEntityIds**: [`EntityID`](#type-alias-entityid)[]

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`presentEntityIds`](#interface-setscenecommand)

***

### sceneId

> **sceneId**: [`SceneId`](#type-alias-sceneid)

#### Inherited from

[`SetSceneCommand`](#interface-setscenecommand).[`sceneId`](#interface-setscenecommand)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SetSceneResult

# Interface: SetSceneResult

## Properties

### sceneId

> **sceneId**: [`SceneId`](#type-alias-sceneid)

***

### turnNumber

> **turnNumber**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SuggestionResult

# Interface: SuggestionResult

## Properties

### candidates

> **candidates**: [`Entity`](#interface-entity)[]

***

### recommendsNew

> **recommendsNew**: `boolean`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Tendance

# Interface: Tendance

## Properties

### description

> **description**: `string`

***

### poids

> **poids**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ToolCallContext

# Interface: ToolCallContext

## Methods

### addConstraint()

> **addConstraint**(`input`): `Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### entityId

[`EntityID`](#type-alias-entityid)

###### justification

`string`

###### rule

[`RegleContrainte`](#type-alias-reglecontrainte)

#### Returns

`Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

***

### advanceTurn()

> **advanceTurn**(`summary?`): `Promise`\<\{ `turnNumber`: `number`; \}\>

#### Parameters

##### summary?

`string`

#### Returns

`Promise`\<\{ `turnNumber`: `number`; \}\>

***

### getEntity()

> **getEntity**(`entityId`): `Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Parameters

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

***

### getRelevantFacts()

> **getRelevantFacts**(`entityId`, `opts?`): `Promise`\<[`AttributFige`](#interface-attributfige)[]\>

#### Parameters

##### entityId

[`EntityID`](#type-alias-entityid)

##### opts?

###### attributeKeys?

`string`[]

###### depth?

`0` \| `1`

#### Returns

`Promise`\<[`AttributFige`](#interface-attributfige)[]\>

***

### mentionEntity()

> **mentionEntity**(`input`): `Promise`\<[`MentionResult`](#type-alias-mentionresult)\>

#### Parameters

##### input

###### aliases?

`string`[]

###### canonicalName

`string`

###### description

`string`

###### force?

`boolean`

###### type

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`MentionResult`](#type-alias-mentionresult)\>

***

### registerFact()

> **registerFact**(`input`): `Promise`\<\{ `contradictions`: [`AttributFige`](#interface-attributfige)[]; `factId`: [`FactId`](#type-alias-factid) \| `null`; \}\>

#### Parameters

##### input

###### attributeKey

`string`

###### category

[`CategorieAttribut`](#type-alias-categorieattribut)

###### entityId

[`EntityID`](#type-alias-entityid)

###### observation

[`Observation`](#interface-observation)

###### value

[`AttributValue`](#type-alias-attributvalue)

#### Returns

`Promise`\<\{ `contradictions`: [`AttributFige`](#interface-attributfige)[]; `factId`: [`FactId`](#type-alias-factid) \| `null`; \}\>

***

### resolveEntity()

> **resolveEntity**(`opts`): `Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

#### Parameters

##### opts

###### mention

`string`

###### type?

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`ResolutionResult`](#interface-resolutionresult)\>

***

### setScene()

> **setScene**(`input`): `Promise`\<\{ `sceneId`: [`SceneId`](#type-alias-sceneid); `turnNumber`: `number`; \}\>

#### Parameters

##### input

###### description

`string`

###### locationEntityId

[`EntityID`](#type-alias-entityid)

###### presentEntityIds

[`EntityID`](#type-alias-entityid)[]

#### Returns

`Promise`\<\{ `sceneId`: [`SceneId`](#type-alias-sceneid); `turnNumber`: `number`; \}\>

***

### suggestExisting()

> **suggestExisting**(`mention`, `type`): `Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

#### Parameters

##### mention

`string`

##### type

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`SuggestionResult`](#interface-suggestionresult)\>

***

### validateNarration()

> **validateNarration**(`input`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

#### Parameters

##### input

###### narration

`string`

###### strict?

`boolean`

###### type?

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Turn

# Interface: Turn

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### createdAt

> **createdAt**: `number`

***

### sceneId

> **sceneId**: [`SceneId`](#type-alias-sceneid) \| `null`

***

### summary

> **summary**: `string` \| `null`

***

### turnNumber

> **turnNumber**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidationContext

# Interface: ValidationContext

## Properties

### existingFiged

> **existingFiged**: readonly [`AttributFige`](#interface-attributfige)[]

***

### softContraintes

> **softContraintes**: readonly [`Contrainte`](#interface-contrainte)[]

***

### strictContraintes

> **strictContraintes**: readonly [`Contrainte`](#interface-contrainte)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidationFailure

# Interface: ValidationFailure

## Properties

### contrainte?

> `optional` **contrainte?**: [`Contrainte`](#interface-contrainte)

***

### message

> **message**: `string`

***

### type

> **type**: `ErrorType`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidationFailureDetail

# Interface: ValidationFailureDetail

## Properties

### message

> **message**: `string`

***

### type

> **type**: `"FORMAT"` \| `"CONTRAINTE_STRICTE"` \| `"CONTRADICTION_RC"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidationReport

# Interface: ValidationReport

## Properties

### extractedNames

> **extractedNames**: `string`[]

***

### issues

> **issues**: [`NarrationIssue`](#interface-narrationissue)[]

***

### ok

> **ok**: `boolean`

***

### partial?

> `optional` **partial?**: `boolean`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidationResult

# Interface: ValidationResult

## Properties

### avertissements

> **avertissements**: [`Avertissement`](#interface-avertissement)[]

***

### erreurs

> **erreurs**: [`ValidationFailure`](#interface-validationfailure)[]

***

### valide

> **valide**: `boolean`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ValidatorOptions

# Interface: ValidatorOptions

## Properties

### llmCharBudget?

> `optional` **llmCharBudget?**: `number`

***

### stopwords?

> `optional` **stopwords?**: `ReadonlySet`\<`string`\>

***

### topK?

> `optional` **topK?**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / VectorSearchOpts

# Interface: VectorSearchOpts

## Properties

### excludeEntityIds?

> `optional` **excludeEntityIds?**: [`EntityID`](#type-alias-entityid)[]

***

### filterType?

> `optional` **filterType?**: [`EntityType`](#type-alias-entitytype)

***

### topK

> **topK**: `number`


## type-aliases

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AliasSource

# Type Alias: AliasSource

> **AliasSource** = \{ `kind`: `"PLAYER"`; \} \| \{ `kind`: `"GM_NARRATION"`; \} \| \{ `documentId`: [`EntityID`](#type-alias-entityid); `kind`: `"DOCUMENT"`; \} \| \{ `kind`: `"INFERENCE"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AskUserFn

# Type Alias: AskUserFn

> **AskUserFn** = (`args`) => `Promise`\<[`Entity`](#interface-entity) \| `null`\>

## Parameters

### args

[`AskUserArgs`](#interface-askuserargs)

## Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / AttributValue

# Type Alias: AttributValue

> **AttributValue** = \{ `type`: `"STRING"`; `value`: `string`; \} \| \{ `type`: `"NUMBER"`; `value`: `number`; \} \| \{ `type`: `"BOOLEAN"`; `value`: `boolean`; \} \| \{ `id`: [`EntityID`](#type-alias-entityid); `type`: `"ENTITY_REF"`; \} \| \{ `ids`: [`EntityID`](#type-alias-entityid)[]; `type`: `"ENTITY_SET"`; \} \| \{ `enumType`: `string`; `type`: `"ENUM"`; `value`: `string`; \} \| \{ `fields`: `Record`\<`string`, `AttributValue`\>; `type`: `"COMPOSITE"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CampaignContextInvalidationReason

# Type Alias: CampaignContextInvalidationReason

> **CampaignContextInvalidationReason** = `"deleting"` \| `"deleted"` \| `"engine-closed"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CampaignId

# Type Alias: CampaignId

> **CampaignId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"CampaignId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CategorieAttribut

# Type Alias: CategorieAttribut

> **CategorieAttribut** = `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConstraintId

# Type Alias: ConstraintId

> **ConstraintId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"ConstraintId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ContrainteSource

# Type Alias: ContrainteSource

> **ContrainteSource** = \{ `factId`: [`FactId`](#type-alias-factid); `kind`: `"FAIT_CANONIQUE"`; \} \| \{ `edgeKey`: `string`; `kind`: `"RELATION"`; \} \| \{ `kind`: `"REGLE_MONDE"`; `ruleId`: `string`; \} \| \{ `confidence`: `number`; `kind`: `"INFERENCE_IA"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CreateEntityResult

# Type Alias: CreateEntityResult

> **CreateEntityResult** = \{ `status`: `"stale"`; \} \| \{ `entityId`: [`EntityID`](#type-alias-entityid); `isNew`: `true`; `status`: `"created"`; \} \| \{ `entityId`: [`EntityID`](#type-alias-entityid); `isNew`: `false`; `resolvedTo`: [`EntityID`](#type-alias-entityid); `status`: `"existing"`; \} \| \{ `candidates`: [`EntityCandidateSummary`](#interface-entitycandidatesummary)[]; `status`: `"conflict"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EntityID

# Type Alias: EntityID

> **EntityID** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"EntityID"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EntityType

# Type Alias: EntityType

> **EntityType** = `"PERSONNAGE"` \| `"LIEU"` \| `"OBJET"` \| `"FACTION"` \| `"EVENEMENT"` \| `"RELATION"` \| `"SCENE"` \| `"WORLD"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / EtatAttribut

# Type Alias: EtatAttribut

> **EtatAttribut** = `"INDEFINI"` \| `"CONTRAINT"` \| `"FIGE"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / FactId

# Type Alias: FactId

> **FactId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"FactId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Fiabilite

# Type Alias: Fiabilite

> **Fiabilite** = `"CERTAINE"` \| `"TEMOIGNAGE"` \| `"RUMEUR_CONFIRMEE"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / MentionResult

# Type Alias: MentionResult

> **MentionResult** = \{ `entityId`: [`EntityID`](#type-alias-entityid); `isNew`: `boolean`; `needsAdjudication?`: `false`; `resolvedTo?`: [`EntityID`](#type-alias-entityid); \} \| \{ `candidates`: `object`[]; `entityId`: `null`; `isNew`: `false`; `needsAdjudication`: `true`; `reason?`: `"ambiguous"` \| `"unavailable"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ObservationMethod

# Type Alias: ObservationMethod

> **ObservationMethod** = `"DIALOGUE_DIRECT"` \| `"DOCUMENT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ObservationSource

# Type Alias: ObservationSource

> **ObservationSource** = `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderErrorCode

# Type Alias: ProviderErrorCode

> **ProviderErrorCode** = `"QUOTA"` \| `"AUTH"` \| `"SERVER"` \| `"TIMEOUT"` \| `"MALFORMED"` \| `"NETWORK"` \| `"UNSUPPORTED"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ProviderKind

# Type Alias: ProviderKind

> **ProviderKind** = `"openai-compatible"` \| `"anthropic"` \| `"google-genai"` \| `"custom"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RegleContrainte

# Type Alias: RegleContrainte

> **RegleContrainte** = \{ `type`: `"DOIT_ETRE"`; `valeurs`: [`AttributValue`](#type-alias-attributvalue)[]; \} \| \{ `type`: `"NE_PEUT_PAS_ETRE"`; `valeurs`: [`AttributValue`](#type-alias-attributvalue)[]; \} \| \{ `condition`: `string`; `consequence`: `string`; `type`: `"IMPLIQUE"`; \} \| \{ `autreAttribut`: `string`; `autreEntite`: [`EntityID`](#type-alias-entityid); `type`: `"CORRELE_AVEC"`; \} \| \{ `max?`: `number`; `min?`: `number`; `type`: `"RANGE_NUMERIQUE"`; \} \| \{ `pattern`: `string`; `type`: `"REGEX"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / RepositoryAccess

# Type Alias: RepositoryAccess

> **RepositoryAccess** = `Omit`\<[`Repository`](#interface-repository), `"transaction"`\>

Repository surface usable by distributed stores; atomic writes are injected separately.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SceneId

# Type Alias: SceneId

> **SceneId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"SceneId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Tier

# Type Alias: Tier

> **Tier** = `"heavy"` \| `"light"` \| `"embeddings"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ToolName

# Type Alias: ToolName

> **ToolName** = *typeof* [`ToolNames`](#variable-toolnames)\[`number`\]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / TypeRelation

# Type Alias: TypeRelation

> **TypeRelation** = \{ `categorie`: `"SOCIAL"`; `sousType`: `RelationSociale`; \} \| \{ `categorie`: `"CAUSAL"`; `sousType`: `RelationCausale`; \} \| \{ `categorie`: `"SPATIAL"`; `sousType`: `RelationSpatiale`; \} \| \{ `categorie`: `"TEMPOREL"`; `sousType`: `RelationTemporelle`; \} \| \{ `categorie`: `"CONCEPTUEL"`; `sousType`: `RelationConceptuelle`; \}


## functions

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / anthropicTools

# Function: anthropicTools()

> **anthropicTools**(): `object`[]

## Returns

`object`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asCampaignId

# Function: asCampaignId()

> **asCampaignId**(`s`): [`CampaignId`](#type-alias-campaignid)

## Parameters

### s

`string`

## Returns

[`CampaignId`](#type-alias-campaignid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asConstraintId

# Function: asConstraintId()

> **asConstraintId**(`s`): [`ConstraintId`](#type-alias-constraintid)

## Parameters

### s

`string`

## Returns

[`ConstraintId`](#type-alias-constraintid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asEntityID

# Function: asEntityID()

> **asEntityID**(`s`): [`EntityID`](#type-alias-entityid)

## Parameters

### s

`string`

## Returns

[`EntityID`](#type-alias-entityid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asFactId

# Function: asFactId()

> **asFactId**(`s`): [`FactId`](#type-alias-factid)

## Parameters

### s

`string`

## Returns

[`FactId`](#type-alias-factid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asSceneId

# Function: asSceneId()

> **asSceneId**(`s`): [`SceneId`](#type-alias-sceneid)

## Parameters

### s

`string`

## Returns

[`SceneId`](#type-alias-sceneid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / createDefaultDeps

# Function: createDefaultDeps()

> **createDefaultDeps**(`opts?`): [`RouterDeps`](#interface-routerdeps)

## Parameters

### opts?

[`DefaultDepsOptions`](#interface-defaultdepsoptions) = `{}`

## Returns

[`RouterDeps`](#interface-routerdeps)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideAddConstraint

# Function: decideAddConstraint()

> **decideAddConstraint**(`input`): [`AddConstraintDecision`](#interface-addconstraintdecision)

## Parameters

### input

[`AddConstraintDecisionInput`](#interface-addconstraintdecisioninput)

## Returns

[`AddConstraintDecision`](#interface-addconstraintdecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideAdvanceTurn

# Function: decideAdvanceTurn()

> **decideAdvanceTurn**(`input`): [`AdvanceTurnDecision`](#interface-advanceturndecision)

## Parameters

### input

[`AdvanceTurnDecisionInput`](#interface-advanceturndecisioninput)

## Returns

[`AdvanceTurnDecision`](#interface-advanceturndecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideConfirmEntityMatch

# Function: decideConfirmEntityMatch()

> **decideConfirmEntityMatch**(`input`): [`ConfirmEntityMatchDecision`](#interface-confirmentitymatchdecision)

## Parameters

### input

[`ConfirmEntityMatchDecisionInput`](#interface-confirmentitymatchdecisioninput)

## Returns

[`ConfirmEntityMatchDecision`](#interface-confirmentitymatchdecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideCreateEntity

# Function: decideCreateEntity()

> **decideCreateEntity**(`input`): [`CreateEntityDecision`](#interface-createentitydecision)

## Parameters

### input

[`CreateEntityDecisionInput`](#interface-createentitydecisioninput)

## Returns

[`CreateEntityDecision`](#interface-createentitydecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideRegisterFact

# Function: decideRegisterFact()

> **decideRegisterFact**(`input`): [`RegisterFactDecision`](#interface-registerfactdecision)

## Parameters

### input

[`RegisterFactDecisionInput`](#interface-registerfactdecisioninput)

## Returns

[`RegisterFactDecision`](#interface-registerfactdecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / decideSetScene

# Function: decideSetScene()

> **decideSetScene**(`input`): [`SetSceneDecision`](#interface-setscenedecision)

## Parameters

### input

[`SetSceneDecisionInput`](#interface-setscenedecisioninput)

## Returns

[`SetSceneDecision`](#interface-setscenedecision)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / defaultRouterConfig

# Function: defaultRouterConfig()

> **defaultRouterConfig**(): [`RouterConfig`](#interface-routerconfig)

## Returns

[`RouterConfig`](#interface-routerconfig)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / dispatchToolCall

# Function: dispatchToolCall()

> **dispatchToolCall**(`name`, `rawArgs`, `ctx`): `Promise`\<`unknown`\>

## Parameters

### name

`string`

### rawArgs

`unknown`

### ctx

[`ToolCallContext`](#interface-toolcallcontext)

## Returns

`Promise`\<`unknown`\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / geminiTools

# Function: geminiTools()

> **geminiTools**(): `object`[]

## Returns

`object`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / genericTools

# Function: genericTools()

> **genericTools**(): `object`[]

## Returns

`object`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / loadConfigFromFile

# Function: loadConfigFromFile()

> **loadConfigFromFile**(`path`): `object`

## Parameters

### path

`string`

## Returns

`object`

### resolver?

> `optional` **resolver?**: `Partial`\<[`ResolverThresholds`](#interface-resolverthresholds)\>

### router

> **router**: [`RouterConfig`](#interface-routerconfig)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / openAITools

# Function: openAITools()

> **openAITools**(): `object`[]

## Returns

`object`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / propagate

# Function: propagate()

> **propagate**(`input`): [`PropagationResult`](#interface-propagationresult)

## Parameters

### input

[`PropagationInput`](#interface-propagationinput)

## Returns

[`PropagationResult`](#interface-propagationresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / validateValue

# Function: validateValue()

> **validateValue**(`value`, `ctx`): [`ValidationResult`](#interface-validationresult)

## Parameters

### value

[`AttributValue`](#type-alias-attributvalue)

### ctx

[`ValidationContext`](#interface-validationcontext)

## Returns

[`ValidationResult`](#interface-validationresult)


## variables

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ADVERTISED\_TOOL\_NAMES

# Variable: ADVERTISED\_TOOL\_NAMES

> `const` **ADVERTISED\_TOOL\_NAMES**: readonly [`ToolName`](#type-alias-toolname)[] = `ToolNames`

Tools advertised to LLMs. Every listed tool is implemented.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SNEQ\_ENGINE\_VERSION

# Variable: SNEQ\_ENGINE\_VERSION

> `const` **SNEQ\_ENGINE\_VERSION**: `"0.3.1"` = `"0.3.1"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ToolNames

# Variable: ToolNames

> `const` **ToolNames**: readonly \[`"sneq__lookup_entity"`, `"sneq__get_entity"`, `"sneq__get_relevant_facts"`, `"sneq__suggest_existing"`, `"sneq__mention_entity"`, `"sneq__register_fact"`, `"sneq__add_constraint"`, `"sneq__set_scene"`, `"sneq__advance_turn"`, `"sneq__validate_narration"`\]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / defaultNarrationGateHook

# Variable: defaultNarrationGateHook

> `const` **defaultNarrationGateHook**: [`NarrationGateHook`](#interface-narrationgatehook)

Default `NarrationGateHook` implementation backed by the Validator. Engine
uses this as the registry fallback so a consumer that never registers a
custom hook still gets the built-in behavior.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / noopLogger

# Variable: noopLogger

> `const` **noopLogger**: [`Logger`](#interface-logger)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / noopPreGenerationHook

# Variable: noopPreGenerationHook

> `const` **noopPreGenerationHook**: [`PreGenerationHook`](#interface-pregenerationhook)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / toolDescriptions

# Variable: toolDescriptions

> `const` **toolDescriptions**: `Record`\<[`ToolName`](#type-alias-toolname), `string`\>

Shipped to the model on every call, which makes this the highest-leverage
documentation in the package — and the only one guaranteed to be in context.
Each entry states what the tool returns, what it does NOT return, the failure
mode the caller must handle, and the call that has to come first.

Every id below is an engine-issued entity id from `lookup_entity` or
`mention_entity`. A name is never an id: the tools that write reject one.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / toolJsonSchemas

# Variable: toolJsonSchemas

> `const` **toolJsonSchemas**: `Record`\<[`ToolName`](#type-alias-toolname), `object`\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / toolSchemas

# Variable: toolSchemas

> `const` **toolSchemas**: `object`

## Type Declaration

### sneq\_\_add\_constraint

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `rule`: `ZodUnknown`; \}, `$strip`\>

### sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `summary`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

### sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `$strip`\>

### sneq\_\_get\_relevant\_facts

> `readonly` **sneq\_\_get\_relevant\_facts**: `ZodObject`\<\{ `attributeKeys`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `depth`: `ZodOptional`\<`ZodUnion`\<readonly \[`ZodLiteral`\<`0`\>, `ZodLiteral`\<`1`\>\]\>\>; `entityId`: `ZodString`; \}, `$strip`\>

### sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

### sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `force`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

### sneq\_\_register\_fact

> `readonly` **sneq\_\_register\_fact**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `entityId`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<`ZodString`\>; `excerpt`: `ZodOptional`\<`ZodString`\>; `fiabilite`: `ZodEnum`\<\{ `CERTAINE`: `"CERTAINE"`; `RUMEUR_CONFIRMEE`: `"RUMEUR_CONFIRMEE"`; `TEMOIGNAGE`: `"TEMOIGNAGE"`; \}\>; `method`: `ZodEnum`\<\{ `AVEU`: `"AVEU"`; `DEDUCTION_CONFIRMEE`: `"DEDUCTION_CONFIRMEE"`; `DEMONSTRATION`: `"DEMONSTRATION"`; `DIALOGUE_DIRECT`: `"DIALOGUE_DIRECT"`; `DOCUMENT`: `"DOCUMENT"`; `OBSERVATION_VISUELLE`: `"OBSERVATION_VISUELLE"`; \}\>; `sceneId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\{ `DICE_ROLL`: `"DICE_ROLL"`; `GM_NARRATION`: `"GM_NARRATION"`; `PLAYER_UTTERANCE`: `"PLAYER_UTTERANCE"`; `SYSTEM`: `"SYSTEM"`; \}\>; `timestamp`: `ZodNumber`; \}, `$strip`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>

### sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>

### sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

### sneq\_\_validate\_narration

> `readonly` **sneq\_\_validate\_narration**: `ZodObject`\<\{ `narration`: `ZodString`; `strict`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>
