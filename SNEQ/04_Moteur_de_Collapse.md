# SNEQ - Partie 4 : Moteur de Collapse (MC)

---

## Navigation

← [03 - Graphe de Cohérence](./03_Graphe_de_Coherence.md) | [05 - Pré-génération et Cache →](./05_Pregeneration_et_Cache.md)

---

# 4. Moteur de Collapse (MC)

## 4.1 Vue d'ensemble

Le Moteur de Collapse est le **chef d'orchestre** qui :

1. Détecte quand une observation du joueur nécessite de figer un attribut
2. Rassemble tout le contexte nécessaire
3. Appelle l'IA pour générer une valeur cohérente
4. Valide que cette valeur ne crée pas de contradiction
5. Inscrit le fait dans le Registre Canonique
6. Déclenche la propagation des contraintes

C'est le point de contact entre le monde déterministe du jeu et l'intelligence générative.

---

## 4.2 Architecture du Moteur

```typescript
class MoteurCollapse {
  
  private rc: RegistreCanonique;
  private cp: ChampPotentialites;
  private gcn: GrapheCoherenceNarrative;
  private ia: ServiceIA;
  private validateur: ValidateurCoherence;
  private propagateur: MoteurPropagation;
  private cache: CacheGeneration;
  
  // Point d'entrée principal
  async collapse(demande: DemandeCollapse): Promise<ResultatCollapse> {
    
    // 1. Vérifier si déjà figé
    const existant = this.rc.getFait(demande.entiteId, demande.attribut);
    if (existant) {
      return { 
        type: 'DEJA_FIGE', 
        fait: existant 
      };
    }
    
    // 2. Vérifier le cache de pré-génération
    const cached = this.cache.get(demande.entiteId, demande.attribut);
    if (cached && this.validerCache(cached, demande)) {
      return this.finaliserCollapse(cached.valeur, demande);
    }
    
    // 3. Construire le contexte
    const contexte = await this.construireContexte(demande);
    
    // 4. Générer via IA
    const generation = await this.genererValeur(contexte);
    
    // 5. Valider
    const validation = this.validateur.valider(generation, contexte);
    if (!validation.valide) {
      return this.gererEchecValidation(validation, contexte, demande);
    }
    
    // 6. Finaliser
    return this.finaliserCollapse(generation.valeur, demande);
  }
  
  private async finaliserCollapse(
    valeur: AttributValue, 
    demande: DemandeCollapse
  ): Promise<ResultatCollapse> {
    
    // Inscrire dans le RC
    const fait = this.rc.inscrireFait(
      demande.entiteId,
      demande.attribut,
      valeur,
      demande.observation
    );
    
    // Retirer du CP
    this.cp.convertirEnFige(demande.entiteId, demande.attribut);
    
    // Propager les contraintes
    const propagation = this.propagateur.propager(fait, this.gcn, this.cp);
    
    // Invalider le cache affecté
    this.cache.invaliderPourEntites(propagation.entitesImpactees);
    
    return {
      type: 'SUCCES',
      fait,
      propagation
    };
  }
}
```

---

## 4.3 Demande de Collapse

Tout commence par une demande structurée :

```typescript
interface DemandeCollapse {
  // Quoi
  entiteId: EntityID;
  attribut: string;
  
  // Contexte d'observation
  observation: {
    timestamp: GameTimestamp;
    lieu: EntityID;
    methode: ObservationMethod;
    declencheur: DeclencheurObservation;
  };
  
  // Contraintes additionnelles du moment
  contraintesContextuelles?: Contrainte[];
  
  // Options de génération
  options: OptionsCollapse;
}

type DeclencheurObservation = 
  | { type: 'DIALOGUE'; pnjId: EntityID; ligneDialogue: string }
  | { type: 'EXPLORATION'; zoneId: EntityID; action: string }
  | { type: 'LECTURE'; documentId: EntityID }
  | { type: 'EVENEMENT'; evenementId: EntityID }
  | { type: 'COMBAT'; cibleId: EntityID }
  | { type: 'COMPETENCE'; competence: string };  // Perception, investigation, etc.

interface OptionsCollapse {
  // Niveau de détail attendu
  profondeur: 'MINIMAL' | 'STANDARD' | 'DETAILLE';
  
  // Tonalité
  registre: 'NEUTRE' | 'DRAMATIQUE' | 'HUMORISTIQUE' | 'SOMBRE';
  
  // Timeout pour la génération IA
  timeoutMs: number;
  
  // Nombre max de tentatives si échec validation
  maxTentatives: number;
  
  // Autoriser génération partielle ?
  accepterPartiel: boolean;
}
```

