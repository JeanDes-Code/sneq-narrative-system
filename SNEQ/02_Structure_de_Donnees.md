# SNEQ - Partie 2 : Structure de Données Fondamentale

---

## Navigation

← [01 - Introduction](./01_Introduction_et_Concept.md) | [03 - Graphe de Cohérence →](./03_Graphe_de_Coherence.md)

---

# 2. Structure de Données Fondamentale

## 2.1 Le Registre Canonique (RC)

### Principe

Le RC est la **mémoire infaillible** du monde. Tout ce que le joueur a observé y est inscrit de manière permanente. C'est le contrat entre le jeu et le joueur : ce qui a été vu ne changera jamais.

### Structure Détaillée

```typescript
// === ENTITÉS ===

type EntityType = 
  | 'PERSONNAGE' 
  | 'LIEU' 
  | 'OBJET' 
  | 'FACTION' 
  | 'EVENEMENT' 
  | 'RELATION';

interface Entity {
  id: string;                    // UUID unique
  type: EntityType;
  nom: string;                   // Nom canonique une fois connu
  nomConnu: boolean;             // Le joueur connaît-il le vrai nom ?
  aliases: string[];             // "l'homme masqué", "le forgeron", etc.
  dateCreation: GameTimestamp;   // Quand l'entité est entrée dans le RC
  
  attributsFiges: Map<string, AttributFige>;
}

// === ATTRIBUTS FIGÉS ===

interface AttributFige {
  cle: string;                   // ex: "profession", "secret", "motivation"
  valeur: AttributValue;
  
  // Métadonnées d'observation
  observation: {
    timestamp: GameTimestamp;
    lieu: EntityID;
    methode: ObservationMethod;
    source: SourceType;
    fiabilite: 'CERTAINE' | 'TEMOIGNAGE' | 'RUMEUR_CONFIRMEE';
  };
  
  // Traçabilité
  preuves: Preuve[];
}

type ObservationMethod = 
  | 'DIALOGUE_DIRECT'      // Le PNJ l'a dit lui-même
  | 'DOCUMENT'             // Lu dans un livre, lettre, etc.
  | 'OBSERVATION_VISUELLE' // Vu de ses propres yeux
  | 'DEDUCTION_CONFIRMEE'  // Déduit puis confirmé
  | 'AVEU'                 // Révélé sous contrainte/confession
  | 'DEMONSTRATION';       // Prouvé par action (combat, magie, etc.)

type SourceType = 
  | { type: 'ENTITE'; id: EntityID }      // Un PNJ a dit ça
  | { type: 'DOCUMENT'; id: EntityID }    // Un objet-document
  | { type: 'OBSERVATION_DIRECTE' }       // Le joueur a vu
  | { type: 'EVENEMENT'; id: EntityID };  // S'est produit devant le joueur

interface Preuve {
  type: 'DIALOGUE' | 'OBJET' | 'EVENEMENT';
  reference: string;             // ID du dialogue/objet/événement
  extrait?: string;              // Citation ou description
}

// === VALEURS D'ATTRIBUTS ===

type AttributValue = 
  | { type: 'STRING'; valeur: string }
  | { type: 'NUMBER'; valeur: number }
  | { type: 'BOOLEAN'; valeur: boolean }
  | { type: 'ENTITY_REF'; id: EntityID }
  | { type: 'ENTITY_SET'; ids: EntityID[] }
  | { type: 'ENUM'; valeur: string; enumType: string }
  | { type: 'COMPOSITE'; champs: Record<string, AttributValue> };
```

### Exemple Concret

```typescript
const forgeronRC: Entity = {
  id: "ent_7f3a2b",
  type: 'PERSONNAGE',
  nom: "Aldric Fervent",
  nomConnu: true,
  aliases: ["le forgeron", "le vieux grincheux"],
  dateCreation: { jour: 1, heure: 14 },
  
  attributsFiges: new Map([
    ["profession", {
      cle: "profession",
      valeur: { type: 'STRING', valeur: "Forgeron" },
      observation: {
        timestamp: { jour: 1, heure: 14 },
        lieu: "loc_village_centre",
        methode: 'OBSERVATION_VISUELLE',
        source: { type: 'OBSERVATION_DIRECTE' },
        fiabilite: 'CERTAINE'
      },
      preuves: [{
        type: 'EVENEMENT',
        reference: "evt_premiere_rencontre_forgeron",
        extrait: "Un homme travaille le métal à l'enclume"
      }]
    }],
    
    ["passe_militaire", {
      cle: "passe_militaire",
      valeur: { type: 'BOOLEAN', valeur: true },
      observation: {
        timestamp: { jour: 3, heure: 20 },
        lieu: "loc_taverne",
        methode: 'DIALOGUE_DIRECT',
        source: { type: 'ENTITE', id: "ent_7f3a2b" },
        fiabilite: 'CERTAINE'
      },
      preuves: [{
        type: 'DIALOGUE',
        reference: "dial_forgeron_confession",
        extrait: "J'ai servi sous les ordres du Duc pendant quinze ans."
      }]
    }]
  ])
};
```

