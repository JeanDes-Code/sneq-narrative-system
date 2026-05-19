# SNEQ - Partie 3 : Graphe de Cohérence Narrative (GCN)

---

## Navigation

← [02 - Structure de Données](./02_Structure_de_Donnees.md) | [04 - Moteur de Collapse →](./04_Moteur_de_Collapse.md)

---

# 3. Graphe de Cohérence Narrative (GCN)

## 3.1 Principe

Le GCN est la **carte des connexions** entre toutes les entités narratives. Il répond à deux besoins critiques :

1. **Propagation** : Quand un fait se fige, quelles autres entités doivent recevoir de nouvelles contraintes ?
2. **Cohérence** : L'IA doit comprendre le réseau de relations pour générer du contenu qui fait sens.

Ce n'est pas un simple graphe de relations sociales. C'est un graphe **sémantique et causal** qui encode comment les éléments du monde s'influencent mutuellement.

---

## 3.2 Structure du Graphe

### Nœuds

Chaque nœud est une référence vers une entité du RC ou du CP :

```typescript
interface NoeudGCN {
  entiteId: EntityID;
  type: EntityType;
  
  // Cache pour performance
  etatActuel: 'INCONNU' | 'PARTIELLEMENT_CONNU' | 'BIEN_CONNU';
  nombreAttributsFiges: number;
  nombreAttributsContraints: number;
  
  // Poids narratif (importance dans l'histoire)
  poidsNarratif: number;  // 0-1, influence la priorité de propagation
  
  // Tags pour filtrage rapide
  tags: Set<string>;  // "noble", "antagoniste", "lieu_clé", etc.
}
```

### Arêtes

Les arêtes sont le cœur du système. Elles ne représentent pas juste "A connaît B" mais **comment A et B sont narrativement liés** :

```typescript
interface AreteGCN {
  id: string;
  source: EntityID;
  cible: EntityID;
  
  // Type de relation
  typeRelation: TypeRelation;
  
  // Direction de causalité narrative
  directionnalite: 'UNIDIRECTIONNELLE' | 'BIDIRECTIONNELLE';
  
  // Force de propagation (0-1)
  // Plus c'est élevé, plus un changement sur source impacte cible
  forcePropagation: number;
  
  // État de l'arête elle-même
  etatArete: 'INDEFINI' | 'CONTRAINT' | 'FIGE';
  
  // Attributs de la relation (peuvent aussi être figés/contraints)
  attributs: Map<string, AttributRelation>;
  
  // Règles de propagation spécifiques
  reglesPropagation: ReglePropagation[];
}
```

---

## 3.3 Types de Relations

```typescript
type TypeRelation = 
  // Relations interpersonnelles
  | { categorie: 'SOCIAL'; sous_type: RelationSociale }
  // Relations causales
  | { categorie: 'CAUSAL'; sous_type: RelationCausale }
  // Relations spatiales
  | { categorie: 'SPATIAL'; sous_type: RelationSpatiale }
  // Relations temporelles
  | { categorie: 'TEMPOREL'; sous_type: RelationTemporelle }
  // Relations conceptuelles
  | { categorie: 'CONCEPTUEL'; sous_type: RelationConceptuelle };

type RelationSociale = 
  | 'FAMILLE'           // parent, enfant, fratrie, époux
  | 'AMITIE'            // ami, confident, allié
  | 'INIMITIE'          // ennemi, rival, némésis
  | 'HIERARCHIE'        // supérieur, subordonné, maître/apprenti
  | 'ROMANTIQUE'        // amour, ex, prétendant
  | 'PROFESSIONNELLE'   // collègue, client, fournisseur
  | 'APPARTENANCE';     // membre de faction/groupe

type RelationCausale = 
  | 'A_CAUSE'           // A a causé B (événement)
  | 'A_PERMIS'          // A a rendu B possible
  | 'A_EMPECHE'         // A a empêché B
  | 'CONSEQUENCE_DE'    // A est conséquence de B
  | 'MOTIVE_PAR'        // A est motivé par B
  | 'REVELEE_PAR';      // A est révélé/découvert via B

type RelationSpatiale = 
  | 'CONTIENT'          // lieu contient lieu/objet
  | 'ADJACENT'          // lieux voisins
  | 'ORIGINE'           // personnage vient de lieu
  | 'RESIDE'            // personnage habite lieu
  | 'FREQUENTE';        // personnage visite souvent lieu

type RelationTemporelle = 
  | 'PRECEDE'           // événement avant événement
  | 'PENDANT'           // simultané
  | 'DECLENCHE';        // événement déclenche événement

type RelationConceptuelle = 
  | 'SYMBOLISE'         // objet/lieu représente concept
  | 'CONTRASTE'         // opposition thématique
  | 'PARALLELE'         // miroir narratif
  | 'SECRET_LIE';       // secrets interconnectés
```