---

## 4.4 Construction du Contexte

Le contexte est **crucial** — c'est ce que l'IA voit pour prendre sa décision :

```typescript
interface ContexteCollapse {
  // === CIBLE ===
  cible: {
    entite: EntityComplete;
    attributDemande: string;
    categorieAttribut: CategorieAttribut;
    potentialite: Potentialite;
  };
  
  // === CONTRAINTES ===
  contraintes: {
    strictes: Contrainte[];      // DOIVENT être respectées
    souples: Contrainte[];       // DEVRAIENT être respectées
    tendances: Tendance[];       // Suggestions pondérées
  };
  
  // === CONTEXTE RELATIONNEL ===
  grapheLocal: {
    relationsDirectes: RelationContextuelle[];
    entitesProches: EntityResume[];
    cheminsNarratifs: CheminNarratif[];
  };
  
  // === HISTORIQUE JOUEUR ===
  historiqueJoueur: {
    actionsRecentes: ActionJoueur[];
    choixMoraux: ProfilMoral;
    reputations: Map<FactionID, number>;
    connaissances: Set<FaitID>;  // Ce que le joueur sait
  };
  
  // === CONTEXTE IMMÉDIAT ===
  situationActuelle: {
    lieu: EntityComplete;
    moment: MomentNarratif;      // Jour/nuit, saison, événement en cours
    temoinPresents: EntityID[];
    ambiance: string;
  };
  
  // === MÉTA ===
  meta: {
    nombreFaitsFiges: number;
    progressionNarrative: number;  // 0-1, avancement global
    themes: string[];              // Thèmes dominants de la partie
  };
}
```

### Constructeur de Contexte

```typescript
class ConstructeurContexte {
  
  async construire(demande: DemandeCollapse): Promise<ContexteCollapse> {
    
    // Récupérer l'entité complète
    const entite = await this.recupererEntiteComplete(demande.entiteId);
    
    // Récupérer la potentialité
    const potentialite = this.cp.getPotentialite(
      demande.entiteId, 
      demande.attribut
    );
    
    // Extraire le sous-graphe pertinent
    const sousGraphe = this.gcn.extraireSousGrapheContextuel(
      [demande.entiteId],
      RAYON_CONTEXTE  // ex: 3
    );
    
    // Classifier les contraintes
    const contraintesClassifiees = this.classifierContraintes(
      potentialite.contraintes
    );
    
    // Récupérer l'historique joueur pertinent
    const historiqueJoueur = await this.recupererHistoriqueJoueur(
      demande,
      sousGraphe
    );
    
    // Analyser la situation actuelle
    const situation = this.analyserSituation(demande.observation);
    
    return {
      cible: {
        entite,
        attributDemande: demande.attribut,
        categorieAttribut: this.determinerCategorie(demande.attribut),
        potentialite
      },
      contraintes: contraintesClassifiees,
      grapheLocal: this.formaterGrapheLocal(sousGraphe),
      historiqueJoueur,
      situationActuelle: situation,
      meta: this.calculerMeta()
    };
  }
  
  private classifierContraintes(contraintes: Contrainte[]): ContraintesClassifiees {
    const strictes: Contrainte[] = [];
    const souples: Contrainte[] = [];
    const tendances: Tendance[] = [];
    
    for (const c of contraintes) {
      // Contraintes venant de faits figés = strictes
      if (c.source.type === 'FAIT_CANONIQUE') {
        strictes.push(c);
      }
      // Contraintes venant de règles monde = strictes
      else if (c.source.type === 'REGLE_MONDE') {
        strictes.push(c);
      }
      // Contraintes venant de relations = souples
      else if (c.source.type === 'RELATION') {
        souples.push(c);
      }
      // Inférences IA = tendances
      else if (c.source.type === 'INFERENCE_IA') {
        tendances.push({
          description: c.justificationNarrative,
          poids: c.source.confidence
        });
      }
    }
    
    return { strictes, souples, tendances };
  }
}
```