---

## 2.2 Le Champ de Potentialités (CP)

### Principe

Le CP représente tout ce qui **pourrait être vrai** mais ne l'est pas encore. C'est l'espace des possibles, progressivement réduit par les contraintes.

### Structure Détaillée

```typescript
// === POTENTIALITÉ ===

interface Potentialite {
  entiteId: EntityID;
  attribut: string;
  etat: 'INDEFINI' | 'CONTRAINT';
  
  // Contraintes actives (si CONTRAINT)
  contraintes: Contrainte[];
  
  // Méta-informations pour l'IA
  contexteGeneratif: ContexteGeneratif;
}

// === CONTRAINTES ===

interface Contrainte {
  id: string;
  source: ContrainteSource;
  dateCreation: GameTimestamp;
  
  // La règle elle-même
  regle: RegleContrainte;
  
  // Pour debug et cohérence narrative
  justificationNarrative: string;
}

type ContrainteSource = 
  | { type: 'FAIT_CANONIQUE'; faitId: string }
  | { type: 'RELATION'; relationId: string }
  | { type: 'REGLE_MONDE'; regleId: string }      // Lois du monde (magie, physique, sociale)
  | { type: 'INFERENCE_IA'; confidence: number };

type RegleContrainte = 
  | { type: 'DOIT_ETRE'; valeurs: AttributValue[] }
  | { type: 'NE_PEUT_PAS_ETRE'; valeurs: AttributValue[] }
  | { type: 'IMPLIQUE'; condition: string; consequence: string }
  | { type: 'CORRELE_AVEC'; autreEntite: EntityID; autreAttribut: string }
  | { type: 'RANGE_NUMERIQUE'; min?: number; max?: number }
  | { type: 'REGEX'; pattern: string }
  | { type: 'CUSTOM'; evaluateur: string };  // Référence à une fonction de validation

// === CONTEXTE GÉNÉRATIF ===

interface ContexteGeneratif {
  // Ce que l'IA doit savoir pour générer
  categorieAttribut: CategorieAttribut;
  
  // Suggestions/tendances (non contraignantes)
  tendances?: {
    description: string;
    poids: number;  // 0-1, influence douce sur l'IA
  }[];
  
  // Historique des tentatives (si régénération)
  tentativesPrecedentes?: {
    valeurProposee: AttributValue;
    raisonRejet: string;
  }[];
}

type CategorieAttribut = 
  | 'IDENTITE'           // nom, âge, apparence
  | 'PSYCHOLOGIE'        // motivation, peur, désir
  | 'HISTORIQUE'         // passé, événements vécus
  | 'SOCIAL'             // relations, statut, faction
  | 'COMPETENCE'         // capacités, savoirs
  | 'SECRET'             // ce que l'entité cache
  | 'ETAT'               // condition actuelle (blessé, amoureux, etc.)
  | 'POSSESSION';        // ce que l'entité possède
```

### Exemple Concret

```typescript
const potentialiteSecretForgeron: Potentialite = {
  entiteId: "ent_7f3a2b",
  attribut: "secret_principal",
  etat: 'CONTRAINT',
  
  contraintes: [
    {
      id: "ctr_001",
      source: { type: 'FAIT_CANONIQUE', faitId: "fait_passe_militaire" },
      dateCreation: { jour: 3, heure: 20 },
      regle: { 
        type: 'IMPLIQUE', 
        condition: "passe_militaire = true",
        consequence: "secret lié à période militaire probable"
      },
      justificationNarrative: 
        "Son passé militaire suggère que son secret concerne cette période"
    },
    {
      id: "ctr_002",
      source: { type: 'FAIT_CANONIQUE', faitId: "fait_duc_tyran" },
      dateCreation: { jour: 2, heure: 10 },
      regle: {
        type: 'NE_PEUT_PAS_ETRE',
        valeurs: [{ type: 'STRING', valeur: "loyauté secrète au Duc" }]
      },
      justificationNarrative:
        "Le joueur a appris que le Duc était un tyran cruel - " +
        "une loyauté secrète serait incohérente avec le caractère établi du forgeron"
    },
    {
      id: "ctr_003",
      source: { type: 'RELATION', relationId: "rel_forgeron_tavernier" },
      dateCreation: { jour: 4, heure: 8 },
      regle: {
        type: 'CORRELE_AVEC',
        autreEntite: "ent_tavernier",
        autreAttribut: "secret_principal"
      },
      justificationNarrative:
        "Le joueur a observé des regards entendus entre eux - " +
        "leurs secrets sont probablement liés"
    }
  ],
  
  contexteGeneratif: {
    categorieAttribut: 'SECRET',
    tendances: [
      { 
        description: "Culpabilité liée à un acte de guerre", 
        poids: 0.7 
      },
      { 
        description: "Protection de quelqu'un", 
        poids: 0.5 
      }
    ]
  }
};
```

