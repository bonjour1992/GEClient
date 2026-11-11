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
- geserver à redémarrer : `etat.js` (réinitialisation des votes) et `miseEnPlace.js`
  (lancement : événement caché, planètes natales) tournent côté serveur.