---

## 4.5 Génération IA

### Interface avec le LLM

```typescript
interface ServiceIA {
  generer(prompt: PromptCollapse): Promise<ReponseIA>;
}

interface PromptCollapse {
  systemPrompt: string;
  contexte: string;
  instructions: string;
  formatSortie: SchemaJSON;
  exemples?: ExempleGeneration[];
}

interface ReponseIA {
  valeur: AttributValue;
  raisonnement: string;        // Explication de l'IA
  confidence: number;          // 0-1
  alternativesConsiderees?: AttributValue[];
}
```

---

## 4.6 Validation

Après génération, validation rigoureuse :

```typescript
class ValidateurCoherence {
  
  valider(reponse: ReponseIA, contexte: ContexteCollapse): ResultatValidation {
    
    const erreurs: ErreurValidation[] = [];
    const avertissements: Avertissement[] = [];
    
    // 1. Validation du format
    const formatOk = this.validerFormat(
      reponse.valeur, 
      contexte.cible.categorieAttribut
    );
    if (!formatOk.valide) {
      erreurs.push({ type: 'FORMAT', message: formatOk.erreur });
    }
    
    // 2. Validation des contraintes strictes
    for (const contrainte of contexte.contraintes.strictes) {
      const respect = this.verifierContrainte(reponse.valeur, contrainte);
      if (!respect.respectee) {
        erreurs.push({
          type: 'CONTRAINTE_STRICTE',
          message: `Viole la contrainte: ${contrainte.justificationNarrative}`,
          details: respect.violation
        });
      }
    }
    
    // 3. Validation des contraintes souples
    for (const contrainte of contexte.contraintes.souples) {
      const respect = this.verifierContrainte(reponse.valeur, contrainte);
      if (!respect.respectee) {
        avertissements.push({
          type: 'CONTRAINTE_SOUPLE',
          message: `Ne respecte pas: ${contrainte.justificationNarrative}`,
          acceptable: this.evaluerAcceptabilite(respect, reponse.raisonnement)
        });
      }
    }
    
    // 4. Vérification de non-contradiction avec le RC
    const contradictions = this.verifierContradictionsRC(
      reponse.valeur,
      contexte.cible.entiteId,
      contexte
    );
    for (const contradiction of contradictions) {
      erreurs.push({
        type: 'CONTRADICTION_RC',
        message: `Contredit le fait figé: ${contradiction.fait.description}`,
        details: contradiction
      });
    }
    
    // 5. Validation sémantique
    const semantique = this.validerSemantique(reponse, contexte);
    if (!semantique.valide) {
      erreurs.push({
        type: 'SEMANTIQUE',
        message: semantique.erreur
      });
    }
    
    // 6. Score de qualité narrative
    const scoreNarratif = this.evaluerQualiteNarrative(reponse, contexte);
    
    return {
      valide: erreurs.length === 0,
      erreurs,
      avertissements,
      scoreNarratif,
      recommandations: this.genererRecommandations(erreurs, avertissements)
    };
  }
  
  private verifierContrainte(
    valeur: AttributValue, 
    contrainte: Contrainte
  ): VerificationContrainte {
    
    switch (contrainte.regle.type) {
      
      case 'DOIT_ETRE':
        const matchDoit = contrainte.regle.valeurs.some(v => 
          this.valeursEquivalentes(valeur, v)
        );
        return {
          respectee: matchDoit,
          violation: matchDoit ? null : 
            `Valeur "${valeur}" non dans les valeurs permises`
        };
        
      case 'NE_PEUT_PAS_ETRE':
        const matchInterdit = contrainte.regle.valeurs.some(v => 
          this.valeursEquivalentes(valeur, v)
        );
        return {
          respectee: !matchInterdit,
          violation: matchInterdit ? 
            `Valeur "${valeur}" explicitement interdite` : null
        };
        
      case 'IMPLIQUE':
        return this.evaluerImplication(valeur, contrainte.regle);
        
      case 'RANGE_NUMERIQUE':
        if (valeur.type !== 'NUMBER') {
          return { respectee: false, violation: 'Type non numérique' };
        }
        const dansRange = 
          (contrainte.regle.min === undefined || 
           valeur.valeur >= contrainte.regle.min) &&
          (contrainte.regle.max === undefined || 
           valeur.valeur <= contrainte.regle.max);
        return {
          respectee: dansRange,
          violation: dansRange ? null : 
            `Valeur ${valeur.valeur} hors range ` +
            `[${contrainte.regle.min}, ${contrainte.regle.max}]`
        };
        
      default:
        return { respectee: true, violation: null };
    }
  }
  
  private evaluerQualiteNarrative(
    reponse: ReponseIA, 
    contexte: ContexteCollapse
  ): ScoreNarratif {
    
    let score = 0;
    const details: string[] = [];
    
    // Crée-t-il du potentiel dramatique ?
    if (this.detecterPotentielDramatique(reponse.valeur)) {
      score += 20;
      details.push('Potentiel dramatique détecté');
    }
    
    // Crée-t-il des liens avec d'autres entités ?
    const liens = this.compterLiensCrees(reponse.valeur, contexte);
    score += liens * 10;
    details.push(`${liens} liens narratifs potentiels`);
    
    // Est-ce cohérent avec les thèmes ?
    const coherenceThemes = this.evaluerCoherenceThemes(
      reponse.valeur, 
      contexte.meta.themes
    );
    score += coherenceThemes * 15;
    details.push(`Cohérence thématique: ${coherenceThemes}/1`);
    
    // Est-ce surprenant mais logique ?
    const surprise = this.evaluerSurprise(reponse.valeur, contexte);
    score += surprise * 10;
    details.push(`Facteur surprise: ${surprise}/1`);
    
    return {
      score: Math.min(100, score),
      details
    };
  }
}
```

