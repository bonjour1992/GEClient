# Chantier ti5 — plan et avancement

Demandes du 2026-11-10 : dossier `2026-11-10/` (copie de l'archive `ti5.7z`).
État de chaque point : ☐ à faire · ◐ en cours · ☑ fait et déployé · ❓ question posée.

Trois catégories (README) : **D** données en base · **P** outil de partie ·
**E** éditeur et affichage des données.

## Lot 1 — correctifs rapides de l'outil de partie (P)

- ☑ Zone libre : supprimer la case « contenu caché » (obsolète)
- ☑ Plateau joueur : fragments de relique sans le texte du type
- ☑ Plateau joueur : fragments et faveurs à gauche de la feuille de faction
  (entre commerce et agents usés) ; réserve sous les agents, barre continuée
  à gauche, à côté du verso de la feuille ; supprimer « autres agents »
- ☑ Réserve : icône de faction pour les unités liées à une faction
- ☑ Vote : bouton « réinitialiser le décompte » + remise à zéro au nouveau tour
- ☑ Espace : unités entourées de blanc
- ☑ Espace : systèmes en combat entourés de rouge (jaune si le combat ne me concerne pas)
- ☑ Trêve : bouton dans la fiche du système à la place du Ctrl + clic
  (rouge grisé hors phase ou sans diplomate, mais utilisable)
- ☑ Combat : touche sur « valeur ou moins » ; bonus / malus manuels de valeur
  et de nombre d'attaques

## Lot 2 — combat et confort de l'outil de partie (P)

- ☑ Combat en 4 phases : frappe en premier, dégâts, autres attaques, dégâts
- ☑ Dégâts appliqués par celui qui les reçoit, selon le ciblage ; surplus au
  ciblage suivant, perdu sinon
- ☑ Unités neutres : dégâts automatiques (moins résistantes d'abord, une unité
  finie avant la suivante)
- ☑ Réordonner sa main, ses éléments actifs, la table
- ☑ Plateau général, tout en bas : rechercher une carte parmi tout, l'afficher en popup
- ☑ Remplacements : commerce / inf / res sans chiffre → icône vide ; rech
  (+ regen, respa…) 1 px plus haut

## Lot 3 — tokens, agents, miniatures (D + P)

- ☑ Token rond « signal » (Nomade), logo de la feuille de tech signal
- ☑ Token de trêve à créer ; il remplace les marqueurs de trêve du plateau général
- ☑ Agents : champ « réimplémente » ; un agent de base recruté devient celui
  de la faction (Winnu : diplomate de Winnu ; Arborec : logisticien → généticien) ;
  recrutement impossible sans cette version ni son réimplément
- ☑ Miniatures d'unité : copies recadrées des images, utilisées à la place
- ☑ Éditeur : « lié à » accepte les factions neutres

## Lot 4 — affichage et éditeur de données (E)

- ☑ Feuille de faction : couleur secondaire (picker) ; principale pour noms et
  stats, secondaire pour bordures, compteur de tour, ligne du verso
- ☑ Faction : verso dans le cadre en haut à droite, picture de faction à sa gauche
- ☑ En-tête sur petit écran
- ☑ Onglet explication : défaut de synchronisation (vide ou celle de la page d'avant)
- ☑ JSON de l'élément : bloc repliable, replié par défaut
- ☑ Auteur et date de modification en haut de page
- ☑ Nom comme affichage de chaque type, utilisé par la recherche ; icône de
  faction / mercenaire / technologie devant le nom, cohérent avec la partie
- ☑ Bibliothèque d'images : chargement très lent

## Lot 5 — données existantes (D)

- ☑ Fautes d'orthographe (sans rallonger les textes)
- ☑ Éléments multiples `!30!` : champ dédié + page d'impression
- ☐ Préfixes `!xxx!` : les supprimer si les données les représentent, sinon proposer

## Lot 6 — plateaux (P)

- ☑ Technologie : poser une technologie sur une case vide d'une feuille ; elle
  fonctionne et s'affiche comme une technologie imprimée
- ☑ Systèmes secondaires : cadre sous l'espace, hors du plan central (accès par trous de ver)

## Lot 7 — clarté de l'interface (P)

- ☑ Boutons gris (action simple), verts (effet du jeu utilisable), rouges
  grisés (effet du jeu hors conditions : confirmation qui explique) ; mêmes
  couleurs dans le journal ; aussi pour les clics et Ctrl + clics
- ☑ Messages d'erreur non bloquants (ex. plus d'infanteries que la capacité) ;
  proposer d'autres cas

## Lot 8 — implémentation partielle des règles (P)

- ☑ Scripts sur action construite (modifient l'action, message orange) et
  scripts qui ajoutent un bouton à la fiche d'une carte
- ☑ Outil : liste des scripts, carte liée, version à l'écriture, version
  actuelle, case « désactivé » pour toutes les parties
- ☑ Début de partie : système et unités de départ en éléments actifs ; bouton
  « mise en place » (système de départ libre au hasard, unités posées)
- ☑ Scripts de mise en place des factions actuelles (Winnu…)
- ☑ Script de mise en place des événements (bouton de la fiche)
- ☑ Réductions du coût de recrutement (technologies ; Nomade et mercenaires)
- ☑ Tableau technologies / habilités / unités : implémenté (oui / non / partiel), diagnostic

## Lot 9 — nouvelles factions (D)

- ☑ Fantômes de Creuss (systèmes, technologies, promesse, mécha, agents, unités, token)
- ☑ Virus de Nekro (drones, infiltration, désolation / dévastation, technologies)

## Lot 10 — déplacement (P) — en dernier, sur une version de test

- ☑ Activation (Ctrl + clic), départs, sélection des vaisseaux, chargement,
  flottes et agents, trajet glissé, dépassement signalé, blocages, trous de ver
- ☑ Validation par Loïc avant fusion dans la version principale

## Questions en attente (2026-11-10, après les lots 1 à 9)

1. **Lot 10, déplacement** : il doit se coder « sur une version de test ». Rien n'est
   commité à ce jour. Il faut donc (a) l'accord pour commiter et pousser l'état actuel
   sur main, puis une branche `deplacement` dans les deux dépôts ; (b) dire où tester :
   serveur local (ports 5174 / 8501) ou second site déployé à côté du principal.
2. **Préfixes de texte** (`!arborec!`, `!hacan!`, `!merc!`…) : ils distinguent les
   homonymes dans les listes déroulantes de l'éditeur (« Cuirassé » ×4). Proposition :
   afficher « nom — faction » dans ces listes d'après le type de lien, puis retirer les
   préfixes (61 éléments sur 75 sont déjà représentés par leur type de lien ; restent des
   planètes sans nom affiché — « !Ruine! », trous de ver —, 3 technologies et 2 erreurs de
   lien à corriger : unit#849 !mentak!Infanterie liée à Jol-Nar, techsheet#848 sans lien).
3. **Préfixes `!N!`** : le champ exemplaires est renseigné ; le préfixe est gardé tant que
   geserver n'est pas redémarré. Ensuite : `node migrate-exemplaires.mjs --retirer-prefixe`.
4. **Nekro, feuille génétique** : lue comme la feuille propre à Nekro (petit format, bombe
   bactériologique + gaz) ; la feuille génétique commune n'a pas été touchée.
## Notes d'avancement

- 2026-11-10, lot 1 : fait, testé en partie de test, déployé
  (`index-D7UqzPsy.js`). geserver à redémarrer (action `reinitialiserVotes` :
  sans cela « Nouveau tour » est refusé). Choix faits : « Agents hors feuille »
  n'apparaît que non vide ; zone libre toujours consultable ; trêve sans
  diplomate : rien n'est détruit ; dé du combat non relancé par un ajustement.
- 2026-11-10, lot 2 : fait, testé en partie de test, déployé. Combat en 4 phases
  (étapes 0 / 1 / 2 inchangées), « ✹ Encaisser » par le joueur visé, neutres
  d'office ; rangement par glisser (avant / après) ; recherche de carte ;
  icône vide pour #res / #inf / #com sans nombre ; carrés de recherche + 1 px
  (8 remplacements modifiés en base, script migrate-rech-1px.mjs, --retirer
  pour revenir en arrière). geserver à redémarrer (deplacer avant / apres).
- 2026-11-10, lot 3 : fait, testé, déployé. Tokens #859 Signal et #860 Trêve ;
  agents 147, 422, 426, 468 : champ reimplemente ; action remplacer (etat.js) ;
  miniatures dans server/public/ti/unit_mini ; champ type de lien ajouté à la
  faction neutre (lecture de « ajouter lié à aux factions neutres »).
- 2026-11-10, lot 4 : fait, testé, déployé. Faction : color2, picture (7 factions
  renseignées) ; contexte de couleurs passé aux unités et habilités ; Affichage.jsx
  refait (auteur, date, JSON replié) ; explication remise à zéro pendant le rendu
  (games.jsx) ; en-tête sur deux lignes sous 800 px ; affichage « nom » commun
  (Component/Nom.jsx) et recherche de l'en-tête refaite ; vignettes de la
  bibliothèque dans server/public/_vignettes (152 images > 200 Ko).
- 2026-11-10, lots 5 à 7 : déployés. Lot 5 : 949 corrections orthographiques
  (312 éléments, 68 remplacements ; trace dans corrections-orthographe/) ; champ
  exemplaires renseigné pour 30 éléments, préfixe !N! GARDÉ tant que geserver
  n'est pas redémarré (ensuite : node migrate-exemplaires.mjs --retirer-prefixe) ;
  préfixes de texte (!arborec!…) : proposition faite, en attente de décision.
  Lot 6 : technologie posée, systèmes secondaires (hex:1000+). Lot 7 : BoutonRegle,
  confirmerRegle, journal vert / rouge, avertissement de capacité.
- 2026-11-10, lots 8 et 9 : déployés (index-DZbuH1_I.js). Lot 8 : engine/scripts.js
  (10 scripts), outil /GE/ti5/tools/scripts, élément reglage #861, mise en place en
  éléments actifs + bouton (MiseEnPlaceJoueur.jsx), bouton d'événement (ScriptsCarte.jsx) ;
  tableau d'implémentabilité : implementabilite.md. Lot 9 : Fantômes de Creuss (faction
  #862, porte #865, natal #864, remplacement #tvd) et Virus de Nekro (faction #880, type
  de technologie infi, remplacement #reinfi, tokens Dévastation et Infiltration).
  geserver à redémarrer : miseEnPlace.js et etat.js ont changé.
- 2026-11-10 (suite) : main commité et poussé (client 032b25a, serveur b437b2c).
  Lot 10 : branche locale `deplacement` du dépôt client (commit 1d18fee, non poussée,
  non déployée) : engine/Deplacement.jsx + raccord dans Espace.jsx. Testé sur le
  serveur local (5174 / 8501). EN ATTENTE DE VALIDATION par Loïc avant fusion dans main.
  Attention : le dossier E:\GE\client est sur la branche deplacement ; revenir sur main
  (git checkout main) avant tout build de production si la branche n'est pas fusionnée.
- 2026-11-10 (fin) : déplacement validé par Loïc, fusionné dans main, déployé
  (index-B5qRJu1x.js) et poussé (client 12762f3). Branche deplacement supprimée.
  Restent ouverts : préfixes de texte (proposition à valider), retrait des préfixes !N!
  après redémarrage de geserver, limites du déplacement (hyperlanes, astéroïdes, règle
  exacte du blocage, transports avec le logisticien).
- 2026-11-10, 20 h 40 : geserver redémarré par Loïc (20 h 33). Préfixes !N! retirés des
  30 noms (champ exemplaires seul désormais) ; partie de test : mêmes comptes qu'avant
  (53 tuiles en pioche, 55 agendas, 21 reliques, 49 mercenaires, 13 promesses). Reste
  ouvert : préfixes de texte (!arborec!…), proposition à valider.
- 2026-11-10 (soir) : préfixes de texte retirés (72 noms ; migrate-prefixes.mjs), listes
  « nom — faction » (champ `lie` de la recherche du serveur, lib/store.js `nomDeListe`),
  planètes à nom masqué (`nomCache`). Ce plan et le tableau d'implémentabilité sont
  désormais dans le dépôt client (doc/). Corrections (migrate-corrections-soir.mjs) :
  scientifique de base #907 (créé par Loïc) repris par toutes les factions sauf le
  Nomade (#2, lié au Nomade) et Arborec (#426) ; Creuss : plus d'habilité « Matière
  instable », Dock #908 et Système de défense #909 à 5, Forge du vide à 3 ; icônes
  dédiées /ti/token/signal.svg et /ti/tech/I.svg (infiltration : feuille, token, type
  de technologie). Un script de mise en place par événement (agendas dans les lois à
  venir) ; sélecteur de l'éditeur en liste filtrable aux noms de la recherche
  (Component/NomElement.jsx) ; agents au-dessus de la main. Déployé, poussé (136fbb3).
- 2026-11-10 (nuit) : blocage du déplacement refait, case par case (engine/Blocage.jsx),
  directement sur main à la demande de Loïc ; onglet Combat renommé Conflit. Choix faits
  sans consigne : les neutres bloquent par défaut (tout joueur peut changer leur choix) ;
  les unités militaires du joueur déjà sur la case aident d'office ; l'évaluation
  commence à la case de départ et ne se fait pas à l'arrivée ; une rupture franchie
  donne toujours +1 mouvement ; un camp qui n'a pas répondu compte comme une abstention
  si le joueur passe outre (bouton rouge gris). Aucun changement côté serveur.
  Reste ouvert : hyperlanes, astéroïdes, contrôle autre que 1 par unité, « Porte de
  Creuss » visible dans la réserve de tuiles spéciales de toutes les parties.
- 2026-11-11 : scripts d'effet de technologie (sorte « effet », `aScript`) pour 25
  technologies — 139 à 141, 180, 181, 183 à 190, 194 à 198, 200 à 202, 205 à 208 —
  selon les consignes de Loïc (liste du 2026-11-11) ; chaque script dit s'il crée un
  bouton, modifie un bouton existant ou agit d'office (colonne « Interface » de
  doc/implementabilite.md et de l'outil « Scripts de règles »). Événements : tuiles SIG
  mélangées à la pioche, jets de rébellion. Donnée : Blindage en duranium (#197) vaut
  aussi pour les transporteurs (migrate-blindage.mjs). Choix faits sans consigne :
  Bio stimulant paie 2 ressources (texte de la carte ; la consigne disait « 2 inf ») ;
  « jet de 6 » de Capsule de secours = 6 ou moins sur un dé de 10 ; Brevet : une fois
  par tour, par faction qui recherche et par technologie ; Écoles militaires et Centre
  de coordination : combat spatial seulement ; Récupération compte toutes les unités
  détruites pendant le combat ; la version Hacan de Réparation improvisée (#419) a le
  même bouton. Aucun changement côté serveur.
- 2026-11-11 (suite) : technologies au type de lien (55 technologies de faction ou
  d'événement liées d'après leur feuille, plus de case « spéciale » ni de préfixe
  « hacan: » ; migrate-tech-lien.mjs) ; mercenaire « Ilyane Vorsk — Unioniste » (#910)
  et plateau « Random 2 joueurs » (#911 : triangle de 33 cases, départs et Mecatol à 4
  cases les uns des autres ; migrate-unioniste-plateau.mjs) ; hyperlanes (hyperlane.js) ;
  conflit de contrôle à la prise de possession (Controle.jsx) ; notifications du
  navigateur (Notifications.jsx) ; mots-clés d'unité dans doc/implementabilite.md.
  Choix faits sans consigne : l'« agent unioniste » est un mercenaire (les seuls à avoir
  nom et titre) ; le conflit de contrôle ne s'ouvre que si un autre camp a des unités
  militaires sur la planète, le demandeur soutient d'office, les neutres s'opposent ;
  « Revendiquer » n'ouvre pas de conflit ; l'hyperlane en X ne relie pas ses deux
  traits, la patte d'oie relie ses quatre branches ; les notifications ne partent que
  si la page n'est pas au premier plan.

## Chantier « toutes les technologies » (consignes du 2026-11-11, soir)

Consignes de Loïc : `E:\GE\demandes-ti5\2026-11-11\instructions-technologies.txt` (une ligne par
technologie ou mécanique ; une technologie sans ligne se fait comme le tableau le proposait ;
**rien après la 419**). Lots, cochés quand ils sont testés, déployés et poussés :

- ☑ Lot A — effets simples : données (ligne « explorer » retirée des scientifiques, Dock :
  `#prod` = capacité logistique) ; 218 Exploration réservée à qui a la technologie ; 211 Pillage
  à la prise de possession ; boutons du plateau 210 Université, 213 Réseau de commerce, 214
  Extorsion, 237 Micro-téléporteur ; déplacement 233 Moteur à gravité, 234 Stratégie de saut, 236
  Camouflage (`#furtif`, `#deplfurtif`), 238 Stargate, 239 Moteur FTL ; combat 192 PC, 231
  Cartographie, 244 Bouclier amplifié, 252 Stratégie dominante, 253 Avantage aérien ; vote 247
  Réseau d'ingérence (scientifique posé sur le plateau de vote), 251 Argumentation véhémente
  (interface de vote, résultat immédiat) ; 245 Cuve de clonage (mobilisation) ; 217 Rayon
  tracteur et valeur de contrôle (`#con`) dans le blocage et les conflits de contrôle.
- ☑ Lot B — production : 191 capacité logistique (taille de flotte, production du Dock) ; mode
  production (Ctrl + clic sur un élément à `#prod` : marqueur d'activation, bandeau « production
  en cours … 1/3 », réserve en rouge pour ce qui n'est pas productible, « Terminer ») ; 193 IA
  industrielle ; capture (une unité capturée glissée en production donne mon unité équivalente,
  sans coût, et retourne dans la réserve de son propriétaire).
- ☑ Lot C — commerce et agents : livraison commerciale depuis la fiche d'une unité à `#livr`
  (comptoir dans le système, choix de la faction) ; 216 Science intégrée et 269 Commerce
  profitable à la livraison ; 270 Connexion (fenêtre quand un agent est utilisé) ; 212 Propagande
  (fenêtre au gain d'infamie).
- ☑ Lot D — conflits : canons spatiaux (liste de mes canons accessibles avec leur distance,
  tirer = amiral usé + marqueur d'activation ; 235 et 248 pour la portée) ; conflit résolu gardé
  jusqu'à la fin de la phase, avec 250 Grappin de capture ; 182 Bombe bactériologique (dégâts
  verts) ; 242 Médecine.
- ☑ Lot E — 232 Exploitation du vide (conflit de domination par système vide disputé, entretien
  bloqué tant qu'ils ne sont pas résolus) ; 246 Drain spatial dans le cadre de blocage ; 209
  Archéologie (fouille : 2 fragments, en garder un ; bouton pour piocher un plan).
- Non faits, et pourquoi : 273 Exploitation de masse et 274 Enrôlement (ils modifient l'action
  « Esclaves » de Kabal, qui n'existe pas dans l'outil).
- 2026-11-11 (nuit) : les cinq lots sont faits, testés en partie de test, déployés et
  poussés (commits 4643439, 9797111, b802511, 62904f8, puis le lot E). Choix faits sans
  consigne : une unité capturée = une unité d'un autre joueur dans mes éléments actifs ;
  « supprimer » une unité la renvoie dans la réserve de son joueur (comportement
  existant), donc une frégate « dépensée » y retourne ; conflit de domination : chaque
  camp soutient le sien par défaut, les neutres le leur ; Drain spatial : 1 ressource par
  vaisseau et par joueur qui l'exige ; Archéologie : le second fragment est tiré du sac ;
  Connexion ne vaut pas pour les agents du déplacement assisté ; Réseau de commerce : deux
  boutons de conversion (les paiements ne prennent pas l'autre ressource d'office).
  Non testés un par un à l'écran : dégâts verts de la Bombe bactériologique, Stargate,
  Stratégie de saut, Camouflage au combat, Canon et Laser longue portée, Cuve de clonage,
  Réseau d'ingérence, Pillage, paiement du Drain spatial par le joueur qui se déplace.

## Lot « partie 2 » (consignes du 2026-11-11, `demandes-ti5/2026-11-11/instructions-partie-2.txt`)

- ☑ Nomade : au lancement, un joueur ne possède que les planètes de son système natal liées à
  sa faction ; Arcturus (#783) n'est plus liée (données) ; la mise en place pose un négociant
  sur l'Anneau Arcturus.
- ☑ L'événement du tour 1 est caché au départ.
- ☑ Déplacement assisté : « Finir le déplacement » (vert dès qu'un vaisseau est déplacé), départ
  masqué tant qu'aucun système n'est activé, pions des vaisseaux (dégâts, unités embarquées),
  « Charger » par planète avec glisser-déposer sur le vaisseau.
- ☑ Semi-blocages : ouvrir un combat sans unité dans le système ; prendre possession et
  revendiquer hors de la phase de revendication ; mobiliser sur les planètes seulement.
- ☑ Systèmes secondaires : bande de 12 colonnes × 3 lignes (lignes réglables).
- ☑ « Mes agents » : un pion par type d'agent, toujours.
- ☑ Le drapeau (planète ou station possédée) compte comme une unité dans le système.
- ☑ Stations : prise de possession avec l'agent adapté posé dessus, conflit de contrôle spatial.
- ☑ Revendiquer : conflit d'accord quand d'autres camps ont des unités militaires dans le système.
- ☑ Technologies : cadre vert des technologies acquises (éditeur et partie) ; zone « Éléments
  posés sur les technologies » retirée ; cadre « Recherche du tour ».
- ☑ Recrutement mis en place à « Nouveau tour » ; plus aucun bouton (le rattrapage a été retiré).
- ☑ Production : pose hors système signalée, échec faute de ressources non compté, stations et
  planètes à `#prod` (« Produire ici »), logisticien utilisé.
- ☑ Construction : case « Construction », non-structures grisées, doublons signalés, logisticien
  utilisé ou dépensé et planète activée automatiquement.
- ☑ Vote : case = utilisé, 1 voix ; carré de droite = dépensé, 2 voix.
- Choix faits sans consigne : le conflit d'accord consulte les camps qui ont des unités
  **militaires** dans l'espace du système ou sur la planète (règle de la phase), les neutres
  refusent par défaut et tout joueur peut répondre pour eux ; la revendication se fait dans le
  coup du dernier « Accepter » ; le drapeau ne compte pas pour ouvrir un combat ; station sans
  type : aucun agent posé ; station « spéciale » : agent au choix ; construction dans l'espace :
  un logisticien utilisé par structure ; « Finir le déplacement » ne compte que les vaisseaux
  déplacés avec l'assistant.
- ☑ Complément : « Revendiquer » une station (use un diplomate et pose l'agent adapté) ;
  l'agent présent est rendu au possesseur précédent ; Canon ancien (#27) et Canon restauré
  (#30), seules stations sans type, sont devenus des stations militaires (données,
  `demandes-ti5/migrate-canons-stations.mjs`).
- ☑ Complément : bouton « Abandonner » (phase de revendication) — retire le drapeau, la carte
  quitte les éléments actifs, l'agent d'une station revient dans les agents usés.
- ☑ Complément déplacement : « Annuler l'activation » tant qu'aucun vaisseau n'est déplacé ; un
  déplacement à la fois (seconde activation signalée) ; « Finir le déplacement » clôt les
  activations (marque `fini`, le marqueur reste) ; trajet en flèches sur la carte.
- ☑ Complément vote : secret du vote — pendant la phase de vote, placements sur le plateau de
  vote et ajustements de voix restent dans un coup local (navigateur), envoyé avec la révélation
  quand tous les joueurs sont prêts.
- ☑ Complément recherche : journal de recherche du tour par phase (effacé en fin de tour),
  recherche de connaissance (clic sur la grille d'une feuille), prérequis d'une technologie
  semi-bloquant (niveaux de connaissance).
- ☑ Scripts des planètes, des unités et des habilités (quand c'est nécessaire) : revenus de
  phase, boutons d'action, règles automatiques ; règle par défaut des habilités (feuille de
  faction ou éléments actifs : cette faction ; table : toutes ; système : rien). Ce qui est
  ambigu ou trop lourd est marqué « (passé) » dans `implementabilite.md`.
- ☑ Pillage (#pill) : l'auteur de chaque dégât est gardé sur l'unité touchée ; à « Retirer », le
  camp du dernier dégât gagne le pillage s'il a une unité dans le système (explication du mot-clé
  complétée en base) ; habilités Maître du pillage et Libre échange.
- ☑ Planètes (consignes du 2026-11-11 au soir) : canons, Mecatol Rex, Starpoint, Atlas et Cormund
  automatiques, Anneau monde, Relique, Elysium, SR-42, Station de combat, Arcturus, Anneau
  Arcturus. Restent passées : Station de mercenaire, Velnor, Mecatol Rex spécial, Université
  polytechnique.
- ☑ Habilités, second lot (2026-11-11) : Clé de l'empire, Esclaves (et Camp de travail), Fierté,
  Fin de la tempête, Présence de cache, Diplomatie pirate, Rébellion en cours, Milice au cœur du
  pouvoir, Sans influence, Infiltration. Passées (difficiles ou pas claires) : Vente au Bazaar,
  Mandat, Raid, Exécuter / Restituer les otages, Vassalisation forcée, Seigneur, Domination, Aide
  humanitaire, Mouvement pirate, Péage aux frontières, Offre d'asile, Cache, Distorsion
  gravitationnelle, Combat pirate, Khan (3), Négocier avec les rebelles, Rébellion armée, Armer
  les rebelles, Vote du conclave, Achat de votes, Réfugiés, Entraîner les milices, Enrôlement des
  milices, Essaim de drones.
- ☑ Mercenaires et promesses (2026-11-11) : 11 mercenaires (Doctor Carrina, Xuange, Aktaran, Yvin
  Korduul, Sai Seravus, Ahk Ravin, Artuno, Ta Zern, Sal Gavda, Agnlan Oln, Shipmonger Zsknck) et
  7 promesses (Vassal, Pacte de non-agression, Accord de recherche, Accès aux archives impériales,
  Promesse de vente, Frontière ouverte, Pacte pirate). Les autres sont passés : voir les sections
  Mercenaires et Promesses de `implementabilite.md`.
- ☑ « Utilisable comme » (2026-11-11) : types d'agent à 0 gardés dans « Mes agents », cube noir
  du mercenaire glissé sur un type d'agent, fenêtre de choix à chaque agent utilisé ou dépensé ;
  agent Héritier et relique Noble cryogénisé ; un bouton de combat par mercenaire (Claire Gibson,
  Jace X, Sharsiss, Henry Storcher, Skarvald, So Ata) et Mirik Aun Sissiri sur la fiche du système.
- ☑ Cube des mercenaires (2026-11-11) : un mercenaire utilisé envoie son cube noir dans les agents
  usés ; sans cube sur sa carte il n'est plus utilisable ; l'entretien rend les cubes aux cartes.
  Ahk Ravin : donnée modifiée (`demandes-ti5/migrate-ahk-ravin.mjs`), fenêtre à la fouille.
- ☑ Correctifs (2026-11-11) : Dock (réparation illimitée) — « Réparer » sur la fiche de chaque unité
  endommagée du système en production ; transporteurs déplacés par un amiral ou un logisticien, au choix.
- ☑ Lot « faciles et moyens » (2026-11-11) : 34 scripts — 14 technologies, 5 habilités (réfugiés,
  rebelles), 9 unités, Mecatol Rex (spécial). Les éléments passés et les mécaniques manquantes :
  voir `implementabilite.md` (lignes « non »).
- ☑ Mécaniques de combat (2026-11-11) : raid (combat « Raid », capture des infanteries), furtif au
  combat terrestre, ciblage obligatoire, attaques en plus, annuler une touche, effets de destruction
  (frégate du khan, Armageddon, Camp de travail, Myru Vos, Memoria D), Olivier Dubois, Stratégie
  d'évitement, Prévision des combats. Détail : `combat.md`, « mécaniques d'unités ».
- ☑ Troupe de détournement (2026-11-11) : 3e temps d'attaque (phases 5 et 6 « Dernières
  attaques ») et capture des vaisseaux qu'elle détruit (« Retirer (capturé) »).
- ☑ Factions du fichier ti5.csv (2026-11-18, `demandes-ti5/migrate-factions-csv.mjs`) : 16
  factions « … WIP » créées sur la structure du modèle « template » (#18), avec logo,
  illustration, couleurs, lore, infos de planète et forces ; leurs habilités sont vides (nom
  seul, aucune règle). Les 10 factions existantes reçoivent seulement les infos de planète, les
  forces et le lore quand il était vide. Verso : infos de planète en haut à droite, graphique
  des forces en bas à gauche ; formulaire complété.
- ☑ Pirate Mentak, données (2026-11-18, `demandes-ti5/migrate-mentak-asteroides.mjs`) :
  technologie militaire « Pluie d'astéroïdes » (#941, niveau 4, feuille militaire de Mentak
  case 3), marqueur « Ciblage astéroïde » (#940, `ti/token/ciblage.svg`), habilité « Racket »
  (#942) ajoutée à la faction. Noms choisis faute d'indication ; règles non scriptées.
- ☑ Ravitaillement automatique (2026-11-18) : plus de bouton « Entretien » ; l'entretien de chaque
  joueur part tout seul au début de la phase de ravitaillement (`Entretien.jsx`), avec un compte
  rendu détaillé ligne par ligne (en-tête pendant la phase, Plateau joueur ensuite) ; rattrapage
  rouge gris s'il a été manqué.
- ☑ Scripts manquants (2026-11-18) : Racket (bouton par planète, test de domination, ressources
  prises à la clôture), test de domination ouvrable depuis la fiche d'un système, Exploitation de
  masse, Enrôlement, Vie fructifiante, Adaptation des réacteurs, Stabilisateur de rupture,
  Extraction de la faille, Tempête électromagnétique, Arme bactériologique, Péage aux frontières,
  Cache, Domination, Distorsion gravitationnelle, Débarquement du Khan, Négocier avec les
  rebelles, Rébellion armée, SIG-1 à SIG-4 (signaux tirés à la mise en place), Pluie
  d'astéroïdes (portée 3). Jets de dés des scripts : `tirages` (`ActionsScript.jsx`).
- ☑ Données (2026-11-18) : systèmes de défense à canon « portée 1 », celui de Creuss tire au
  travers des trous de ver (`migrate-sdp-portee.mjs`) ; factions WIP — 4 feuilles de technologie
  par faction, unités de départ du CSV, agents de départ selon les forces ; Empyréens — habilité
  Émanation du vide, promesses Conspirer ensemble et Chemin du vide, système Ténébreuse (nébuleuse,
  planète 3/5), vaisseau amiral Dynamo, technologie Fouille des nébuleuses, Culture courtisane
  débloquée (`migrate-factions-wip-2.mjs`). Graphique des forces : « Infanterie » au lieu de « Sol ».
- ☑ Onglet Décision (2026-11-18) : les choix d'une action s'y ouvrent au lieu d'une fenêtre
  (scripts à `demande`, So Ata, Propagande) ; Recomposition y est une décision durable (jet,
  réussites gardées, vaisseaux produits). `Decisions.jsx`.
- ☑ Combat (2026-11-18) : plus de bouton « Retirer » ; une unité qui a pris assez de dégâts est
  cochée « détruit » (décochable après confirmation), « Terminer le combat » retire les détruites.
- ☑ Cartes restantes (2026-11-18) : Croissance, Contact mercenaire, Calcul de probabilité, Seigneur,
  Vassalisation forcée, Exécuter et Restituer les otages, Aide humanitaire, Station météorologique,
  Émanation du vide, Fouille des nébuleuses (fragment spatial), Achat de votes et Vote du conclave,
  Mandat (transactions, révocation, Mecatol Rex).
- ☑ Données (2026-11-18) : unités de la Néo-peste et de Sardakk N'orr (`migrate-neopeste-sardakk.mjs`).
- ☑ Braises de Muaat (2026-11-18, `migrate-muaat.mjs`) : habilité Physiologie gashlai, Soleil de
  guerre vaisseau amiral (2 de plus en réserve), mini-technologie « Forge d'arme » — type `forge`
  (`ti5Const.js`, `tech.jsx`), remplacement `#reforge`, feuille de 6 technologies, habilité Étude de
  la forge, marqueur Instable. Règles non scriptées.
- ☑ Promesses (2026-11-19) : Redevance de protection, Soutien politique, Concession commerciale,
  Embuscade et Pupille de l'empire (le donneur répond dans son onglet Décision), Protecteur de
  l'empire (boutons du combat, cumul détenteur + Winnu), Commerce d'esclave (jet au combat
  terrestre, capture et dette), Partage de technologie (marqueur sur la technologie), Tuteur des
  réfugiés, Passage de Creuss et Navigation delta, Chemin du vide, Conspirer ensemble (+1 voix dans
  le décompte des votes, `decompteVotes`, `Vote.jsx`).
- ☑ Promesses de faction à la main de départ, tous les exemplaires (2026-11-19,
  `migrate-promesses-depart.mjs`) : Volée — Vassal ×5, Embuscade ×3 ; Kabal — Commerce d'esclave
  ×2 ; Jol-Nar — Partage de technologie ×6 ; Winnu — Concession commerciale et Accès aux archives
  ajoutées. Le nombre suit le champ `exemplaires` de la carte.
- ☑ Review du code : duplication, lots A à E (2026-11-19, `demandes-ti5/review-code.md`) —
  refactoring pur, vérifié lot par lot dans une partie de test, sans changement de
  comportement.
  - **A, fonctions partagées** : `campDe`, `NEUTRE`, `aMot`, `MOTIF_LOGISTICIEN`,
    `MOTIF_NEGOCIANT` (`miseEnPlace.js`) ; `tuileDe`, `esclavesDe`, `possesseurDe`,
    `carteDePlanete`, `nomDuCamp`, `pastilleCamp`, `styleMini` (`Interaction.jsx`) ;
    `lotsDeDes`, `desDeLaReponse` (`effets.js`) ; hook `useUnitesDeFaction` (`sync.js`).
    `effets.js` et `scripts.js` importent maintenant `./miseEnPlace.js`.
  - **B, interface** : `Modale` (6 fenêtres), `Pas` (sélecteur − / +), `CoquePion` (6 branches
    de `Pion`) dans `Interaction.jsx` ; `Bandeau` et tables de l'aide de phase et des cartes
    citées dans `Partie.jsx`.
  - **C, scripts** : `rendrePromesse`, `uneFoisParTour`, `tirageDegat` / `unDegat`,
    `choixDansListe` (9 scripts), `lesPremiers`, `lieuDuTour`, `dansUneNebuleuse`,
    `donneurDe`, constante `DIPLOMATE`. Filet : `demandes-ti5/empreinte-scripts.mjs` compare
    les 310 scripts à leur empreinte (identifiants, cartes, textes, champs).
  - **D, combat** : table `JETS` et `rendreJets` (Médecine, Commerce d'esclave, Memoria D,
    riposte du Khan), `sauver`, `bonusTerrestre`, `userPolitique`, `effacerMarques`.
  - **E, fiche d'un système** : `manque(nom, verbe)`, `mesUnitesSur`, `Natives`,
    `poseSurStation`, `ouvrirControle`, `casesDeVue`, `cadreCarte`, `caseOccupee`
    (`Espace.jsx`).
  - Laissé exprès, faute d'équivalence stricte : les tests de sorte de combat dispersés
    (D2), les expressions régulières de zones et « unités dans le système n » (A3, A7), la
    promesse en jeu et son donneur (A10), les carrés et icônes de `Pion` (B4), Pupille de
    l'empire / Embuscade (C5). Reste aussi la règle des pistes écrite deux fois (`etat.js` et
    `miseEnPlace.js`, côté serveur).
- ☑ Rétrocompatibilité retirée du moteur (2026-11-19, demande de Loïc) : notation à étoiles
  (`capacite`), pillage et production sans parenthèses, `#rep` suivi d'un nombre nu, préfixe
  `!…!` des noms (14 endroits) et nombre d'exemplaires lu dans le nom, ancien booléen
  `special`, ancienne règle des agents cités par deux factions, ancien champ `faction` des
  feuilles, frégate marchande typée « inf », liens sans type, ancien jeton `trêve` (et son
  icône), zone secrète des faveurs, anciennes zones du plateau général, anciens compteurs
  `rechTour` / `rechFait`, libellés morts du journal. Données normalisées avant
  (`migrate-review-s14.mjs` : `#pill(#rerupt(3))`, `#Rep(2)`, macro `#rep` en `after` ;
  `migrate-review-s15.mjs` : `lienType` « commun » écrit sur 165 éléments). `estCommun`
  garde son défaut « commun » pour les types sans ce champ (objectif militaire, événement).
  Non retiré : le mécanisme générique des zones secrètes (`etat.js` et `server/partie.js`),
  plus utilisé mais partagé avec le serveur. Aucune partie supprimée. Review de la
  duplication : `demandes-ti5/review-code.md`.
- ☑ En-tête du site (2026-11-19) : une seule barre en flex, `HeaderBar.jsx` ; les outils du
  jeu (`JeuBar.jsx` : recherche, « Ajouter », éléments supprimés) sont rendus par portail
  dans l'emplacement `slotEntete` passé par le contexte de l'`<Outlet>` ; menus au clic
  (`Menu`) ; sous 700 px, une seule ligne (page courante + retour, boutons en icônes,
  recherche dépliable). Cadre « Connaissance » des feuilles arrondi (`techSheet.jsx`).
- ☑ Lot côté serveur de la review du code (2026-11-19, demande un redémarrage de
  `geserver`) : le serveur tire les D10 de 0 à 9 (`premiereFace`, `etat.js`) et `faceD10`
  disparaît — un dé pas encore lancé se reconnaît à sa marque absente (`faceDe`,
  `effets.js`) ; le mécanisme des zones secrètes `joueur:<u>:secret:<nom>`, que rien
  n'utilisait, est retiré (`etat.js`, `server/partie.js`) ; la règle d'avancée sur une piste
  n'existe plus qu'une fois (`actionsPiste`, dans `etat.js`, que `miseEnPlace.js` réexporte).
- ☑ Dés à 10 faces numérotés de 0 à 9 (2026-11-19, précision de Loïc : le 0 vaut zéro, pas
  dix) : `faceD10` (`effets.js`) appliqué à toutes les lectures d'un D10 — combat, jets
  isolés, blocage, sauvetage, scripts, tirages de début de tour, journal, cadre « Dés » ; le
  serveur n'est pas modifié. Règle « Jet » et macro `#jet` mises à jour
  (`migrate-review-s12.mjs`). Trou de ver oméga, tranché par Loïc : bloqué sur 0 à 3, passe
  sur 4 à 8, passe avec une touche sur 9 — règle de `#tvo` mise à jour
  (`migrate-review-s13.mjs`), l'outil le faisait déjà.
- ☑ Review des données, textes d'unité T1 à T15 (2026-11-19, `migrate-review-s10.mjs` et
  `migrate-review-s11.mjs`, 15 écritures) : texte de carte en style abrégé, détail en phrases
  dans « explication ». Scripts alignés : Camp de travail (2 esclaves dépensés — ceux des
  autres factions d'abord, le choix revenant au destructeur — qui pose 2 de ses infanteries),
  Vaisseau pirate (seuls ses dés à 0 touchent d'abord les vaisseaux de commerce), Vaisseau
  relique (le fragment ancien reste posé sur le vaisseau : réparé, +1 de résistance par
  fragment, `fragmentsPoses`).
- ☑ Technologies isolées (2026-11-19) : cadre « Technologies isolées » de l'onglet Technologie
  (`TechnologiesIsolees`, `TechIsolee`), où une carte technologie hors feuille se recherche
  comme les autres (mêmes compteurs, case 0 de son composant ; `technologiesDe` la compte) ;
  « Envoyer vers… Mes technologies » pour une carte technologie ; les événements « Signal
  capté » (SIG-1 à SIG-4) et « Peste lointaine » (Vaccin, Arme bactériologique) les
  distribuent à chaque joueur (`vers: "joueurs"`).
- ☑ Review des données, suites (2026-11-19, `migrate-review-s9.mjs`, 19 écritures) : jets en
  `#jet(n)` (J1 à J11) ; la faveur du ravitaillement va à qui a la possession d'une de ses
  planètes natales (S21) ; planète #1041 et système #1042 « Haven » (légendaire, culturelle,
  2 / 4), qui compte comme planète natale — règle `haven` dans `Entretien.jsx`.
- ☑ Review des données, propositions validées (2026-11-19, `migrate-review-s8.mjs`, 85
  écritures) : Ashtroth et Université polytechnique en « commun » (systèmes et planètes) ;
  `unitNum` 1 sur quatre planètes à unité native ; macros `#poss` et `#dom` passées en noms
  (« possession », « domination » : « en votre #poss », « la #dom du système », « sous votre
  #con »), `#reforger` (Canon ancien, Portail de repli, Relique, Armageddon conquis) et `#tour`
  (« #tour+3 » affiche « T+3 », dans les agendas et les événements) ; S1 à S24 sauf S21 ;
  réécritures T16 à T49 (promesses, technologies, habilités, agendas, planètes, objectifs
  militaires). Scripts alignés : le Vaccin donne une faveur neutre ; Destin légendaire rapporte
  à la faction qui prend la planète légendaire du Winnu ; Domination parle de possession.
  Restent : T1 à T15 (unités, agents, mercenaires), S21 (faveur du monde natal : contrôle ou
  possession ?), J1 à J11 (jets en `#jet(n)`).
- ☑ Review des données, points 8 à 15 (2026-11-19, `migrate-review-s6.mjs`, 16 écritures, et
  `migrate-review-s7.mjs`, 8 écritures) : images des stations renommées sur le disque
  (`SR042.png`, `SR124.png`, `StationDeCombat.png`, vignettes comprises) ; « Armageddon conquis »
  (#490) ; systèmes « Ashtroth » (#1036) et « Université polytechnique » (#1037), en `special` ;
  événement « Peste lointaine » (#1039) : Vaccin et Arme bactériologique chez chaque faction, Aide
  humanitaire à T, « Bilan de l'aide humanitaire » (#1038) à T+3 — script de mise en place
  `evenement-peste-lointaine` (`vers: "mains"`), le décompte passe sur la carte #1038 et retire
  les deux cartes ; « Signal capté » cite SIG-1 à SIG-4 ; macros `#jet(7)` et `#poss`, règles de
  `#con` et `#dom` complétées ; la phase « Habilité spéciale » devient une règle qui liste les 16
  mots-clés d'unité, et les règles de `#bomb`, `#can`, `#furtif`, `#deplfurtif`, `#prod`, `#indes`
  sont relues. Propositions en attente de validation : `demandes-ti5/propositions-review.md`
  (cartes + unité, contrôler / posséder / dominer, textes peu clairs, jets en `#jet(n)`).
- ☑ Review des données, propositions 1 à 7 (2026-11-19, `migrate-review-s5.mjs`, 32 écritures) :
  système #241 « Ruines spatiales » ; « Frégate du Khan », « Palais du Khan », « Vaisseau
  relique » ; agendas Ostracisme et Subvention en directive ; formule de vote des agendas
  (« Élisez X. », « Élisez X ou votez contre. », « Votez pour ou contre. », « Votez pour … »
  quand on compte les voix par faction ou par option) ; « Vos #diplo& coûtent #inf(1) de moins à
  recruter. » pour les six technologies ; vocabulaire (mouvement, structure, destroyeur,
  transporteur, vaisseau de commerce, résistance) ; macro `#pv` supprimée.
- ☑ Review des données, règles des remplacements (2026-11-19, `migrate-review-s4.mjs`, 50
  écritures) : les 23 règles de macro recopiées par erreur, tronquées ou vides (`#con`, `#fpre`,
  `#raid`, `#comp`, `#fav`, `#infa`, `#prec`, `#res`, `#point`, `#def`, `#aggre`, types de planète,
  trous de ver, phases de production / proposition / revendication, `#gene`) sont réécrites à
  partir des phases et des règles en base (copie d'origine :
  `demandes-ti5/sauvegarde-remplacements-s4.json`) ; ponctuation et espaces de 27 éléments ;
  trous de ver delta et gamma typés « spe » comme les autres (ils étaient « pla » : l'outil de
  partie y proposait bombardement et combat terrestre).
- ☑ Review des données, suites (2026-11-19, `migrate-review-s2.mjs`, 324 écritures) : mot-clé
  `mil` sur six unités neutres ; promesses #228, #370 (Winnu) et #421 (Jol-Nar) liées à leur
  faction ; « technologies de même nom » dans les règles de la phase de science ; en-têtes de
  phase `#Pcom:` ; valeurs et quantités entre parenthèses (le moteur lit désormais `#con(3)` et
  `#livr(5)` là où `#con 3` et `#livr 5` étaient ignorés) ; type `regle` (Jet, Contrôle, Ciblage,
  Application des dégâts) et « Règles générales » dans l'onglet Aide ; données d'unité retirées
  des planètes, agendas, reliques et mercenaires (copie : `sauvegarde-donnees-unite-hors-unite.json`) ;
  `fullfaction` supprimé définitivement (copie : `sauvegarde-fullfaction.json`) ; système
  « Rarron + beta » : trou de ver bêta.
- ☑ Review des données, erreurs sûres (2026-11-19, `migrate-review-s1.mjs`, détail dans
  `demandes-ti5/review-donnees.md`) : Mentak — feuille sociale #858 au départ, Lune noire en
  vaisseau amiral ; Kabal — `departNum` ; Hacan — lien parasite ; tech#192 « PC » supprimée (doublon
  de Centre de coordination, script `pc` retiré) ; textes et noms corrigés ; remplacements `dom` et
  `transac` dédoublonnés. Outils de contrôle : `dump-donnees.mjs`, `controle-donnees.mjs`,
  `controle-structure.mjs`.
- ☑ Cartes reliées au décompte des votes (2026-11-19) : colonne « Conclave » (voix du jet « Vote du
  conclave », ajustables), Soutien politique (loi et vote annoncés dans l'onglet Décision, « régler
  d'après le décompte »), Z'eu (X commerce → X voix), Harrugh Gefhara (commerce en quittant la phase
  de vote), Ilyane Vorsk (compte comme un politicien, +1 voix par faction du même vote
  majoritaire). Les scripts d'action acceptent `demandes`, une suite de décisions.
- ☑ Braises de Muaat, règles simples (2026-11-19) : Physiologie gashlai, Réacteurs solaires, Coque
  stellaire, Armement solaire, Étude de la forge.
- ☑ Issues GEClient #4, #5 et #6 (2026-11-18) : `#img[…]` accepte les apostrophes (`Text.jsx`) ;
  description de la planète natale dans l'éditeur de texte ; Nekro — logisticien propre sans
  mobiliser, habilité Essaim de drones retirée et supprimée (`migrate-nekro-logisticien.mjs`).
- ☑ Issues GEClient #2 et #3 (2026-11-18) : unités de base dans la réserve neutre ; ni
  bombardement ni combat terrestre sur un satellite ou une planète spéciale (rouge gris) ;
  un seul bombardement par unité et par tour. Verso de faction : illustration, système et
  infos de planète côte à côte. Détail : `combat.md`, `structure.md`.
- ☑ Décisions, exploration, événements (2026-11-20) :
  - plus de fenêtre du navigateur pour une question : tout passe par `demande.js` (`demander`,
    `confirmer`) et s'ouvre dans l'onglet Décision, qui s'affiche tout seul — agent de base ou
    remplaçant, Bio stimulant, Connexion, Science intégrée, Ahk Ravin, confirmations, propositions
    piochées, carte face cachée (révéler ou consulter). Le coup part une fois la décision prise ; les fenêtres (`Modale`) se masquent
    pendant la réponse. Seule exception voulue : la confirmation d'un élément semi-bloqué
    (`confirmerRegle`, rouge gris) reste un `window.confirm` ;
  - une décision en attente semi-bloque « Joueur suivant » et « Passer » (rouge gris) ;
  - exploration : tout joueur explore avec un logisticien et un scientifique ; la technologie
    « Exploration efficace » (218) n'en use qu'un, au choix ; la tuile explorée porte la marque
    `explore` ;
  - événements : section « Événements » de `implementabilite.md` ; Signal capté pose ses
    fragments sur les systèmes explorés, Rupture de l'espace-temps pose Akhenar, les failles,
    leurs Nefs et les trous de ver oméga tirés au sort, « Faire arriver le grand Khan » sur la
    fiche de la faction neutre ; Recrudescence de la piraterie pose aussi ses pirates sur les
    nébuleuses (texte de la carte modifié, `migrate-piraterie-neb.mjs`).
- ☑ Paramètres de départ et infos de la partie (2026-11-20) : le lancement garde dans
  `etat.depart` le plateau, les joueurs, les cases natales et les systèmes posés
  (`miseEnPlace.js`, côté serveur) ; bouton « Infos de la partie » de l'en-tête (`InfosPartie.jsx`,
  une fenêtre : gestion, pas décision), qui porte « Supprimer la partie ». Signal capté en
  déduit les systèmes explorés (`systemesExplores`) : plus de marque `explore`. Le grand Khan
  arrive dans un système non spécial (texte de la carte modifié, `migrate-khan-non-special.mjs`).
  Une partie lancée avant n'a pas ces paramètres.
- ☑ Revue des scripts « à revoir » (2026-11-20) : 250 scripts sur 209 cartes changées depuis leur
  écriture (réécriture aux conventions, type de lien, caractéristiques d'unité sorties des planètes
  et des mercenaires, images renommées). Seul changement de règle : le mot-clé « Reforger » (à la
  phase de science, un scientifique dépensé et les fragments de la carte) — « Forger la relique »
  dépense maintenant un scientifique, « Restaurer le canon » et le scientifique d'Armageddon conquis
  sont à la phase de science. Libre échange suit le texte (vaisseau de commerce non militaire).
  Tous les `ecritLe` sont à la version actuelle (`demandes-ti5/scripts-pas-a-jour.mjs --marquer`,
  `scripts-tri.mjs` pour trier les changements de texte).
- ☑ Agendas du tour (2026-11-20, `engine/Agendas.jsx`) : le texte de la loi est lu sur la carte. « Révélez
  3 objectifs militaires / un mercenaire / une relique » (en tête du texte) : les cartes sont piochées
  à l'arrivée en phase de mandat (`changerPhase`) et posées à côté de la loi dans l'onglet Vote (zone
  `general:revele:<id de la loi>`), avec un bouton de rattrapage. « Élisez une planète / un système » :
  une décision durable par faction, de la phase de mandat à la fin du vote
  (`agenda:<tour>:<ligne>:designe:<joueur>`) ; pastilles à la couleur de la faction à côté de la loi.
  Le vote et l'application de la loi restent à la main.
- ☑ Portail de repli et Reforger (2026-11-20, choix de Loïc) : le mot-clé Reforger vaut à la phase de
  science sauf si la carte donne une autre phase, une seule fois par élément, et l'élément reforgé compte
  comme une relique forgée. Le Portail de repli, structure spatiale (mots-clés struc + space), se reforge
  à la phase de construction au lieu de se construire (`migrate-portail-reforger.mjs`). Outil : en mode
  « Construction », glisser le portail vers un système dépense un scientifique et 2 fragments spatiaux
  et donne 1 point, sans logisticien (`payerProduction`, `REFORGE_PORTAIL`). Relique et Canon ancien :
  bouton masqué une fois reforgés. Non essayé à l'écran (le glisser n'a pas pu être simulé).
- ☑ Construction et contrôle (2026-11-20) : construire demande le contrôle du lieu (phase de construction,
  règle « Contrôle » #1033). `payerProduction` demande une confirmation si je n'ai rien sur place, ou si
  mon contrôle ne dépasse pas celui des unités militaires des autres camps (l'opposition se déclare :
  l'outil ne la connaît pas). Règle précisée par Loïc : le contrôle est exigé dans tous les cas, plus
  une unité ou la possession. Planète : les unités qui s'y trouvent, plus 2 pour sa possession (ajouté
  à la règle #1033 et aux mots-clés #con et #cons : `migrate-possession-controle.mjs`,
  `migrate-cons-controle.mjs`). Système : vaisseaux et structures spatiales ; la possession d'une de
  ses planètes compte comme présence, pas comme contrôle.
- ☑ Conflits de contrôle et possession (2026-11-20, `Controle.jsx`, `Espace.jsx`) : la faction qui
  possède la planète entre dans le conflit avec 2 de contrôle, même sans unité (pas pour une station :
  contrôle spatial) ; « Prendre possession » ouvre le conflit dès qu'une autre faction possède la planète.
- ☑ Règle générale des tests de contrôle (2026-11-20, précisée par Loïc ; `evaluerControle`,
  `Controle.jsx`) : s'opposer est un choix et des effets peuvent changer le contrôle, donc un conflit de
  contrôle s'ouvre — sauf si aucune autre faction ne peut participer, ou s'il n'y a que des neutres que
  l'on dépasse. Appliquée à la prise de possession (planète, station) et à la construction : un conflit
  « pour la construction de … » s'ouvre (`controle:<case>p<k>:motif`, k = 99 pour l'espace) ; « Contrôle
  acquis : construire » le clôt et permet de construire là jusqu'à la fin de la phase
  (`controleAcquis:<case>p<k>:<joueur>`), en glissant de nouveau la structure. Reste à faire : les
  cartes qui demandent le contrôle sans le vérifier (Complexe de guerre, Exploitation des tempêtes,
  Mandat… : `demandes-ti5/scripts-controle.mjs`).
- ☑ Revue du système de contrôle et de domination (2026-11-20, demande de Loïc) :
  - un seul calcul, `engine/regleControle.js` (`campsDeControle`, `evaluerControle`) : test préalable
    d'une action, affichage d'un conflit de contrôle et d'un conflit de domination passent par lui ;
  - toute action qui exige le contrôle passe par `demanderControle` (`Controle.jsx`) : si un conflit
    doit trancher, il s'ouvre en disant pour quelle action (prise de possession, construction de X,
    « nom du script »), l'action part quand le demandeur conclut « Contrôle acquis », et n'a pas lieu
    (rien n'est dépensé) s'il renonce. Page rechargée entre-temps : le contrôle reste acquis ici pour la
    phase (`controleAcquis:…`), il suffit de refaire l'action ;
  - construction (`payerProduction`) et boutons de carte (`ActionsScript.jsx`, champ `controle` :
    "systeme" ou "planete") utilisent ce chemin ; la prise de possession garde son bouton dans le conflit ;
  - conflit de domination : la carte qui l'a demandé est dite (`domination:<case>:motif`), sinon
    « Racket » ou « à la main » ;
  - `unitesDuLieu` : les systèmes de défense (« le #con affecte aussi l'espace ») comptent dans
    l'espace ; Rapport de force (+2) dans les conflits de contrôle et de domination ; contrôle demandé
    par Arme bactériologique, Tempête électromagnétique, Exploitation des tempêtes, Skarvald, Grappin
    de capture ; station : confirmation sans unité dans l'espace ;
  - revue complète (cartes, actions de phase, 21 questions de règles) : `doc/revue-controle.md`.
- geserver à redémarrer : `etat.js` (réinitialisation des votes) et `miseEnPlace.js`
  (lancement : événement caché, planètes natales) tournent côté serveur.
