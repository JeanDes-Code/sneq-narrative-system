# SNEQ - Partie 7 : Stratégies Avancées et Optimisation

---

## Navigation

← [06 - Prompt Engineering](./06_Prompt_Engineering.md) | [08 - Récapitulatif →](./08_Recapitulatif.md)

---

# 7. Stratégies Avancées et Optimisation

## 7.1 Défis d'Échelle

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPLOSION COMBINATOIRE                                         │
│  - 100 PNJs × 10 attributs = 1000 générations potentielles     │
│  - Chaque fait figé peut invalider des dizaines d'entrées      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  COHÉRENCE À DISTANCE                                           │
│  - Un fait au village A peut impacter un PNJ au village B       │
│  - Contradictions indirectes difficiles à détecter              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LATENCE RÉSEAU                                                 │
│  - Appels LLM = 1-5 secondes                                    │
│  - Pics de demande lors d'événements majeurs                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DÉRIVE NARRATIVE                                               │
│  - Accumulation de faits peut créer des incohérences subtiles   │
│  - Le ton peut dériver au fil des générations                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.2 Génération par Vagues

Organiser la génération en vagues stratégiques :

```typescript
interface ConfigurationVague {
  id: string;
  nom: string;
  priorite: number;
  declencheur: DeclencheurVague;
  cibles: CibleVague[];
  ressources: {
    maxGenerationsParalleles: number;
    timeoutGlobalMs: number;
    budgetTokens: number;
  };
}

type DeclencheurVague =
  | { type: 'ENTREE_ZONE'; zoneId: EntityID }
  | { type: 'DEBUT_QUETE'; queteId: string }
  | { type: 'RENCONTRE_FACTION'; factionId: EntityID }
  | { type: 'PROGRESSION_NARRATIVE'; seuil: number }
  | { type: 'TEMPS_JEU'; intervalleMinutes: number }
  | { type: 'EVENEMENT_MAJEUR'; evenementId: string };
```

### Exemples de Vagues

```typescript
const VAGUES_STANDARD = [
  // Initialisation de zone
  {
    id: 'init_zone',
    nom: 'Initialisation Zone',
    priorite: 100,
    declencheur: { type: 'ENTREE_ZONE', zoneId: '*' },
    cibles: [
      {
        selecteur: { type: 'PNJS_ZONE', rayon: 0 },
        attributs: ['apparence', 'premiere_impression'],
        profondeur: 'MINIMAL',
        prioriteDansVague: 1
      },
      {
        selecteur: { type: 'PNJS_ZONE', filtre: 'IMPORTANTS' },
        attributs: ['personnalite_surface', 'motivation_apparente'],
        profondeur: 'STANDARD',
        prioriteDansVague: 2
      }
    ],
    ressources: {
      maxGenerationsParalleles: 5,
      timeoutGlobalMs: 30000,
      budgetTokens: 10000
    }
  },
  
  // Préparation de quête
  {
    id: 'prep_quete',
    nom: 'Préparation Quête',
    priorite: 90,
    declencheur: { type: 'DEBUT_QUETE', queteId: '*' },
    cibles: [
      {
        selecteur: { type: 'ENTITES_QUETE', role: 'PRINCIPAL' },
        attributs: ['motivation_profonde', 'secret_lie_quete'],
        profondeur: 'DETAILLE',
        prioriteDansVague: 1
      }
    ],
    ressources: {
      maxGenerationsParalleles: 3,
      timeoutGlobalMs: 60000,
      budgetTokens: 20000
    }
  }
];
```

---

## 7.3 Génération Hiérarchique

Générer du général vers le particulier :

```typescript
const HIERARCHIE_NARRATIVE = {
  niveaux: [
    {
      niveau: 0,
      nom: 'Monde',
      description: 'Lois fondamentales, histoire ancienne',
      typesEntites: ['MONDE'],
      attributsTypiques: ['regles_magie', 'histoire_ancienne', 'factions_majeures'],
      heriteDe: null
    },
    {
      niveau: 1,
      nom: 'Régions',
      description: 'Royaumes, territoires, cultures',
      typesEntites: ['REGION', 'FACTION_MAJEURE'],
      attributsTypiques: ['culture', 'gouvernement', 'ressources'],
      heriteDe: 0
    },
    {
      niveau: 2,
      nom: 'Localités',
      description: 'Villes, villages, donjons',
      typesEntites: ['LIEU_MAJEUR'],
      attributsTypiques: ['histoire_locale', 'pouvoir_local', 'atmosphere'],
      heriteDe: 1
    },
    {
      niveau: 3,
      nom: 'Groupes',
      description: 'Guildes, familles, organisations',
      typesEntites: ['FACTION_LOCALE', 'FAMILLE'],
      attributsTypiques: ['objectifs', 'hierarchie', 'rivaux'],
      heriteDe: 2
    },
    {
      niveau: 4,
      nom: 'Individus',
      description: 'PNJs, créatures nommées',
      typesEntites: ['PERSONNAGE', 'CREATURE_NOMMEE'],
      attributsTypiques: ['personnalite', 'motivation', 'secret'],
      heriteDe: 3
    },
    {
      niveau: 5,
      nom: 'Détails',
      description: 'Objets, lieux spécifiques',
      typesEntites: ['OBJET', 'LIEU_MINEUR', 'EVENEMENT'],
      attributsTypiques: ['description', 'origine', 'signification'],
      heriteDe: 4
    }
  ]
};
```

