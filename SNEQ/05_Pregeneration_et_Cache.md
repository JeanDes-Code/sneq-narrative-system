# SNEQ - Partie 5 : Pré-génération et Cache

---

## Navigation

← [04 - Moteur de Collapse](./04_Moteur_de_Collapse.md) | [06 - Prompt Engineering →](./06_Prompt_Engineering.md)

---

# 5. Pré-génération et Cache

## 5.1 Le Problème

Un appel LLM prend typiquement 1 à 5 secondes. Inacceptable si le joueur attend une réponse de dialogue. Il faut **anticiper** les besoins.

```
SANS PRÉ-GÉNÉRATION:

Joueur parle au forgeron
         │
         ▼
    [ATTENTE 3s]  ← Génération histoire_passé
         │
         ▼
    Réponse affichée
         │
         ▼
Joueur demande "Et ta famille ?"
         │
         ▼
    [ATTENTE 2s]  ← Génération famille
         │
         ▼
    Réponse affichée


AVEC PRÉ-GÉNÉRATION:

Joueur entre dans le village
         │
         ├──► [Background] Pré-génère forgeron.histoire_passé
         ├──► [Background] Pré-génère forgeron.famille
         ├──► [Background] Pré-génère tavernier.rumeurs
         │
Joueur parle au forgeron
         │
         ▼
    [CACHE HIT - 0ms]
         │
         ▼
    Réponse instantanée
```

---

## 5.2 Architecture du Système de Cache

```typescript
class SystemePregeneration {
  
  private cache: CacheGeneration;
  private predicteur: PredicteurBesoins;
  private orchestrateur: OrchestrateurGeneration;
  private fileAttente: FileAttenteGeneration;
  
  // Boucle principale (tourne en arrière-plan)
  async bouclePregeneration(): Promise<void> {
    
    while (true) {
      // 1. Obtenir les prédictions actuelles
      const predictions = await this.predicteur.predire();
      
      // 2. Filtrer ce qui est déjà en cache ou en cours
      const aGenerer = this.filtrerDejaTraite(predictions);
      
      // 3. Prioriser
      const ordonnees = this.prioriser(aGenerer);
      
      // 4. Soumettre à la file (respect des limites de ressources)
      for (const item of ordonnees) {
        if (this.fileAttente.peutAccepter()) {
          this.fileAttente.soumettre(item);
        }
      }
      
      // 5. Attendre avant prochaine itération
      await this.attendreProchainCycle();
    }
  }
}
```

---

## 5.3 Structure du Cache

```typescript
interface CacheGeneration {
  
  // Stockage principal
  entries: Map<CacheCle, CacheEntree>;
  
  // Index pour invalidation rapide
  indexParEntite: Map<EntityID, Set<CacheCle>>;
  indexParAttribut: Map<string, Set<CacheCle>>;
  
  // Métriques
  stats: CacheStats;
}

type CacheCle = `${EntityID}:${string}`;  // "ent_forgeron:histoire_passé"

interface CacheEntree {
  cle: CacheCle;
  entiteId: EntityID;
  attribut: string;
  
  // Valeur générée
  valeur: AttributValue;
  raisonnement: string;
  confidence: number;
  
  // Contexte au moment de la génération
  contexteSnapshot: ContexteSnapshot;
  
  // Métadonnées
  meta: {
    dateGeneration: Date;
    dureeGenerationMs: number;
    version: number;
    
    // Validité
    estValide: boolean;
    raisonInvalidation?: string;
    
    // Dépendances (pour invalidation en cascade)
    dependDe: CacheCle[];
  };
  
  // Statistiques d'utilisation
  usage: {
    nombreHits: number;
    dernierAcces: Date;
  };
}

interface ContexteSnapshot {
  // Hash des contraintes au moment de la génération
  hashContraintes: string;
  
  // IDs des faits figés qui ont influencé
  faitsDependants: FaitID[];
  
  // État du graphe local
  hashGrapheLocal: string;
  
  // Progression narrative
  progressionNarrative: number;
}

interface CacheStats {
  totalEntrees: number;
  tailleMemoire: number;
  
  hits: number;
  misses: number;
  invalidations: number;
  
  tauxHit: number;  // hits / (hits + misses)
  
  tempsGenerationMoyen: number;
  tempsSauvegardeGrace: number;  // temps économisé
}
```