---

## 2.3 Opérations Fondamentales

### Inscription d'un Fait (RC)

```typescript
interface RegistreCanonique {
  
  inscrireFait(
    entiteId: EntityID,
    attribut: string,
    valeur: AttributValue,
    observation: ObservationContext
  ): ResultatInscription;
  
  // Vérifie qu'un fait n'existe pas déjà ou ne contredit pas
  verifierCoherence(
    entiteId: EntityID,
    attribut: string,
    valeur: AttributValue
  ): VerificationResult;
  
  // Requêtes
  getFait(entiteId: EntityID, attribut: string): AttributFige | null;
  getTousFaits(entiteId: EntityID): AttributFige[];
  rechercherFaits(query: FactQuery): AttributFige[];
}

type ResultatInscription = 
  | { succes: true; faitId: string }
  | { succes: false; raison: 'DEJA_FIGE' | 'CONTRADICTION'; details: string };
```

### Gestion des Contraintes (CP)

```typescript
interface ChampPotentialites {
  
  // Ajouter une contrainte
  ajouterContrainte(
    entiteId: EntityID,
    attribut: string,
    contrainte: Contrainte
  ): void;
  
  // Quand un fait est figé, propager les implications
  propagerContraintes(faitNouveau: AttributFige): ContraintesPropagees[];
  
  // Vérifier si une valeur respecte toutes les contraintes
  validerValeur(
    entiteId: EntityID,
    attribut: string,
    valeurProposee: AttributValue
  ): ValidationResult;
  
  // Récupérer le contexte complet pour l'IA
  getContexteGeneration(
    entiteId: EntityID,
    attribut: string
  ): ContexteComplet;
  
  // Supprimer une potentialité (quand l'attribut est figé)
  convertirEnFige(entiteId: EntityID, attribut: string): void;
}

interface ContexteComplet {
  potentialite: Potentialite;
  faitsFigesEntite: AttributFige[];
  faitsFigesLies: AttributFige[];      // Entités connectées dans le graphe
  reglesMondeApplicables: RegleMonde[];
}
```

---

## 2.4 Schéma de Persistance

Pour sauvegarder une partie :

```typescript
interface SauvegardeNarrative {
  version: string;
  timestamp: Date;
  
  // État complet
  registreCanonique: {
    entites: Entity[];
    relationsExplicites: Relation[];
  };
  
  champPotentialites: {
    potentialites: Potentialite[];
    contraintesGlobales: Contrainte[];  // Règles du monde
  };
  
  // Métadonnées
  meta: {
    tempsDeJeu: GameTimestamp;
    nombreFaitsFiges: number;
    nombreContraintes: number;
    seedAleatoire: string;  // Pour reproductibilité si besoin
  };
}
```

---

## 2.5 Questions de Conception

Quelques choix importants qui impacteront l'implémentation :

### Granularité des Attributs

Un attribut "personnalité" global ou plusieurs attributs fins (courage, honnêteté, humour) ?

**Recommandation :** Attributs fins pour plus de flexibilité dans les contraintes et la génération.

### Profondeur des Contraintes

Jusqu'où propager ? (voisins directs, 2 niveaux, tout le graphe ?)

**Recommandation :** 2-3 niveaux maximum avec force de propagation décroissante.

### Gestion des Rumeurs

Une rumeur crée-t-elle une contrainte immédiate ou attend-elle confirmation ?

**Recommandation :** Contrainte souple immédiate, convertie en stricte si confirmée.

---

→ **Suite :** [03 - Graphe de Cohérence Narrative](./03_Graphe_de_Coherence.md)
