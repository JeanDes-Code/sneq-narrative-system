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
- [SneqContainmentError](#class-sneqcontainmenterror)
- [SneqContradictionError](#class-sneqcontradictionerror)
- [SneqEmbeddingDimError](#class-sneqembeddingdimerror)
- [SneqProviderError](#class-sneqprovidererror)
- [SneqUnknownEntityError](#class-snequnknownentityerror)
- [SneqUnknownHolderError](#class-snequnknownholdererror)
- [SneqValidationError](#class-sneqvalidationerror)
- [UserPromptRegistry](#class-userpromptregistry)
- [Validator](#class-validator)

## Interfaces

- [ActEffect](#interface-acteffect)
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
- [Avertissement](#interface-avertissement)
- [Belief](#interface-belief)
- [BeliefWorld](#interface-beliefworld)
- [BootstrapPlan](#interface-bootstrapplan)
- [BootstrapResult](#interface-bootstrapresult)
- [CampaignContextDeps](#interface-campaigncontextdeps)
- [CampaignMeta](#interface-campaignmeta)
- [CanonicalAttribute](#interface-canonicalattribute)
- [Carriage](#interface-carriage)
- [CarriageEffect](#interface-carriageeffect)
- [CarriageQuery](#interface-carriagequery)
- [ChatRequest](#interface-chatrequest)
- [ChatResponse](#interface-chatresponse)
- [CommitCarriageInput](#interface-commitcarriageinput)
- [CommitContext](#interface-commitcontext)
- [CommitEventInput](#interface-commiteventinput)
- [CommitHealth](#interface-commithealth)
- [CommitNarrativeBundle](#interface-commitnarrativebundle)
- [CommitNarrativeOptions](#interface-commitnarrativeoptions)
- [CommitNarrativeResult](#interface-commitnarrativeresult)
- [CommitPlan](#interface-commitplan)
- [ConfirmEntityMatchCommand](#interface-confirmentitymatchcommand)
- [ConfirmEntityMatchDecision](#interface-confirmentitymatchdecision)
- [ConfirmEntityMatchDecisionInput](#interface-confirmentitymatchdecisioninput)
- [ConfirmEntityMatchInput](#interface-confirmentitymatchinput)
- [ConfirmEntityMatchResult](#interface-confirmentitymatchresult)
- [ContainmentResult](#interface-containmentresult)
- [ContexteGeneratif](#interface-contextegeneratif)
- [Contrainte](#interface-contrainte)
- [CreateEntityCommand](#interface-createentitycommand)
- [CreateEntityDecision](#interface-createentitydecision)
- [CreateEntityDecisionInput](#interface-createentitydecisioninput)
- [DefaultDepsOptions](#interface-defaultdepsoptions)
- [DispatchPolicy](#interface-dispatchpolicy)
- [DispatchRoute](#interface-dispatchroute)
- [DispatchRule](#interface-dispatchrule)
- [DoctorCheck](#interface-doctorcheck)
- [DoctorInput](#interface-doctorinput)
- [DoctorReport](#interface-doctorreport)
- [Embedder](#interface-embedder)
- [EmbeddingRequest](#interface-embeddingrequest)
- [EmbeddingResponse](#interface-embeddingresponse)
- [EngineConfig](#interface-engineconfig)
- [Entity](#interface-entity)
- [EntityCandidateSummary](#interface-entitycandidatesummary)
- [EntityLike](#interface-entitylike)
- [EntityWithScore](#interface-entitywithscore)
- [EventAct](#interface-eventact)
- [GroupHolder](#interface-groupholder)
- [HolderContext](#interface-holdercontext)
- [HolderContextArgs](#interface-holdercontextargs)
- [HolderContextInput](#interface-holdercontextinput)
- [HolderResolution](#interface-holderresolution)
- [HolderResolutionInput](#interface-holderresolutioninput)
- [IndividualHolder](#interface-individualholder)
- [IngestedPlayerInput](#interface-ingestedplayerinput)
- [IntraCommitConflict](#interface-intracommitconflict)
- [InventionTransition](#interface-inventiontransition)
- [LegacyCampaignInput](#interface-legacycampaigninput)
- [LegacyFact](#interface-legacyfact)
- [LegacyMigrationOutput](#interface-legacymigrationoutput)
- [Logger](#interface-logger)
- [MentionInput](#interface-mentioninput)
- [MigrationFinding](#interface-migrationfinding)
- [NarrationGateContext](#interface-narrationgatecontext)
- [NarrationGateHook](#interface-narrationgatehook)
- [NarrationGateInput](#interface-narrationgateinput)
- [NarrationIssue](#interface-narrationissue)
- [NarrativeEvent](#interface-narrativeevent)
- [NewCampaignInput](#interface-newcampaigninput)
- [NoeudGCN](#interface-noeudgcn)
- [Observation](#interface-observation)
- [OfficialRecord](#interface-officialrecord)
- [Potentialite](#interface-potentialite)
- [PredictionEvent](#interface-predictionevent)
- [PreGenerationHook](#interface-pregenerationhook)
- [ProjectionInputs](#interface-projectioninputs)
- [PromotionContext](#interface-promotioncontext)
- [Provider](#interface-provider)
- [ProviderChain](#interface-providerchain)
- [ProviderRef](#interface-providerref)
- [ProviderUsage](#interface-providerusage)
- [ProvisionalInvention](#interface-provisionalinvention)
- [ReglePropagation](#interface-reglepropagation)
- [Repository](#interface-repository)
- [ResolutionResult](#interface-resolutionresult)
- [ResolvedCandidate](#interface-resolvedcandidate)
- [ResolveOptions](#interface-resolveoptions)
- [ResolverThresholds](#interface-resolverthresholds)
- [RouterConfig](#interface-routerconfig)
- [RouterDeps](#interface-routerdeps)
- [RouterTiers](#interface-routertiers)
- [SalienceFactors](#interface-saliencefactors)
- [Scene](#interface-scene)
- [SetSceneCommand](#interface-setscenecommand)
- [SetSceneDecision](#interface-setscenedecision)
- [SetSceneDecisionInput](#interface-setscenedecisioninput)
- [SetSceneResult](#interface-setsceneresult)
- [SuggestionResult](#interface-suggestionresult)
- [Tendance](#interface-tendance)
- [TokenWorld](#interface-tokenworld)
- [ToolCallContext](#interface-toolcallcontext)
- [TranscriptEntry](#interface-transcriptentry)
- [TranscriptFilterResult](#interface-transcriptfilterresult)
- [Turn](#interface-turn)
- [ValidationContext](#interface-validationcontext)
- [ValidationFailure](#interface-validationfailure)
- [ValidationFailureDetail](#interface-validationfailuredetail)
- [ValidationReport](#interface-validationreport)
- [ValidationResult](#interface-validationresult)
- [ValidatorOptions](#interface-validatoroptions)
- [VectorSearchOpts](#interface-vectorsearchopts)
- [WorldHealth](#interface-worldhealth)
- [WorldHealthInput](#interface-worldhealthinput)

## Type Aliases

- [AliasSource](#type-alias-aliassource)
- [AskUserFn](#type-alias-askuserfn)
- [AttributValue](#type-alias-attributvalue)
- [BeliefCertainty](#type-alias-beliefcertainty)
- [BootstrapRepo](#type-alias-bootstraprepo)
- [CampaignContextInvalidationReason](#type-alias-campaigncontextinvalidationreason)
- [CampaignId](#type-alias-campaignid)
- [CanonicalSource](#type-alias-canonicalsource)
- [CarriageId](#type-alias-carriageid)
- [CarriageRoute](#type-alias-carriageroute)
- [CategorieAttribut](#type-alias-categorieattribut)
- [CheckStatus](#type-alias-checkstatus)
- [ConstraintId](#type-alias-constraintid)
- [ConstraintRole](#type-alias-constraintrole)
- [ConstraintStatus](#type-alias-constraintstatus)
- [ContrainteSource](#type-alias-contraintesource)
- [CreateEntityResult](#type-alias-createentityresult)
- [DerogationReason](#type-alias-derogationreason)
- [EntityID](#type-alias-entityid)
- [EntityType](#type-alias-entitytype)
- [EtatAttribut](#type-alias-etatattribut)
- [EventId](#type-alias-eventid)
- [FactId](#type-alias-factid)
- [Fiabilite](#type-alias-fiabilite)
- [Holder](#type-alias-holder)
- [HolderId](#type-alias-holderid)
- [InventionId](#type-alias-inventionid)
- [InventionStatus](#type-alias-inventionstatus)
- [InventionTokenRejection](#type-alias-inventiontokenrejection)
- [MentionResult](#type-alias-mentionresult)
- [MigrationFindingKind](#type-alias-migrationfindingkind)
- [NarrationVerdict](#type-alias-narrationverdict)
- [ObservationMethod](#type-alias-observationmethod)
- [ObservationSource](#type-alias-observationsource)
- [PromotionDecision](#type-alias-promotiondecision)
- [PromotionEvidence](#type-alias-promotionevidence)
- [ProviderErrorCode](#type-alias-providererrorcode)
- [ProviderKind](#type-alias-providerkind)
- [RecordId](#type-alias-recordid)
- [RegleContrainte](#type-alias-reglecontrainte)
- [RepositoryAccess](#type-alias-repositoryaccess)
- [ResolutionRoad](#type-alias-resolutionroad)
- [SalienceWeights](#type-alias-salienceweights)
- [SceneId](#type-alias-sceneid)
- [Tier](#type-alias-tier)
- [ToolCommitBundle](#type-alias-toolcommitbundle)
- [ToolName](#type-alias-toolname)
- [TypeRelation](#type-alias-typerelation)

## Variables

- [ADVERTISED\_TOOL\_NAMES](#variable-advertised_tool_names)
- [DEFAULT\_GROUP\_HOLDER\_ID](#variable-default_group_holder_id)
- [DEFAULT\_MAX\_DISPATCH\_FANOUT](#variable-default_max_dispatch_fanout)
- [DEFAULT\_REALM\_ENTITY\_ID](#variable-default_realm_entity_id)
- [DEFAULT\_SALIENCE\_WEIGHTS](#variable-default_salience_weights)
- [defaultNarrationGateHook](#variable-defaultnarrationgatehook)
- [noopLogger](#variable-nooplogger)
- [noopPreGenerationHook](#variable-nooppregenerationhook)
- [OPERATION\_RETENTION](#variable-operation_retention)
- [PUBLIC\_TAG](#variable-public_tag)
- [SNEQ\_ENGINE\_VERSION](#variable-sneq_engine_version)
- [toolDescriptions](#variable-tooldescriptions)
- [toolJsonSchemas](#variable-tooljsonschemas)
- [ToolNames](#variable-toolnames)
- [toolSchemas](#variable-toolschemas)

## Functions

- [anthropicTools](#function-anthropictools)
- [applyContainment](#function-applycontainment)
- [asCampaignId](#function-ascampaignid)
- [asCarriageId](#function-ascarriageid)
- [asConstraintId](#function-asconstraintid)
- [asEntityID](#function-asentityid)
- [asEventId](#function-aseventid)
- [asFactId](#function-asfactid)
- [asHolderId](#function-asholderid)
- [asInventionId](#function-asinventionid)
- [asRecordId](#function-asrecordid)
- [asSceneId](#function-assceneid)
- [assertContainment](#function-assertcontainment)
- [bootstrapCampaign](#function-bootstrapcampaign)
- [bootstrapPlan](#function-bootstrapplan)
- [buildHolderContext](#function-buildholdercontext)
- [checkContainment](#function-checkcontainment)
- [commitNarrative](#function-commitnarrative)
- [computeSalience](#function-computesalience)
- [createDefaultDeps](#function-createdefaultdeps)
- [decideAddConstraint](#function-decideaddconstraint)
- [decideAdvanceTurn](#function-decideadvanceturn)
- [decideCommitNarrative](#function-decidecommitnarrative)
- [decideConfirmEntityMatch](#function-decideconfirmentitymatch)
- [decideCreateEntity](#function-decidecreateentity)
- [decidePromotion](#function-decidepromotion)
- [decideSetScene](#function-decidesetscene)
- [defaultRouterConfig](#function-defaultrouterconfig)
- [deriveBeliefs](#function-derivebeliefs)
- [detectPlayerUptake](#function-detectplayeruptake)
- [detectUptake](#function-detectuptake)
- [dispatchToolCall](#function-dispatchtoolcall)
- [filterTranscript](#function-filtertranscript)
- [forbiddenTokensFor](#function-forbiddentokensfor)
- [geminiTools](#function-geminitools)
- [genericTools](#function-generictools)
- [loadConfigFromFile](#function-loadconfigfromfile)
- [migrateLegacyCampaign](#function-migratelegacycampaign)
- [openAITools](#function-openaitools)
- [rebuildProjection](#function-rebuildprojection)
- [renderContextBlock](#function-rendercontextblock)
- [resolveHolder](#function-resolveholder)
- [runDoctor](#function-rundoctor)
- [surfaceTokensOf](#function-surfacetokensof)
- [tick](#function-tick)
- [validateInventionTokens](#function-validateinventiontokens)
- [validateSuppliedTokens](#function-validatesuppliedtokens)
- [validateValue](#function-validatevalue)
- [worldHealth](#function-worldhealth)


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

[`CampaignContextDeps`](#interface-campaigncontextdeps)

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

###### role

[`ConstraintRole`](#type-alias-constraintrole)

###### rule

[`RegleContrainte`](#type-alias-reglecontrainte)

#### Returns

`Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`addConstraint`](#interface-toolcallcontext)

***

### advanceTurn()

> **advanceTurn**(`input?`): `Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `turnNumber`: `number`; `worldDay`: `number`; \}\>

Phase H (§11), and the out-of-band clock road (#20). `days` is downtime and
session breaks — the fiction's own elapsed time rides on
`commitNarrative.daysElapsed`, because that is the call carrying the events
the time applies to. Moving the clock here also lands the carriages whose
journeys end in the interval, which is why the health report comes back
with the turn number: somebody has to run the world, and if that somebody
is the GM model, a deaf world is the default outcome (§6.1).

#### Parameters

##### input?

###### days?

`number`

###### summary?

`string`

#### Returns

`Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `turnNumber`: `number`; `worldDay`: `number`; \}\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`advanceTurn`](#interface-toolcallcontext)

***

### assertContainment()

> **assertContainment**(`input`): `Promise`\<[`ContainmentResult`](#interface-containmentresult)\>

Phase D (§11) — the decisive seam. The host composes whatever it wants and
submits the final string; SNEQ answers whether it carries a token this
holder cannot hold. Default posture is to throw, because a containment
failure is an engine bug, not a gameplay outcome. Pass `throwOnFail: false`
when you want the report instead.

#### Parameters

##### input

###### entityId?

[`EntityID`](#type-alias-entityid)

###### holderId?

[`HolderId`](#type-alias-holderid)

###### text

`string`

###### throwOnFail?

`boolean`

#### Returns

`Promise`\<[`ContainmentResult`](#interface-containmentresult)\>

***

### commitNarrative()

> **commitNarrative**(`bundle`): `Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

The single write (§5.1), on the campaign. Idempotent by `operationId`: a
retry replays the recorded result rather than writing twice.

#### Parameters

##### bundle

[`ToolCommitBundle`](#type-alias-toolcommitbundle)

#### Returns

`Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`commitNarrative`](#interface-toolcallcontext)

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

### doctor()

> **doctor**(`opts?`): `Promise`\<[`DoctorReport`](#interface-doctorreport)\>

§12.4's conformance harness, over this campaign's persisted state.

#### Parameters

##### opts?

###### staleAfterTurns?

`number`

#### Returns

`Promise`\<[`DoctorReport`](#interface-doctorreport)\>

***

### filterTranscript()

> **filterTranscript**(`input`): `Promise`\<[`TranscriptFilterResult`](#interface-transcriptfilterresult)\>

Phase C (§11) — which transcript entries this holder may still see. Without
it the guarantee expires after one turn: turn 2's prompt replays turn 1's
prose, and no per-call filter can help.

#### Parameters

##### input

###### entityId?

[`EntityID`](#type-alias-entityid)

###### entries

[`TranscriptEntry`](#interface-transcriptentry)[]

###### holderId?

[`HolderId`](#type-alias-holderid)

#### Returns

`Promise`\<[`TranscriptFilterResult`](#interface-transcriptfilterresult)\>

***

### gateNarration()

> **gateNarration**(`input`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

Phase F's spelling for hosts that read the pipeline names rather than the 0.3 ones.

#### Parameters

##### input

[`NarrationGateInput`](#interface-narrationgateinput)

#### Returns

`Promise`\<[`ValidationReport`](#interface-validationreport)\>

***

### getDispatchPolicy()

> **getDispatchPolicy**(): `Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

#### Returns

`Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

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

### getHolderContext()

> **getHolderContext**(`args`): `Promise`\<[`HolderContext`](#interface-holdercontext)\>

Phase B (§11), the only read of world knowledge on the surface — and it is always somebody's.

#### Parameters

##### args

[`HolderContextArgs`](#interface-holdercontextargs)

#### Returns

`Promise`\<[`HolderContext`](#interface-holdercontext)\>

#### Implementation of

[`ToolCallContext`](#interface-toolcallcontext).[`getHolderContext`](#interface-toolcallcontext)

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

### ingestPlayerInput()

> **ingestPlayerInput**(`input`): `Promise`\<[`IngestedPlayerInput`](#interface-ingestedplayerinput)\>

Phase A (§11) — the ingress that closes §2.6's hole. Before this, nothing
ever handed SNEQ the raw player utterance, so `promotionEvidence[]` was
supplied by the caller and the model decided its own promotions: exactly
what §2.6 forbids.

What comes back is a preview. The detection that counts runs again inside
`commitNarrative` from `playerUtterance`, where it cannot be edited on the
way.

#### Parameters

##### input

###### entityId?

[`EntityID`](#type-alias-entityid)

###### holderId?

[`HolderId`](#type-alias-holderid)

###### text

`string`

#### Returns

`Promise`\<[`IngestedPlayerInput`](#interface-ingestedplayerinput)\>

***

### listHolders()

> **listHolders**(): `Promise`\<[`Holder`](#type-alias-holder)[]\>

#### Returns

`Promise`\<[`Holder`](#type-alias-holder)[]\>

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

> **prepareTurn**(`opts?`): `Promise`\<\{ `day`: `number`; `holder`: [`HolderContext`](#interface-holdercontext) \| `null`; `presentEntities`: [`Entity`](#interface-entity)[]; `scene`: [`Scene`](#interface-scene) \| `null`; `turn`: `number`; \}\>

The wake-up probe (#21). Holderless it returns the **frame** the host
authored and nothing else — day, turn, scene, who is present by identity.
No holder knowledge, so no way to read the world sideways through it.
With a holder or an entity it also carries that holder's context, so a
turn starts in one call.

`scene: null` is a literal, distinct answer: nobody has said where the
player is. Ask the human — never guess.

#### Parameters

##### opts?

###### entityId?

[`EntityID`](#type-alias-entityid)

###### holderId?

[`HolderId`](#type-alias-holderid)

###### topK?

`number`

#### Returns

`Promise`\<\{ `day`: `number`; `holder`: [`HolderContext`](#interface-holdercontext) \| `null`; `presentEntities`: [`Entity`](#interface-entity)[]; `scene`: [`Scene`](#interface-scene) \| `null`; `turn`: `number`; \}\>

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

### setDispatchPolicy()

> **setDispatchPolicy**(`patch`): `Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

Additive, like the bundle's `policy` (#15): routes and rules accrete, they never replace.

#### Parameters

##### patch

`Partial`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

#### Returns

`Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

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

### upsertHolder()

> **upsertHolder**(`holder`): `Promise`\<`void`\>

#### Parameters

##### holder

[`Holder`](#type-alias-holder)

#### Returns

`Promise`\<`void`\>

***

### validateNarration()

> **validateNarration**(`input`): `Promise`\<[`ValidationReport`](#interface-validationreport)\>

Phase F (§11) — holder-aware, and able to withhold. Without `holderId` this
is 0.3's behaviour and says so: proper nouns only, nothing about
entitlement. With one, the narration is also run through containment, and
a leak comes back `BLOCK`.

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

> `readonly` **jsonSchema**: `Record`\<`"sneq__lookup_entity"` \| `"sneq__get_entity"` \| `"sneq__get_holder_context"` \| `"sneq__suggest_existing"` \| `"sneq__mention_entity"` \| `"sneq__commit_narrative"` \| `"sneq__add_constraint"` \| `"sneq__set_scene"` \| `"sneq__advance_turn"` \| `"sneq__validate_narration"`, `object`\> = `jsonSchemas`

#### openai

> `readonly` **openai**: `object`[]

#### zod

> `readonly` **zod**: `object` = `zodSchemas`

##### zod.sneq\_\_add\_constraint

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `role`: `ZodUnion`\<readonly \[`ZodObject`\<\{ `role`: `ZodLiteral`\<`"REGLE_MONDE"`\>; `ruleId`: `ZodString`; \}, `$strip`\>, `ZodObject`\<\{ `confidence`: `ZodNumber`; `role`: `ZodLiteral`\<`"INFERENCE_IA"`\>; \}, `$strip`\>, `ZodObject`\<\{ `factId`: `ZodString`; `role`: `ZodLiteral`\<`"FAIT_CANONIQUE"`\>; \}, `$strip`\>, `ZodObject`\<\{ `edgeKey`: `ZodString`; `role`: `ZodLiteral`\<`"RELATION"`\>; \}, `$strip`\>\]\>; `rule`: `ZodUnknown`; \}, `$strip`\>

##### zod.sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `days`: `ZodOptional`\<`ZodNumber`\>; `summary`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

##### zod.sneq\_\_commit\_narrative

> `readonly` **sneq\_\_commit\_narrative**: `ZodObject`\<\{ `carriageEffects`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carriageId`: `ZodString`; `declaredOnDay`: `ZodNumber`; `effect`: `ZodUnion`\<readonly \[`ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>\]\>; \}, `$strip`\>\>\>; `carriages`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carriageId`: `ZodString`; `carrier`: `ZodString`; `fromPlaceId`: `ZodString`; `minStanding`: `ZodOptional`\<`ZodNumber`\>; `route`: `ZodEnum`\<\{ `OFFICIAL`: `"OFFICIAL"`; `RUMOUR`: `"RUMOUR"`; \}\>; `subject`: `ZodUnion`\<readonly \[`ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>\]\>; `toPlaceId`: `ZodString`; `travelDays`: `ZodNumber`; \}, `$strip`\>\>\>; `daysElapsed`: `ZodNumber`; `event`: `ZodOptional`\<`ZodObject`\<\{ `acts`: `ZodArray`\<`ZodObject`\<\{ `actorId`: `ZodString`; `objectId`: `ZodOptional`\<...\>; `sets`: `ZodOptional`\<...\>; `value`: `ZodOptional`\<...\>; `verb`: `ZodString`; \}, `$strip`\>\>; `circumstance`: `ZodString`; `eventId`: `ZodString`; `gravity`: `ZodUnion`\<readonly \[`ZodLiteral`\<`0`\>, `ZodLiteral`\<`1`\>, `ZodLiteral`\<`2`\>, `ZodLiteral`\<`3`\>\]\>; `participants`: `ZodArray`\<`ZodString`\>; `placeId`: `ZodOptional`\<`ZodString`\>; `surfaceTokens`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>\>; `holders`: `ZodOptional`\<`ZodArray`\<`ZodUnion`\<readonly \[`ZodObject`\<\{ `community`: `ZodString`; `holderId`: `ZodString`; `kind`: `ZodLiteral`\<...\>; `placeId`: `ZodString`; `realmId`: `ZodString`; `standing`: `ZodNumber`; `stratum`: `ZodString`; \}, `$strip`\>, `ZodObject`\<\{ `baseGroupId`: `ZodString`; `derogationReason`: `ZodEnum`\<...\>; `entityId`: `ZodString`; `holderId`: `ZodString`; `kind`: `ZodLiteral`\<...\>; `standingOverride`: `ZodOptional`\<...\>; \}, `$strip`\>\]\>\>\>; `inventions`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `confidence`: `ZodNumber`; `entityId`: `ZodString`; `inventionId`: `ZodString`; `sourceNarration`: `ZodString`; `surfaceTokens`: `ZodArray`\<`ZodString`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>\>\>; `operationId`: `ZodString`; `playerUtterance`: `ZodOptional`\<`ZodString`\>; `policy`: `ZodOptional`\<`ZodObject`\<\{ `routes`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `fromPlaceId`: ...; `minStanding`: ...; `route`: ...; `toPlaceId`: ...; `travelDays`: ...; \}, `$strip`\>\>\>; `rules`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carrierLabel`: ...; `minGravity`: ...; `route`: ...; `targets`: ...; \}, `$strip`\>\>\>; \}, `$strip`\>\>; `promotionEvidence`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `evidence`: `ZodUnion`\<readonly \[`ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>, `ZodObject`\<..., ...\>\]\>; `inventionId`: `ZodString`; \}, `$strip`\>\>\>; `records`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `aboutEventId`: `ZodOptional`\<`ZodString`\>; `authoredBy`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `entityId`: `ZodString`; `key`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<...\>; `excerpt`: `ZodOptional`\<...\>; `method`: `ZodEnum`\<...\>; `sceneId`: `ZodOptional`\<...\>; `source`: `ZodEnum`\<...\>; `timestamp`: `ZodNumber`; \}, `$strict`\>; `recordId`: `ZodString`; `route`: `ZodEnum`\<\{ `OFFICIAL`: `"OFFICIAL"`; `RUMOUR`: `"RUMOUR"`; \}\>; `surfaceTokens`: `ZodArray`\<`ZodString`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>\>\>; \}, `$strip`\>

##### zod.sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `$strip`\>

##### zod.sneq\_\_get\_holder\_context

> `readonly` **sneq\_\_get\_holder\_context**: `ZodObject`\<\{ `about`: `ZodOptional`\<`ZodString`\>; `entityId`: `ZodOptional`\<`ZodString`\>; `holderId`: `ZodOptional`\<`ZodString`\>; `topK`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\> = `holderContextArgs`

##### zod.sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

##### zod.sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `force`: `ZodOptional`\<`ZodBoolean`\>; `public`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

##### zod.sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>

##### zod.sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

##### zod.sneq\_\_validate\_narration

> `readonly` **sneq\_\_validate\_narration**: `ZodObject`\<\{ `holderId`: `ZodOptional`\<`ZodString`\>; `narration`: `ZodString`; `strict`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

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

[sneq-engine API](#sneq-engine-api) / SneqContainmentError

# Class: SneqContainmentError

A composed payload contains a token this holder cannot hold (§11 phase D).
Default posture: throw — "the engine is broken, stop". A containment failure
is an engine bug, never a gameplay outcome.

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqContainmentError**(`holderId`, `forbidden`, `present`): `SneqContainmentError`

#### Parameters

##### holderId

`string`

##### forbidden

`string`[]

##### present

`string`[]

#### Returns

`SneqContainmentError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### forbidden

> `readonly` **forbidden**: `string`[]

***

### holderId

> `readonly` **holderId**: `string`

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

### present

> `readonly` **present**: `string`[]

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

> **new SneqContradictionError**(`contradictions`, `message?`): `SneqContradictionError`

#### Parameters

##### contradictions

[`CanonicalAttribute`](#interface-canonicalattribute)[] \| [`IntraCommitConflict`](#interface-intracommitconflict)[]

##### message?

`string`

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

> `readonly` **contradictions**: [`CanonicalAttribute`](#interface-canonicalattribute)[] \| [`IntraCommitConflict`](#interface-intracommitconflict)[]

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

[sneq-engine API](#sneq-engine-api) / SneqEmbeddingDimError

# Class: SneqEmbeddingDimError

A vector does not match the campaign's stored dimension (§14.5). The old
message said *what* to do ("use a fresh database file") and never *why*, and
it arrived after the campaign was already unusable. There is a migration
now, so the message names it.

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqEmbeddingDimError**(`campaignId`, `stored`, `got`): `SneqEmbeddingDimError`

#### Parameters

##### campaignId

`string`

##### stored

`number`

##### got

`number`

#### Returns

`SneqEmbeddingDimError`

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

### got

> `readonly` **got**: `number`

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

### stored

> `readonly` **stored**: `number`

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

[sneq-engine API](#sneq-engine-api) / SneqUnknownHolderError

# Class: SneqUnknownHolderError

A holder id reached the engine and no holder answers to it. Distinct from
"this holder knows nothing", which is an empty belief list plus an explain
line — the #21 null doctrine keeps the three states apart, and conflating
them is the Cassius Vorentius bug.

## Extends

- `Error`

## Constructors

### Constructor

> **new SneqUnknownHolderError**(`holderId`): `SneqUnknownHolderError`

#### Parameters

##### holderId

`string`

#### Returns

`SneqUnknownHolderError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### holderId

> `readonly` **holderId**: `string`

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

[sneq-engine API](#sneq-engine-api) / ActEffect

# Interface: ActEffect

The act's declared canonical effect (#27): an act projects into
`CanonicalAttribute` ONLY through this — the engine never interprets `verb`.

## Properties

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### key

> **key**: `string`

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

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

### role

> **role**: [`ConstraintRole`](#type-alias-constraintrole)

REQUIRED (#19): the founding is explicit now, never inferred.

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

### role

> **role**: [`ConstraintRole`](#type-alias-constraintrole)

REQUIRED (#19): the founding is explicit now, never inferred.

#### Inherited from

[`AddConstraintCommand`](#interface-addconstraintcommand).[`role`](#interface-addconstraintcommand)

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

### setScene()

> **setScene**(`command`): `Promise`\<[`SetSceneResult`](#interface-setsceneresult)\>

#### Parameters

##### command

[`SetSceneCommand`](#interface-setscenecommand)

#### Returns

`Promise`\<[`SetSceneResult`](#interface-setsceneresult)\>

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

[sneq-engine API](#sneq-engine-api) / Belief

# Interface: Belief

What a holder knows (§2.5) — derived, NEVER stored. A pure function of
(events, records, carriages, effects, holders, today). WITNESSED beliefs are
not negotiable by later records: the player floor generalized to every NPC.

## Properties

### certainty

> **certainty**: [`BeliefCertainty`](#type-alias-beliefcertainty)

From event.participants — "you were there" is not negotiable.

***

### content

> **content**: `string`

***

### factors

> **factors**: [`SalienceFactors`](#interface-saliencefactors)

***

### fiabilite

> **fiabilite**: [`Fiabilite`](#type-alias-fiabilite)

The 0.3 vocabulary, finally on the right object (#18).

***

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### learnedOnDay

> **learnedOnDay**: `number`

***

### method

> **method**: [`ObservationMethod`](#type-alias-observationmethod)

***

### salience

> **salience**: `number`

***

### subject

> **subject**: \{ `id`: [`EventId`](#type-alias-eventid); `kind`: `"EVENT"`; \} \| \{ `id`: [`RecordId`](#type-alias-recordid); `kind`: `"RECORD"`; \}

***

### viaCarrier?

> `optional` **viaCarrier?**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / BeliefWorld

# Interface: BeliefWorld

## Properties

### carriageEffects

> **carriageEffects**: [`CarriageEffect`](#interface-carriageeffect)[]

***

### carriages

> **carriages**: [`Carriage`](#interface-carriage)[]

***

### defaultGroupId

> **defaultGroupId**: [`HolderId`](#type-alias-holderid)

The bootstrap default group (§2.3) — LEGACY_CANON events are known here (#17).

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### holders

> **holders**: [`Holder`](#type-alias-holder)[]

***

### records

> **records**: [`OfficialRecord`](#interface-officialrecord)[]

***

### salienceWeights?

> `optional` **salienceWeights?**: [`SalienceFactors`](#interface-saliencefactors)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / BootstrapPlan

# Interface: BootstrapPlan

## Extends

- [`BootstrapResult`](#interface-bootstrapresult)

## Properties

### defaultGroup

> **defaultGroup**: [`GroupHolder`](#interface-groupholder)

***

### defaultGroupId

> **defaultGroupId**: [`HolderId`](#type-alias-holderid)

#### Inherited from

[`BootstrapResult`](#interface-bootstrapresult).[`defaultGroupId`](#interface-bootstrapresult)

***

### defaultRealmId

> **defaultRealmId**: [`EntityID`](#type-alias-entityid)

#### Inherited from

[`BootstrapResult`](#interface-bootstrapresult).[`defaultRealmId`](#interface-bootstrapresult)

***

### policy

> **policy**: [`DispatchPolicy`](#interface-dispatchpolicy)

***

### realmEntity

> **realmEntity**: [`Entity`](#interface-entity)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / BootstrapResult

# Interface: BootstrapResult

## Extended by

- [`BootstrapPlan`](#interface-bootstrapplan)

## Properties

### defaultGroupId

> **defaultGroupId**: [`HolderId`](#type-alias-holderid)

***

### defaultRealmId

> **defaultRealmId**: [`EntityID`](#type-alias-entityid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CampaignContextDeps

# Interface: CampaignContextDeps

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### embedder

> **embedder**: [`Embedder`](#interface-embedder) \| `null`

null = keyless mode (no embeddings tier): entities are stored without vectors.

***

### lifecycle?

> `optional` **lifecycle?**: `CampaignLifecycle`

***

### logger

> **logger**: [`Logger`](#interface-logger)

***

### maxDispatchFanout?

> `optional` **maxDispatchFanout?**: `number`

Fan-out cap for ALL_KNOWN_COMMUNITIES dispatch (#15).

***

### narrationGate

> **narrationGate**: [`NarrationGateRegistry`](#class-narrationgateregistry)

***

### preGen

> **preGen**: [`PreGenerationRegistry`](#class-pregenerationregistry)

***

### repo

> **repo**: [`RepositoryAccess`](#type-alias-repositoryaccess)

***

### resolver

> **resolver**: [`Resolver`](#class-resolver)

***

### router

> **router**: [`Router`](#class-router)

***

### salienceWeights?

> `optional` **salienceWeights?**: [`SalienceFactors`](#interface-saliencefactors)

Salience weights override (§2.5) — the factor list itself is fixed.

***

### userPrompt

> **userPrompt**: [`UserPromptRegistry`](#class-userpromptregistry)

***

### writeStrategy?

> `optional` **writeStrategy?**: [`AtomicWriteStrategy`](#interface-atomicwritestrategy)

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

[sneq-engine API](#sneq-engine-api) / CanonicalAttribute

# Interface: CanonicalAttribute

Current-state projection over the ledger (§2.6, #27) — replace-on-key is
state evolution; history lives in events and invention transitions.
Written only by the projection fold, never directly.

## Properties

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### day

> **day**: `number`

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

### observation?

> `optional` **observation?**: [`Observation`](#interface-observation)

Present on LEGACY_FACT copies; EVENT/PROMOTED_INVENTION rows carry provenance in `source`.

***

### source

> **source**: [`CanonicalSource`](#type-alias-canonicalsource)

***

### turn

> **turn**: `number`

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Carriage

# Interface: Carriage

What travels (§2.4). An OFFICIAL carriage with originRealm !==
destinationRealm delivers nothing — a structural halt, not an attenuation.

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### carriageId

> **carriageId**: [`CarriageId`](#type-alias-carriageid)

***

### carrier

> **carrier**: `string`

NAMED → traceable, interceptable.

***

### departedDay

> **departedDay**: `number`

***

### destinationRealm

> **destinationRealm**: [`EntityID`](#type-alias-entityid)

Engine-stamped at dispatch from toPlaceId (#26).

***

### fromPlaceId

> **fromPlaceId**: [`EntityID`](#type-alias-entityid)

***

### minStanding?

> `optional` **minStanding?**: `number`

***

### originRealm

> **originRealm**: [`EntityID`](#type-alias-entityid)

Engine-stamped at dispatch from fromPlaceId (#26) — never caller-supplied.

***

### route

> **route**: [`CarriageRoute`](#type-alias-carriageroute)

***

### subject

> **subject**: \{ `id`: [`EventId`](#type-alias-eventid); `kind`: `"EVENT"`; \} \| \{ `id`: [`RecordId`](#type-alias-recordid); `kind`: `"RECORD"`; \}

***

### toPlaceId

> **toPlaceId**: [`EntityID`](#type-alias-entityid)

***

### travelDays

> **travelDays**: `number`

The GAME supplies this number; SNEQ owns no map.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CarriageEffect

# Interface: CarriageEffect

Append-only — interception is gameplay, with provenance. Arrival is
derived: departedDay + travelDays + Σ delays; CANCEL never arrives;
DISCREDIT degrades reliability without touching arrival.

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### carriageId

> **carriageId**: [`CarriageId`](#type-alias-carriageid)

***

### causedByEventId

> **causedByEventId**: [`EventId`](#type-alias-eventid)

The bribe/ambush IS an event.

***

### day

> **day**: `number`

***

### effect

> **effect**: \{ `days`: `number`; `kind`: `"DELAY"`; \} \| \{ `kind`: `"CANCEL"`; \} \| \{ `kind`: `"DISCREDIT"`; \}

***

### effectId

> **effectId**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CarriageQuery

# Interface: CarriageQuery

## Properties

### arrivedBy?

> `optional` **arrivedBy?**: `number`

Derived arrival ≤ this day: departedDay + travelDays + Σ DELAY; CANCEL never arrives.

***

### toPlaceId?

> `optional` **toPlaceId?**: [`EntityID`](#type-alias-entityid)

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

[sneq-engine API](#sneq-engine-api) / CommitCarriageInput

# Interface: CommitCarriageInput

## Properties

### carriageId

> **carriageId**: [`CarriageId`](#type-alias-carriageid)

***

### carrier

> **carrier**: `string`

***

### fromPlaceId

> **fromPlaceId**: [`EntityID`](#type-alias-entityid)

***

### minStanding?

> `optional` **minStanding?**: `number`

***

### route

> **route**: [`CarriageRoute`](#type-alias-carriageroute)

***

### subject

> **subject**: \{ `id`: [`EventId`](#type-alias-eventid); `kind`: `"EVENT"`; \} \| \{ `id`: [`RecordId`](#type-alias-recordid); `kind`: `"RECORD"`; \}

***

### toPlaceId

> **toPlaceId**: [`EntityID`](#type-alias-entityid)

***

### travelDays

> **travelDays**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitContext

# Interface: CommitContext

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### canon

> **canon**: [`CanonicalAttribute`](#interface-canonicalattribute)[]

***

### defaultRealmId

> **defaultRealmId**: [`EntityID`](#type-alias-entityid)

***

### holders

> **holders**: [`Holder`](#type-alias-holder)[]

Every holder the campaign already has. The GROUP ones are the
ALL_KNOWN_COMMUNITIES dispatch targets; the rest is what lets this pure
function tell a holder the bundle *creates* from one it *edits* (#46).

Replaced `communities` in 0.6.0 — a pure decision cannot check an edit
against a list it was never handed.

***

### inventions

> **inventions**: [`ProvisionalInvention`](#interface-provisionalinvention)[]

All PROVISIONAL inventions (for promotion + competition).

***

### latestTurn

> **latestTurn**: `number`

***

### maxDispatchFanout

> **maxDispatchFanout**: `number`

***

### places

> **places**: `object`[]

Realm membership of known places (#26); absent place → default realm.

#### id

> **id**: [`EntityID`](#type-alias-entityid)

#### realmId?

> `optional` **realmId?**: [`EntityID`](#type-alias-entityid)

***

### policy

> **policy**: [`DispatchPolicy`](#interface-dispatchpolicy)

***

### potentialites

> **potentialites**: [`Potentialite`](#interface-potentialite)[]

***

### worldDay

> **worldDay**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitEventInput

# Interface: CommitEventInput

## Properties

### acts

> **acts**: [`EventAct`](#interface-eventact)[]

***

### circumstance

> **circumstance**: `string`

***

### eventId

> **eventId**: [`EventId`](#type-alias-eventid)

***

### gravity

> **gravity**: `0` \| `1` \| `2` \| `3`

***

### participants

> **participants**: [`EntityID`](#type-alias-entityid)[]

***

### placeId?

> `optional` **placeId?**: [`EntityID`](#type-alias-entityid)

***

### surfaceTokens

> **surfaceTokens**: `string`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitHealth

# Interface: CommitHealth

## Properties

### truncated

> **truncated**: `number`

Targets dropped by the fan-out cap (#15) — counted, never silent.

***

### uncovered

> **uncovered**: `boolean`

No rule matched the event — a policy hole (§6.1).

***

### unroutable

> **unroutable**: `object`[]

A rule fired but no route reaches the target — a map hole (§6.1).

#### carrierLabel

> **carrierLabel**: `string`

#### toPlaceId

> **toPlaceId**: [`EntityID`](#type-alias-entityid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitNarrativeBundle

# Interface: CommitNarrativeBundle

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### carriageEffects?

> `optional` **carriageEffects?**: `Omit`\<[`CarriageEffect`](#interface-carriageeffect), `"campaignId"`\>[]

***

### carriages?

> `optional` **carriages?**: [`CommitCarriageInput`](#interface-commitcarriageinput)[]

***

### daysElapsed

> **daysElapsed**: `number`

REQUIRED (#20): the fiction declares its own elapsed time, every turn. 0 is legal.

***

### event?

> `optional` **event?**: [`CommitEventInput`](#interface-commiteventinput)

***

### holders?

> `optional` **holders?**: [`Holder`](#type-alias-holder)[]

***

### inventions?

> `optional` **inventions?**: `Omit`\<[`ProvisionalInvention`](#interface-provisionalinvention), `"campaignId"` \| `"introducedAtTurn"` \| `"introducedOnDay"` \| `"status"` \| `"lastReferencedTurn"`\>[]

***

### operationId

> **operationId**: `string`

***

### playerUtterance?

> `optional` **playerUtterance?**: `string`

The player's raw text this turn (§11 phase A). The engine substring-searches
it for every provisional invention's known `surfaceTokens` and adds the
`PLAYER_UPTAKE` evidence itself (#25) — promotion is detected at commit
time, never claimed by the model (§2.6).

Uptake needs an event to point at, so this only fires when the bundle
carries one: the utterance belongs on the ledger before it can promote
anything. Before 0.5.0 no tool, CLI command or bundle field ever handed
SNEQ this text, which is what made the model the judge of its own
inventions.

***

### policy?

> `optional` **policy?**: `Partial`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

Additive (#15): routes and rules accrete, they never replace.

***

### promotionEvidence?

> `optional` **promotionEvidence?**: `object`[]

#### evidence

> **evidence**: [`PromotionEvidence`](#type-alias-promotionevidence)

#### inventionId

> **inventionId**: [`InventionId`](#type-alias-inventionid)

***

### records?

> `optional` **records?**: `Omit`\<[`OfficialRecord`](#interface-officialrecord), `"campaignId"` \| `"day"` \| `"turn"`\>[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitNarrativeOptions

# Interface: CommitNarrativeOptions

## Properties

### defaultRealmId?

> `optional` **defaultRealmId?**: [`EntityID`](#type-alias-entityid)

The campaign's default realm entity (#26). Bootstrap creates it as `realm_default`.

***

### maxDispatchFanout?

> `optional` **maxDispatchFanout?**: `number`

***

### now?

> `optional` **now?**: () => `number`

#### Returns

`number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitNarrativeResult

# Interface: CommitNarrativeResult

## Properties

### carriages

> **carriages**: `number`

***

### eventId?

> `optional` **eventId?**: [`EventId`](#type-alias-eventid)

***

### health

> **health**: [`CommitHealth`](#interface-commithealth)

***

### newWorldDay

> **newWorldDay**: `number`

***

### promoted

> **promoted**: `number`

***

### quarantined

> **quarantined**: `string`[]

***

### replayed

> **replayed**: `boolean`

***

### turn

> **turn**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CommitPlan

# Interface: CommitPlan

## Properties

### canonicalUpdates

> **canonicalUpdates**: [`CanonicalAttribute`](#interface-canonicalattribute)[]

***

### carriageEffects

> **carriageEffects**: [`CarriageEffect`](#interface-carriageeffect)[]

***

### carriages

> **carriages**: [`Carriage`](#interface-carriage)[]

***

### event?

> `optional` **event?**: [`NarrativeEvent`](#interface-narrativeevent)

***

### health

> **health**: [`CommitHealth`](#interface-commithealth)

***

### holders

> **holders**: [`Holder`](#type-alias-holder)[]

***

### inventions

> **inventions**: [`ProvisionalInvention`](#interface-provisionalinvention)[]

***

### newWorldDay

> **newWorldDay**: `number`

***

### policyUpdate?

> `optional` **policyUpdate?**: [`DispatchPolicy`](#interface-dispatchpolicy)

***

### quarantined

> **quarantined**: [`ConstraintId`](#type-alias-constraintid)[]

***

### records

> **records**: [`OfficialRecord`](#interface-officialrecord)[]

***

### transitions

> **transitions**: [`InventionTransition`](#interface-inventiontransition)[]

***

### turn

> **turn**: `number`

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

[sneq-engine API](#sneq-engine-api) / ContainmentResult

# Interface: ContainmentResult

## Properties

### forbidden

> **forbidden**: `string`[]

***

### pass

> **pass**: `boolean`

***

### present

> **present**: `string`[]

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

***

### status?

> `optional` **status?**: [`ConstraintStatus`](#type-alias-constraintstatus)

Absent = ACTIVE. Only the quarantine path (#23) ever writes QUARANTINED.

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

[sneq-engine API](#sneq-engine-api) / DispatchPolicy

# Interface: DispatchPolicy

Auto-dispatch by game rule (§2.4). Lives in campaign state (#15); evolves
via additive bundle policy and the show/set-dispatch-policy CLI pair.

## Properties

### routes

> **routes**: [`DispatchRoute`](#interface-dispatchroute)[]

***

### rules

> **rules**: [`DispatchRule`](#interface-dispatchrule)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DispatchRoute

# Interface: DispatchRoute

Game-owned distances; lazy — a route exists once the fiction establishes it (#15).

## Properties

### fromPlaceId

> **fromPlaceId**: [`EntityID`](#type-alias-entityid)

***

### route

> **route**: [`CarriageRoute`](#type-alias-carriageroute)

***

### toPlaceId

> **toPlaceId**: [`EntityID`](#type-alias-entityid)

***

### travelDays

> **travelDays**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DispatchRule

# Interface: DispatchRule

## Properties

### carrierLabel

> **carrierLabel**: `string`

***

### minGravity

> **minGravity**: `1` \| `2` \| `3`

***

### route

> **route**: [`CarriageRoute`](#type-alias-carriageroute)

***

### targets

> **targets**: [`EntityID`](#type-alias-entityid)[] \| `"ALL_KNOWN_COMMUNITIES"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DoctorCheck

# Interface: DoctorCheck

## Properties

### id

> **id**: `string`

***

### message

> **message**: `string`

One line, written for whoever has to act on it. Names the fix when there is one.

***

### status

> **status**: [`CheckStatus`](#type-alias-checkstatus)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DoctorInput

# Interface: DoctorInput

## Properties

### campaignId

> **campaignId**: `string`

***

### day

> **day**: `number`

***

### dispatch?

> `optional` **dispatch?**: `object`

From the last commit's `CommitHealth`, when the campaign has committed at all.

#### truncated

> **truncated**: `number`

#### uncovered

> **uncovered**: `number`

#### unroutable

> **unroutable**: `number`

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### health

> **health**: [`WorldHealth`](#interface-worldhealth)

***

### holders

> **holders**: [`Holder`](#type-alias-holder)[]

***

### migrationFindings

> **migrationFindings**: [`MigrationFinding`](#interface-migrationfinding)[]

***

### potentialites

> **potentialites**: [`Potentialite`](#interface-potentialite)[]

***

### publicEntities

> **publicEntities**: `object`[]

Entities the ledger names that are declared common knowledge (`PUBLIC_TAG`)
— the floor's only authored exemption. A public entity no event mentions
exempts nothing, so it is not listed.

#### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

#### name

> **name**: `string`

***

### scene

> **scene**: [`Scene`](#interface-scene) \| `null`

***

### sceneEntityResolution

> **sceneEntityResolution**: `object`[]

Every entity id the scene names, with whether the campaign actually knows it.

#### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

#### known

> **known**: `boolean`

***

### staleAfterTurns?

> `optional` **staleAfterTurns?**: `number`

Turns without an appended event before the ledger is called stale (§6.2).

***

### turn

> **turn**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DoctorReport

# Interface: DoctorReport

## Properties

### campaignId

> **campaignId**: `string`

***

### checks

> **checks**: [`DoctorCheck`](#interface-doctorcheck)[]

***

### day

> **day**: `number`

***

### status

> **status**: [`CheckStatus`](#type-alias-checkstatus)

FAIL if any check failed, else WARN if any warned, else PASS.

***

### turn

> **turn**: `number`

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

### maxDispatchFanout?

> `optional` **maxDispatchFanout?**: `number`

Fan-out cap for ALL_KNOWN_COMMUNITIES dispatch (#15). The Convex bundle is
one transaction with a document-write ceiling; truncation is deterministic
(nearest declared travelDays first) and always counted, never silent.

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

### salienceWeights?

> `optional` **salienceWeights?**: [`SalienceFactors`](#interface-saliencefactors)

Salience weights override (§2.5) — the factor list itself is fixed.

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

### realmId?

> `optional` **realmId?**: [`EntityID`](#type-alias-entityid)

For place entities: the realm entity this place belongs to (#26). Entity
metadata, not a canonical attribute — conquest is a metadata update.
Absent = the campaign's default realm (`realmOf` fallback).

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

[sneq-engine API](#sneq-engine-api) / EntityLike

# Interface: EntityLike

The identity surface the engine can floor without NLP (#25).

## Properties

### aliases

> **aliases**: `string`[]

***

### id

> **id**: [`EntityID`](#type-alias-entityid)

***

### name

> **name**: `string`

***

### tags?

> `optional` **tags?**: `string`[]

`public` here exempts this entity's own name and aliases from the floor.

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

[sneq-engine API](#sneq-engine-api) / EventAct

# Interface: EventAct

## Properties

### actorId

> **actorId**: [`EntityID`](#type-alias-entityid)

***

### objectId?

> `optional` **objectId?**: [`EntityID`](#type-alias-entityid)

***

### sets?

> `optional` **sets?**: [`ActEffect`](#interface-acteffect)

***

### value?

> `optional` **value?**: [`AttributValue`](#type-alias-attributvalue)

***

### verb

> **verb**: `string`

Structured, never prose. Carries no projection semantics (#27).

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / GroupHolder

# Interface: GroupHolder

Groups are the default (§2.3): a town has strata, not three hundred
memories. Holders are created lazily, never authored upfront.

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### community

> **community**: `string`

***

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### kind

> **kind**: `"GROUP"`

***

### placeId

> **placeId**: [`EntityID`](#type-alias-entityid)

***

### realmId

> **realmId**: [`EntityID`](#type-alias-entityid)

The realm entity (#26) — realms are entities, not strings.

***

### standing

> **standing**: `number`

0..1

***

### stratum

> **stratum**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderContext

# Interface: HolderContext

Phase B's answer (§11). Everything an agent needs to write one turn for one
holder, and nothing it needs to write the turn for somebody else.

The three states of #21's null doctrine are distinguishable here and never
conflated: an unknown id throws before this type is built; no scene is a
literal `scene: null` on the frame; a holder who knows nothing is
`beliefs: []` **plus** an `explain` line that says so. The Cassius Vorentius
bug was a plausible-empty standing in for a null.

## Properties

### beliefs

> **beliefs**: [`Belief`](#interface-belief)[]

Ranked by salience, highest first. Empty is an answer, not a failure.

***

### day

> **day**: `number`

***

### explain

> **explain**: `string`

Why the list looks the way it does, in one sentence. Always present.

***

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### omitted

> **omitted**: `number`

How many beliefs `topK` dropped — a truncated read is never silent.

***

### resolvedFrom?

> `optional` **resolvedFrom?**: [`EntityID`](#type-alias-entityid)

Present when the caller asked by entity: the entity the cascade started from.

***

### road

> **road**: [`ResolutionRoad`](#type-alias-resolutionroad)

Which road of the §2.3 cascade answered — the reply always names it (#21).

***

### turn

> **turn**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderContextArgs

# Interface: HolderContextArgs

## Properties

### about?

> `optional` **about?**: [`EntityID`](#type-alias-entityid)

***

### entityId?

> `optional` **entityId?**: [`EntityID`](#type-alias-entityid)

***

### holderId?

> `optional` **holderId?**: [`HolderId`](#type-alias-holderid)

***

### topK?

> `optional` **topK?**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderContextInput

# Interface: HolderContextInput

## Properties

### about?

> `optional` **about?**: [`EntityID`](#type-alias-entityid)

***

### beliefs

> **beliefs**: [`Belief`](#interface-belief)[]

***

### day

> **day**: `number`

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### records

> **records**: [`OfficialRecord`](#interface-officialrecord)[]

***

### resolvedFrom?

> `optional` **resolvedFrom?**: [`EntityID`](#type-alias-entityid)

***

### road

> **road**: [`ResolutionRoad`](#type-alias-resolutionroad)

***

### topK?

> `optional` **topK?**: `number`

***

### turn

> **turn**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderResolution

# Interface: HolderResolution

## Properties

### holder

> **holder**: [`Holder`](#type-alias-holder)

***

### materialized?

> `optional` **materialized?**: [`IndividualHolder`](#interface-individualholder)

Present only on AUTO_PARTICIPANT: the lazily created holder, for the caller to persist.

***

### road

> **road**: [`ResolutionRoad`](#type-alias-resolutionroad)

The reply always names the road (#21) — the agent knows who answered and why.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderResolutionInput

# Interface: HolderResolutionInput

## Properties

### defaultGroupId

> **defaultGroupId**: [`HolderId`](#type-alias-holderid)

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### holders

> **holders**: [`Holder`](#type-alias-holder)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / IndividualHolder

# Interface: IndividualHolder

An individual inherits their base group and adds only what their declared
derogation justifies. PARTICIPANT holders are auto-materialized lazily at
cascade time (#28); PERSONAL_STAKE is always an authoring act.

## Properties

### baseGroupId

> **baseGroupId**: [`HolderId`](#type-alias-holderid)

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### derogationReason

> **derogationReason**: [`DerogationReason`](#type-alias-derogationreason)

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### kind

> **kind**: `"INDIVIDUAL"`

***

### standingOverride?

> `optional` **standingOverride?**: `number`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / IngestedPlayerInput

# Interface: IngestedPlayerInput

## Properties

### holderId

> **holderId**: [`HolderId`](#type-alias-holderid)

***

### mentions

> **mentions**: `object`[]

Free-text mentions resolved against canon; `entityId: null` = unresolved, which is normal.

#### confidence

> **confidence**: `number`

#### entityId

> **entityId**: [`EntityID`](#type-alias-entityid) \| `null`

#### mention

> **mention**: `string`

***

### road

> **road**: [`ResolutionRoad`](#type-alias-resolutionroad)

***

### uptake

> **uptake**: [`InventionId`](#type-alias-inventionid)[]

Provisional inventions this utterance takes up (§2.6) — detected here by
the engine, never claimed by the model. Hand them to `commit_narrative` as
`playerUtterance` and the same detection runs again at commit, which is
the one that counts.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / IntraCommitConflict

# Interface: IntraCommitConflict

Two `sets` on the same key with different values inside one commit (#27).

## Properties

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### eventId

> **eventId**: [`EventId`](#type-alias-eventid)

***

### key

> **key**: `string`

***

### values

> **values**: \[[`AttributValue`](#type-alias-attributvalue), [`AttributValue`](#type-alias-attributvalue)\]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / InventionTransition

# Interface: InventionTransition

Append-only audit.

## Properties

### atDay

> **atDay**: `number`

World day of the transition — the fold orders promotions by (atDay, atTurn) (#27).

***

### atTurn

> **atTurn**: `number`

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### evidence?

> `optional` **evidence?**: [`PromotionEvidence`](#type-alias-promotionevidence)

***

### from

> **from**: [`InventionStatus`](#type-alias-inventionstatus)

***

### inventionId

> **inventionId**: [`InventionId`](#type-alias-inventionid)

***

### supersededBy?

> `optional` **supersededBy?**: [`InventionId`](#type-alias-inventionid)

***

### to

> **to**: `"PROMOTED"` \| `"REJECTED"` \| `"SUPERSEDED"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / LegacyCampaignInput

# Interface: LegacyCampaignInput

## Properties

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### facts

> **facts**: [`LegacyFact`](#interface-legacyfact) & `object`[]

0.3-era facts; observation blobs may still carry the stale `fiabilite` key.

***

### potentialites

> **potentialites**: [`Potentialite`](#interface-potentialite)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / LegacyFact

# Interface: LegacyFact

The 0.3-era `AttributFige` row, kept only as the shape the migration reads
off an old store (§2.6 — one release, one break: the live contract holds
`CanonicalAttribute` and nothing else, and there is no alias). Nothing writes
this type after the migration epoch.

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

[sneq-engine API](#sneq-engine-api) / LegacyMigrationOutput

# Interface: LegacyMigrationOutput

## Properties

### canonicalAttributes

> **canonicalAttributes**: [`CanonicalAttribute`](#interface-canonicalattribute)[]

One LEGACY_FACT row per fact, at the day-0 migration epoch (§4).

***

### cleanedFacts

> **cleanedFacts**: [`LegacyFact`](#interface-legacyfact) & `object`[]

The same facts with the stale `fiabilite` key stripped (#18).

***

### findings

> **findings**: [`MigrationFinding`](#interface-migrationfinding)[]

***

### legacyEvents

> **legacyEvents**: [`NarrativeEvent`](#interface-narrativeevent)[]

One day-0 LEGACY_CANON event per entity (#17) — the ledger backing that
 keeps `rebuild(ledger) === projection` free of a LEGACY_FACT special case.

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

### public?

> `optional` **public?**: `boolean`

Common knowledge: this entity's NAME is exempt from the containment floor
(`PUBLIC_TAG`). For landmarks, towns, factions everybody has heard of —
things whose name carries no secret. What HAPPENED to them is still
withheld; only the name stops being.

***

### type

> **type**: [`EntityType`](#type-alias-entitytype)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / MigrationFinding

# Interface: MigrationFinding

A mis-encoded constraint found by the migration audit (#23). Flagged, never
auto-fixed (guessing) and never deleted (data loss); `doctor` re-reads these.

## Properties

### attributeKey

> **attributeKey**: `string`

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### constraintId

> **constraintId**: `string`

***

### detail

> **detail**: `string`

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### kind

> **kind**: [`MigrationFindingKind`](#type-alias-migrationfindingkind)

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

### holderId?

> `optional` **holderId?**: [`HolderId`](#type-alias-holderid)

The holder this narration is FOR (§11 phase F). With it the gate also runs
containment over the narration and can BLOCK. Without it the gate keeps its
0.3 job — entity resolution — and is honest that it checked nothing else.

***

### narration

> **narration**: `string`

***

### strict?

> `optional` **strict?**: `boolean`

Read at last (§5.2): `strict` was accepted at the schema and the hook and
consulted nowhere in the Validator — an empty shell for two releases. It
now decides whether unresolved proper nouns downgrade the verdict to
`REPAIR` instead of merely being reported.

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

[sneq-engine API](#sneq-engine-api) / NarrativeEvent

# Interface: NarrativeEvent

## Properties

### acts

> **acts**: [`EventAct`](#interface-eventact)[]

THE ACTS — immutable; the repository exposes no mutation path (§2.1).

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### circumstance

> **circumstance**: `string`

THE SCENE — prose; the only thing REINTERPRETATION may reframe.

***

### day

> **day**: `number`

World clock (§4).

***

### eventId

> **eventId**: [`EventId`](#type-alias-eventid)

***

### gravity

> **gravity**: `0` \| `1` \| `2` \| `3`

***

### participants

> **participants**: [`EntityID`](#type-alias-entityid)[]

***

### placeId?

> `optional` **placeId?**: [`EntityID`](#type-alias-entityid)

***

### surfaceTokens

> **surfaceTokens**: `string`[]

The containment/canary alphabet — model-supplied + engine floor (#25).

***

### turn

> **turn**: `number`

Ordering within a day.

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

Provenance ONLY (#18). The tool boundary rejects a stray `fiabilite` key.

## Properties

### emittedBy?

> `optional` **emittedBy?**: [`EntityID`](#type-alias-entityid)

***

### excerpt?

> `optional` **excerpt?**: `string`

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

[sneq-engine API](#sneq-engine-api) / OfficialRecord

# Interface: OfficialRecord

What power claims (§2.2). A record contradicting its event is legal data,
not an error — the gap is the game. Records accumulate; never replaced.
Records never project into canon (#27): their only road is
OFFICIAL_RECORD promotion evidence.

## Properties

### aboutEventId?

> `optional` **aboutEventId?**: [`EventId`](#type-alias-eventid)

Absent = pure assertion.

***

### authoredBy

> **authoredBy**: [`EntityID`](#type-alias-entityid)

The power that issued it.

***

### campaignId

> **campaignId**: [`CampaignId`](#type-alias-campaignid)

***

### category

> **category**: [`CategorieAttribut`](#type-alias-categorieattribut)

***

### day

> **day**: `number`

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### key

> **key**: `string`

***

### observation

> **observation**: [`Observation`](#interface-observation)

Provenance only — fiabilite lives on Belief (#18).

***

### recordId

> **recordId**: [`RecordId`](#type-alias-recordid)

***

### route

> **route**: [`CarriageRoute`](#type-alias-carriageroute)

***

### surfaceTokens

> **surfaceTokens**: `string`[]

Containment alphabet, same producer rule as events (#25).

***

### turn

> **turn**: `number`

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

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

[sneq-engine API](#sneq-engine-api) / ProjectionInputs

# Interface: ProjectionInputs

## Properties

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

In ledger order — as `getEvents` returns them: (day, turn, seq).

***

### legacy

> **legacy**: [`CanonicalAttribute`](#interface-canonicalattribute)[]

LEGACY_FACT rows from migration — the epoch floor, overridden by any later producer.

***

### promotions

> **promotions**: `object`[]

Promotion transitions with their inventions; non-PROMOTED transitions are ignored.

#### invention

> **invention**: [`ProvisionalInvention`](#interface-provisionalinvention)

#### transition

> **transition**: [`InventionTransition`](#interface-inventiontransition)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PromotionContext

# Interface: PromotionContext

## Properties

### atDay

> **atDay**: `number`

***

### atTurn

> **atTurn**: `number`

***

### canon

> **canon**: [`CanonicalAttribute`](#interface-canonicalattribute)[]

Canon rows for the invention's entity (at minimum its attributeKey).

***

### competing?

> `optional` **competing?**: [`ProvisionalInvention`](#interface-provisionalinvention)[]

Other PROVISIONAL inventions on the same (entity, key) — first uptake wins.

***

### constraints

> **constraints**: [`Contrainte`](#interface-contrainte)[]

Constraints on (entity, attributeKey). QUARANTINED ones never gate.

***

### evidence

> **evidence**: [`PromotionEvidence`](#type-alias-promotionevidence)

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

[sneq-engine API](#sneq-engine-api) / ProvisionalInvention

# Interface: ProvisionalInvention

What the GM invents without warrant (§2.6). Promotes to canon only when
something comes to depend on it. No evaporation by deletion: a stale
provisional falls out of prompts by salience, not out of storage.

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

### confidence

> **confidence**: `number`

Provenance, NEVER a promotion threshold.

***

### entityId

> **entityId**: [`EntityID`](#type-alias-entityid)

***

### introducedAtTurn

> **introducedAtTurn**: `number`

***

### introducedOnDay

> **introducedOnDay**: `number`

***

### inventionId

> **inventionId**: [`InventionId`](#type-alias-inventionid)

***

### lastReferencedTurn

> **lastReferencedTurn**: `number`

***

### sourceNarration

> **sourceNarration**: `string`

***

### status

> **status**: [`InventionStatus`](#type-alias-inventionstatus)

***

### surfaceTokens

> **surfaceTokens**: `string`[]

Uptake alphabet: known-token substring search over player utterances (#25).

***

### value

> **value**: [`AttributValue`](#type-alias-attributvalue)

Value-bearing — the thing Potentialite structurally cannot hold.

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

### appendCarriage()

> **appendCarriage**(`c`): `Promise`\<`void`\>

#### Parameters

##### c

[`Carriage`](#interface-carriage)

#### Returns

`Promise`\<`void`\>

***

### appendCarriageEffect()

> **appendCarriageEffect**(`fx`): `Promise`\<`void`\>

#### Parameters

##### fx

[`CarriageEffect`](#interface-carriageeffect)

#### Returns

`Promise`\<`void`\>

***

### appendEvent()

> **appendEvent**(`e`): `Promise`\<`void`\>

#### Parameters

##### e

[`NarrativeEvent`](#interface-narrativeevent)

#### Returns

`Promise`\<`void`\>

***

### appendInvention()

> **appendInvention**(`i`): `Promise`\<`void`\>

#### Parameters

##### i

[`ProvisionalInvention`](#interface-provisionalinvention)

#### Returns

`Promise`\<`void`\>

***

### appendInventionTransition()

> **appendInventionTransition**(`t`): `Promise`\<`void`\>

Also updates the invention row's status — transitions are the only status writer.

#### Parameters

##### t

[`InventionTransition`](#interface-inventiontransition)

#### Returns

`Promise`\<`void`\>

***

### appendMigrationFindings()

> **appendMigrationFindings**(`findings`): `Promise`\<`void`\>

#### Parameters

##### findings

[`MigrationFinding`](#interface-migrationfinding)[]

#### Returns

`Promise`\<`void`\>

***

### appendRecord()

> **appendRecord**(`r`): `Promise`\<`void`\>

#### Parameters

##### r

[`OfficialRecord`](#interface-officialrecord)

#### Returns

`Promise`\<`void`\>

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

### findOperation()

> **findOperation**(`campaignId`, `operationId`): `Promise`\<`unknown`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### operationId

`string`

#### Returns

`Promise`\<`unknown`\>

***

### getCanonicalAttributes()

> **getCanonicalAttributes**(`campaignId`, `entityId?`): `Promise`\<[`CanonicalAttribute`](#interface-canonicalattribute)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### entityId?

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`CanonicalAttribute`](#interface-canonicalattribute)[]\>

***

### getDispatchPolicy()

> **getDispatchPolicy**(`campaignId`): `Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`DispatchPolicy`](#interface-dispatchpolicy)\>

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

### getEvents()

> **getEvents**(`campaignId`): `Promise`\<[`NarrativeEvent`](#interface-narrativeevent)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`NarrativeEvent`](#interface-narrativeevent)[]\>

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

### getRecords()

> **getRecords**(`campaignId`): `Promise`\<[`OfficialRecord`](#interface-officialrecord)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`OfficialRecord`](#interface-officialrecord)[]\>

***

### getWorldDay()

> **getWorldDay**(`campaignId`): `Promise`\<`number`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<`number`\>

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

### listCarriageEffects()

> **listCarriageEffects**(`campaignId`, `carriageId?`): `Promise`\<[`CarriageEffect`](#interface-carriageeffect)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### carriageId?

[`CarriageId`](#type-alias-carriageid)

#### Returns

`Promise`\<[`CarriageEffect`](#interface-carriageeffect)[]\>

***

### listCarriages()

> **listCarriages**(`campaignId`, `q`): `Promise`\<[`Carriage`](#interface-carriage)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### q

[`CarriageQuery`](#interface-carriagequery)

#### Returns

`Promise`\<[`Carriage`](#interface-carriage)[]\>

***

### listHolders()

> **listHolders**(`campaignId`): `Promise`\<[`Holder`](#type-alias-holder)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`Holder`](#type-alias-holder)[]\>

***

### listInventions()

> **listInventions**(`campaignId`, `status?`): `Promise`\<[`ProvisionalInvention`](#interface-provisionalinvention)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### status?

[`InventionStatus`](#type-alias-inventionstatus)

#### Returns

`Promise`\<[`ProvisionalInvention`](#interface-provisionalinvention)[]\>

***

### listInventionTransitions()

> **listInventionTransitions**(`campaignId`, `inventionId?`): `Promise`\<[`InventionTransition`](#interface-inventiontransition)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### inventionId?

[`InventionId`](#type-alias-inventionid)

#### Returns

`Promise`\<[`InventionTransition`](#interface-inventiontransition)[]\>

***

### listMigrationFindings()

> **listMigrationFindings**(`campaignId`): `Promise`\<[`MigrationFinding`](#interface-migrationfinding)[]\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

#### Returns

`Promise`\<[`MigrationFinding`](#interface-migrationfinding)[]\>

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

### recordOperation()

> **recordOperation**(`campaignId`, `operationId`, `result`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### operationId

`string`

##### result

`unknown`

#### Returns

`Promise`\<`void`\>

***

### reindexEmbeddings()

> **reindexEmbeddings**(`campaignId`, `vectors`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### vectors

`object`[]

#### Returns

`Promise`\<`void`\>

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

### setDispatchPolicy()

> **setDispatchPolicy**(`campaignId`, `p`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### p

[`DispatchPolicy`](#interface-dispatchpolicy)

#### Returns

`Promise`\<`void`\>

***

### setEmbeddingDim()

> **setEmbeddingDim**(`campaignId`, `dim`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### dim

`number`

#### Returns

`Promise`\<`void`\>

***

### setWorldDay()

> **setWorldDay**(`campaignId`, `day`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### day

`number`

#### Returns

`Promise`\<`void`\>

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

### upsertCanonicalAttribute()

> **upsertCanonicalAttribute**(`campaignId`, `row`): `Promise`\<`void`\>

#### Parameters

##### campaignId

[`CampaignId`](#type-alias-campaignid)

##### row

[`CanonicalAttribute`](#interface-canonicalattribute)

#### Returns

`Promise`\<`void`\>

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

### upsertHolder()

> **upsertHolder**(`h`): `Promise`\<`void`\>

#### Parameters

##### h

[`Holder`](#type-alias-holder)

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

[sneq-engine API](#sneq-engine-api) / SalienceFactors

# Interface: SalienceFactors

## Properties

### gravity

> **gravity**: `number`

***

### personalInvolvement

> **personalInvolvement**: `number`

***

### propagationDelay

> **propagationDelay**: `number`

***

### recency

> **recency**: `number`

***

### socialPosition

> **socialPosition**: `number`

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

[sneq-engine API](#sneq-engine-api) / TokenWorld

# Interface: TokenWorld

## Properties

### entities

> **entities**: [`EntityLike`](#interface-entitylike)[]

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### records

> **records**: [`OfficialRecord`](#interface-officialrecord)[]

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

###### role

[`ConstraintRole`](#type-alias-constraintrole)

###### rule

[`RegleContrainte`](#type-alias-reglecontrainte)

#### Returns

`Promise`\<\{ `constraintId`: [`ConstraintId`](#type-alias-constraintid); \}\>

***

### advanceTurn()

> **advanceTurn**(`input`): `Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `turnNumber`: `number`; `worldDay`: `number`; \}\>

#### Parameters

##### input

###### days?

`number`

###### summary?

`string`

#### Returns

`Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `turnNumber`: `number`; `worldDay`: `number`; \}\>

***

### commitNarrative()

> **commitNarrative**(`bundle`): `Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

#### Parameters

##### bundle

[`ToolCommitBundle`](#type-alias-toolcommitbundle)

#### Returns

`Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

***

### getEntity()

> **getEntity**(`entityId`): `Promise`\<[`Entity`](#interface-entity) \| `null`\>

#### Parameters

##### entityId

[`EntityID`](#type-alias-entityid)

#### Returns

`Promise`\<[`Entity`](#interface-entity) \| `null`\>

***

### getHolderContext()

> **getHolderContext**(`args`): `Promise`\<[`HolderContext`](#interface-holdercontext)\>

#### Parameters

##### args

[`HolderContextArgs`](#interface-holdercontextargs)

#### Returns

`Promise`\<[`HolderContext`](#interface-holdercontext)\>

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

###### public?

`boolean`

###### type

[`EntityType`](#type-alias-entitytype)

#### Returns

`Promise`\<[`MentionResult`](#type-alias-mentionresult)\>

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

###### holderId?

[`HolderId`](#type-alias-holderid)

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

[sneq-engine API](#sneq-engine-api) / TranscriptEntry

# Interface: TranscriptEntry

## Properties

### id

> **id**: `string`

***

### text

> **text**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / TranscriptFilterResult

# Interface: TranscriptFilterResult

## Properties

### dropped

> **dropped**: `object`[]

Each dropped entry with the tokens that condemned it — a redaction that explains itself.

#### entry

> **entry**: [`TranscriptEntry`](#interface-transcriptentry)

#### present

> **present**: `string`[]

***

### kept

> **kept**: [`TranscriptEntry`](#interface-transcriptentry)[]

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

### existingCanon

> **existingCanon**: readonly [`CanonicalAttribute`](#interface-canonicalattribute)[]

Canon rows for the same (entity, key). Reserved for `CONTRADICTION_RC`,
which nothing produces yet — `decidePromotion` runs its own canon check
(§2.6) and passes `[]` here.

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

The gate's answer. 0.3's shape was `{ ok, partial, extractedNames, issues }`
— it reported and could never withhold, so all three live consumers invented
block, redaction and a repair loop on top of it (grimoire twice, including a
`blocked → partial` downgrade). Those three now live here, once.

## Properties

### containment?

> `optional` **containment?**: `object`

Present when a `holderId` was supplied: the tokens this holder has not
learned, and which of them the narration used. `pass: false` is what makes
the verdict `BLOCK`.

#### forbidden

> **forbidden**: `string`[]

#### pass

> **pass**: `boolean`

#### present

> **present**: `string`[]

***

### extractedNames

> **extractedNames**: `string`[]

***

### issues

> **issues**: [`NarrationIssue`](#interface-narrationissue)[]

***

### ok

> **ok**: `boolean`

True only on `PASS`. Kept for callers that read nothing else.

***

### partial?

> `optional` **partial?**: `boolean`

***

### repairHint?

> `optional` **repairHint?**: `string`

Present on `REPAIR` and `BLOCK`: what to tell the model, in its own terms.

***

### verdict

> **verdict**: [`NarrationVerdict`](#type-alias-narrationverdict)

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / WorldHealth

# Interface: WorldHealth

## Properties

### frozenClock

> **frozenClock**: `boolean`

`day` unchanged across the last K commits while ≥ 1 carriage is in
transit (#20) — carriages exist and never land, invisible to a
zero-carriage count; also catches a model that habitually answers
`daysElapsed: 0`.

***

### inTransit

> **inTransit**: `number`

Carriages neither arrived nor cancelled as of worldDay.

***

### outOfBandRecords

> **outOfBandRecords**: `number`

#22 — the escape hatch is audited, not locked.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / WorldHealthInput

# Interface: WorldHealthInput

## Properties

### carriageEffects

> **carriageEffects**: [`CarriageEffect`](#interface-carriageeffect)[]

***

### carriages

> **carriages**: [`Carriage`](#interface-carriage)[]

***

### events

> **events**: [`NarrativeEvent`](#interface-narrativeevent)[]

***

### k?

> `optional` **k?**: `number`

Consecutive same-day commits before the frozen-clock detector trips.

***

### records

> **records**: [`OfficialRecord`](#interface-officialrecord)[]

***

### worldDay

> **worldDay**: `number`


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

[sneq-engine API](#sneq-engine-api) / BeliefCertainty

# Type Alias: BeliefCertainty

> **BeliefCertainty** = `"WITNESSED"` \| `"TOLD"` \| `"INFERRED"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / BootstrapRepo

# Type Alias: BootstrapRepo

> **BootstrapRepo** = `Pick`\<[`Repository`](#interface-repository), `"getEntity"` \| `"upsertEntity"` \| `"upsertHolder"` \| `"setDispatchPolicy"`\>

The slice of the repository bootstrap needs — RepositoryAccess qualifies.

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

[sneq-engine API](#sneq-engine-api) / CanonicalSource

# Type Alias: CanonicalSource

> **CanonicalSource** = \{ `eventId`: [`EventId`](#type-alias-eventid); `kind`: `"EVENT"`; \} \| \{ `inventionId`: [`InventionId`](#type-alias-inventionid); `kind`: `"PROMOTED_INVENTION"`; \} \| \{ `kind`: `"LEGACY_FACT"`; \}

Exactly the three producers of the projection rule (#27).

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CarriageId

# Type Alias: CarriageId

> **CarriageId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"CarriageId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CarriageRoute

# Type Alias: CarriageRoute

> **CarriageRoute** = `"OFFICIAL"` \| `"RUMOUR"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CategorieAttribut

# Type Alias: CategorieAttribut

> **CategorieAttribut** = `"IDENTITE"` \| `"PSYCHOLOGIE"` \| `"HISTORIQUE"` \| `"SOCIAL"` \| `"COMPETENCE"` \| `"SECRET"` \| `"ETAT"` \| `"POSSESSION"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / CheckStatus

# Type Alias: CheckStatus

> **CheckStatus** = `"PASS"` \| `"WARN"` \| `"FAIL"` \| `"INFO"`

`INFO` is a checklist line §12.4 asks for that nothing persisted can answer.
It reports and never judges, so it stays out of the roll-up — a permanent
WARN would just teach the reader to ignore warnings.

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

[sneq-engine API](#sneq-engine-api) / ConstraintRole

# Type Alias: ConstraintRole

> **ConstraintRole** = \{ `role`: `"REGLE_MONDE"`; `ruleId`: `string`; \} \| \{ `confidence`: `number`; `role`: `"INFERENCE_IA"`; \} \| \{ `factId`: [`FactId`](#type-alias-factid); `role`: `"FAIT_CANONIQUE"`; \} \| \{ `edgeKey`: `string`; `role`: `"RELATION"`; \}

Who is speaking, in the payload rather than hardcoded (#19). 0.3 stamped
every constraint `INFERENCE_IA`, so `REGLE_MONDE` — the declared world rule
the promotion loop needs a producer for — could never be written, and the
discriminator matched everything.

## Union Members

### Type Literal

\{ `role`: `"REGLE_MONDE"`; `ruleId`: `string`; \}

A declared rule of the world: authored, not guessed. Gates promotion at full weight.

***

### Type Literal

\{ `confidence`: `number`; `role`: `"INFERENCE_IA"`; \}

The model's inference. Carries its own confidence, and says so.

***

### Type Literal

\{ `factId`: [`FactId`](#type-alias-factid); `role`: `"FAIT_CANONIQUE"`; \}

Derived from an established canonical fact.

***

### Type Literal

\{ `edgeKey`: `string`; `role`: `"RELATION"`; \}

Derived from a relation between two entities.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ConstraintStatus

# Type Alias: ConstraintStatus

> **ConstraintStatus** = `"ACTIVE"` \| `"QUARANTINED"`

#23: quarantined constraints stop gating; the transition is auditable.

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

[sneq-engine API](#sneq-engine-api) / DerogationReason

# Type Alias: DerogationReason

> **DerogationReason** = `"PARTICIPANT"` \| `"PERSONAL_STAKE"` \| `"PLAYER"`

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

[sneq-engine API](#sneq-engine-api) / EventId

# Type Alias: EventId

> **EventId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"EventId"`

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

Reliability vocabulary. Lives on Belief (derived, §2.5) — deleted from
Observation itself (#18): provenance says where a claim came from, never
how much a holder should trust it.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / Holder

# Type Alias: Holder

> **Holder** = [`GroupHolder`](#interface-groupholder) \| [`IndividualHolder`](#interface-individualholder)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / HolderId

# Type Alias: HolderId

> **HolderId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"HolderId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / InventionId

# Type Alias: InventionId

> **InventionId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"InventionId"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / InventionStatus

# Type Alias: InventionStatus

> **InventionStatus** = `"PROVISIONAL"` \| `"PROMOTED"` \| `"REJECTED"` \| `"SUPERSEDED"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / InventionTokenRejection

# Type Alias: InventionTokenRejection

> **InventionTokenRejection** = `object`

## Properties

### reason

> **reason**: `"ABSENT_FROM_SOURCE"` \| `"NOT_DISTINCTIVE"`

The model never said it — a trigger invented purely to be a trigger.

***

### token

> **token**: `string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / MentionResult

# Type Alias: MentionResult

> **MentionResult** = \{ `entityId`: [`EntityID`](#type-alias-entityid); `isNew`: `boolean`; `needsAdjudication?`: `false`; `resolvedTo?`: [`EntityID`](#type-alias-entityid); \} \| \{ `candidates`: `object`[]; `entityId`: `null`; `isNew`: `false`; `needsAdjudication`: `true`; `reason?`: `"ambiguous"` \| `"unavailable"`; \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / MigrationFindingKind

# Type Alias: MigrationFindingKind

> **MigrationFindingKind** = `"TYPE_MISMATCH_WITH_CANON"` \| `"EMPTY_DOIT_ETRE"` \| `"MIXED_VALUE_TYPES"` \| `"RANGE_ON_NON_NUMBER"` \| `"REGEX_ON_NON_STRING"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / NarrationVerdict

# Type Alias: NarrationVerdict

> **NarrationVerdict** = `"PASS"` \| `"REPAIR"` \| `"BLOCK"`

What the host must do with this narration.

- `PASS` — show it.
- `REPAIR` — hand `repairHint` back to the model and ask for one rewrite.
  Bounded by the host: SNEQ states the problem, it does not run the loop.
- `BLOCK` — do not show it, and do not ask for a rewrite either. Reserved
  for a containment failure: the narration says something this holder cannot
  know, so the payload or the derivation is wrong and a reworded version of
  the same leak is still a leak.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ObservationMethod

# Type Alias: ObservationMethod

> **ObservationMethod** = `"DIALOGUE_DIRECT"` \| `"DOCUMENT"` \| `"OBSERVATION_VISUELLE"` \| `"DEDUCTION_CONFIRMEE"` \| `"AVEU"` \| `"DEMONSTRATION"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ObservationSource

# Type Alias: ObservationSource

> **ObservationSource** = `"GM_NARRATION"` \| `"PLAYER_UTTERANCE"` \| `"DICE_ROLL"` \| `"SYSTEM"` \| `"OUT_OF_BAND"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PromotionDecision

# Type Alias: PromotionDecision

> **PromotionDecision** = \{ `outcome`: `"PROMOTED"`; `quarantined`: [`ConstraintId`](#type-alias-constraintid)[]; `superseded`: [`InventionTransition`](#interface-inventiontransition)[]; `transition`: [`InventionTransition`](#interface-inventiontransition); \} \| \{ `outcome`: `"REJECTED"`; `quarantined`: [`ConstraintId`](#type-alias-constraintid)[]; `transition`: [`InventionTransition`](#interface-inventiontransition); \}

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PromotionEvidence

# Type Alias: PromotionEvidence

> **PromotionEvidence** = \{ `eventId`: [`EventId`](#type-alias-eventid); `kind`: `"PLAYER_UPTAKE"`; \} \| \{ `eventId`: [`EventId`](#type-alias-eventid); `kind`: `"WORLD_CONSEQUENCE"`; \} \| \{ `eventId`: [`EventId`](#type-alias-eventid); `kind`: `"RECONFIRMATION"`; \} \| \{ `kind`: `"OFFICIAL_RECORD"`; `recordId`: [`RecordId`](#type-alias-recordid); \}

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

[sneq-engine API](#sneq-engine-api) / RecordId

# Type Alias: RecordId

> **RecordId** = `string` & `object`

## Type Declaration

### \[brand\]

> `readonly` **\[brand\]**: `"RecordId"`

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

[sneq-engine API](#sneq-engine-api) / ResolutionRoad

# Type Alias: ResolutionRoad

> **ResolutionRoad** = `"DECLARED_INDIVIDUAL"` \| `"AUTO_PARTICIPANT"` \| `"DEFAULT_GROUP"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SalienceWeights

# Type Alias: SalienceWeights

> **SalienceWeights** = [`SalienceFactors`](#interface-saliencefactors)

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

[sneq-engine API](#sneq-engine-api) / ToolCommitBundle

# Type Alias: ToolCommitBundle

> **ToolCommitBundle** = `Omit`\<[`CommitNarrativeBundle`](#interface-commitnarrativebundle), `"campaignId"`\>

The bundle minus what the engine owns: campaign, day and turn are never caller-set.

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

[sneq-engine API](#sneq-engine-api) / applyContainment

# Function: applyContainment()

> **applyContainment**(`report`, `containment`): [`ValidationReport`](#interface-validationreport)

Fold a containment result into a gate report (§11 phase F). Containment
outranks everything: a narration that leaks is BLOCKed even when every proper
noun in it resolves perfectly.

## Parameters

### report

[`ValidationReport`](#interface-validationreport)

### containment

#### forbidden

`string`[]

#### pass

`boolean`

#### present

`string`[]

## Returns

[`ValidationReport`](#interface-validationreport)

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

[sneq-engine API](#sneq-engine-api) / asCarriageId

# Function: asCarriageId()

> **asCarriageId**(`s`): [`CarriageId`](#type-alias-carriageid)

## Parameters

### s

`string`

## Returns

[`CarriageId`](#type-alias-carriageid)

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

[sneq-engine API](#sneq-engine-api) / asEventId

# Function: asEventId()

> **asEventId**(`s`): [`EventId`](#type-alias-eventid)

## Parameters

### s

`string`

## Returns

[`EventId`](#type-alias-eventid)

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

[sneq-engine API](#sneq-engine-api) / asHolderId

# Function: asHolderId()

> **asHolderId**(`s`): [`HolderId`](#type-alias-holderid)

## Parameters

### s

`string`

## Returns

[`HolderId`](#type-alias-holderid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asInventionId

# Function: asInventionId()

> **asInventionId**(`s`): [`InventionId`](#type-alias-inventionid)

## Parameters

### s

`string`

## Returns

[`InventionId`](#type-alias-inventionid)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / asRecordId

# Function: asRecordId()

> **asRecordId**(`s`): [`RecordId`](#type-alias-recordid)

## Parameters

### s

`string`

## Returns

[`RecordId`](#type-alias-recordid)

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

[sneq-engine API](#sneq-engine-api) / assertContainment

# Function: assertContainment()

> **assertContainment**(`world`, `beliefs`, `holderId`, `text`): [`ContainmentResult`](#interface-containmentresult)

§11 phase D — the pre-flight assertion over the composed payload. The host
composes whatever it wants and submits the final string; SNEQ answers
whether it contains a token this holder cannot hold. Default posture: throw.

## Parameters

### world

[`TokenWorld`](#interface-tokenworld)

### beliefs

[`Belief`](#interface-belief)[]

### holderId

[`HolderId`](#type-alias-holderid)

### text

`string`

## Returns

[`ContainmentResult`](#interface-containmentresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / bootstrapCampaign

# Function: bootstrapCampaign()

> **bootstrapCampaign**(`repo`, `campaignId`, `opts?`): `Promise`\<[`BootstrapResult`](#interface-bootstrapresult)\>

Campaign bootstrap (§2.3, decided at #15/#26): seed one default realm
ENTITY (realms are entities, not strings), one default community with a
single stratum (so `get_holder_context` never returns empty for lack of
authoring), and the default dispatch rules with ZERO routes — SNEQ owns no
map, so until the fiction declares its first route, rules fire and find
nothing, and that state is counted (§6.1 unroutable), never silent.

## Parameters

### repo

[`BootstrapRepo`](#type-alias-bootstraprepo)

### campaignId

[`CampaignId`](#type-alias-campaignid)

### opts?

#### now?

() => `number`

## Returns

`Promise`\<[`BootstrapResult`](#interface-bootstrapresult)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / bootstrapPlan

# Function: bootstrapPlan()

> **bootstrapPlan**(`campaignId`, `now?`): [`BootstrapPlan`](#interface-bootstrapplan)

The bootstrap as pure data, so the three places that have to seed a campaign
— `createCampaign`, the SQLite v3→v5 migration and the JSON v1 loader —
write the same rows instead of three hand-copied versions that drift. Same
reason `migrateLegacyCampaign` is a pure core.

## Parameters

### campaignId

[`CampaignId`](#type-alias-campaignid)

### now?

`number` = `...`

## Returns

[`BootstrapPlan`](#interface-bootstrapplan)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / buildHolderContext

# Function: buildHolderContext()

> **buildHolderContext**(`input`): [`HolderContext`](#interface-holdercontext)

Filter, rank and explain — the pure half of phase B. `deriveBeliefs` has
already decided what this holder knows; this decides what to hand over.

`about` filters on an event→entity walk done here rather than through an
index: `Belief.subject` is EVENT | RECORD, and the contract has no
event→entity index (a gap §13 names). Over a campaign's ledger the walk is
cheap; if it ever stops being cheap, that index is the fix, not a cache.

## Parameters

### input

[`HolderContextInput`](#interface-holdercontextinput)

## Returns

[`HolderContext`](#interface-holdercontext)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / checkContainment

# Function: checkContainment()

> **checkContainment**(`forbidden`, `text`): [`ContainmentResult`](#interface-containmentresult)

## Parameters

### forbidden

`string`[]

### text

`string`

## Returns

[`ContainmentResult`](#interface-containmentresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / commitNarrative

# Function: commitNarrative()

> **commitNarrative**(`repo`, `bundle`, `opts?`): `Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

The single atomic write (§5.1): gather → decide (pure, shared rules) →
apply, all inside one repository transaction. Idempotent by `operationId`
(#29): a retry replays the recorded result — exactly one event, one time
advance, one transition set, however many times the caller retries.

## Parameters

### repo

[`Repository`](#interface-repository)

### bundle

[`CommitNarrativeBundle`](#interface-commitnarrativebundle)

### opts?

[`CommitNarrativeOptions`](#interface-commitnarrativeoptions) = `{}`

## Returns

`Promise`\<[`CommitNarrativeResult`](#interface-commitnarrativeresult)\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / computeSalience

# Function: computeSalience()

> **computeSalience**(`factors`, `weights?`): `number`

## Parameters

### factors

[`SalienceFactors`](#interface-saliencefactors)

### weights?

[`SalienceFactors`](#interface-saliencefactors) = `DEFAULT_SALIENCE_WEIGHTS`

## Returns

`number`

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

[sneq-engine API](#sneq-engine-api) / decideCommitNarrative

# Function: decideCommitNarrative()

> **decideCommitNarrative**(`bundle`, `ctx`): [`CommitPlan`](#interface-commitplan)

The single write (§5.1), as a pure decision — the `decideCommitNarrative`
§13 asked for, so the out-of-tree Convex adapter shares SNEQ's rules instead
of re-deriving them. The executor applies the plan in one transaction.

## Parameters

### bundle

[`CommitNarrativeBundle`](#interface-commitnarrativebundle)

### ctx

[`CommitContext`](#interface-commitcontext)

## Returns

[`CommitPlan`](#interface-commitplan)

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

[sneq-engine API](#sneq-engine-api) / decidePromotion

# Function: decidePromotion()

> **decidePromotion**(`invention`, `ctx`): [`PromotionDecision`](#type-alias-promotiondecision)

The collapse loop, aimed at the output side (§2.6): promotion validates
against canon + exclusion constraints. Contradiction by canon → REJECTED
silently — no error, no interrupt (inverting today's `decideRegisterFact`
path). Between provisionals, first uptake wins and the loser is SUPERSEDED.

## Parameters

### invention

[`ProvisionalInvention`](#interface-provisionalinvention)

### ctx

[`PromotionContext`](#interface-promotioncontext)

## Returns

[`PromotionDecision`](#type-alias-promotiondecision)

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

[sneq-engine API](#sneq-engine-api) / deriveBeliefs

# Function: deriveBeliefs()

> **deriveBeliefs**(`world`, `holderId`, `today`): [`Belief`](#interface-belief)[]

What a holder knows (§2.5): a pure function of
(events, records, carriages, effects, holders, today). Never stored.

The matrix (§7.2): participants know immediately with WITNESSED; a group
witnesses events at its own place; everything else arrives by carriage —
nothing early, OFFICIAL halts at a realm border regardless of standing,
RUMOUR crosses but still waits, `minStanding` filters strata, DELAY shifts,
CANCEL kills, DISCREDIT degrades fiabilite only. LEGACY_CANON events are
known to the campaign default group (and, by inheritance, the player) from
day 0 (#17) — pre-0.4 canon was omniscient; old data keeps old semantics.

## Parameters

### world

[`BeliefWorld`](#interface-beliefworld)

### holderId

[`HolderId`](#type-alias-holderid)

### today

`number`

## Returns

[`Belief`](#interface-belief)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / detectPlayerUptake

# Function: detectPlayerUptake()

> **detectPlayerUptake**(`text`, `inventions`, `atTurn`): [`InventionId`](#type-alias-inventionid)[]

The detection half of phase A, pure. Resolution of mentions needs the resolver and stays in the context.

## Parameters

### text

`string`

### inventions

[`ProvisionalInvention`](#interface-provisionalinvention)[]

### atTurn

`number`

## Returns

[`InventionId`](#type-alias-inventionid)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / detectUptake

# Function: detectUptake()

> **detectUptake**(`utterance`, `inventions`, `atTurn`): [`InventionId`](#type-alias-inventionid)[]

Player uptake, detected by the engine at commit time, never by the model
(§2.6): a case-insensitive substring search of the utterance for each
provisional invention's known `surfaceTokens` — the `checkContainment`
match, not open extraction (#25; closes §0.5 premise 4's under-fire on
lowercase tokens). A same-turn echo is the GM's own phrasing bouncing back
and is not uptake. Confidence plays no part: it is provenance, never a
promotion threshold.

## Parameters

### utterance

`string`

### inventions

[`ProvisionalInvention`](#interface-provisionalinvention)[]

### atTurn

`number`

## Returns

[`InventionId`](#type-alias-inventionid)[]

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

[sneq-engine API](#sneq-engine-api) / filterTranscript

# Function: filterTranscript()

> **filterTranscript**(`world`, `beliefs`, `entries`): [`TranscriptFilterResult`](#interface-transcriptfilterresult)

Phase C's other half (§11) — the leak that is measurable today. The host
holds a transcript; this says which entries THIS holder may see. Without it
the guarantee expires after one turn, because turn 2's prompt replays turn
1's prose unfiltered (grimoire re-injects the last twelve journal entries
raw on every call).

Drop, never rewrite: a summariser would be a model call inside the seam, and
the seam's whole claim is that it hands over nothing it has not checked.

## Parameters

### world

[`TokenWorld`](#interface-tokenworld)

### beliefs

[`Belief`](#interface-belief)[]

### entries

[`TranscriptEntry`](#interface-transcriptentry)[]

## Returns

[`TranscriptFilterResult`](#interface-transcriptfilterresult)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / forbiddenTokensFor

# Function: forbiddenTokensFor()

> **forbiddenTokensFor**(`world`, `beliefs`): `string`[]

Every token from every event/record this holder has NOT learned. Decided
from state, before any call — not a validator on the model's output; a
statement about what was handed over.

Three things are never forbidden. A token the holder legitimately holds, even
if it also appears in something they do not hold. The name of an entity
authored `public` (see `PUBLIC_TAG`) — but only where that token is purely
an identity: if any unlearned subject also *declares* the same string as its
own surface token, key or value, the exemption does not apply to it, because
freeing the name would free the secret spelled the same way.

And anything that cannot carry a secret (#46). Model-supplied tokens reach
this set from events and records as well as inventions, a record's `key` and
`value` join it automatically, and none of those paths checked
distinctiveness. One `"le"` on one event forbade the commonest word in the
language for every holder who had not learned it — `assertContainment` threw
on harmless payloads and `filterTranscript` dropped legitimate entries in
silence.

Removing them cannot leak: a stopword conveys nothing, which is what makes it
a stopword. It does mean an entity whose *entire* name is a stopword or two
letters long is not protected by substring containment — and it never was.
Blocking every payload containing `"or"` is not protection, it is refusal to
answer; the engine declines to pretend otherwise.

## Parameters

### world

[`TokenWorld`](#interface-tokenworld)

### beliefs

[`Belief`](#interface-belief)[]

## Returns

`string`[]

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

[sneq-engine API](#sneq-engine-api) / migrateLegacyCampaign

# Function: migrateLegacyCampaign()

> **migrateLegacyCampaign**(`input`): [`LegacyMigrationOutput`](#interface-legacymigrationoutput)

The v0.4 migration epoch, as one pure function — shared by the SQLite v5
migration and the JSON v1 loader so the two cannot drift. Deterministic:
every synthesized id derives from content.

## Parameters

### input

[`LegacyCampaignInput`](#interface-legacycampaigninput)

## Returns

[`LegacyMigrationOutput`](#interface-legacymigrationoutput)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / openAITools

# Function: openAITools()

> **openAITools**(): `object`[]

## Returns

`object`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / rebuildProjection

# Function: rebuildProjection()

> **rebuildProjection**(`inputs`): [`CanonicalAttribute`](#interface-canonicalattribute)[]

The deterministic fold (#27): `CanonicalAttribute` is a pure function of the
ledger, with exactly the three producers the `source` union names. Applied in
(day, turn, ledger sequence) order — last writer wins; replace-on-key is
state evolution. Two `sets` on the same key with different values inside one
event throw `SneqContradictionError`: a self-contradicting bundle is a
caller bug, not fiction. Records never project.

`rebuild(ledger) === projection` is the contract this function IS — it is
also the SQLite v3→v4 migration tool (§5.4).

## Parameters

### inputs

[`ProjectionInputs`](#interface-projectioninputs)

## Returns

[`CanonicalAttribute`](#interface-canonicalattribute)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / renderContextBlock

# Function: renderContextBlock()

> **renderContextBlock**(`ctx`): `string`

Phase C — the prompt block, rendered by the engine so every consumer stops
writing its own (4/4 did). Deliberately plain text: the host owns the
prompt, SNEQ owns what may be in it.

## Parameters

### ctx

[`HolderContext`](#interface-holdercontext)

## Returns

`string`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / resolveHolder

# Function: resolveHolder()

> **resolveHolder**(`entityId`, `input`): [`HolderResolution`](#interface-holderresolution)

The cascade (§2.3, #21): declared INDIVIDUAL → lazy auto-PARTICIPANT (#28) →
campaign default group. Participation IS the declared reason, and the fiction
touching the NPC is the trigger — a holder row exists only for entities the
fiction actually asks about, so the cost is bounded by real play, never cast
size. LEGACY_CANON participation does not derogate: the migration epoch is
shared knowledge, not drama.

## Parameters

### entityId

[`EntityID`](#type-alias-entityid)

### input

[`HolderResolutionInput`](#interface-holderresolutioninput)

## Returns

[`HolderResolution`](#interface-holderresolution)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / runDoctor

# Function: runDoctor()

> **runDoctor**(`input`): [`DoctorReport`](#interface-doctorreport)

§12.4's executable checklist. Four consumers, four silent misintegrations,
zero of them detectable from inside the consumer — this is the instrument
that says *why* when the campaign misbehaves, instead of leaving an
impression.

Pure: the CLI gathers, this judges. Every FAIL names the corrective call.

## Parameters

### input

[`DoctorInput`](#interface-doctorinput)

## Returns

[`DoctorReport`](#interface-doctorreport)

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / surfaceTokensOf

# Function: surfaceTokensOf()

> **surfaceTokensOf**(`subject`, `entities`): `string`[]

Supplied tokens + the engine floor (#25): participant/place/object names and
aliases for events; subject names, key, and textual value for records.
`verb` is excluded — taxonomy strings do not occur in prose and only add
false positives. The measured basis: the prototype's containment ran on
hand-authored lowercase phrases; the floor covers what is mechanically
nameable, the model covers the distinctive surface.

## Parameters

### subject

[`NarrativeEvent`](#interface-narrativeevent) \| [`OfficialRecord`](#interface-officialrecord)

### entities

[`EntityLike`](#interface-entitylike)[]

## Returns

`string`[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / tick

# Function: tick()

> **tick**(`repo`, `campaignId`, `opts`): `Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `worldDay`: `number`; \}\>

Phase H (§11), reduced to what pure derivation leaves it: the out-of-band
clock road (#20 — downtime, session breaks; in-fiction time travels on
`commit_narrative.daysElapsed`) plus the world-health report. Arrivals and
salience decay are read-time facts of `deriveBeliefs`; policy dispatch
happens at commit.

## Parameters

### repo

[`Repository`](#interface-repository)

### campaignId

[`CampaignId`](#type-alias-campaignid)

### opts

#### days

`number`

#### k?

`number`

## Returns

`Promise`\<\{ `health`: [`WorldHealth`](#interface-worldhealth); `worldDay`: `number`; \}\>

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / validateInventionTokens

# Function: validateInventionTokens()

> **validateInventionTokens**(`invention`): [`InventionTokenRejection`](#type-alias-inventiontokenrejection)[]

Commit-time validation of an invention's uptake alphabet (#46).

These tokens are what `detectUptake` searches the player's utterance for, and
a match promotes the invention into canon. They arrive from the model, and
until 0.5.1 nothing looked at them — so the model chose the string whose
later appearance would make its own invention true. Tag one `"le"` and the
next French sentence the player types promotes it.

Two guards, because each catches what the other cannot:

- **Provenance.** The token must occur in `sourceNarration`, so it can only
  be something the player actually read. This is the event-side argument
  (`validateSuppliedTokens`) applied to the other half of the bundle.
- **Distinctiveness.** The token must not be a stopword and must not be a
  fragment. Provenance alone cannot catch this: `sourceNarration` is
  model-supplied too, and `"le"` occurs in nearly all French prose, so it
  passes a presence check trivially.

**What this does not do.** It raises the floor; it does not make the channel
safe. A common noun that is not a stopword — `"porte"`, `"nord"` — still
passes, and detecting that would need a frequency model this engine does not
have. The durable answer is to stop detecting uptake from raw prose at all
and carve it from an act instead; this guard is what holds until then.

## Parameters

### invention

#### sourceNarration

`string`

#### surfaceTokens

`string`[]

## Returns

[`InventionTokenRejection`](#type-alias-inventiontokenrejection)[]

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / validateSuppliedTokens

# Function: validateSuppliedTokens()

> **validateSuppliedTokens**(`e`): `string`[]

Commit-time validation (#25): a supplied token absent from `circumstance`
and every textual act value cannot leak — it can only false-positive against
innocent prose — so it is rejected. Returns the invalid tokens.

## Parameters

### e

[`NarrativeEvent`](#interface-narrativeevent)

## Returns

`string`[]

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

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / worldHealth

# Function: worldHealth()

> **worldHealth**(`input`): [`WorldHealth`](#interface-worldhealth)

## Parameters

### input

[`WorldHealthInput`](#interface-worldhealthinput)

## Returns

[`WorldHealth`](#interface-worldhealth)


## variables

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ADVERTISED\_TOOL\_NAMES

# Variable: ADVERTISED\_TOOL\_NAMES

> `const` **ADVERTISED\_TOOL\_NAMES**: readonly [`ToolName`](#type-alias-toolname)[] = `ToolNames`

Tools advertised to LLMs. Every listed tool is implemented.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DEFAULT\_GROUP\_HOLDER\_ID

# Variable: DEFAULT\_GROUP\_HOLDER\_ID

> `const` **DEFAULT\_GROUP\_HOLDER\_ID**: `"h_default_group"` = `"h_default_group"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DEFAULT\_MAX\_DISPATCH\_FANOUT

# Variable: DEFAULT\_MAX\_DISPATCH\_FANOUT

> `const` **DEFAULT\_MAX\_DISPATCH\_FANOUT**: `64` = `64`

Default for EngineConfig.maxDispatchFanout (#15).

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DEFAULT\_REALM\_ENTITY\_ID

# Variable: DEFAULT\_REALM\_ENTITY\_ID

> `const` **DEFAULT\_REALM\_ENTITY\_ID**: `"realm_default"` = `"realm_default"`

Deterministic ids — the executor and the CLI can rely on them without a lookup.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / DEFAULT\_SALIENCE\_WEIGHTS

# Variable: DEFAULT\_SALIENCE\_WEIGHTS

> `const` **DEFAULT\_SALIENCE\_WEIGHTS**: [`SalienceWeights`](#type-alias-salienceweights)

The prototype's exercised values (§2.5). Five factors are the decided thing;
the weights are a config constant, tunable via `EngineConfig` without
touching the factor list. The model never ranks its own memory.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / OPERATION\_RETENTION

# Variable: OPERATION\_RETENTION

> `const` **OPERATION\_RETENTION**: `100` = `100`

Per-campaign size of the operation dedup ring (#29). Retries are
near-in-time; the ring is a bounded log, never a forever-log.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / PUBLIC\_TAG

# Variable: PUBLIC\_TAG

> `const` **PUBLIC\_TAG**: `"public"` = `"public"`

Declares a name common knowledge. The floor forbids the names of every
subject a holder has not learned, which is right for people and secrets and
wrong for landmarks: a tavern that appears in one secret meeting becomes
unmentionable to the whole town, and the host's own scene description stops
passing its own pre-flight check.

Tag the tavern `public` and its NAME stops being withheld. Nothing else
changes: what happened there is still forbidden, and every model-supplied
token, record key and record value stays subject to the floor. This is a
deliberate, authored, per-entity weakening — `doctor` counts them.

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / SNEQ\_ENGINE\_VERSION

# Variable: SNEQ\_ENGINE\_VERSION

> `const` **SNEQ\_ENGINE\_VERSION**: `"0.6.0"` = `"0.6.0"`

[**sneq-engine API**](#sneq-engine-api)

***

[sneq-engine API](#sneq-engine-api) / ToolNames

# Variable: ToolNames

> `const` **ToolNames**: readonly \[`"sneq__lookup_entity"`, `"sneq__get_entity"`, `"sneq__get_holder_context"`, `"sneq__suggest_existing"`, `"sneq__mention_entity"`, `"sneq__commit_narrative"`, `"sneq__add_constraint"`, `"sneq__set_scene"`, `"sneq__advance_turn"`, `"sneq__validate_narration"`\]

Ten tools (§5.2). `get_relevant_facts` and `register_fact` are gone: the
first was the omniscient read this design exists to remove, the second asked
a stochastic process to invent a stable attribute key and then let
GM_NARRATION walk straight into canon.

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

> `readonly` **sneq\_\_add\_constraint**: `ZodObject`\<\{ `attributeKey`: `ZodString`; `entityId`: `ZodString`; `justification`: `ZodString`; `role`: `ZodUnion`\<readonly \[`ZodObject`\<\{ `role`: `ZodLiteral`\<`"REGLE_MONDE"`\>; `ruleId`: `ZodString`; \}, `$strip`\>, `ZodObject`\<\{ `confidence`: `ZodNumber`; `role`: `ZodLiteral`\<`"INFERENCE_IA"`\>; \}, `$strip`\>, `ZodObject`\<\{ `factId`: `ZodString`; `role`: `ZodLiteral`\<`"FAIT_CANONIQUE"`\>; \}, `$strip`\>, `ZodObject`\<\{ `edgeKey`: `ZodString`; `role`: `ZodLiteral`\<`"RELATION"`\>; \}, `$strip`\>\]\>; `rule`: `ZodUnknown`; \}, `$strip`\>

### sneq\_\_advance\_turn

> `readonly` **sneq\_\_advance\_turn**: `ZodObject`\<\{ `days`: `ZodOptional`\<`ZodNumber`\>; `summary`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

### sneq\_\_commit\_narrative

> `readonly` **sneq\_\_commit\_narrative**: `ZodObject`\<\{ `carriageEffects`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carriageId`: `ZodString`; `declaredOnDay`: `ZodNumber`; `effect`: `ZodUnion`\<readonly \[`ZodObject`\<\{ `days`: ...; `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `kind`: ...; \}, `$strip`\>\]\>; \}, `$strip`\>\>\>; `carriages`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carriageId`: `ZodString`; `carrier`: `ZodString`; `fromPlaceId`: `ZodString`; `minStanding`: `ZodOptional`\<`ZodNumber`\>; `route`: `ZodEnum`\<\{ `OFFICIAL`: `"OFFICIAL"`; `RUMOUR`: `"RUMOUR"`; \}\>; `subject`: `ZodUnion`\<readonly \[`ZodObject`\<\{ `id`: ...; `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `id`: ...; `kind`: ...; \}, `$strip`\>\]\>; `toPlaceId`: `ZodString`; `travelDays`: `ZodNumber`; \}, `$strip`\>\>\>; `daysElapsed`: `ZodNumber`; `event`: `ZodOptional`\<`ZodObject`\<\{ `acts`: `ZodArray`\<`ZodObject`\<\{ `actorId`: `ZodString`; `objectId`: `ZodOptional`\<`ZodString`\>; `sets`: `ZodOptional`\<`ZodObject`\<..., ...\>\>; `value`: `ZodOptional`\<`ZodType`\<..., ..., ...\>\>; `verb`: `ZodString`; \}, `$strip`\>\>; `circumstance`: `ZodString`; `eventId`: `ZodString`; `gravity`: `ZodUnion`\<readonly \[`ZodLiteral`\<`0`\>, `ZodLiteral`\<`1`\>, `ZodLiteral`\<`2`\>, `ZodLiteral`\<`3`\>\]\>; `participants`: `ZodArray`\<`ZodString`\>; `placeId`: `ZodOptional`\<`ZodString`\>; `surfaceTokens`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>\>; `holders`: `ZodOptional`\<`ZodArray`\<`ZodUnion`\<readonly \[`ZodObject`\<\{ `community`: `ZodString`; `holderId`: `ZodString`; `kind`: `ZodLiteral`\<`"GROUP"`\>; `placeId`: `ZodString`; `realmId`: `ZodString`; `standing`: `ZodNumber`; `stratum`: `ZodString`; \}, `$strip`\>, `ZodObject`\<\{ `baseGroupId`: `ZodString`; `derogationReason`: `ZodEnum`\<\{ `PARTICIPANT`: ...; `PERSONAL_STAKE`: ...; `PLAYER`: ...; \}\>; `entityId`: `ZodString`; `holderId`: `ZodString`; `kind`: `ZodLiteral`\<`"INDIVIDUAL"`\>; `standingOverride`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\>\]\>\>\>; `inventions`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `attributeKey`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `confidence`: `ZodNumber`; `entityId`: `ZodString`; `inventionId`: `ZodString`; `sourceNarration`: `ZodString`; `surfaceTokens`: `ZodArray`\<`ZodString`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>\>\>; `operationId`: `ZodString`; `playerUtterance`: `ZodOptional`\<`ZodString`\>; `policy`: `ZodOptional`\<`ZodObject`\<\{ `routes`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `fromPlaceId`: `ZodString`; `minStanding`: `ZodOptional`\<...\>; `route`: `ZodEnum`\<...\>; `toPlaceId`: `ZodString`; `travelDays`: `ZodNumber`; \}, `$strip`\>\>\>; `rules`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `carrierLabel`: `ZodString`; `minGravity`: `ZodUnion`\<...\>; `route`: `ZodEnum`\<...\>; `targets`: `ZodUnion`\<...\>; \}, `$strip`\>\>\>; \}, `$strip`\>\>; `promotionEvidence`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `evidence`: `ZodUnion`\<readonly \[`ZodObject`\<\{ `eventId`: ...; `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `eventId`: ...; `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `eventId`: ...; `kind`: ...; \}, `$strip`\>, `ZodObject`\<\{ `kind`: ...; `recordId`: ...; \}, `$strip`\>\]\>; `inventionId`: `ZodString`; \}, `$strip`\>\>\>; `records`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `aboutEventId`: `ZodOptional`\<`ZodString`\>; `authoredBy`: `ZodString`; `category`: `ZodEnum`\<\{ `COMPETENCE`: `"COMPETENCE"`; `ETAT`: `"ETAT"`; `HISTORIQUE`: `"HISTORIQUE"`; `IDENTITE`: `"IDENTITE"`; `POSSESSION`: `"POSSESSION"`; `PSYCHOLOGIE`: `"PSYCHOLOGIE"`; `SECRET`: `"SECRET"`; `SOCIAL`: `"SOCIAL"`; \}\>; `entityId`: `ZodString`; `key`: `ZodString`; `observation`: `ZodObject`\<\{ `emittedBy`: `ZodOptional`\<`ZodString`\>; `excerpt`: `ZodOptional`\<`ZodString`\>; `method`: `ZodEnum`\<\{ `AVEU`: ...; `DEDUCTION_CONFIRMEE`: ...; `DEMONSTRATION`: ...; `DIALOGUE_DIRECT`: ...; `DOCUMENT`: ...; `OBSERVATION_VISUELLE`: ...; \}\>; `sceneId`: `ZodOptional`\<`ZodString`\>; `source`: `ZodEnum`\<\{ `DICE_ROLL`: ...; `GM_NARRATION`: ...; `OUT_OF_BAND`: ...; `PLAYER_UTTERANCE`: ...; `SYSTEM`: ...; \}\>; `timestamp`: `ZodNumber`; \}, `$strict`\>; `recordId`: `ZodString`; `route`: `ZodEnum`\<\{ `OFFICIAL`: `"OFFICIAL"`; `RUMOUR`: `"RUMOUR"`; \}\>; `surfaceTokens`: `ZodArray`\<`ZodString`\>; `value`: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>; \}, `$strip`\>\>\>; \}, `$strip`\>

### sneq\_\_get\_entity

> `readonly` **sneq\_\_get\_entity**: `ZodObject`\<\{ `entityId`: `ZodString`; \}, `$strip`\>

### sneq\_\_get\_holder\_context

> `readonly` **sneq\_\_get\_holder\_context**: `ZodObject`\<\{ `about`: `ZodOptional`\<`ZodString`\>; `entityId`: `ZodOptional`\<`ZodString`\>; `holderId`: `ZodOptional`\<`ZodString`\>; `topK`: `ZodOptional`\<`ZodNumber`\>; \}, `$strip`\> = `holderContextArgs`

### sneq\_\_lookup\_entity

> `readonly` **sneq\_\_lookup\_entity**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>

### sneq\_\_mention\_entity

> `readonly` **sneq\_\_mention\_entity**: `ZodObject`\<\{ `aliases`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `canonicalName`: `ZodString`; `description`: `ZodString`; `force`: `ZodOptional`\<`ZodBoolean`\>; `public`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

### sneq\_\_set\_scene

> `readonly` **sneq\_\_set\_scene**: `ZodObject`\<\{ `description`: `ZodString`; `locationEntityId`: `ZodString`; `presentEntityIds`: `ZodArray`\<`ZodString`\>; \}, `$strip`\>

### sneq\_\_suggest\_existing

> `readonly` **sneq\_\_suggest\_existing**: `ZodObject`\<\{ `mention`: `ZodString`; `type`: `ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>; \}, `$strip`\>

### sneq\_\_validate\_narration

> `readonly` **sneq\_\_validate\_narration**: `ZodObject`\<\{ `holderId`: `ZodOptional`\<`ZodString`\>; `narration`: `ZodString`; `strict`: `ZodOptional`\<`ZodBoolean`\>; `type`: `ZodOptional`\<`ZodEnum`\<\{ `EVENEMENT`: `"EVENEMENT"`; `FACTION`: `"FACTION"`; `LIEU`: `"LIEU"`; `OBJET`: `"OBJET"`; `PERSONNAGE`: `"PERSONNAGE"`; `RELATION`: `"RELATION"`; `SCENE`: `"SCENE"`; `WORLD`: `"WORLD"`; \}\>\>; \}, `$strip`\>
