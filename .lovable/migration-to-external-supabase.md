# Migration progressive de Living Fellowship

## État et périmètre

La destination est le projet Supabase personnel montré dans la capture. Aucun accès administrateur à cette destination n’est confirmé. Les outils de base de données actuellement disponibles ciblent la source Lovable Cloud, pas la destination : ne pas les utiliser pour prétendre restaurer la copie.

L’application actuelle et sa configuration restent inchangées. Aucune suppression de Lovable Cloud n’est nécessaire pour préparer ou basculer le site Cloudflare vers une destination externe.

## 1. Export officiel

Depuis Lovable : **More → Database → Manage → Settings → Export data → Database → Export → Start export**. Télécharger l’export via le lien envoyé par email ou depuis Storage.

L’export contient la structure, les données et les comptes avec leurs empreintes de mots de passe. Il ne contient pas les fichiers stockés, le code des fonctions, les secrets ni les réglages des fournisseurs de connexion. Limites documentées : base de 15 Go maximum, fichier exporté de 5 Go maximum, un export par 24 heures ; le service doit être démarré.

Cet export est sensible : le conserver dans un emplacement privé, jamais dans le dépôt de code. Ne pas écrire un script de dump de la source.

## 2. Préparer la copie sans bascule

- Confirmer l’adresse publique du projet de destination et un mode d’accès sécurisé avant toute écriture.
- Restaurer l’export dans la destination avec une procédure compatible avec les schémas gérés du fournisseur ; ne pas effectuer une restauration aveugle des schémas internes.
- Conserver les identifiants des comptes et des données, leurs relations, les numéros LF et la valeur de la séquence.
- Comparer les comptes, membres, rôles, annonces, réactions, demandes et votes de vérification, journal, abonnements entre membres, vidéos et interactions.
- Vérifier les droits explicites, politiques d’accès, fonctions sécurisées et déclencheurs.

## 3. Fichiers et services

- Télécharger séparément les fichiers depuis **More → Storage** : avatars, portraits et vidéos. Les sauvegardes quotidiennes et l’export ne comprennent pas ces fichiers.
- Recréer les espaces et leurs accès : avatars et portraits privés, vidéos publiques ; préserver les limites configurées et les chemins des objets.
- Importer les fichiers sur la destination puis traiter les anciennes adresses stockées ; régénérer les liens temporaires des fichiers privés.
- Reconfigurer les emails, la connexion Google, les adresses de retour et la récupération des mots de passe. La connexion Google actuelle utilise un service Lovable et doit être remplacée pour satisfaire l’objectif d’indépendance.
- Examiner les autres services, tâches et appels externes avant de déclarer l’indépendance complète.

## 4. Vérification isolée sur Cloudflare

Créer un déploiement de test pointant uniquement sur la copie, sans changer le site existant. Ne jamais envoyer les clés privées au navigateur ni les enregistrer dans le code.

Tester connexion d’un membre existant, données d’origine, photos, annonces et réactions, gestion des admins par le CEO, vérification des comptes et restrictions d’accès. Tester les actions destructives uniquement avec des comptes de test sur la copie.

## 5. Synchronisation finale et bascule

Les nouvelles inscriptions et modifications postérieures à l’export ne seront pas dans la copie. Définir la stratégie de rattrapage avant la bascule ; une courte suspension annoncée des écritures peut être nécessaire. Ne pas promettre une migration sans interruption ou une synchronisation automatique non implémentée.

Après comparaison finale, modifier le déploiement Cloudflare et les services concernés pour pointer sur la destination. Les sessions existantes peuvent devoir être renouvelées. Vérifier les parcours réels après bascule.

Conserver la source et sa configuration. Un retour arrière après de nouvelles écritures sur la destination nécessite de traiter ces nouvelles données, pas seulement de remettre les anciennes variables.