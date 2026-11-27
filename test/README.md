# Environnement de test — tournois partagés

URL : https://peteach.github.io/tournois-equipes/test/

Cette version est indépendante de l'application principale :
- IndexedDB de test : `peteach-tournois-test`
- IndexedDB de production (lecture seule pour la copie) : `peteach-tournois`
- Supabase de test : projet `tournois-partage-test`, région Canada Central.
- Aucun identifiant secret Supabase n'est livré au navigateur. Les écritures passent par une Edge Function qui vérifie le code.

## Essai sur deux iPad

1. Ouvrir d'abord l'application principale sur le premier iPad, sur le navigateur où les données sont enregistrées.
2. Ouvrir l'URL de test, puis **Administration → Copier les données de la version actuelle**.
3. Ouvrir le tournoi à tester et choisir **Partager ce tournoi**. Copier le code généré.
4. Sur le second iPad, ouvrir la même URL de test, choisir **Administration**, saisir le code et appuyer sur **Rejoindre avec ce code**.
5. Inscrire un résultat sur un iPad et vérifier qu'il apparaît sur l'autre. La vérification automatique se fait environ toutes les 2,5 secondes.
6. Pour tester une autre rencontre, recommencer avec un autre tournoi/code. Le partage actif porte sur un seul tournoi.

Si les données originales sont sur un autre appareil, exporter d'abord une sauvegarde JSON depuis l'application principale, puis l'importer dans l'environnement de test avant de créer le partage.

## Protections et limites du pilote

- Les données de l'application principale ne sont jamais modifiées par l'environnement de test.
- Chaque code donne accès au tournoi correspondant; le code est une clé d'accès à ne pas publier.
- Les écritures utilisent une révision optimiste : deux tablettes ne peuvent pas écraser silencieusement une même version. En cas de conflit, l'appareil perdant recharge la dernière version et demande de vérifier/re-saisir son résultat.
- Internet est requis. Aucun mode hors ligne n'est inclus dans ce pilote.
- La taille maximale d'une sauvegarde partagée est de 900 Ko.
- Le mode partagé est expérimental : valider les résultats sur deux appareils avant une utilisation avec une classe entière.
