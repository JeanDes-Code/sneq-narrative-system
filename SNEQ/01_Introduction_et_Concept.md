# Système Narratif à État Quantique (SNEQ)

## Documentation Technique - Partie 1 : Introduction et Concept

**Version:** 1.0  
**Date:** Février 2025

---

## Table des matières générale

1. **Introduction et Concept** (ce document)
2. [Structure de Données Fondamentale](./02_Structure_de_Donnees.md)
3. [Graphe de Cohérence Narrative](./03_Graphe_de_Coherence.md)
4. [Moteur de Collapse](./04_Moteur_de_Collapse.md)
5. [Pré-génération et Cache](./05_Pregeneration_et_Cache.md)
6. [Prompt Engineering](./06_Prompt_Engineering.md)
7. [Stratégies Avancées et Optimisation](./07_Strategies_Avancees.md)
8. [Récapitulatif et Architecture](./08_Recapitulatif.md)

---

# 1. Introduction et Concept

## 1.1 Vision

Le SNEQ est un système pour jeux vidéo RPG (type RPG Maker) dans lequel **tous les éléments narratifs sont initialement établis mais varient en fonction de toutes les actions et décisions du joueur**. Cette variation est pilotée par IA.

L'idée centrale : chaque action et décision du joueur va venir modifier le monde — les agissements des PNJs, des monstres, etc. — de manière très granulaire et totalement unique. **Ce n'est pas différentes trames narratives prévues à l'avance** (comme un arbre de choix qui entraîne des conséquences pré-établies).

## 1.2 Le Cœur du Concept

### Superposition Narrative

Tant que le joueur n'a pas "observé" un élément du monde (un PNJ, un lieu, un événement), cet élément existe dans un **état d'incertitude**. Il n'est pas encore défini. Ce n'est pas qu'il y a 3 versions pré-écrites du forgeron du village — c'est que le forgeron n'a pas encore de personnalité/histoire/motivation arrêtée.

### Effondrement par Observation

Dès que le joueur interagit avec un élément, l'IA "collapse" cet état en quelque chose de concret, influencé par tout le contexte accumulé (actions passées, réputation, choix moraux, etc.). Et ce fait devient alors **canonique et immuable**.

### Propagation Causale

Chaque fait nouvellement figé peut influencer les états encore incertains du reste du monde. Le forgeron que tu viens de rencontrer est désormais un ancien soldat traumatisé → ça peut influencer ce que l'IA décidera pour le capitaine de la garde (que tu n'as pas encore rencontré).

## 1.3 Ce qui rend ça unique

Ce n'est pas du branching narratif classique (arbre de décisions). C'est plutôt un **champ de possibilités** qui se cristallise progressivement autour des actions du joueur, avec une cohérence maintenue par l'IA.

---

## 1.4 Architecture Fondamentale

### Ontologie du Monde

Le monde est composé d'**entités narratives** (EN) de différents types :

| Type | Exemples |
|------|----------|
| Personnages | PNJs, factions, créatures nommées |
| Lieux | Zones, bâtiments, pièces |
| Objets | Artefacts, documents, clés narratives |
| Événements | Faits historiques, incidents, rumeurs |
| Relations | Liens entre entités (alliances, rivalités, secrets) |

Chaque EN possède un ensemble d'**attributs narratifs** (motivations, histoire, état émotionnel, secrets, etc.).

### États des Attributs

Chaque attribut d'une EN existe dans l'un des trois états suivants :

```
┌─────────────────────────────────────────────────────────┐
│  INDÉFINI (I)                                           │
│  → Aucune contrainte. Pur potentiel.                    │
│  → N'a jamais été évoqué ni observé.                    │
├─────────────────────────────────────────────────────────┤
│  CONTRAINT (C)                                          │
│  → Partiellement déterminé par inférence.               │
│  → Le joueur a observé des faits connexes qui           │
│    restreignent les possibilités sans les fixer.        │
├─────────────────────────────────────────────────────────┤
│  FIGÉ (F)                                               │
│  → Canonique. Immuable.                                 │
│  → Le joueur a directement observé/appris ce fait.      │
└─────────────────────────────────────────────────────────┘
```

**Transitions possibles :**
```
I → C → F
I → F (observation directe immédiate)
```

**Transition impossible :**
```
F → C ou F → I (jamais de retour en arrière)
```

---

## 1.5 Composants Principaux

### Le Registre Canonique (RC)

Base de données persistante contenant tous les faits figés. C'est la **source de vérité absolue**. L'IA ne peut jamais le contredire.

### Le Champ de Potentialités (CP)

Pour chaque attribut non figé, le système maintient un **espace de possibilités** avec des contraintes qui restreignent progressivement les options.

### Le Graphe de Cohérence Narrative (GCN)

Structure qui maintient les relations entre EN et permet la propagation des contraintes.

```
          [Forgeron]
          /    |    \
    (ancien)  (fournit) (déteste)
        /      |         \
  [Guerre]  [Armurier]  [Seigneur]
      |          |           |
   (causa)    (ami de)    (ordonna)
      |          |           |
  [Massacre] [Tavernier]  [Massacre]
```

### Le Moteur de Collapse (MC)

Orchestrateur qui gère la génération IA, la validation et l'inscription des faits.

---

## 1.6 Flux de Données Global

```
┌─────────────────────────────────────────────────────────────┐
│                      JOUEUR                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ actions
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   GAME ENGINE                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Input       │→ │ Détecteur   │→ │ Moteur de Collapse  │  │
│  │ Handler     │  │ Observation │  │ (avec appel LLM)    │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└──────────────────────────────────────────────┬──────────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                 ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
                 │  Registre   │ ←──→ │  Champ de   │ ←──→ │  Graphe     │
                 │  Canonique  │      │ Potentialités│      │  Cohérence  │
                 └─────────────┘      └─────────────┘      └─────────────┘
```

---

## 1.7 Taxonomie des Observations

Toutes les actions joueur ne déclenchent pas un collapse :

| Action | Déclenche collapse ? |
|--------|---------------------|
| Dialogue direct avec PNJ | ✓ Oui (pour attributs évoqués) |
| Lire un document | ✓ Oui (pour faits décrits) |
| Observer une scène | ✓ Oui (pour éléments visibles) |
| Entendre une rumeur | ◐ Partiel (crée contrainte, pas fait) |
| Traverser un lieu sans explorer | ✗ Non |
| Combat sans interaction narrative | ✗ Non |

---

## 1.8 Gestion des Contradictions Apparentes

Si l'IA génère quelque chose qui semble incohérent :

```typescript
enum ResolutionStrategy {
  REINTERPRETATION,  // Le PNJ mentait, était mal informé
  REVELATION,        // "Ce n'est pas ce que tu crois..."
  RETCON_DOUX,       // Nuancer un fait contraint (pas figé)
  REJET              // Refuser la génération, redemander à l'IA
}
```

Les faits FIGÉS ne sont jamais modifiés. Seule l'interprétation peut évoluer.

---

→ **Suite :** [02 - Structure de Données Fondamentale](./02_Structure_de_Donnees.md)
