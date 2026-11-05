/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { CUSTOM_CATEGORY, VERIFICATION_CATEGORIES, resolveVerificationCategory } from "./verification-categories";

describe("verification category submission", () => {
  it("accepts all eleven professional groups as the saved category", () => {
    const groups = [
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
    ];
    expect(VERIFICATION_CATEGORIES).toHaveLength(12);
    for (const group of groups) expect(resolveVerificationCategory(group, "")).toBe(group);
  });
  it("saves the personalized category rather than the generic option", () => {
    expect(resolveVerificationCategory(CUSTOM_CATEGORY, "  Artisan  ")).toBe("Artisan");
    expect(resolveVerificationCategory(CUSTOM_CATEGORY, "  ")).toBe("");
  });
  it("rejects former functions and unselected categories for new requests", () => {
    for (const old of ["Représentant(e)", "Vice Représentant(e)", "Secrétaire", "Trésorier(ère)", "Staff d'arbitrage", "Membre Fondateur", "Membre", ""]) {
      expect(resolveVerificationCategory(old, "")).toBe("");
    }
  });
});