### Opérations du Cache

```typescript
class CacheGeneration {
  
  // Récupérer une entrée
  get(entiteId: EntityID, attribut: string): CacheEntree | null {
    const cle = this.construireCle(entiteId, attribut);
    const entree = this.entries.get(cle);
    
    if (!entree) {
      this.stats.misses++;
      return null;
    }
    
    if (!entree.meta.estValide) {
      this.stats.misses++;
      return null;
    }
    
    // Mettre à jour les stats d'usage
    entree.usage.nombreHits++;
    entree.usage.dernierAcces = new Date();
    this.stats.hits++;
    
    return entree;
  }
  
  // Stocker une entrée
  set(
    entiteId: EntityID, 
    attribut: string, 
    valeur: AttributValue,
    contexte: ContexteCollapse,
    meta: Partial<CacheEntreeMeta>
  ): void {
    
    const cle = this.construireCle(entiteId, attribut);
    
    const entree: CacheEntree = {
      cle,
      entiteId,
      attribut,
      valeur,
      raisonnement: meta.raisonnement || '',
      confidence: meta.confidence || 0.5,
      contexteSnapshot: this.creerSnapshot(contexte),
      meta: {
        dateGeneration: new Date(),
        dureeGenerationMs: meta.dureeGenerationMs || 0,
        version: (this.entries.get(cle)?.meta.version || 0) + 1,
        estValide: true,
        dependDe: this.calculerDependances(contexte)
      },
      usage: {
        nombreHits: 0,
        dernierAcces: new Date()
      }
    };
    
    this.entries.set(cle, entree);
    this.mettreAJourIndex(entree);
    this.verifierLimiteTaille();
  }
  
  // Invalider une entrée
  invalider(entiteId: EntityID, attribut: string, raison: string): void {
    const cle = this.construireCle(entiteId, attribut);
    const entree = this.entries.get(cle);
    
    if (entree) {
      entree.meta.estValide = false;
      entree.meta.raisonInvalidation = raison;
      this.stats.invalidations++;
      
      // Invalider en cascade les entrées qui dépendent de celle-ci
      this.invaliderDependants(cle, raison);
    }
  }
  
  // Invalider tout ce qui concerne une entité
  invaliderPourEntite(entiteId: EntityID, raison: string): void {
    const cles = this.indexParEntite.get(entiteId) || new Set();
    for (const cle of cles) {
      this.invaliderParCle(cle, raison);
    }
  }
  
  // Vérifier si une entrée est toujours valide
  verifierValidite(
    entree: CacheEntree, 
    contexteActuel: ContexteCollapse
  ): boolean {
    
    // 1. Vérifier le hash des contraintes
    const hashActuel = this.calculerHashContraintes(contexteActuel);
    if (hashActuel !== entree.contexteSnapshot.hashContraintes) {
      return false;
    }
    
    // 2. Vérifier que les faits dépendants n'ont pas changé
    for (const faitId of entree.contexteSnapshot.faitsDependants) {
      const faitActuel = this.rc.getFaitParId(faitId);
      if (!faitActuel || 
          faitActuel.version !== this.getVersionSnapshot(faitId, entree)) {
        return false;
      }
    }
    
    // 3. Vérifier le graphe local
    const hashGrapheActuel = this.calculerHashGraphe(contexteActuel);
    if (hashGrapheActuel !== entree.contexteSnapshot.hashGrapheLocal) {
      return false;
    }
    
    return true;
  }
  
  // Nettoyage périodique
  nettoyer(): NettoyageResultat {
    const maintenant = new Date();
    const aSupprimer: CacheCle[] = [];
    
    for (const [cle, entree] of this.entries) {
      // Supprimer les entrées invalides anciennes
      if (!entree.meta.estValide) {
        const age = maintenant.getTime() - entree.meta.dateGeneration.getTime();
        if (age > DELAI_SUPPRESSION_INVALIDE) {
          aSupprimer.push(cle);
        }
      }
      
      // Supprimer les entrées jamais utilisées et vieilles
      if (entree.usage.nombreHits === 0) {
        const age = maintenant.getTime() - entree.meta.dateGeneration.getTime();
        if (age > DELAI_SUPPRESSION_INUTILISEE) {
          aSupprimer.push(cle);
        }
      }
    }
    
    for (const cle of aSupprimer) {
      this.entries.delete(cle);
      this.retirerDesIndex(cle);
    }
    
    return {
      entreesSuprimees: aSupprimer.length,
      tailleApres: this.entries.size
    };
  }
}
```