---

## 7.4 Détection des Incohérences

```typescript
class DetecteurIncoherences {
  
  async verificationComplete(): Promise<RapportCoherence> {
    const problemes: ProblemeCoherence[] = [];
    
    // 1. Contradictions directes dans le RC
    problemes.push(...await this.verifierContradictionsDirectes());
    
    // 2. Contradictions logiques
    problemes.push(...await this.verifierContradictionsLogiques());
    
    // 3. Impossibilités temporelles
    problemes.push(...await this.verifierTimeline());
    
    // 4. Incohérences de graphe
    problemes.push(...await this.verifierGraphe());
    
    // 5. Cohérence thématique
    problemes.push(...await this.verifierCoherenceThematique());
    
    return {
      timestamp: new Date(),
      nombreProblemes: problemes.length,
      problemes,
      scoreCoherence: this.calculerScore(problemes)
    };
  }
}
```

### Règles Logiques

```typescript
const reglesLogiques = [
  {
    id: 'mort_implique_inactif',
    description: 'Un personnage mort ne peut pas avoir d\'activité récente',
    verifier: (faits) => {
      const morts = faits.filter(f => 
        f.attribut === 'etat_vital' && f.valeur === 'mort'
      );
      for (const mort of morts) {
        const activites = faits.filter(f => 
          f.entiteId === mort.entiteId && 
          f.attribut === 'activite_recente' &&
          f.timestamp > mort.timestamp
        );
        if (activites.length > 0) {
          return { valide: false, details: 'Activité post-mortem détectée' };
        }
      }
      return { valide: true };
    }
  },
  {
    id: 'age_coherent',
    description: 'L\'âge doit être cohérent avec les événements vécus'
  },
  {
    id: 'relations_symetriques',
    description: 'Certaines relations doivent être symétriques'
  }
];
```

---

## 7.5 Optimisation LLM

### Batching Intelligent

```typescript
class BatcherLLM {
  
  private fileAttente: DemandeGeneration[] = [];
  private timerBatch: NodeJS.Timeout | null = null;
  
  async soumettre(demande: DemandeGeneration): Promise<ReponseIA> {
    return new Promise((resolve, reject) => {
      this.fileAttente.push({ ...demande, resolve, reject });
      this.planifierBatch();
    });
  }
  
  private planifierBatch(): void {
    if (this.timerBatch) return;
    
    this.timerBatch = setTimeout(() => {
      this.executerBatch();
      this.timerBatch = null;
    }, DELAI_BATCH_MS);  // 100ms
  }
  
  private async executerBatch(): Promise<void> {
    const batch = this.fileAttente.splice(0, MAX_BATCH_SIZE);
    if (batch.length === 0) return;
    
    // Grouper les demandes similaires
    const groupes = this.grouperDemandes(batch);
    
    for (const groupe of groupes) {
      if (groupe.length === 1) {
        await this.executerSimple(groupe[0]);
      } else {
        await this.executerGroupe(groupe);
      }
    }
  }
}
```

### Cache Sémantique

```typescript
class CacheSemantique {
  
  private index: VectorIndex;  // FAISS, Annoy
  
  async chercherSimilaire(
    contexte: ContexteCollapse,
    seuilSimilarite: number = 0.85
  ): Promise<CacheEntree | null> {
    
    const embedding = await this.calculerEmbedding(contexte);
    const voisins = this.index.rechercherVoisins(embedding, 5);
    
    for (const voisin of voisins) {
      if (voisin.similarite >= seuilSimilarite) {
        const entree = this.cache.getParId(voisin.id);
        
        if (this.estApplicable(entree, contexte)) {
          return this.adapterEntree(entree, contexte);
        }
      }
    }
    
    return null;
  }
  
  private normaliserContexte(contexte: ContexteCollapse): string {
    return [
      `type:${contexte.cible.entite.type}`,
      `attribut:${contexte.cible.attributDemande}`,
      `contraintes:${contexte.contraintes.strictes.map(c => c.type).sort().join(',')}`,
      `relations:${contexte.grapheLocal.relationsDirectes.map(r => r.type).sort().join(',')}`
    ].join('|');
  }
}
```

---

## 7.6 Fallback et Dégradation Gracieuse

```typescript
class GestionnaireFallback {
  
  private strategies: StrategieFallback[] = [
    new StrategieCache(),
    new StrategieCacheSemantique(),
    new StrategieTemplate(),
    new StrategieDefaut()
  ];
  
  async genererAvecFallback(
    demande: DemandeCollapse,
    contexte: ContexteCollapse
  ): Promise<ResultatGeneration> {
    
    // Tentative normale
    try {
      const resultat = await this.moteurCollapse.collapse(demande);
      if (resultat.type === 'SUCCES') return resultat;
    } catch (erreur) {
      console.warn('Échec génération normale:', erreur);
    }
    
    // Parcourir les stratégies de fallback
    for (const strategie of this.strategies) {
      if (strategie.estApplicable(demande, contexte)) {
        try {
          const resultat = await strategie.executer(demande, contexte);
          if (resultat.succes) {
            return { ...resultat, meta: { fallback: strategie.nom } };
          }
        } catch (erreur) {
          console.warn(`Échec fallback ${strategie.nom}:`, erreur);
        }
      }
    }
    
    // Dernier recours
    return this.genererValeurMinimale(demande, contexte);
  }
}
```

