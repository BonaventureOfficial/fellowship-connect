export const VERIFICATION_CATEGORIES = [
  "Chanteur, musicien, chorale",
  "Formateur, éducateur, enseignant, professeur",
  "Docteur, infirmier",
  "Entreprise, organisation",
  "Humoriste, acteur, comédien",
  "Cinéma : réalisateur, vidéaste, cinéaste",
  "Journaliste, média",
  "Peintre, photographe, caméra",
  "Mode, beauté, voyage",
  "Développeur, innovateur",
  "Coach, leader, politicien",
  "Autre catégorie personnalisée",
] as const;

export const CUSTOM_CATEGORY = VERIFICATION_CATEGORIES[11];

export function resolveVerificationCategory(category: string, custom: string): string {
  if (!VERIFICATION_CATEGORIES.some((value) => value === category)) return "";
  return category === CUSTOM_CATEGORY ? custom.trim() : category;
}