### Attributs de Relation

Les relations elles-mêmes ont des attributs qui peuvent être figés ou non :

```typescript
interface AttributRelation {
  cle: string;
  etat: 'INDEFINI' | 'CONTRAINT' | 'FIGE';
  valeur?: AttributValue;
  contraintes: Contrainte[];
}

// Exemples d'attributs selon le type de relation :

// FAMILLE
// - lien_exact: "père", "cousin", "belle-mère"
// - connu_publiquement: boolean
// - qualite_relation: "proche", "distant", "rompu"

// INIMITIE  
// - cause: EntityID (événement déclencheur)
// - intensite: 1-10
// - mutuelle: boolean
// - publique: boolean

// HIERARCHIE
// - role_source: "seigneur", "maître", "employeur"
// - role_cible: "vassal", "apprenti", "employé"
// - anciennete: number (années)
// - loyaute: 1-10
```

---

## 3.4 Règles de Propagation

Quand un fait se fige, le GCN détermine comment cette information se propage :

```typescript
interface ReglePropagation {
  id: string;
  nom: string;
  
  // Conditions d'activation
  declencheur: DeclencheurPropagation;
  
  // Action à effectuer
  action: ActionPropagation;
  
  // Priorité (si plusieurs règles s'appliquent)
  priorite: number;
}

interface DeclencheurPropagation {
  // Quel type de fait déclenche cette règle ?
  typeFait: {
    entiteType?: EntityType[];
    attribut?: string[];
    categorieAttribut?: CategorieAttribut[];
  };
  
  // Conditions supplémentaires
  conditions?: ConditionPropagation[];
}

interface ConditionPropagation {
  type: 'VALEUR_EGALE' | 'VALEUR_CONTIENT' | 'RELATION_EXISTE' | 'ATTRIBUT_FIGE';
  parametres: Record<string, any>;
}

interface ActionPropagation {
  type: ActionTypePropagation;
  cible: CiblePropagation;
  parametres: Record<string, any>;
}

type ActionTypePropagation = 
  | 'AJOUTER_CONTRAINTE'
  | 'MODIFIER_FORCE_RELATION'
  | 'CREER_RELATION'
  | 'MARQUER_POUR_REEVALUATION'
  | 'DECLENCHER_EVENEMENT';

type CiblePropagation = 
  | { type: 'RELATION_DIRECTE'; filtreRelation?: TypeRelation }
  | { type: 'CHEMIN'; longueurMax: number; filtreRelation?: TypeRelation }
  | { type: 'TAG'; tag: string }
  | { type: 'ENTITE_SPECIFIQUE'; entiteId: EntityID };
```

### Exemples de Règles

```typescript
const regleSecretMilitaire: ReglePropagation = {
  id: "prop_001",
  nom: "Propagation secret militaire",
  declencheur: {
    typeFait: {
      categorieAttribut: ['SECRET'],
    },
    conditions: [{
      type: 'VALEUR_CONTIENT',
      parametres: { recherche: "militaire|guerre|bataille|armée" }
    }]
  },
  action: {
    type: 'AJOUTER_CONTRAINTE',
    cible: { 
      type: 'RELATION_DIRECTE', 
      filtreRelation: { categorie: 'SOCIAL', sous_type: 'HIERARCHIE' }
    },
    parametres: {
      contrainte: {
        type: 'CORRELE_AVEC',
        description: "Le secret peut impliquer l'ancien supérieur hiérarchique"
      }
    }
  },
  priorite: 10
};

const regleMortPersonnage: ReglePropagation = {
  id: "prop_002", 
  nom: "Propagation décès",
  declencheur: {
    typeFait: {
      entiteType: ['PERSONNAGE'],
      attribut: ['etat_vital']
    },
    conditions: [{
      type: 'VALEUR_EGALE',
      parametres: { valeur: "mort" }
    }]
  },
  action: {
    type: 'MARQUER_POUR_REEVALUATION',
    cible: { type: 'CHEMIN', longueurMax: 2 },
    parametres: {
      attributsARevoir: ['motivation', 'objectif', 'etat_emotionnel'],
      raison: "Décès d'une personne connectée"
    }
  },
  priorite: 100  // Haute priorité
};
```

---

## 3.5 Algorithmes Clés

### Propagation de Contraintes