---

## 4.7 Gestion des Échecs

Quand la validation échoue :

```typescript
class GestionnaireEchecs {
  
  async gererEchec(
    validation: ResultatValidation,
    contexte: ContexteCollapse,
    demande: DemandeCollapse,
    tentative: number
  ): Promise<ResultatCollapse> {
    
    // Trop de tentatives ?
    if (tentative >= demande.options.maxTentatives) {
      return this.echecDefinitif(validation, contexte, demande);
    }
    
    // Analyser le type d'échec
    const typeEchec = this.analyserEchec(validation);
    
    switch (typeEchec) {
      
      case 'CONTRAINTE_IMPOSSIBLE':
        // Les contraintes sont mutuellement exclusives
        return this.resoudreContraintesImpossibles(contexte, demande);
        
      case 'CONTRADICTION_DIRECTE':
        // L'IA a ignoré un fait figé
        return this.regenererAvecEmphase(
          contexte, demande, validation, tentative
        );
        
      case 'FORMAT_INVALIDE':
        // Réponse mal formée
        return this.regenererAvecCorrection(
          contexte, demande, validation, tentative
        );
        
      case 'QUALITE_INSUFFISANTE':
        // Techniquement valide mais narrativement pauvre
        return this.regenererAvecGuidance(
          contexte, demande, validation, tentative
        );
        
      default:
        return this.regenererStandard(contexte, demande, tentative);
    }
  }
  
  private async regenererAvecEmphase(
    contexte: ContexteCollapse,
    demande: DemandeCollapse,
    validation: ResultatValidation,
    tentative: number
  ): Promise<ResultatCollapse> {
    
    // Ajouter les erreurs comme contraintes explicites
    const contraintesRenforcees = validation.erreurs.map(e => ({
      type: 'EXPLICITE' as const,
      message: `ERREUR PRÉCÉDENTE - NE PAS RÉPÉTER: ${e.message}`
    }));
    
    const nouveauContexte = {
      ...contexte,
      contraintes: {
        ...contexte.contraintes,
        strictes: [
          ...contexte.contraintes.strictes,
          ...this.convertirEnContraintes(contraintesRenforcees)
        ]
      },
      meta: {
        ...contexte.meta,
        tentativesPrecedentes: [
          ...(contexte.meta.tentativesPrecedentes || []),
          { erreurs: validation.erreurs }
        ]
      }
    };
    
    // Relancer le collapse avec le contexte enrichi
    return this.moteur.collapse({
      ...demande,
      contexteEnrichi: nouveauContexte,
      tentative: tentative + 1
    });
  }
  
  private resoudreContraintesImpossibles(
    contexte: ContexteCollapse,
    demande: DemandeCollapse
  ): ResultatCollapse {
    
    // Cas rare mais possible : les contraintes se contredisent
    
    // 1. Identifier la contrainte la plus faible
    const contraintesOrdonnees = this.ordonnerParForce(
      contexte.contraintes.strictes
    );
    
    // 2. Tenter de réinterpréter (ex: "le PNJ mentait")
    const reinterpretation = this.tenterReinterpretation(contraintesOrdonnees);
    if (reinterpretation) {
      return {
        type: 'REINTERPRETATION',
        fait: reinterpretation.nouveauFait,
        modification: reinterpretation.explication
      };
    }
    
    // 3. En dernier recours : signaler l'incohérence
    return {
      type: 'ECHEC_INCOHERENCE',
      message: 'Contraintes mutuellement exclusives détectées',
      details: contraintesOrdonnees,
      actionRequise: 'INTERVENTION_AUTEUR'
    };
  }
  
  private echecDefinitif(
    validation: ResultatValidation,
    contexte: ContexteCollapse,
    demande: DemandeCollapse
  ): ResultatCollapse {
    
    if (demande.options.accepterPartiel) {
      // Générer une valeur "safe" minimale
      const valeurDefaut = this.genererValeurDefaut(
        contexte.cible.categorieAttribut,
        contexte.contraintes.strictes
      );
      
      return {
        type: 'PARTIEL',
        fait: this.creerFaitMinimal(valeurDefaut, demande),
        avertissement: 'Génération par défaut après échecs multiples'
      };
    }
    
    return {
      type: 'ECHEC',
      erreurs: validation.erreurs,
      contexte: contexte,
      suggestion: 'Réessayer plus tard ou modifier les contraintes'
    };
  }
}
```