### Stratégie Template

```typescript
class StrategieTemplate implements StrategieFallback {
  nom = 'TEMPLATE';
  
  private templates: Map<string, Template[]>;
  
  estApplicable(demande: DemandeCollapse, contexte: ContexteCollapse): boolean {
    const cle = `${contexte.cible.entite.type}:${demande.attribut}`;
    return this.templates.has(cle);
  }
  
  async executer(
    demande: DemandeCollapse,
    contexte: ContexteCollapse
  ): Promise<ResultatFallback> {
    
    const cle = `${contexte.cible.entite.type}:${demande.attribut}`;
    const templates = this.templates.get(cle)!;
    
    // Filtrer les templates compatibles
    const compatibles = templates.filter(t => 
      this.respecteContraintes(t, contexte.contraintes.strictes)
    );
    
    if (compatibles.length === 0) {
      return { succes: false };
    }
    
    const template = this.choisirTemplate(compatibles, contexte);
    const valeur = this.instancierTemplate(template, contexte);
    
    return { succes: true, valeur, confidence: 0.6 };
  }
}

// Exemples de templates
const TEMPLATES_SECRET = [
  {
    id: 'secret_dette',
    texte: "{{nom}} a une dette importante envers {{creancier}}",
    variables: {
      nom: { type: 'ENTITE_COURANTE', champ: 'nom' },
      creancier: { type: 'RELATION', filtre: 'HIERARCHIE', defaut: 'un marchand' }
    },
    poids: 1.0
  },
  {
    id: 'secret_identite',
    texte: "{{nom}} n'est pas originaire de {{lieu_origine}} mais de {{vrai_lieu}}",
    variables: {
      nom: { type: 'ENTITE_COURANTE', champ: 'nom' },
      lieu_origine: { type: 'ATTRIBUT_FIGE', attribut: 'origine' },
      vrai_lieu: { type: 'LIEU_ALEATOIRE', filtre: 'DISTANT' }
    },
    poids: 0.8
  }
];
```

---

## 7.7 Monitoring

```typescript
interface MetriquesSysteme {
  // Performance
  latenceP50Ms: number;
  latenceP95Ms: number;
  latenceP99Ms: number;
  
  // Qualité
  tauxSucces: number;
  tauxFallback: number;
  scoreCoherenceMoyen: number;
  
  // Ressources
  tokensParHeure: number;
  coutEstimeParHeure: number;
  tailleRC: number;
  tailleCP: number;
  tailleCache: number;
  
  // Santé
  contradictionsDetectees: number;
  invalidationsCache: number;
  erreursLLM: number;
}

class Observabilite {
  
  configurerAlertes(): void {
    this.alertes.ajouter({
      nom: 'latence_elevee',
      condition: (m) => m.latenceP95Ms > 5000,
      severite: 'WARNING',
      message: 'Latence P95 > 5s'
    });
    
    this.alertes.ajouter({
      nom: 'taux_succes_bas',
      condition: (m) => m.tauxSucces < 0.9,
      severite: 'ERROR',
      message: 'Taux de succès < 90%'
    });
    
    this.alertes.ajouter({
      nom: 'incoherences_elevees',
      condition: (m) => m.contradictionsDetectees > 10,
      severite: 'WARNING',
      message: 'Plus de 10 incohérences détectées'
    });
  }
}
```

---

## 7.8 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ARCHITECTURE DÉPLOIEMENT                          │
└─────────────────────────────────────────────────────────────────────────────┘

                                   ┌─────────────┐
                                   │   Client    │
                                   │   (Jeu)     │
                                   └──────┬──────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  - Rate limiting / Authentication / Request routing                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
           ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
           │   Service     │     │   Service     │     │   Service     │
           │   Collapse    │     │   Cache       │     │   Cohérence   │
           └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
                   │                     │                     │
                   └─────────────────────┼─────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   Message Queue     │
                              │   (RabbitMQ/Kafka)  │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
           │   Worker      │    │   Worker      │    │   Worker      │
           │   Pool LLM    │    │   Pool LLM    │    │   Pool LLM    │
           └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
                   │                    │                    │
                   └────────────────────┼────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │   LLM Provider      │
                              │   (OpenAI/Claude)   │
                              └─────────────────────┘

                              ┌─────────────────────┐
                              │   Base de données   │
                              │                     │
                              │ • PostgreSQL (RC)   │
                              │ • Redis (Cache)     │
                              │ • Vector DB         │
                              └─────────────────────┘
```

---

→ **Suite :** [08 - Récapitulatif](./08_Recapitulatif.md)