---

## 5.4 Prédiction des Besoins

Le cœur du système : **anticiper** ce que le joueur va probablement déclencher.

```typescript
class PredicteurBesoins {
  
  private positionJoueur: EntityID;
  private historiqueActions: ActionJoueur[];
  private etatConversation: EtatConversation | null;
  
  async predire(): Promise<PredictionBesoin[]> {
    
    const predictions: PredictionBesoin[] = [];
    
    // 1. Prédictions spatiales
    predictions.push(...await this.predireSpatial());
    
    // 2. Prédictions conversationnelles
    if (this.etatConversation) {
      predictions.push(...await this.predireConversation());
    }
    
    // 3. Prédictions comportementales
    predictions.push(...await this.predireComportement());
    
    // 4. Prédictions narratives
    predictions.push(...await this.predireNarratif());
    
    // Fusionner et dédupliquer
    return this.consolidePredictions(predictions);
  }
```

### Prédictions Spatiales

```typescript
  private async predireSpatial(): Promise<PredictionBesoin[]> {
    const predictions: PredictionBesoin[] = [];
    
    // PNJs dans la zone actuelle
    const pnjsProches = await this.getPNJsZone(this.positionJoueur);
    for (const pnj of pnjsProches) {
      for (const attribut of ATTRIBUTS_DIALOGUE_COURANTS) {
        if (!this.estFige(pnj.id, attribut)) {
          predictions.push({
            entiteId: pnj.id,
            attribut,
            probabilite: this.calculerProbaSpatiale(pnj),
            raison: 'PNJ dans zone actuelle'
          });
        }
      }
    }
    
    // Zones adjacentes
    const zonesAdjacentes = await this.getZonesAdjacentes(this.positionJoueur);
    for (const zone of zonesAdjacentes) {
      const pnjsZone = await this.getPNJsZone(zone.id);
      for (const pnj of pnjsZone) {
        for (const attribut of ATTRIBUTS_DIALOGUE_ESSENTIELS) {
          if (!this.estFige(pnj.id, attribut)) {
            predictions.push({
              entiteId: pnj.id,
              attribut,
              probabilite: this.calculerProbaSpatiale(pnj) * 0.5,
              raison: 'PNJ dans zone adjacente'
            });
          }
        }
      }
    }
    
    return predictions;
  }
```

### Prédictions Conversationnelles

```typescript
  private async predireConversation(): Promise<PredictionBesoin[]> {
    const predictions: PredictionBesoin[] = [];
    const conv = this.etatConversation!;
    
    // Analyser les sujets abordés
    const sujetsActuels = this.analyserSujets(conv.historique);
    
    // Attributs liés aux sujets actuels
    for (const sujet of sujetsActuels) {
      const attributsLies = this.getAttributsLies(sujet);
      for (const attribut of attributsLies) {
        if (!this.estFige(conv.interlocuteur, attribut)) {
          predictions.push({
            entiteId: conv.interlocuteur,
            attribut,
            probabilite: 0.8,  // Haute proba si en conversation
            raison: `Sujet actuel: ${sujet}`
          });
        }
      }
    }
    
    // Entités mentionnées dans la conversation
    const entitesMentionnees = this.extraireEntitesMentionnees(conv.historique);
    for (const entite of entitesMentionnees) {
      for (const attribut of ATTRIBUTS_MENTION_COURANTS) {
        if (!this.estFige(entite.id, attribut)) {
          predictions.push({
            entiteId: entite.id,
            attribut,
            probabilite: 0.6,
            raison: 'Mentionné dans conversation'
          });
        }
      }
    }
    
    // Options de dialogue futures
    const optionsFutures = await this.getOptionsDialoguePossibles(conv);
    for (const option of optionsFutures) {
      for (const attributRequis of option.attributsRequis) {
        if (!this.estFige(attributRequis.entiteId, attributRequis.attribut)) {
          predictions.push({
            ...attributRequis,
            probabilite: option.probabiliteSelection * 0.9,
            raison: `Option dialogue: "${option.texteApercu}"`
          });
        }
      }
    }
    
    return predictions;
  }
```

