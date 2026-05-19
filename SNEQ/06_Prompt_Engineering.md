# SNEQ - Partie 6 : Prompt Engineering pour le LLM

---

## Navigation

← [05 - Pré-génération et Cache](./05_Pregeneration_et_Cache.md) | [07 - Stratégies Avancées →](./07_Strategies_Avancees.md)

---

# 6. Prompt Engineering pour le LLM

## 6.1 Principes Fondamentaux

Le LLM est le **cœur créatif** du système. Il doit être guidé pour :

1. **Respecter absolument** les contraintes strictes (faits figés)
2. **Maintenir la cohérence** narrative globale
3. **Générer du contenu intéressant** (pas générique)
4. **Produire un format exploitable** (JSON structuré)
5. **Expliquer son raisonnement** (pour debug et traçabilité)

---

## 6.2 System Prompt

```
# IDENTITÉ

Tu es le Moteur Narratif d'un jeu de rôle à narration émergente. Ton rôle est de 
déterminer des faits sur le monde du jeu qui n'ont pas encore été établis.

Chaque fait que tu génères devient PERMANENT et CANONIQUE.

# RÈGLES ABSOLUES

## Règle 1 : Respect des faits figés
Les faits marqués [FIGÉ] sont SACRÉS. Tu ne peux JAMAIS les contredire.

## Règle 2 : Respect des contraintes strictes
Les contraintes marquées [STRICT] sont OBLIGATOIRES.

## Règle 3 : Cohérence interne
Ta réponse doit être cohérente avec le ton, la logique et les relations établies.

## Règle 4 : Format de sortie
Tu réponds UNIQUEMENT au format JSON demandé.

# OBJECTIFS CRÉATIFS

1. INTÉRÊT NARRATIF - Crée du potentiel dramatique
2. CONNEXIONS - Relie tes créations aux éléments existants
3. SURPRISE COHÉRENTE - Évite les clichés mais reste logique
4. EXPLOITABILITÉ - Ce que tu crées doit être utilisable en jeu

# ANTI-PATTERNS À ÉVITER

- Le méchant unidimensionnel
- Le gentil parfait
- La coïncidence forcée
- L'excès de mystère
- Le trauma gratuit
- Le générique
```

---

## 6.3 Instructions par Catégorie

### SECRET

Un bon secret doit avoir : substance, enjeux, indices possibles, connexion au monde.

**Schéma JSON :**

```json
{
  "nature": "string",
  "resume": "string",
  "details": "string",
  "origine": "string",
  "personnesAuCourant": ["string"],
  "indices": ["string"],
  "consequencesSiRevele": "string",
  "lienAutresEntites": [{"entite": "string", "nature": "string"}]
}
```

### PSYCHOLOGIE

Un bon trait doit être : observable, avoir une origine, créer des dynamiques, avoir de la nuance.

**Schéma JSON :**

```json
{
  "trait": "string",
  "intensite": "number (1-10)",
  "origine": "string",
  "manifestations": ["string"],
  "declencheurs": ["string"],
  "impactRelations": "string"
}
```

### HISTORIQUE

Un bon élément doit être : concret, avoir des traces, résonner avec le présent.

**Schéma JSON :**

```json
{
  "periode": "string",
  "evenement": "string",
  "details": "string",
  "lieuxConcernes": ["string"],
  "personnesImpliquees": ["string"],
  "tracesRestantes": ["string"],
  "impactActuel": "string"
}
```

---

## 6.4 Parsing des Réponses

```typescript
class ParseurReponseIA {
  
  parser(reponseRaw: string, schemaAttendu: JSONSchema): ResultatParsing {
    
    // 1. Nettoyer la réponse
    const nettoye = this.nettoyer(reponseRaw);
    
    // 2. Tenter le parsing JSON
    let json: any;
    try {
      json = JSON.parse(nettoye);
    } catch (e) {
      const repare = this.tenterReparation(nettoye);
      if (repare) {
        json = repare;
      } else {
        return { succes: false, erreur: { type: 'JSON_INVALIDE' } };
      }
    }
    
    // 3. Valider contre le schéma
    const validationSchema = this.validerSchema(json, schemaAttendu);
    if (!validationSchema.valide) {
      return { succes: false, erreur: { type: 'SCHEMA_INVALIDE' } };
    }
    
    return { succes: true, valeur: json };
  }
  
  private nettoyer(raw: string): string {
    let s = raw.trim();
    
    // Retirer les blocs markdown
    s = s.replace(/^```json\s*/i, '');
    s = s.replace(/^```\s*/i, '');
    s = s.replace(/\s*```$/i, '');
    
    // Extraire le JSON
    const debutJson = s.indexOf('{');
    const finJson = s.lastIndexOf('}');
    
    if (debutJson !== -1 && finJson !== -1 && finJson > debutJson) {
      s = s.substring(debutJson, finJson + 1);
    }
    
    return s;
  }
  
  private tenterReparation(jsonCasse: string): any | null {
    // Virgules en trop
    let repare = jsonCasse
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    
    try { return JSON.parse(repare); } catch {}
    
    // Guillemets manquants
    repare = jsonCasse.replace(/(\w+):/g, '"$1":');
    
    try { return JSON.parse(repare); } catch {}
    
    return null;
  }
}
```

---

## 6.5 Prompt de Résolution de Contradiction

Quand les contraintes semblent impossibles :

```
# RÉSOLUTION D'INCOHÉRENCE

Une incohérence a été détectée :

[Description du problème]

## TA MISSION

Trouve une RÉINTERPRÉTATION qui :
1. Rend les deux faits compatibles
2. Est narrativement intéressante
3. Ne modifie pas les faits figés

## STRATÉGIES POSSIBLES

1. RÉINTERPRÉTATION - Un fait peut être vrai d'une manière inattendue
2. TEMPORALITÉ - Les faits peuvent être vrais à des moments différents
3. PERSPECTIVE - Un fait peut être vrai d'un point de vue, faux d'un autre
4. NUANCE - Les termes absolus peuvent être nuancés
```

---

## 6.6 Paramètres de Génération

```typescript
private determinerTemperature(
  options: OptionsCollapse, 
  contexte: ContexteCollapse
): number {
  const nombreContraintes = contexte.contraintes.strictes.length;
  
  let baseTemp = 0.7;
  
  // Réduire si beaucoup de contraintes
  baseTemp -= nombreContraintes * 0.05;
  
  // Ajuster selon le registre
  if (options.registre === 'DRAMATIQUE') baseTemp += 0.1;
  if (options.registre === 'SOMBRE') baseTemp += 0.05;
  
  // Ajuster selon la profondeur
  if (options.profondeur === 'DETAILLE') baseTemp += 0.1;
  if (options.profondeur === 'MINIMAL') baseTemp -= 0.1;
  
  return Math.max(0.3, Math.min(1.0, baseTemp));
}

private determinerMaxTokens(categorie: CategorieAttribut): number {
  const tokensParCategorie: Record<CategorieAttribut, number> = {
    'SECRET': 800,
    'PSYCHOLOGIE': 600,
    'HISTORIQUE': 700,
    'SOCIAL': 500,
    'COMPETENCE': 400,
    'ETAT': 300,
    'IDENTITE': 400,
    'POSSESSION': 400
  };
  
  return tokensParCategorie[categorie] || 500;
}
```

---

→ **Suite :** [07 - Stratégies Avancées](./07_Strategies_Avancees.md)
