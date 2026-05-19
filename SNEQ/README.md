# SNEQ - Système Narratif à État Quantique

## Documentation Technique Complète

**Version:** 1.0  
**Date:** Février 2025

---

## Qu'est-ce que le SNEQ ?

Le SNEQ est un système pour jeux vidéo RPG dans lequel **tous les éléments narratifs varient en fonction des actions du joueur**, piloté par IA. 

Contrairement aux arbres de choix traditionnels, le SNEQ utilise un concept inspiré de la mécanique quantique : les éléments du monde existent dans un état d'incertitude jusqu'à ce que le joueur les "observe", moment où ils se figent de manière permanente et cohérente.

### Principes Clés

- **Superposition narrative** : Les attributs non observés restent indéfinis
- **Effondrement par observation** : L'interaction du joueur fige les faits
- **Propagation causale** : Chaque fait figé influence le reste du monde
- **Cohérence garantie** : Le système de contraintes empêche les contradictions

---

## Structure de la Documentation

| # | Document | Description |
|---|----------|-------------|
| 1 | [Introduction et Concept](./01_Introduction_et_Concept.md) | Vision, principes fondamentaux, architecture |
| 2 | [Structure de Données](./02_Structure_de_Donnees.md) | Registre Canonique (RC) et Champ de Potentialités (CP) |
| 3 | [Graphe de Cohérence](./03_Graphe_de_Coherence.md) | GCN, relations, propagation des contraintes |
| 4 | [Moteur de Collapse](./04_Moteur_de_Collapse.md) | Orchestration, validation, inscription des faits |
| 5 | [Pré-génération et Cache](./05_Pregeneration_et_Cache.md) | Prédiction, cache, optimisation de la latence |
| 6 | [Prompt Engineering](./06_Prompt_Engineering.md) | Prompts LLM, instructions, parsing |
| 7 | [Stratégies Avancées](./07_Strategies_Avancees.md) | Optimisation, détection d'incohérences, fallback |
| 8 | [Récapitulatif](./08_Recapitulatif.md) | Vue d'ensemble, métriques, questions ouvertes |

---

## Lecture Rapide

### Pour comprendre le concept
→ Lire [01 - Introduction](./01_Introduction_et_Concept.md)

### Pour implémenter les données
→ Lire [02 - Structure de Données](./02_Structure_de_Donnees.md) + [03 - Graphe](./03_Graphe_de_Coherence.md)

### Pour implémenter le moteur
→ Lire [04 - Moteur de Collapse](./04_Moteur_de_Collapse.md)

### Pour optimiser les performances
→ Lire [05 - Cache](./05_Pregeneration_et_Cache.md) + [07 - Stratégies Avancées](./07_Strategies_Avancees.md)

### Pour configurer le LLM
→ Lire [06 - Prompt Engineering](./06_Prompt_Engineering.md)

---

## Architecture Simplifiée

```
JOUEUR
   │
   ▼
┌──────────────────┐
│ MOTEUR COLLAPSE  │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ CACHE │ │  LLM  │
└───────┘ └───────┘
    │         │
    └────┬────┘
         ▼
┌──────────────────┐
│    VALIDATION    │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│  RC   │ │  GCN  │
│(faits)│ │(liens)│
└───────┘ └───────┘
         │
         ▼
    PROPAGATION
```

---

## Technologies Suggérées

| Composant | Technologies |
|-----------|--------------|
| Backend | Node.js/TypeScript, Python |
| Base de données | PostgreSQL |
| Cache | Redis |
| Graphe | Neo4j ou PostgreSQL |
| Vector DB | Pinecone, Weaviate, pgvector |
| LLM | Claude API, OpenAI API |
| Queue | RabbitMQ, Redis Streams |

---

## Licence

Documentation propriétaire - Tous droits réservés.

---

*Pour toute question ou contribution, ouvrir une issue.*