### Consolidation

```typescript
  private consolidePredictions(
    predictions: PredictionBesoin[]
  ): PredictionBesoin[] {
    const map = new Map<string, PredictionBesoin>();
    
    for (const pred of predictions) {
      const cle = `${pred.entiteId}:${pred.attribut}`;
      const existant = map.get(cle);
      
      if (!existant || pred.probabilite > existant.probabilite) {
        map.set(cle, pred);
      }
    }
    
    return Array.from(map.values())
      .filter(p => p.probabilite > SEUIL_PROBABILITE_MIN)
      .sort((a, b) => b.probabilite - a.probabilite);
  }
}

// Constantes de configuration
const ATTRIBUTS_DIALOGUE_COURANTS = [
  'histoire_passe',
  'motivation',
  'secret_principal',
  'opinion_joueur',
  'rumeurs_connues',
  'etat_emotionnel'
];

const ATTRIBUTS_DIALOGUE_ESSENTIELS = [
  'histoire_passe',
  'motivation'
];

const ATTRIBUTS_MENTION_COURANTS = [
  'description',
  'reputation',
  'derniere_action'
];

const SEUIL_PROBABILITE_MIN = 0.2;
```

---

## 5.5 Orchestration de la Génération

Gérer les ressources et prioriser intelligemment :

```typescript
class OrchestrateurGeneration {
  
  private workersDisponibles: number;
  private fileAttente: FileAttenteGeneration;
  private enCours: Map<CacheCle, PromiseGeneration>;
  
  constructor(config: ConfigOrchestration) {
    this.workersDisponibles = config.maxWorkersConcurrents;  // ex: 3
    this.fileAttente = new FileAttenteGeneration(config.tailleMaxFile);
  }
  
  // Soumettre une demande de pré-génération
  soumettre(prediction: PredictionBesoin): boolean {
    
    const cle = `${prediction.entiteId}:${prediction.attribut}`;
    
    // Déjà en cours ?
    if (this.enCours.has(cle)) {
      return false;
    }
    
    // Créer la tâche
    const tache: TacheGeneration = {
      cle,
      entiteId: prediction.entiteId,
      attribut: prediction.attribut,
      priorite: this.calculerPriorite(prediction),
      dateCreation: new Date(),
      prediction
    };
    
    return this.fileAttente.ajouter(tache);
  }
  
  // Boucle de traitement
  async boucleTraitement(): Promise<void> {
    
    while (true) {
      await this.attendreWorkerDisponible();
      
      const tache = this.fileAttente.prendreProchaine();
      if (!tache) {
        await this.attendreTache();
        continue;
      }
      
      if (this.tacheObsolete(tache)) {
        continue;
      }
      
      this.workersDisponibles--;
      this.lancerGeneration(tache)
        .finally(() => {
          this.workersDisponibles++;
          this.enCours.delete(tache.cle);
        });
    }
  }
  
  private calculerPriorite(prediction: PredictionBesoin): number {
    let priorite = prediction.probabilite * 100;
    
    // Bonus si en conversation
    if (prediction.raison.includes('conversation')) {
      priorite += 50;
    }
    
    // Bonus si zone actuelle
    if (prediction.raison.includes('zone actuelle')) {
      priorite += 30;
    }
    
    // Bonus pour attributs critiques
    if (ATTRIBUTS_CRITIQUES.includes(prediction.attribut)) {
      priorite += 20;
    }
    
    return priorite;
  }
  
  private tacheObsolete(tache: TacheGeneration): boolean {
    // L'attribut a été figé entre-temps
    if (this.rc.getFait(tache.entiteId, tache.attribut)) {
      return true;
    }
    
    // Déjà dans le cache et valide
    const cached = this.cache.get(tache.entiteId, tache.attribut);
    if (cached && cached.meta.estValide) {
      return true;
    }
    
    // Tâche trop vieille
    const ageMs = Date.now() - tache.dateCreation.getTime();
    if (ageMs > DELAI_OBSOLESCENCE_TACHE) {
      return true;
    }
    
    return false;
  }
}

const ATTRIBUTS_CRITIQUES = [
  'histoire_passe',
  'secret_principal',
  'motivation'
];

const DELAI_OBSOLESCENCE_TACHE = 30000;  // 30 secondes
```

