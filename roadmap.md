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

## Polissage des Paramètres

- [ ] Corriger et vérifier l’ouverture des miniatures avec une session réelle.
- [ ] Vérifier la chaîne Lovable → GitHub → Cloudflare sans modifier le déploiement existant.

- [ ] Organiser les fonctions en trois miniatures par ligne et corriger les débordements.
- [ ] Remplacer les fonctions par les catégories demandées, avec saisie personnalisée.
- [ ] Afficher Notre Devise sous les paramètres et vérifier l’affichage mobile.

- [x] Router les nouveaux uploads de vidéos, réels et avatars vers le service média avec la session et conserver les anciens liens. Envoi réel d’une image neutre réussi.
- [ ] Router les portraits de vérification vers le service média. Blocage : le média test est lisible sans connexion (HTTP 206) ; conserver les portraits privés actuels jusqu’à un accès limité au propriétaire et aux admins.