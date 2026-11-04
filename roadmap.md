# Migration progressive vers le Supabase personnel

- [x] Inventorier les fonctions existantes et les dépendances au service actuel.
- [ ] Obtenir l’export officiel de la source, comptes compris. Export prêt sur Drive ; blocage : nouvelle autorisation Google refusée, fichier inaccessible.
- [ ] Établir un accès sécurisé au projet de destination. Adresse publique confirmée ; blocage : aucun accès administrateur confirmé.
- [ ] Restaurer et comparer les données, identifiants, séquences, règles d’accès et fonctions.
- [ ] Transférer les fichiers des trois espaces de stockage, séparément de l’export de la base.
- [ ] Reconfigurer les connexions, emails et intégrations sur la destination.
- [ ] Tester la copie avec Cloudflare sans changer le site actuel.
- [ ] Organiser la synchronisation finale et une courte suspension des écritures si nécessaire.
- [ ] Basculer uniquement après les vérifications, conserver la source pour le retour arrière.

## Nouveaux uploads médias

- [ ] Remplacer le stockage actuel pour les nouveaux uploads de vidéos, avatars et portraits par https://media.livingfellowship2026.com. Service public joignable : il annonce R2 connecté, authentification obligatoire et limite 100 Mo. Blocage : contrat d’envoi et vérification réelle des accès privés inconnus ; obtenir le code du service Cloudflare sans secrets avant modification.