---

## 5.6 File d'Attente Prioritaire

```typescript
class FileAttenteGeneration {
  
  private heap: TacheGeneration[];
  private tailleMax: number;
  private index: Map<CacheCle, number>;
  
  constructor(tailleMax: number) {
    this.heap = [];
    this.tailleMax = tailleMax;
    this.index = new Map();
  }
  
  ajouter(tache: TacheGeneration): boolean {
    if (this.heap.length >= this.tailleMax) {
      const moins = this.heap[this.heap.length - 1];
      if (tache.priorite > moins.priorite) {
        this.retirerDernier();
      } else {
        return false;
      }
    }
    
    this.heap.push(tache);
    this.index.set(tache.cle, this.heap.length - 1);
    this.remonter(this.heap.length - 1);
    return true;
  }
  
  prendreProchaine(): TacheGeneration | null {
    if (this.heap.length === 0) return null;
    
    const tache = this.heap[0];
    this.index.delete(tache.cle);
    
    if (this.heap.length === 1) {
      this.heap.pop();
    } else {
      this.heap[0] = this.heap.pop()!;
      this.index.set(this.heap[0].cle, 0);
      this.descendre(0);
    }
    
    return tache;
  }
  
  // Heap max standard
  private remonter(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[parent].priorite >= this.heap[idx].priorite) break;
      this.echanger(parent, idx);
      idx = parent;
    }
  }
  
  private descendre(idx: number): void {
    while (true) {
      const gauche = 2 * idx + 1;
      const droite = 2 * idx + 2;
      let max = idx;
      
      if (gauche < this.heap.length && 
          this.heap[gauche].priorite > this.heap[max].priorite) {
        max = gauche;
      }
      if (droite < this.heap.length && 
          this.heap[droite].priorite > this.heap[max].priorite) {
        max = droite;
      }
      
      if (max === idx) break;
      this.echanger(max, idx);
      idx = max;
    }
  }
  
  private echanger(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.index.set(this.heap[i].cle, i);
    this.index.set(this.heap[j].cle, j);
  }
}
```

---

## 5.7 Stratégies d'Invalidation

Quand invalider le cache ?

```typescript
class GestionnaireInvalidation {
  
  // Appelé après chaque collapse réussi
  apresCollapse(fait: AttributFige, propagation: PropagationResult): void {
    
    // 1. Invalider l'entrée de l'attribut lui-même
    this.cache.invalider(
      fait.entiteId, 
      fait.attribut, 
      'Attribut figé'
    );
    
    // 2. Invalider les entrées des entités impactées
    for (const entiteId of propagation.entitesImpactees) {
      this.invaliderEntiteSelectif(entiteId, propagation);
    }
    
    // 3. Invalider les entrées qui dépendaient du contexte modifié
    this.invaliderParDependance(fait);
  }
  
  private invaliderEntiteSelectif(
    entiteId: EntityID, 
    propagation: PropagationResult
  ): void {
    
    const attributsImpactes = propagation.contraintesPropagees
      .filter(c => c.entiteId === entiteId)
      .map(c => c.attributCible);
    
    for (const attribut of attributsImpactes) {
      const entree = this.cache.get(entiteId, attribut);
      if (entree) {
        const toujoursValide = this.verifierContraintesNouvelles(
          entree, 
          propagation.contraintesPropagees
        );
        
        if (!toujoursValide) {
          this.cache.invalider(
            entiteId, 
            attribut, 
            'Nouvelles contraintes incompatibles'
          );
        }
      }
    }
  }
  
  // Maintenance périodique
  maintenancePeriodique(): void {
    const maintenant = Date.now();
    
    for (const [cle, entree] of this.cache.entries) {
      if (!entree.meta.estValide) continue;
      
      // Invalider si trop vieux
      const ageMs = maintenant - entree.meta.dateGeneration.getTime();
      if (ageMs > DUREE_VIE_MAX_CACHE) {
        this.cache.invalider(
          entree.entiteId,
          entree.attribut,
          'Expiration temporelle'
        );
        continue;
      }
      
      // Vérifier la validité contextuelle
      const contexteActuel = this.construireContexteActuel(
        entree.entiteId, 
        entree.attribut
      );
      if (!this.cache.verifierValidite(entree, contexteActuel)) {
        this.cache.invalider(
          entree.entiteId,
          entree.attribut,
          'Contexte modifié'
        );
      }
    }
  }
}

const DUREE_VIE_MAX_CACHE = 10 * 60 * 1000;  // 10 minutes
```

