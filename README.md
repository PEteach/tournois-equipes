# PEteach Tournois

Application web légère pour organiser des tournois scolaires 1 contre 1 et suivre les classements Elo. Elle fonctionne sans compte, sans Supabase et sans serveur de données distant.

## Fonctionnalités
- Ajout, modification, suppression et import CSV des participants.
- Création de groupes aléatoires ou équilibrés selon la cote Elo générale.
- Génération de tournois toutes rondes (round-robin) par groupe.
- Saisie des victoires, défaites et égalités.
- Cote Elo initiale de 1000 et facteur K configurable.
- Classement général cumulatif entre les sports et classement par sport.
- Historique des variations Elo conservé localement.
- Export et import de sauvegardes JSON.
- Stockage dans IndexedDB.

## Lancer en local
Aucun outil de compilation n'est nécessaire. Depuis le dossier du projet :
```bash
python -m http.server 8000
```
Puis ouvrir http://localhost:8000.

## Déploiement GitHub Pages
1. Dans le dépôt GitHub, ouvrir **Settings → Pages**.
2. Choisir **GitHub Actions** comme source de déploiement.
3. Le workflow `.github/workflows/pages.yml` publie automatiquement le site après chaque mise à jour de la branche `main`.
4. Adresse prévue : https://peteach.github.io/tournois-equipes/

## Données locales
Les données restent dans IndexedDB du navigateur et de l'appareil utilisés. Elles ne sont pas envoyées à GitHub. Elles ne se synchronisent pas entre appareils ou navigateurs. Utiliser régulièrement le bouton **Exporter**. L'importation remplace les données présentes sur l'appareil. Effacer les données du site dans le navigateur peut les supprimer.

## Formule Elo
Pour le joueur A :
`E_A = 1 / (1 + 10 ** ((R_B - R_A) / 400))`
`R'_A = R_A + K * (S_A - E_A)`

Le joueur B reçoit la variation opposée. Chaque match met à jour la cote générale (tous sports confondus) et la cote du sport concerné.

## Limites de cette première version
- Le format disponible est le toutes rondes.
- Les résultats enregistrés ne sont pas encore modifiables depuis l'interface.
- Les données sont propres à un navigateur et à un appareil.
