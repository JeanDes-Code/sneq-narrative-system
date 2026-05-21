// French + English stopwords used by the Validator regex stage to drop
// capitalized tokens that look like proper nouns but aren't. All lowercase;
// the Validator lowercases candidates before checking membership.
const FRENCH_STOPWORDS = [
  "le","la","les","un","une","des","du","de","au","aux",
  "je","tu","il","elle","on","nous","vous","ils","elles",
  "ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses",
  "notre","nos","votre","vos","leur","leurs",
  "et","ou","mais","donc","or","ni","car","si","quand","lorsque","alors","ainsi",
  "puis","ensuite","enfin","aussi","encore","déjà","jamais","toujours","souvent",
  "ici","là","là-bas","oui","non","peut-être","bien","très","trop","plus","moins",
  "comme","comment","pourquoi","parce","que","qui","quoi","quel","quelle","quels","quelles",
  "qu","l","d","n","s","m","t","j","c","jusque","jusqu","quoique","cependant",
  "soudain","aujourd","hui","demain","hier","aujourd'hui","oh","ah","eh","hé","ho","bah"
];

const ENGLISH_STOPWORDS = [
  "the","a","an","is","are","was","were","be","been","being","am",
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "my","your","his","its","our","their","mine","yours","hers","ours","theirs",
  "this","that","these","those","such",
  "and","or","but","so","yet","nor","for","if","then","when","while","because",
  "as","of","at","by","with","from","into","onto","upon","over","under","through",
  "yes","no","ok","okay","oh","ah","hey","whoa","wow","huh","well",
  "now","here","there","where","why","how","what","who","whom","which",
  "very","quite","just","also","too","still","already","never","always","often",
  "more","less","most","least","not","only","even"
];

const ALL = [...FRENCH_STOPWORDS, ...ENGLISH_STOPWORDS].map(w => w.toLowerCase());

export const STOPWORDS: ReadonlySet<string> = new Set(ALL);