```typescript
class MoteurPropagation {
  
  propager(faitNouveau: AttributFige, gcn: GrapheCN, cp: ChampPotentialites): PropagationResult {
    
    const resultats: ContraintePropagee[] = [];
    const file: NoeudAPropager[] = [];
    const visites = new Set<string>();
    
    // Initialiser avec les voisins directs
    const voisins = gcn.getVoisins(faitNouveau.entiteId);
    for (const voisin of voisins) {
      const arete = gcn.getArete(faitNouveau.entiteId, voisin.entiteId);
      file.push({
        entiteId: voisin.entiteId,
        distance: 1,
        cheminRelations: [arete],
        forceAccumulee: arete.forcePropagation
      });
    }
    
    while (file.length > 0) {
      const courant = file.shift()!;
      
      // Éviter cycles et propagation trop faible
      if (visites.has(courant.entiteId)) continue;
      if (courant.forceAccumulee < SEUIL_PROPAGATION_MIN) continue;
      
      visites.add(courant.entiteId);
      
      // Trouver les règles applicables
      const regles = this.trouverReglesApplicables(
        faitNouveau, 
        courant, 
        gcn
      );
      
      // Appliquer chaque règle
      for (const regle of regles) {
        const contrainte = this.genererContrainte(
          regle, 
          faitNouveau, 
          courant,
          gcn
        );
        
        if (contrainte) {
          cp.ajouterContrainte(
            courant.entiteId,
            contrainte.attributCible,
            contrainte
          );
          resultats.push(contrainte);
        }
      }
      
      // Continuer la propagation si nécessaire
      if (courant.distance < MAX_DISTANCE_PROPAGATION) {
        const prochains = gcn.getVoisins(courant.entiteId);
        for (const prochain of prochains) {
          if (!visites.has(prochain.entiteId)) {
            const arete = gcn.getArete(courant.entiteId, prochain.entiteId);
            file.push({
              entiteId: prochain.entiteId,
              distance: courant.distance + 1,
              cheminRelations: [...courant.cheminRelations, arete],
              forceAccumulee: courant.forceAccumulee * arete.forcePropagation
            });
          }
        }
      }
    }
    
    return {
      faitSource: faitNouveau,
      contraintesPropagees: resultats,
      entitesImpactees: visites.size
    };
  }
}
```

### Recherche de Chemins Narratifs

Pour l'IA, pouvoir trouver "comment ces deux entités sont-elles connectées ?" :

```typescript
class AnalyseurGCN {
  
  // Trouver tous les chemins entre deux entités
  trouverChemins(
    source: EntityID, 
    cible: EntityID, 
    options: OptionsRecherche
  ): CheminNarratif[] {
    
    const chemins: CheminNarratif[] = [];
    const pile: EtatRecherche[] = [{
      position: source,
      chemin: [],
      visites: new Set([source])
    }];
    
    while (pile.length > 0) {
      const etat = pile.pop()!;
      
      if (etat.position === cible) {
        chemins.push(this.construireChemin(etat.chemin));
        continue;
      }
      
      if (etat.chemin.length >= options.longueurMax) continue;
      
      const voisins = this.gcn.getVoisins(etat.position);
      for (const voisin of voisins) {
        if (etat.visites.has(voisin.entiteId)) continue;
        if (options.filtreRelation && 
            !this.matchFiltre(voisin.arete, options.filtreRelation)) continue;
        
        pile.push({
          position: voisin.entiteId,
          chemin: [...etat.chemin, voisin.arete],
          visites: new Set([...etat.visites, voisin.entiteId])
        });
      }
    }
    
    // Trier par pertinence narrative
    return this.classerParPertinence(chemins, options);
  }
  
  // Calculer la "distance narrative" entre deux entités
  distanceNarrative(a: EntityID, b: EntityID): number {
    const chemins = this.trouverChemins(a, b, { longueurMax: 5 });
    if (chemins.length === 0) return Infinity;
    
    // Le chemin le plus "fort" (pas forcément le plus court)
    return Math.min(...chemins.map(c => this.calculerCoutChemin(c)));
  }
  
  // Trouver le sous-graphe pertinent pour une situation
  extraireSousGrapheContextuel(
    entitesCentrales: EntityID[],
    rayon: number
  ): SousGraphe {
    const noeuds = new Set<EntityID>();
    const aretes = new Set<string>();
    
    for (const centre of entitesCentrales) {
      const voisinage = this.explorerVoisinage(centre, rayon);
      voisinage.noeuds.forEach(n => noeuds.add(n));
      voisinage.aretes.forEach(a => aretes.add(a));
    }
    
    return {
      noeuds: [...noeuds].map(id => this.gcn.getNoeud(id)),
      aretes: [...aretes].map(id => this.gcn.getArete(id))
    };
  }
}
```

---

## 3.6 Représentation pour l'IA

Quand l'IA doit générer du contenu, elle reçoit une **vue sérialisée** du sous-graphe pertinent :