---

## 5.8 Diagramme du Flux Complet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTÈME DE PRÉ-GÉNÉRATION                         │
└─────────────────────────────────────────────────────────────────────────────┘

     ÉVÉNEMENTS JEU                    PRÉDICTEUR                    CACHE
           │                               │                           │
           │  Position joueur              │                           │
           │  Actions                      │                           │
           │  État conversation            │                           │
           ├──────────────────────────────►│                           │
           │                               │                           │
           │                      ┌────────┴────────┐                  │
           │                      │ Analyse &       │                  │
           │                      │ Prédiction      │                  │
           │                      └────────┬────────┘                  │
           │                               │                           │
           │                      Liste de prédictions                 │
           │                      avec probabilités                    │
           │                               │                           │
           │                               ▼                           │
           │                    ┌─────────────────────┐                │
           │                    │  FILE D'ATTENTE     │                │
           │                    │  PRIORITAIRE        │                │
           │                    └──────────┬──────────┘                │
           │                               │                           │
           │                               ▼                           │
           │                    ┌─────────────────────┐                │
           │                    │  ORCHESTRATEUR      │                │
           │                    │  (3 workers max)    │                │
           │                    └──────────┬──────────┘                │
           │                               │                           │
           │              ┌────────────────┼────────────────┐          │
           │              ▼                ▼                ▼          │
           │         [Worker 1]      [Worker 2]      [Worker 3]        │
           │              │                │                │          │
           │              └────────────────┼────────────────┘          │
           │                               │                           │
           │                               ▼                           │
           │                         ┌───────────┐                     │
           │                         │    LLM    │                     │
           │                         └─────┬─────┘                     │
           │                               │                           │
           │                          Validation                       │
           │                               │                           │
           │                               ▼                           │
           │                    ┌─────────────────────┐                │
           │                    │  Stockage Cache     │◄───────────────┤
           │                    └─────────────────────┘                │
           │                                                           │
     MOTEUR COLLAPSE ─────────────────── CHECK CACHE ──────────────────┤
           │                                    │                      │
           │                           ┌────────┴────────┐             │
           │                           │                 │             │
           │                        HIT              MISS              │
           │                           │                 │             │
           │                  Utiliser cache     Génération            │
           │                           │           temps réel          │
           │                           └────────┬────────┘             │
           │                                    │                      │
           │◄───────────────────────────────────┘                      │
           │                                                           │
           ▼                                                           │
    Réponse instantanée                                                │
    au joueur                                                          │
```

---

## 5.9 Métriques et Monitoring

```typescript
interface MetriquesPregeneraton {
  // Performance
  tauxHitCache: number;              // Objectif: > 80%
  tempsReponseMedianMs: number;      // Objectif: < 100ms avec cache
  tempsGenerationMoyenMs: number;
  
  // Qualité des prédictions
  tauxPredictionUtilisee: number;    // % des pré-générations utilisées
  tauxPredictionCorrecte: number;
  
  // Ressources
  tailleCache: number;
  memorieCacheBytes: number;
  tailleFileAttente: number;
  workersActifs: number;
  
  // Santé
  erreursPar5Min: number;
  invalidationsPar5Min: number;
  generationsEchoueesPar5Min: number;
}
```

---

→ **Suite :** [06 - Prompt Engineering](./06_Prompt_Engineering.md)
