# SNEQ - Partie 8 : Récapitulatif et Architecture

---

## Navigation

← [07 - Stratégies Avancées](./07_Strategies_Avancees.md) | [Retour à l'Introduction](./01_Introduction_et_Concept.md)

---

# 8. Récapitulatif des Composants

## 8.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SYSTÈME NARRATIF À ÉTAT QUANTIQUE                        │
│                              Vue d'ensemble                                  │
└─────────────────────────────────────────────────────────────────────────────┘

DONNÉES
├── Registre Canonique (RC)
│   └── Faits figés, immuables, source de vérité
├── Champ de Potentialités (CP)
│   └── Attributs non figés, contraintes, tendances
└── Graphe de Cohérence Narrative (GCN)
    └── Relations, propagation, chemins narratifs

MOTEURS
├── Moteur de Collapse (MC)
│   └── Orchestration génération, validation, inscription
├── Moteur de Propagation
│   └── Diffusion contraintes après collapse
└── Moteur de Pré-génération
    └── Prédiction, cache, optimisation latence

INTELLIGENCE
├── Service LLM
│   └── Génération, prompts, parsing
├── Constructeur de Prompts
│   └── Templates, contexte, instructions
└── Validateur
    └── Contraintes, cohérence, qualité

OPTIMISATION
├── Cache multiniveau
│   └── Exact, sémantique, templates
├── Batcher LLM
│   └── Groupage requêtes, efficacité
└── Gestionnaire Fallback
    └── Dégradation gracieuse, templates

QUALITÉ
├── Détecteur d'incohérences
│   └── Vérification proactive
├── Résolveur
│   └── Réinterprétation, correction
└── Observabilité
    └── Métriques, alertes, dashboard
```

---

## 8.2 Flux Principal

```
┌──────────────┐
│   JOUEUR     │
│   Action     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Détecteur           │
│  d'Observation       │
│                      │
│  "Cette action       │
│   nécessite-t-elle   │
│   un collapse ?"     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Vérification RC     │────►│  Déjà figé ?         │
│                      │     │  → Retourner le fait │
└──────┬───────────────┘     └──────────────────────┘
       │ Non figé
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Vérification Cache  │────►│  En cache valide ?   │
│                      │     │  → Utiliser le cache │
└──────┬───────────────┘     └──────────────────────┘
       │ Cache miss
       ▼
┌──────────────────────┐
│  Construction        │
│  Contexte            │
│                      │
│  • Entité cible      │
│  • Contraintes       │
│  • Graphe local      │
│  • Historique joueur │
│  • Situation         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Appel LLM           │
│                      │
│  Prompt + Contexte   │
│  → Génération        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Validation          │────►│  Échec ?             │
│                      │     │  → Régénérer ou      │
│  • Format            │     │    Fallback          │
│  • Contraintes       │     └──────────────────────┘
│  • Cohérence RC      │
│  • Qualité narrative │
└──────┬───────────────┘
       │ Succès
       ▼
┌──────────────────────┐
│  Inscription RC      │
│                      │
│  Fait → FIGÉ         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Propagation         │
│                      │
│  Nouvelles           │
│  contraintes vers    │
│  entités liées       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Invalidation Cache  │
│                      │
│  Entrées impactées   │
└──────┬───────────────┘
       │
       ▼
┌──────────────┐
│   RÉPONSE    │
│   au joueur  │
└──────────────┘
```

---

## 8.3 États des Attributs

```
                    CYCLE DE VIE D'UN ATTRIBUT

    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │                      INDÉFINI                           │
    │                                                         │
    │   • Aucune contrainte                                   │
    │   • Pur potentiel                                       │
    │   • N'a jamais été évoqué                              │
    │                                                         │
    └─────────────────────────┬───────────────────────────────┘
                              │
                              │ Observation indirecte
                              │ (rumeur, relation, inférence)
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │                      CONTRAINT                          │
    │                                                         │
    │   • Certaines valeurs exclues                          │
    │   • Certaines valeurs suggérées                        │
    │   • Encore modifiable                                   │
    │                                                         │
    └─────────────────────────┬───────────────────────────────┘
                              │
                              │ Observation directe
                              │ (dialogue, lecture, vision)
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │                        FIGÉ                             │
    │                                                         │
    │   • Valeur définitive                                   │
    │   • Canonique                                           │
    │   • IMMUABLE                                            │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    ⚠️ AUCUN RETOUR EN ARRIÈRE POSSIBLE
       FIGÉ → CONTRAINT ✗
       FIGÉ → INDÉFINI  ✗
```

---

## 8.4 Types de Contraintes

| Type | Source | Force | Exemple |
|------|--------|-------|---------|
| `DOIT_ETRE` | Fait canonique | Stricte | "Doit être un ancien militaire" |
| `NE_PEUT_PAS_ETRE` | Fait canonique | Stricte | "Ne peut pas être loyal au Duc" |
| `IMPLIQUE` | Règle monde | Stricte | "Si noble → sait lire" |
| `CORRELE_AVEC` | Relation | Souple | "Secret lié à celui du tavernier" |
| `RANGE` | Logique | Stricte | "Âge entre 20 et 60" |
| `TENDANCE` | Inférence IA | Suggestion | "Probablement coupable (0.7)" |

---

## 8.5 Types de Relations (GCN)

### Relations Sociales
- `FAMILLE` - parent, enfant, fratrie, époux
- `AMITIE` - ami, confident, allié
- `INIMITIE` - ennemi, rival, némésis
- `HIERARCHIE` - supérieur, subordonné, maître/apprenti
- `ROMANTIQUE` - amour, ex, prétendant
- `PROFESSIONNELLE` - collègue, client, fournisseur
- `APPARTENANCE` - membre de faction/groupe

### Relations Causales
- `A_CAUSE` - A a causé B
- `A_PERMIS` - A a rendu B possible
- `A_EMPECHE` - A a empêché B
- `CONSEQUENCE_DE` - A est conséquence de B
- `MOTIVE_PAR` - A est motivé par B
- `REVELEE_PAR` - A est révélé via B

### Relations Spatiales
- `CONTIENT` - lieu contient lieu/objet
- `ADJACENT` - lieux voisins
- `ORIGINE` - personnage vient de lieu
- `RESIDE` - personnage habite lieu
- `FREQUENTE` - personnage visite souvent

### Relations Temporelles
- `PRECEDE` - événement avant événement
- `PENDANT` - simultané
- `DECLENCHE` - événement déclenche événement

### Relations Conceptuelles
- `SYMBOLISE` - représente un concept
- `CONTRASTE` - opposition thématique
- `PARALLELE` - miroir narratif
- `SECRET_LIE` - secrets interconnectés

---

## 8.6 Catégories d'Attributs

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| `IDENTITE` | Qui est l'entité | nom, âge, apparence |
| `PSYCHOLOGIE` | Comment elle pense | motivation, peur, désir |
| `HISTORIQUE` | D'où elle vient | passé, événements vécus |
| `SOCIAL` | Sa place dans le monde | relations, statut, faction |
| `COMPETENCE` | Ce qu'elle sait faire | capacités, savoirs |
| `SECRET` | Ce qu'elle cache | vérités dissimulées |
| `ETAT` | Sa condition actuelle | blessé, amoureux, etc. |
| `POSSESSION` | Ce qu'elle a | objets, propriétés |

---

## 8.7 Métriques Clés

### Performance
- **Latence P95** : < 200ms (avec cache)
- **Latence P95** : < 3s (sans cache)
- **Taux de hit cache** : > 80%

### Qualité
- **Taux de succès génération** : > 95%
- **Score cohérence moyen** : > 85/100
- **Taux de fallback** : < 5%

### Ressources
- **Tokens/heure** : selon budget
- **Taille cache** : selon mémoire
- **Workers LLM** : 3-10 selon charge

---

## 8.8 Questions de Conception Ouvertes

1. **Granularité des attributs**
   - Un attribut "personnalité" global ou plusieurs attributs fins ?
   - Recommandation : Attributs fins pour plus de flexibilité

2. **Profondeur de propagation**
   - Jusqu'où propager ? (voisins directs, 2 niveaux, tout le graphe ?)
   - Recommandation : 2-3 niveaux avec force décroissante

3. **Gestion des rumeurs**
   - Contrainte immédiate ou attente de confirmation ?
   - Recommandation : Contrainte souple immédiate

4. **Persistance du cache**
   - Cache en mémoire ou persistant ?
   - Recommandation : Redis pour persistance cross-session

5. **Multi-joueur**
   - Comment gérer des mondes partagés ?
   - À explorer : consensus, branches, ownership

---

## 8.9 Ressources et Références

### Documentation
- `01_Introduction_et_Concept.md` - Vision et principes
- `02_Structure_de_Donnees.md` - RC et CP
- `03_Graphe_de_Coherence.md` - GCN et propagation
- `04_Moteur_de_Collapse.md` - Orchestration
- `05_Pregeneration_et_Cache.md` - Performance
- `06_Prompt_Engineering.md` - LLM
- `07_Strategies_Avancees.md` - Optimisation

### Technologies suggérées
- **Backend** : Node.js/TypeScript ou Python
- **Base de données** : PostgreSQL (RC), Redis (cache)
- **Graphe** : Neo4j ou PostgreSQL avec extensions
- **Vector DB** : Pinecone, Weaviate, ou pgvector
- **LLM** : Claude API, OpenAI API
- **Queue** : RabbitMQ ou Redis Streams

---

## 8.10 Conclusion

Le SNEQ représente une approche novatrice de la narration en jeu vidéo, où :

- **Chaque partie est unique** grâce à la génération procédurale contextuelle
- **La cohérence est garantie** par le système de contraintes et de validation
- **L'immersion est préservée** grâce au cache et à la pré-génération
- **L'émergence narrative** naît de l'interaction entre le joueur et l'IA

Le système transforme fondamentalement la relation entre auteur, jeu et joueur : l'auteur définit les règles et les possibilités, l'IA génère les détails, et le joueur, par ses actions, cristallise le monde qui l'entoure.

---

*Fin de la documentation technique du SNEQ*