```typescript
interface VueGraphePourIA {
  // L'entité centrale concernée
  focus: {
    entite: EntitySerialise;
    attributCible: string;
    contraintes: ContrainteSerialise[];
  };
  
  // Contexte relationnel
  relations: {
    entite: EntitySerialise;
    typeRelation: string;
    attributsRelation: Record<string, any>;
    distance: number;
    pertinence: number;  // 0-1
  }[];
  
  // Faits connexes importants
  faitsPertinents: {
    description: string;
    entiteSource: string;
    fiabilite: string;
  }[];
  
  // Chemins narratifs notables
  cheminsNarratifs: {
    description: string;
    implication: string;
  }[];
}

// Sérialisation pour le prompt IA
function serialiserPourPrompt(vue: VueGraphePourIA): string {
  return `
## ENTITÉ CONCERNÉE
${vue.focus.entite.description}
Attribut à déterminer : ${vue.focus.attributCible}

## CONTRAINTES ACTIVES
${vue.focus.contraintes.map(c => `- ${c.description}`).join('\n')}

## RELATIONS CONNUES
${vue.relations.map(r => 
  `- ${r.typeRelation} avec ${r.entite.nom} (${r.entite.resumé})`
).join('\n')}

## FAITS PERTINENTS
${vue.faitsPertinents.map(f => 
  `- ${f.description} [source: ${f.entiteSource}, fiabilité: ${f.fiabilite}]`
).join('\n')}

## CONNEXIONS NARRATIVES
${vue.cheminsNarratifs.map(c => 
  `- ${c.description}\n  → ${c.implication}`
).join('\n')}
`;
}
```

---

## 3.7 Diagramme Récapitulatif

```
                            GRAPHE DE COHÉRENCE NARRATIVE
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   [Duc]════════════════╗                                           │
    │     ║                  ║                                           │
    │   (ordonna)          (règne sur)                                   │
    │     ║                  ║                                           │
    │     ▼                  ▼                                           │
    │   [Massacre]◄────────[Royaume]                                     │
    │     ║                  ║                                           │
    │   (causa)            (contient)                                    │
    │     ║                  ║                                           │
    │     ▼                  ▼                                           │
    │   [Trauma forgeron]  [Village]                                     │
    │     ║                  ║                                           │
    │   (explique)         (réside)                                      │
    │     ║                  ║                                           │
    │     ▼                  ▼                                           │
    │   [Forgeron]◄════════════╝                                         │
    │     ║    ╲                                                         │
    │   (ami)   ╲(fournit armes)                                        │
    │     ║      ╲                                                       │
    │     ▼       ▼                                                      │
    │   [Tavernier]  [Armurier]                                         │
    │     ║                                                              │
    │   (a entendu)                                                      │
    │     ║                                                              │
    │     ▼                                                              │
    │   [Rumeur sur le Duc]                                             │
    │                                                                     │
    │   ════ Relation figée                                              │
    │   ──── Relation contrainte                                         │
    │   - - - Relation indéfinie                                         │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## 3.8 Visualisation (Debug & Outils Auteur)

Pour les développeurs et créateurs de contenu :

```typescript
interface ConfigVisualisationGCN {
  // Filtres d'affichage
  afficher: {
    relationsIndefinies: boolean;
    relationsContraintes: boolean;
    relationsFigees: boolean;
  };
  
  // Mise en évidence
  surligner: {
    entitesAvecSecrets: boolean;
    cheminsVersJoueur: boolean;
    contraintesRecentes: boolean;
  };
  
  // Layout
  layout: 'FORCE_DIRECTED' | 'HIERARCHIQUE' | 'CIRCULAIRE';
  
  // Couleurs par état
  couleurs: {
    indefini: string;    // ex: "#CCCCCC"
    contraint: string;   // ex: "#FFD700"
    fige: string;        // ex: "#4CAF50"
  };
}

// Export pour outils de visualisation (Cytoscape, D3, etc.)
function exporterPourVisualisation(gcn: GrapheCN): GrapheVisuel {
  return {
    nodes: gcn.getNoeuds().map(n => ({
      id: n.entiteId,
      label: n.nom,
      type: n.type,
      color: determinerCouleur(n),
      size: n.poidsNarratif * 50 + 10
    })),
    edges: gcn.getAretes().map(a => ({
      source: a.source,
      target: a.cible,
      label: a.typeRelation.sous_type,
      color: determinerCouleurArete(a),
      width: a.forcePropagation * 5,
      dashed: a.etatArete !== 'FIGE'
    }))
  };
}
```

---

→ **Suite :** [04 - Moteur de Collapse](./04_Moteur_de_Collapse.md)
