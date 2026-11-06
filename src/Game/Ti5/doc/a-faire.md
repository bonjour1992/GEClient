# à faire plus tard

Améliorations notées en cours de route, à réaliser plus tard.

## déroulé

Fait : ligne « Recrutement » de chaque tour remplie ; en-tête (mercenaire et plan de relique sur la même ligne, 6 cases
d'initiative dont « chef du sénat »).

## situation de départ : informations qui manquent

Ce que la mise en place fait déjà est décrit dans `structure.md`. Il reste :

- **données saisies par claude d'après les textes de mise en place** (à relire) :
  Musée de l'ère antique (#488, lien « spécial ») dans la main d'Hacan, Winnu,
  Jol-Nar, Volée argentée et du Nomade ; Capteur reforgé (#771, lié au Nomade)
  dans la main du Nomade ; 2 Esclaves (#157) dans les éléments actifs du Kabal.
  Ce que la table ne sait pas exprimer reste à faire à la main au tour 0 :
  Winnu « 6 influence et 6 ressources » et infanterie dans les vaisseaux ;
  Nomade « piocher 4 mercenaires, en garder deux » ; Jol-Nar « Dock sur … SDP
  sur … » (planète précise). Arborec, Mentak : texte de mise en place vide ;
- **votes au conseil** : les cartes « Vote au conseil 1 à 5 » (#798 à #802) sont
  reconnues à leur nom ; le texte « Voter pour obtenir … sièges » du déroulé
  est encore affiché à côté de la carte ; il n'y a pas de carte pour un tour à
  plus de 5 sièges ;
- **position de chaque unité** : la règle appliquée est « vaisseaux dans
  l'espace, le reste sur la planète de départ ». À revoir pour les systèmes à
  plusieurs planètes et les cas particuliers (unité embarquée, autre planète) ;
- **mercenaire acheté** : le cube noir reste posé sur la carte dans les
  éléments actifs (à retirer à la main s'il gêne) ;
- **événements** : révélés par les joueurs à la phase d'événement (indiqué dans
  le champ « Jeu en ligne » de la phase) ;
- **images provisoires** (SVG de claude, dans `server/public/ti/planet/`) :
  Arcturus, Anneau Arcturus, Université polytechnique — à remplacer ;
- **rechercher** : la recherche gagnée s'ajoute à la main dans l'onglet
  Technologie ;
- **fragments** : une partie lancée avant l'ajout du sac de fragments n'en a
  pas : seules les ruines d'un type donné y rapportent un fragment ;
- **combat** : spatial, canons, terrestre et bombardement ont leur
  sous-onglet (voir `combat.md`, avec les choix à confirmer) ; la répartition
  des dégâts selon la règle, le blocage et la portée des canons au-delà de 1
  restent manuels ;
- **vote** : le décompte est fait (`vote.md`) ; l'application de la loi reste
  manuelle, comme demandé ;
- **passage de phase** : il n'y a pas d'échappatoire si un joueur absent n'a
  pas passé, hormis « Phase précédente » et les boutons − / + du tour ;
- **images provisoires des factions neutres** (SVG de claude, dans
  `server/public/ti/neutre/`) : à remplacer ;
- **phases** : le champ « Jeu en ligne » des 20 phases a été réécrit par claude
  après la revue de novembre 2026 (il décrit les outils actuels) ; à relire et
  corriger dans la fiche de chaque phase ;
- **aide** : l'onglet Aide (`Aide.jsx`) montre la consigne et la règle de la
  phase en cours, puis un mode d'emploi en six rubriques ; il est à tenir à
  jour quand un outil change ;
- **réserve d'unités** : les limites par type sont une constante du code
  (`LIMITES_UNITES`) ; mécha et usine sont illimités faute de nombre donné ;
- **factions neutres** : plus tard. Les éléments `neutral` et `setup`
  (« Classique N joueurs », une image) ne sont pas exploités ; seules les unités
  natives des systèmes et planètes sont posées.

## remplacements (à évaluer avant d'implémenter)

Fait (champ `icone` d'un remplacement, colonne « Icône » de l'écran Remp),
activé pour `res`, `inf` et `com` de ti5. À contrôler sur quelques cartes
imprimées.

- Dans les remplacements (`remp`), remplacer « X ressources » par une icône
  avec le chiffre dedans :
    - rond doré pour le commerce ;
    - hexagone jaune pour les ressources ;
    - hexagone bleu pour l'influence.

## revue de novembre 2026 : reste à faire

Sans arbitrage, mais non fait (remaniements sans effet visible, à faire à tête
reposée) :

- une seule règle pour avancer sur une piste (`actionsPiste` de miseEnPlace.js
  et `avancerPoints` de etat.js font la même chose) ;
- une seule recherche de l'ordre d'initiative et du score (Partie.jsx,
  Vote.jsx, Combat.jsx) ;
- un seul schéma « prêt de tous puis lancement » (Combat, Vote, Faveurs) ;
- une table des phases (`phases.js`) au lieu des expressions régulières sur
  le nom de la phase, dispersées dans six fichiers ;
- un composant de fenêtre modale (cinq copies), `nomSansPrefixe` exporté (neuf
  copies de la même expression), un seul `lienValide` ;
- découpe des grandes fonctions (`Partie`, `CombatSysteme`, `miseEnPlace`,
  `appliquer`, `Pion`, `FicheSysteme`, `Fiche`) ;
- limites de cadence (création de parties, sièges, messages de chat) ;
  vérification que la faction d'un siège existe.

Tranché par l'auteur et fait : choix scellé des faveurs, coups tout ou rien
avec précondition, lecture des parties ouverte à tous les comptes (gardée).
Les diplomates d'une transaction sont ceux de celui qui la propose (confirmé
par l'auteur). La face cachée est tranchée : la carte revient à celui qui la cache.
Le mot-clé « Terrestre » a été donné par claude aux 21 unités au sol qui ne
l'avaient pas (Infanterie, Mech, Dock, Usine, Système de défense, monuments…) :
seule une unité « Terrestre » se pose sur une planète. Les textes de mise en
place des factions ne répètent plus ce que la table des éléments de départ
fait. Les feuilles de technologie se choisissent à la main dans la table des
éléments de départ (destination « Feuilles de technologie ») ; les huit
factions ont été initialisées par claude avec leurs feuilles (celle de la
faction par type, sinon la commune). Une faction sans feuille choisie garde
l'ancienne règle automatique.

## engine

Étapes prévues dans `structure.md` et pas encore faites :

- étape 8 : raccourcis de `upgrade.md` — mobiliser, rechercher et fouiller
  sont faits ; restent les clics sur le texte (`#res(2)`, `#use#log`).

Laissé de côté pendant les étapes 1 à 6 :

- factions neutres : pas de plateau joueur pour elles (zones `neutre:<id>:...`
  prévues mais sans écran) ;
- plateaux supplémentaires dus aux événements (zones `carte:<nom>:<i>`) ;
- déroulé : seules les cases du haut reçoivent des marqueurs ; les cases de
  ministère et de siège par tour ne sont pas des emplacements ;
- transport au tactile : poser un pion sur un autre demande la touche Maj ;
- terminer une partie (statut `terminee`) ;
- une partie lancée avant l'ajout du sac d'agents n'a ni sac ni réserve
  d'agents : il faut en créer une nouvelle ;
- essai à plusieurs joueurs réels : le filtrage par joueur n'a été vérifié que
  par des tests automatiques, l'interface n'a été essayée qu'avec un seul joueur.