---

## 4.8 Flux Complet Illustré

```
JOUEUR: "Parle-moi de ton passé" → au Forgeron

         │
         ▼
┌─────────────────────────────────────┐
│     DÉTECTEUR D'OBSERVATION         │
│                                     │
│  Dialogue déclenché                 │
│  Attribut requis: "histoire_passé"  │
│  État actuel: CONTRAINT             │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     VÉRIFICATION CACHE              │
│                                     │
│  Cache miss - génération requise    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     CONSTRUCTION CONTEXTE           │
│                                     │
│  • Entité: Forgeron (partiellement  │
│    connu: profession, nom)          │
│  • Contraintes strictes:            │
│    - Ancien militaire [FIGÉ]        │
│    - A servi sous le Duc [FIGÉ]     │
│  • Relations: ami du Tavernier,     │
│    fournit l'Armurier               │
│  • Joueur: a découvert cruauté Duc  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     APPEL LLM                       │
│                                     │
│  Prompt construit avec contexte     │
│  Timeout: 5000ms                    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     RÉPONSE IA                      │
│                                     │
│  "Aldric était capitaine dans       │
│   l'armée du Duc. Il a participé    │
│   au massacre de Valmure mais a     │
│   secrètement aidé des villageois   │
│   à fuir. Il vit avec cette         │
│   culpabilité depuis."              │
│                                     │
│  Confidence: 0.85                   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     VALIDATION                      │
│                                     │
│  ✓ Format OK                        │
│  ✓ Contraintes strictes OK          │
│  ✓ Pas de contradiction RC          │
│  ✓ Score narratif: 78/100           │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     INSCRIPTION RC                  │
│                                     │
│  Nouveau fait FIGÉ:                 │
│  forgeron.histoire_passé =          │
│    { role: "capitaine",             │
│      evenement: "massacre_valmure", │
│      secret: "a_aide_villageois",   │
│      etat: "culpabilite" }          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│     PROPAGATION                     │
│                                     │
│  Nouvelles contraintes créées:      │
│  • Tavernier.secret: CORRÉLÉ        │
│    (peut-être au courant)           │
│  • Massacre_Valmure: IMPLIQUE       │
│    (le forgeron était présent)      │
│  • Duc.crimes: RENFORCÉ             │
│    (preuve supplémentaire)          │
└─────────────────────────────────────┘
```

---

→ **Suite :** [05 - Pré-génération et Cache](./05_Pregeneration_et_Cache.md)
