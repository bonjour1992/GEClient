# structure

Complète `engine.md` (ce que doit faire l'engine) et `component.md` (ce qu'il affiche).
Ce fichier décrit comment c'est construit : modèle de données, actions, API, fichiers.

## décisions

- **Synchronisation** : interrogation périodique. Chaque client demande au serveur
  « quoi de neuf depuis la révision n ? » toutes les 2 secondes environ (plus
  lentement quand l'onglet est caché, tout de suite après un envoi). Si rien n'a
  changé la réponse est `{ rev }` ; sinon c'est l'état filtré complet et les
  derniers coups (pas un différentiel : plus simple et sans risque de décalage).
- **Secret** : filtré par le serveur. Un client ne reçoit jamais le contenu d'un
  composant qu'il n'a pas le droit de voir.
- **Hasard** : géré par le serveur (pioches mélangées, dés).
- **Qui joue** : tout le monde peut envoyer un coup à tout moment. Le joueur actif
  est une indication. Le serveur numérote les coups dans leur ordre d'arrivée.
- **Règles** : l'engine ne valide pas les règles du jeu. Il refuse seulement ce qui
  est techniquement impossible (composant inexistant, composant qu'on ne voit pas).
- **Validation immédiate** : chaque action est envoyée et validée tout de suite. Il
  n'y a plus de coup à préparer puis à envoyer : un coup ne sert qu'à grouper les
  actions d'un même bouton (mobiliser, lancer un combat, appliquer une
  transaction). On corrige par une nouvelle action. L'historique se consulte, il ne
  se rembobine pas.

Conséquence du secret et du hasard : le serveur applique lui-même les coups, il ne
se contente pas de les relayer. Les actions sont donc un vocabulaire fermé (voir
plus bas).

## partie

Une partie passe par trois états : `preparation` → `en cours` → `terminee`.

- **preparation** : le créateur choisit un nom et un élément `plateau`. Chaque joueur
  (un compte GE) ouvre la partie, prend un siège et choisit sa faction et sa couleur.
  Pas besoin de liste des utilisateurs : on rejoint soi-même.
- **lancer** (par le créateur) : le serveur fait la mise en place, voir plus bas.
- Un compte qui n'a pas de siège peut regarder : il ne voit que ce qui est public.

```js
partie = {
    id: 12,
    jeu: "ti5",
    nom: "Partie du samedi",
    statut: "preparation" | "en cours" | "terminee",
    createur: 1,                 // id utilisateur GE
    plateau: 741,                // id de l'élément plateau
    joueurs: [
        { userId: 1, nom: "titou", faction: 57, couleur: "red" },
    ],
    version: 37,                 // numéro du dernier coup appliqué
    etat: { ... }                // voir ci-dessous, jamais envoyé tel quel
}
```

## état

```js
etat = {
    tour: 1,
    phase: "",                   // texte libre ou id d'un élément phase
    joueurActif: 1,              // id utilisateur, indicatif
    anneaux: 5,                  // taille de la carte (spirale, voir hexSpirale.js)
    composants: { "c42": {...} },
    compteurs: { "joueur:1:res": 4 },
    prochainId: 43,
}
```

### composant

Tout ce qui se manipule : unité, carte, tuile système, marqueur.

```js
composant = {
    id: "c42",
    ref: { type: "unit", id: 230 },   // élément GE affiché ; null pour un jeton
    jeton: "",                        // nom du jeton quand ref est null
    zone: "hex:12",                   // où il se trouve
    sur: null,                        // id d'un autre composant qui le porte
    proprio: 1,                       // id utilisateur, ou null
    face: "recto",                    // "recto" | "verso" | "cache"
    marques: { degat: 1 },            // degat, use, rotation, ...
    ordre: 5,                         // position dans la zone (pioche, pile)
}
```

- `sur` sert aux unités transportées, aux dégâts, aux marqueurs de possession des
  mercenaires, aux éléments posés sur une technologie.
- `face: "verso"` utilise l'affichage `verso` de l'élément quand il existe.
- `face: "cache"` : seul le `proprio` voit le contenu (objectif secret posé).

### zones

Une zone est un nom. Son préfixe donne sa visibilité, rien n'est stocké.

| zone | contenu | visible par |
|---|---|---|
| `hex:<i>` | tuile système et unités dans l'espace ; `i` = indice dans la spirale | tous |
| `hex:<i>:planete:<k>` | unités et éléments sur la planète `k` du système | tous |
| `carte:<nom>:<i>` | plateau supplémentaire dû à un événement | tous |
| `joueur:<u>:main` | cartes en main | le joueur `u` |
| `joueur:<u>:reserve` | vaisseaux et unités non déployés | tous |
| `joueur:<u>:actif` | planètes, mercenaires, éléments actifs | tous |
| `joueur:<u>:agents` | agents disponibles | tous |
| `joueur:<u>:agentsUses` | agents usés | tous |
| `joueur:<u>:tour:<t>` | éléments posés sur la case du tour `t` de la feuille (timé, alliances) | tous |
| `joueur:<u>:tech` | éléments posés sur les feuilles de technologie | tous |
| `pioche:<type>` | paquet mélangé | personne (on voit le nombre) |
| `defausse:<type>` | cartes défaussées | tous |
| `general:<nom>` | plateau général = le déroulé : `lois`, `traites`, `regles`, et les cases du déroulé (`mecatol`, `ministre`, `siege`, ...) | tous |
| `neutre:<id>:...` | mêmes zones qu'un joueur, pour une faction neutre | tous |
| `horsJeu` | composants retirés | tous |

Un composant caché est envoyé sans son contenu :
`{ id: "x7", zone: "joueur:3:main", cache: true, dos: "Agenda" }`.
Le type reste visible, comme le dos d'une carte. Son identifiant est anonyme
(`x…`, renuméroté à chaque envoi) : on ne peut pas suivre une carte cachée d'une
zone à l'autre.

Zones du plateau général utilisées par l'interface : `general:table` (cartes
révélées), `general:lois`, `general:traites`, `general:regles`,
`general:objectifs`, `general:promesses` (réserve commune), `general:boite:<n>`
(cases du haut du déroulé).

### compteurs

Valeurs numériques publiques : `joueur:<u>:res`, `joueur:<u>:inf`,
`joueur:<u>:commerce`, et pour la technologie `k` d'une feuille (un composant
de la zone `joueur:<u>:tech`) :

- `joueur:<u>:tech:<composant>:<k>` : nombre de cases de recherche cochées, de 0
  au coût de la technologie (recherche partielle) ; elle est obtenue quand toutes
  le sont ;
- `joueur:<u>:techUse:<composant>:<k>` : 1 = utilisée ce tour.

`tech.jsx` affiche `context.progres` cases cochées quand il est fourni.

Marques utilisées par l'interface : `degat` (nombre), `use` (usé), `rotation`
(tuile système, 0 à 5), `possession` (id du joueur qui contrôle le composant).

## actions

| action | champs | effet | serveur seul |
|---|---|---|---|
| `deplacer` | `c`, `vers`, `sur?`, `ordre?` | déplace un composant (et ce qu'il porte) | |
| `piocher` | `de`, `vers`, `n?` | prend le dessus d'une pioche, ou une carte au hasard dans une main | oui |
| `melanger` | `zone` | mélange une pioche (ex. après y avoir remis la défausse) | oui |
| `des` | `n`, `faces` | lance `n` dés, le résultat est écrit dans le coup | oui |
| `compteur` | `id`, `delta` ou `valeur` | modifie un compteur | |
| `retourner` | `c`, `face` | change la face d'un composant | |
| `marquer` | `c`, `marque`, `valeur` | pose ou retire une marque (dégât, usé, rotation) | |
| `creer` | `ref` ou `jeton`, `zone`, `proprio?`, `n?` | ajoute un composant (unité, jeton, tuile système) | oui |
| `reveler` | `zone` | retourne face visible les cartes posées face cachée dans une zone publique (Ctrl + clic sur la carte) | oui |
| `supprimer` | `c` | envoie un composant dans `horsJeu` | |
| `partie` | `tour?`, `phase?`, `joueurActif?`, `anneaux?` | change l'en-tête ou la taille de la carte | |

Une action sur un composant que l'auteur ne voit pas est refusée, sauf `piocher`.
Il en va de même du porteur (`sur`) : on ne pose ni ne crée rien « sur » un
composant caché (sa zone d'arrivée dirait où il se trouve).

### décisions de l'auteur (novembre 2026)

- **coup tout ou rien** : le serveur essaie un coup sur une copie de l'état ;
  une seule action refusée et rien n'est gardé. Préconditions facultatives :
  `si` sur `compteur` et `marquer` (valeur attendue), `de` sur `deplacer`
  (zone attendue). Elles servent aux achats, au recrutement, au lancement des
  attaques, à l'entretien, à la prise de possession, aux transactions.
- **ordre de jeu** : figé pendant la phase (compteurs `ordre:<rang>`, écrits à
  chaque changement de phase d'après les marqueurs d'initiative). Un marqueur
  déplacé en passant ne compte qu'à la phase suivante.
- **phases** : le décompte n'est une phase qu'au tour 10 ; « Nouveau tour »
  n'est disponible qu'à la dernière phase (et au tour 0), jamais après le
  tour 10. Chaque fin de phase retire les marqueurs d'activation et remet les
  unités « usées » à disposition.
- **propositions** : une seule pioche par tour (compteur
  `joueur:<u>:piocheProposition`), le reste sous la pioche.
- **transactions** : coût en diplomates = le plus grand nombre d'éléments
  reçus par une faction, pris à celui qui propose au moment de l'application.
- **combat** : une seule salve par combat (plus de « Nouvelle manche »).
- **réparer** : toujours disponible, 1 ressource par dégât, pas les unités
  biologiques (mot-clé `bio`).
- **mobiliser** : un logisticien, ou le Généticien.
- **explorer** : les unités natives du système découvert sont posées (second
  coup, une fois la tuile connue).
- **icônes des remplacements** : champ `icone` d'un remplacement (`hex
  #f2c200`, `rond #d4a017`). Avec un nombre, `#res(2)` s'affiche comme
  l'icône portant le nombre (`Component/Text.jsx`) ; en em et à marges
  négatives, elle ne change ni l'interligne ni la longueur des lignes.
  Réglé dans l'écran Remp, colonne « Icône ».
- **planètes** : seule une unité au mot-clé `terre` (Terrestre) s'y pose
  (`estTerrestre`, Interaction.jsx). Refus côté client, au glisser.
- **science** : rechercher et fouiller demandent une de ses unités dans le
  système ; explorer, une de ses unités dans un système voisin de
  l'emplacement.
- **possession** : deux boutons dans la fiche du système. « Prendre
  possession » demande une de ses infanteries sur la planète ;
  « Revendiquer » une de ses unités dans le système, et use un diplomate.
  Si la condition manque, le bouton est rouge gris (`STYLE_INDISPONIBLE`)
  mais reste utilisable.
- **phase suivante** : bloquée par un combat ouvert ou des faveurs à
  encaisser ; rouge gris mais utilisable (après confirmation) tant que tous
  n'ont pas passé. « Joueur suivant » n'est utilisable qu'à son tour.
- **face cachée** : une carte sans propriétaire qu'on cache revient à celui
  qui la cache (action `retourner`) ; une unité neutre reste neutre.
- **vote** : dans le décompte, un vote est écrit sur la couleur de sa colonne
  du plateau ; un clic sur une loi du tour ouvre sa fiche.
- **combat** : « Retirer tous les détruits » retire d'un coup les unités
  détruites (pas les indestructibles).
- **trêve** : le marqueur est une colombe portant un rameau d'olivier.
- **affichage** : code couleur (jaune à faire, vert fait, rouge problème,
  constantes de `Interaction.jsx`) ; en-tête, bandeau « À faire » et blocs du
  volet repliables (`useRepli`, gardé dans le navigateur) ; Ctrl + clic sur
  − / + d'un compteur : 5 d'un coup.

### garde-fous techniques

L'engine ne juge pas les règles, mais il refuse ce qui ferait fuir une
information cachée ou ce qui casserait l'écran des autres :

- **compteurs réservés** : `joueur:<u>:votePret` et `joueur:<u>:faveursValide` ne
  passent à 1 que par le joueur `u` ; `joueur:<u>:voteRevele` ne passe à 1 par
  un autre joueur que si `u` s'est déclaré prêt (révélation groupée) ;
- **encaisser** : refusé tant que tous les joueurs de la partie n'ont pas validé ;
- **types** : `ref.type` est un nom simple (`typeValide`), jamais `__proto__` ou
  `constructor` ; les marques données à `creer` suivent les règles de `marquer`
  (20 clés au plus, valeurs scalaires de 120 caractères au plus) ;
- **plafonds** : `MAX_COMPOSANTS` (20 000) et `MAX_COMPTEURS` (5 000) ;
- **état envoyé** : `prochainId` et `prochainOrdre` restent au serveur ;
- **identifiants** : les pioches et les sacs sont mélangés avant la création de
  leurs composants, l'identifiant `cN` ne dit donc rien de la carte ;
- **journal** : seuls des champs simples (nombre, booléen, chaîne courte) y
  entrent ; la zone d'arrivée notée est la zone réelle ; une action qui touche
  une zone invisible est marquée `secret` par le serveur et n'est envoyée qu'à
  son joueur ;
- **écriture** : la partie est enregistrée avant le coup (un échec ne laisse
  pas de coup orphelin) ; l'identifiant de partie des routes n'est fait que de
  chiffres, et la file d'attente est indexée par ce numéro ;
- **client** : une réponse plus ancienne que l'état affiché est ignorée, les
  coups partent un par un ; une barrière d'erreur (`Barriere`, Partie.jsx)
  entoure la carte, l'onglet ouvert, le lanceur de dés et les derniers coups.

## coup

```js
coup = {
    partie: 12,
    n: 38,                       // numéro d'ordre = version après ce coup
    auteur: 1,
    date: 1793954000000,
    commentaire: "",             // texte libre
    actions: [ ... ],            // actions appliquées, avec leur résultat
    refus: [ ... ],              // actions refusées et pourquoi
}
```

Le serveur traite les coups d'une partie un par un (file d'attente par partie).
Chaque joueur reçoit une version filtrée d'un coup :

- il voit le composant avant ou après l'action : l'action est complète, et contient
  la description du composant quand il vient de lui être révélé ;
- sinon l'action est résumée : `{ type: "piocher", de: "pioche:Agenda", vers:
  "joueur:3:main", n: 1, cache: true }`, affichée « X a pioché 1 carte ».

## mise en place (lancer)

1. Carte : une tuile système par case `select` du plateau, avec sa rotation. Les
   cases `hasard` reçoivent un système tiré au sort, comme le bouton « Générer »
   de l'éditeur (systèmes dont le type de lien n'est pas `commun` exclus).
2. Natals : les cases `natal` sont attribuées aux joueurs dans l'ordre des sièges ;
   le système de la faction (`faction.system`) y est posé.
   Chaque système posé amène ses unités natives (`nativeUnit` × `unitNum` du
   système et de ses planètes), sans propriétaire.
3. Unités de départ (`units` × `unitNum`) : les vaisseaux (mot-clé `ship`) dans
   l'espace du système natal, les autres sur la planète de départ (celle dont
   `homePlanet` est la faction, sinon la première). Sans système natal, elles
   vont dans `joueur:<u>:reserve`. D'autres unités s'ajoutent à la réserve
   depuis le plateau joueur.
   Les planètes du système natal sont posées dans `joueur:<u>:actif`.
   Agents de départ (`agents` × `agentSetup`) : dans `joueur:<u>:agents`.
4. Feuilles de technologie : pour chaque type (`gen`, `mil`, `soc`, `spa`), celle
   de la faction (`techsheet.faction`), sinon la feuille commune. Les
   technologies déjà débloquées sur la feuille ont toutes leurs cases cochées.
5. Pioches : une par type de carte, mélangée : `Agenda`, `militaire`, `relique`,
   `evenement`, `mercenaire`. Les promesses vont dans `general:promesses`.
6. Sac d'agents (`pioche:sac`, contenu caché) : 50 agents de chaque type de base
   (les agents communs à plusieurs factions), 30 cubes noirs (mercenaire) et
   20 cubes blancs (plan de relique). La liste des types de base est gardée dans
   `etat.references.agentsBase` : elle sert à la réserve infinie d'agents
   (`general:agents`), qui crée un agent à la demande.
7. Compteurs à 0, tour 1.
8. Places et initiative tirées au sort : chaque joueur reçoit une case natale au
   hasard, et un marqueur sur une case d'initiative du déroulé ; le premier de
   l'initiative doit jouer.
9. Marqueurs (jeton `marqueur` : carré de la couleur du joueur avec le logo de
   sa faction) : un par joueur sur la case 0 des points, de l'infamie et des
   sièges au conseil.
10. Cartes du déroulé, tirées des pioches pour chaque tour qui en prévoit :
    objectifs militaires (`general:militaire:<tour>`), événements du type prévu,
    mineur ou majeur (`general:evenement:<tour>`), postes de ministre, soit des
    agendas de type mandat (`general:agenda:<tour>`). Pour les objectifs et les
    événements, la première carte est face visible, les suivantes face cachée
    (`face: "cache"`, sans propriétaire : personne ne les voit avant qu'elles
    soient révélées). Les agendas de tous les tours sont visibles de tous.
    S'y ajoutent les votes au conseil : pour chaque tour dont une ligne
    « siège » du déroulé vaut N, la directive « Vote au conseil N » (agenda hors
    réserve commune, reconnu à son nom) est posée dans `general:agenda:<tour>`.
    Dans une partie, le déroulé n'affiche plus les textes « Evenement
    mineur/majeur » ni « Ajouter N postes de ministre » : les cartes les
    remplacent.
11. La partie commence à la première phase du tour.

### phases

Un tour suit les phases dans l'ordre de leur numéro : le champ `numero` de la
phase, sinon le nombre au début de son nom (« 02.Phase de recrutement »). Une
phase sans numéro, de numéro 0 ou marquée `horsTour` est spéciale et n'en fait
pas partie. L'en-tête de la partie a « Phase suivante » et « Nouveau tour » (tour
suivant, retour à la première phase). Le champ `enLigne` d'une phase dit quoi
faire sur le moteur ; l'onglet Aide l'affiche (affichage `enLigne`), puis les
règles de la phase.

### achats au recrutement

Pendant la phase de recrutement, Ctrl + clic sur ce qui est dans une case de
recrutement l'achète : son coût est retiré de l'influence du joueur — le
numéro de la case. Un mercenaire coûte 2 de plus, et le surcoût du tour
(`surCout` du déroulé) en plus : ce surcoût ne vaut que pour les mercenaires.
Refusé si l'influence ne suffit pas, ou si un autre joueur vient d'acheter le
même pion (précondition `de`).

- un agent rejoint les agents du joueur ;
- une carte mercenaire coûte 2 de plus et va dans ses éléments actifs (avec
  le cube posé dessus ; on peut cliquer la carte ou le cube) ;
- un plan de relique (carte relique) va dans sa main, au coût normal.

### fin de phase, nouveau tour

« Phase suivante » et « Nouveau tour » retirent les marqueurs d'activation de
la carte (espace des systèmes, planètes, ruines) et les marqueurs de faction
posés dans l'espace d'un système (zone `hex:<i>`).

### piste des points

`actionsPoints(etat, joueur, n)` (`miseEnPlace.js`) fait avancer le marqueur
du joueur de n cases. Au-delà de la dernière case (25), un de ses marqueurs
reste sur 25 et le score repart de 0. Le « + » de l'en-tête « Points » du
déroulé (`data-action="point"`) ajoute 1 point au joueur ; construire une
relique lui ajoute ses points.

### combats

Onglet « Combat » : un sous-onglet par combat en cours (combat spatial, canons
spatiaux, combat terrestre, bombardement), ouverts depuis la fiche d'un
système (compteurs `combat:<lieu>`). Unités par faction, engagements ordonnés,
« prêt au combat » de tous puis lancement de toutes les attaques en deux temps
(frappe préventive, puis le reste), dés gardés sur les unités, dégâts glissés
sur les cibles, neutres agressifs et défensifs engagés d'office. Détail dans
`combat.md`.

### zones secrètes

`joueur:<u>:secret:<nom>` : comme un plateau de vote caché, les autres joueurs
n'en reçoivent rien, ni dans l'état ni dans le journal (`zoneInvisible` dans
`etat.js`). Une action qui amène un composant dans une zone invisible n'est
montrée qu'à son propriétaire ; une action qui l'en sort vers une zone publique
est montrée sans son origine.

### passage à la phase suivante

« Phase suivante » et « Nouveau tour » ne sont possibles que si :

- tous les joueurs ont passé (bouton « Passer », compteur `joueur:<u>:passe`) ;
- aucun combat n'est en cours, pendant une phase de combat, de canons ou de
  bombardement ;
- les faveurs du tour sont encaissées, pendant la phase d'événement.

La raison du blocage est écrite dans l'en-tête. Au tour 0 rien ne bloque. En
haut, les joueurs sont listés dans l'ordre d'initiative avec leur état : son
tour, a passé, joue encore.

### encaisser les faveurs

Onglet « Faveurs », à la phase d'événement des tours où la ligne « Faveur » du
déroulé en prévoit (`engine/Faveurs.jsx`). Chaque joueur choisit en secret les
faveurs qu'il dépense, une par faction au plus, et valide : l'action serveur
`engager` garde son choix dans `etat.secrets[<u>].faveurs` (que lui seul
reçoit) et met le compteur `joueur:<u>:faveursValide` à 1. Les faveurs ne
bougent pas : les autres ne voient ni combien ni lesquelles. Quand tous
ont validé, l'action serveur `encaisser` compte : 1 point par faveur, 2 de plus
à celui qui en dépense le plus (1 chacun en cas d'égalité), marqueurs avancés
sur la piste des points, faveurs sorties du jeu. Le compteur `faveurs:<tour>`
compte les encaissements faits.

### transactions

Une transaction n'est plus exécutée par celui qui la compose : elle est
proposée (jeton d'en-tête et un jeton par ligne dans `general:transactions`) et
listée dans l'onglet « Transactions ». Chaque faction concernée la valide ;
quand les deux l'ont fait, elle est appliquée en un coup, sauf si elle n'est
plus applicable (une promesse ou une faveur a bougé). Une faction concernée
peut la refuser, celui qui l'a proposée l'annuler.

### décompte des votes

Voir `vote.md`.

### système au hasard

Bouton du lanceur de dés : désigne au hasard un système du plateau qui n'est
ni spécial ni une supernova (`anomaly` = `sup`). Le serveur lance un dé au
nombre de candidats ; le système désigné est le k-ième dans l'ordre des cases.

### factions neutres

L'élément « faction neutre » a un champ `logo` (icône affichée devant son
nom). Icônes provisoires de claude dans `server/public/ti/neutre/`.

### trêve

Jeton `trêve` (carré blanc « T » au liseré du joueur). À la phase de
déclaration de trêve, Ctrl + clic sur un système y pose le marqueur du joueur
et détruit un de ses diplomates. En arrivant à cette phase, tous les marqueurs
de trêve sont retirés. Le plateau général en a une réserve infinie.

### unités hors fiche de faction

Une unité qui n'est pas dans les unités de la faction de son joueur
(mercenaire, unité créée par une relique, unité spéciale) a un liseré doré,
sur la carte comme dans l'onglet Combat.

### pistes du déroulé

Les en-têtes « Points », « Infamie » et « Sièges au conseil » ont un « + »
(`data-action`) qui avance le marqueur du joueur d'une case
(`actionsPiste`). Points et sièges rebouclent au bout de la piste (un marqueur
reste sur la dernière case) ; l'infamie s'arrête à la dernière case.

Dans une partie, la ligne « Agenda » du déroulé a la place de 3 cartes de haut
sur 2 de large (une carte tient dans une demi-colonne) et le plateau n'est plus
tenu à la hauteur d'une page. « Mettre en place le recrutement » ne se fait
qu'une fois par tour (compteur `general:recrutement`).

L'action `des` accepte `c` et `marque` : le jet est celui d'un composant et
son résultat est écrit dans cette marque. Une marque peut faire jusqu'à
120 caractères.

### chat

Onglet « Chat » : messages à tous, ou privés à un joueur. Un message privé
n'est envoyé par le serveur qu'à son auteur et à son destinataire. Les
messages (collection `partieChat`, numérotés par partie) arrivent avec
l'interrogation périodique : le client donne le numéro du dernier message
qu'il connaît (`chat=<n>`). L'onglet porte le nombre de messages non lus (le
dernier lu est gardé dans le navigateur). Seuls les joueurs peuvent écrire ;
500 caractères au plus.

### possession des planètes

Une planète appartient au joueur qui a sa carte dans ses éléments actifs : elle
porte sur la carte un étendard à sa couleur. L'infanterie est un petit rond.
La fiche d'un système (clic sur sa case) a un bouton « Prendre le contrôle »
par planète : la carte passe dans les éléments actifs du joueur (elle est
créée si personne ne l'avait encore).

### marqueurs sur une carte

La fiche d'une carte (agenda, promesse...) a un bouton « Poser mon marqueur » :
un marqueur du joueur est créé sur la carte (`sur`). Ce qui est posé sur une
carte s'affiche dans son coin, à taille constante.

### recrutement avec cartes

Le tirage du recrutement envoie `piocher` avec `remplacements` : un cube noir
tiré fait venir la carte du dessus de `pioche:mercenaire` et se pose dessus ; un
cube blanc est remplacé par la carte du dessus de `pioche:relique`.

### vote

Onglet Vote : chaque joueur a son plateau (élément `vote`), zones
`joueur:<u>:vote:<ligne>:<colonne>`. Il est visible de son joueur seul tant
que le compteur `joueur:<u>:voteRevele` n'est pas à 1 (« Prêt à révéler » du
décompte : tous les plateaux sont révélés ensemble ; il n'y a plus de bouton
pour révéler son plateau seul) :
les autres n'en reçoivent rien, ni les pions, ni leur nombre, ni les coups qui
y posent quelque chose. Chaque case a une partie droite (zone
`…:vote:<ligne>:<colonne>:d`) : le carré. Un politicien dans le carré est
utilisé (1 voix) ; dans la case, il est dépensé (2 voix). « Réinitialiser »
renvoie donc les agents des carrés dans les agents usés, retire du jeu ceux
des cases et le reste, et remet le compteur à 0. En haut de l'onglet : la liste numérotée des lois du tour
(cartes de `general:agenda:<tour>`).

### éléments posés sur une technologie

Chaque technologie d'une feuille est un emplacement (`data-emplacement
"case:<k>"`) : zone `joueur:<u>:tech:<id de la feuille>:case:<k>`. On y glisse
un agent ou tout autre élément.

### marqueurs et activation

Le volet de droite a deux sources illimitées (`Source` avec `jeton`), à glisser
où l'on veut : le marqueur de faction du joueur (`marqueur`) et le marqueur
d'activation (`activation`, neutre, carré noir). Une planète est activée quand
sa zone `hex:<i>:planete:<k>` porte un jeton `activation` ; posé sur une ruine,
il a `marques.ruine` = 1 ou 2 et s'affiche avec un « R ».

### fiche d'un système

Un clic sur une case ouvre la fiche de son système : les unités présentes dans
l'espace (`hex:<i>`) et sur chaque planète (`hex:<i>:planete:<k>`), qu'on peut
glisser d'un emplacement à l'autre, et les options du système :

- toujours : « Réparer toutes mes unités » (dégâts à 0 pour mes unités du
  système, embarquées comprises ; coûte 1 ressource par dégât, indisponible
  si les ressources ne suffisent pas) ;
- phase de science, planète non activée : « Rechercher » (marqueur d'activation
  sur la planète, use un scientifique ; la recherche gagnée, 2 au choix doublé
  dans les spécialités `techSpe` de la planète, s'ajoute à la main) ;
- phase de science, ruine non fouillée : « Fouiller la ruine » (marqueur
  d'activation sur la ruine, use un scientifique, rapporte un fragment de
  relique dans `joueur:<u>:fragments`) ;
- phase de production, planète possédée non activée : « Mobiliser » (nombre
  d'infanteries, par défaut et au plus la valeur `prod` de l'infanterie de la
  faction ; use un logisticien, dépense nombre × `cout` ressources, pose les
  infanteries et active la planète).

### fragments de relique

Jetons « Fragment ancien / militaire / civil / spatial » (`FRAGMENTS`), zone
`joueur:<u>:fragments`. Une ruine d'un type (`ruineType` : `ancien`, `mil`,
`civ`, `spa`) rapporte le fragment de ce type (réserve illimitée : `creer`).
Une ruine « normale » fait tirer un jeton dans le sac `pioche:fragments`, créé
à la mise en place : 20 anciens, 50 militaires, 50 civils, 30 spatiaux. Les
fragments s'affichent avec les icônes des cartes relique (`/ti/relic/`). Le
plateau général a la zone « Sac de fragments de relique » : tirer un fragment,
en prendre un d'un type donné dans la réserve, ou en remettre un dans le sac
en le glissant dessus.

### construire une relique (phase de science)

Fiche d'une relique de sa main, bouton « Construire » : un scientifique
disponible est supprimé, les fragments demandés par la relique (`coutAnc`,
`coutMil`, `coutSpa`, `coutCiv`) sont supprimés de `joueur:<u>:fragments`, la
relique passe dans les éléments actifs et le marqueur du joueur avance de
`point` cases sur la piste des points. Refusé s'il manque des
fragments ou un scientifique. Les reliques de départ d'une faction (table
« Éléments de départ ») sont en main.

### explorer (phase de science)

Ctrl + clic sur un emplacement vide voisin d'un système : la première tuile de
`pioche:system` y est posée ; un logisticien et un scientifique sont utilisés.
Pendant cette phase, les emplacements explorables sont affichés en vert, y
compris au-delà du bord : un anneau de plus est montré, réduit à ses
emplacements explorables, et la carte gagne cet anneau si on y explore.

### production

Case « Production » de la réserve (volet de droite et plateau joueur) : tant
qu'elle est cochée, glisser une unité hors de sa réserve, ou poser une
infanterie depuis sa source, retire son coût (`cout`) des ressources du
joueur. Refusé si les ressources ne suffisent pas.

### phase de proposition

- « Piocher N propositions » coûte N influence : les cartes vont dans
  `joueur:<u>:choix`, zone que le joueur est seul à voir (comme sa main). Une
  fenêtre lui fait en prendre une en main ; les autres retournent sous la
  pioche (`deplacer` avec `dessous: true`).
- Ctrl + clic sur un agenda de sa main : il va dans `general:agenda:<tour+1>`
  et un politique est utilisé. Une fois par tour (compteur
  `joueur:<u>:proposition` = tour de la dernière proposition).

### volet de droite

Dans l'ordre : fin de tour (« Passer », joueur suivant), ressources / influence / commerce du joueur avec
leurs boutons − / +, dés, main, agents, agents usés, marqueurs (sources), réserve
(case « Production », sources d'infanterie), fragments, éléments actifs,
derniers coups. La liste des parties indique le tour et la phase de chacune.

### fiche d'un composant

Dégâts, usé et possession ne sont proposés que pour une unité ; la face pour
tout élément du jeu (carte, unité) ; rien de cela pour un jeton.

### tuiles système

En bas de l'onglet Espace : `pioche:system` (tuiles non spéciales qui ne sont
pas sur la carte, mélangées), `general:tuiles` (tuiles piochées) et
`general:systemes` (tuiles spéciales). Une tuile se glisse sur une case.

Chaque système compte autant de tuiles que le multiplicateur `!N!` de son nom.
Le système natal d'une faction n'est ni tiré au hasard ni mis dans la pioche,
sauf s'il existe en plusieurs exemplaires (« !30!vide », natal de Winnu).

### faveurs

Jeton `faveur` (triangle à la couleur du joueur, logo de sa faction), zone
`joueur:<u>:faveurs`. Au ravitaillement, un joueur qui a les cartes des
planètes de son système natal peut prendre une de ses faveurs.

### tour 0, ordre du tour, passer

La partie commence au tour 0, sans phase : un bandeau demande à chacun
d'appliquer la mise en place de sa faction (son texte est rappelé). « Nouveau
tour » lance le tour 1.

L'ordre du tour est celui des marqueurs sur les cases d'initiative. « Passer »
met le compteur `joueur:<u>:passe` à 1 : le joueur est ignoré par « Suivant »
jusqu'à la phase suivante, qui remet ces compteurs à 0 et rend la main au
premier de l'ordre. Le volet de droite a « Fin de mon tour : joueur suivant ».
« ◀ » revient à la phase précédente ; à la première phase d'un tour, il revient
à la dernière phase du tour précédent.

« Attendre (use un diplomate) » est dans le volet de droite, à toute phase ;
en phase de déplacement le bandeau propose aussi « Attendre (use un amiral) ».
Ctrl + clic sur une case pose son marqueur de faction sur le système.

### création dans un coup groupé

Dans un coup de plusieurs actions, `creer` peut porter un identifiant
provisoire (`idLocal`, « t3 ») que les actions suivantes du même coup
utilisent (poser un marqueur sur la dette qu'on vient de créer). Le serveur
lui attribue son vrai identifiant et l'applique à ces actions.

### transaction (phase de diplomatie)

Bouton « Transaction… » du bandeau : une fenêtre entre deux factions (on est la
première par défaut), envoyée en un seul coup commenté.

- promesse de base : une carte de `general:promesses` va chez l'un des deux,
  sur la case d'un tour de sa feuille (`joueur:<u>:tour:<t>`) ou dans ses
  éléments actifs (sans fin), avec le marqueur de l'autre faction dessus ;
- dette : jeton `Dette` (montant dans `marques.montant`) sur la case du tour de
  paiement du débiteur, avec le marqueur de faction du créancier posé dessus ;
  sa fiche a les boutons − / + du montant ;
- faveur : un jeton de `joueur:<u>:faveurs` passe chez l'autre.

### agents

Dans le volet de droite et sur la feuille de faction : un clic sur un de ses
agents l'utilise (ou récupère un agent usé), Ctrl + clic le supprime.

### cartes face cachée

Ctrl + clic révèle la carte à tous (`reveler`). Un clic ouvre une fenêtre :
« Révéler à tous » ou « Consulter », action `consulter` qui ne change rien à
l'état mais est notée au journal ; seul son auteur y voit le contenu.

### cartes citées

La fiche d'une carte montre les cartes qu'elle cite (liens `|123|` de son texte
et champ `Lien`), avec « Prendre en main » et « Dans mes éléments actifs ».

### défilement

`Defilable` (`Interaction.jsx`) : cliquer-glisser sur le fond de la carte, d'une
feuille de faction ou du déroulé les fait défiler ; sur un pion, on le déplace.

### réserve d'unités

Le nombre de figurines par joueur dépend du type de l'unité (`LIMITES_UNITES`
dans `miseEnPlace.js`) : cuirassé 5, transport 4, croiseur 8, destroyeur 8,
soleil de guerre 2, vaisseau amiral 1, dock 3, système de défense 6, frégate
marchande 10, monument 1, mécha 4, usine 5. Au lancement la réserve reçoit la
limite moins les unités de départ. L'infanterie est illimitée et n'est pas
comptée : la réserve en montre une source (`data-source`), qu'on glisse vers la
carte pour en créer une.

### entretien

Bouton du plateau joueur, affiché à la phase de ravitaillement : ajoute les
ressources et l'influence des planètes du joueur à ses compteurs, renvoie ses
agents usés parmi les disponibles, rend ses technologies utilisables et lui
donne une de ses faveurs s'il possède une planète de son système natal. Une
fois par tour (compteur `joueur:<u>:entretien` = tour).

Le champ `enLigne` de la phase en cours est aussi affiché en haut de la partie
(bandeau « À faire »).

### éléments de départ d'une faction

Table de la faction (`Component/Depart.jsx`, affichée au verso) : élément,
nombre, destination (`main`, `actif`, `reserve`, `agents`, `espace`, `planete`).
Chaque ligne crée ses composants dans la zone du joueur correspondante.

### format des événements

Cartes 88 × 63 mm en paysage (`PokerPa`, `Component/Size.jsx`), imprimées par 9
sur A4 paysage.

### type de lien

Champ `lienType` (`Component/TypeLien.jsx`) des feuilles de technologie, agendas,
promesses, reliques, mercenaires, unités, systèmes et planètes : `commun`, `faction`, `neutre`, `evenement`,
`mercenaire` (avec `lienElement`) ou `special` (lié à rien). Pour une unité, il
remplace les anciens champs `merc` et `faction` : le verso montre le logo de la
faction liée. Pour un système, il remplace l'ancien booléen `special` : un
système non commun est exclu du tirage au hasard (`horsReserveCommune`,
`engine/miseEnPlace.js`). Une planète garde `homePlanet` en plus du lien. Un élément qui n'est pas commun
est écarté des pioches et
de la réserve de promesses ; une feuille de technologie liée à une faction ne
va qu'à cette faction. Sans ce champ, un élément est commun. Non affiché.

### recrutement du tour

La ligne « Recrutement » du déroulé (`recru`) liste, pour chaque tour, les cases
du haut à remplir : `3,4,5` ou `3-5`. Le bouton « Mettre en place le
recrutement » mélange le sac puis tire, pour chacune de ces cases, autant de
jetons qu'il y a de joueurs (`piocher` de `pioche:sac` vers `general:boite:<n>`).
Les jetons déjà en place y restent.

Un nom d'élément qui commence par `!N!` donne N exemplaires (cartes, systèmes).

## API

Toutes les routes demandent d'être connecté.

| route | rôle |
|---|---|
| `GET /partie?jeu=ti5` | liste des parties |
| `POST /partie` | créer : `{ jeu, nom, plateau }` |
| `POST /partie/:id/siege` | prendre ou changer son siège : `{ faction, couleur }` |
| `DELETE /partie/:id/siege` | quitter (en préparation) |
| `POST /partie/:id/lancer` | mise en place (créateur) |
| `GET /partie/:id` | la partie et son état filtré pour le demandeur |
| `POST /partie/:id/coups` | envoyer un coup : `{ actions, commentaire }` |
| `GET /partie/:id/suite?rev=<n>&chat=<m>` | interrogation périodique : `{ rev }` si rien n'a changé, sinon la partie complète ; `chat` : les messages de numéro supérieur à `m` que le demandeur peut lire |
| `GET /partie/:id/coups?avant=<n>` | historique : coups plus anciens que `n`, filtrés |
| `DELETE /partie/:id` | supprimer la partie (créateur) |
| `POST /partie/:id/chat` | écrire un message : `{ texte, a }` ; `a` = identifiant du destinataire d'un message privé, ou `null` pour tous |

Collections MongoDB : `partie`, `partieCoup`, `partieChat`.

## fichiers

Le code existant n'est presque pas touché :

- `server/main.js` : brancher les routes `/partie` (2 à 3 lignes) ;
- `ti5.jsx` : déclarer l'outil dans `Tools` (1 ligne) ;
- composants d'affichage : seulement des attributs `data-zone` et
  `data-composant` là où l'engine doit repérer un emplacement.

Les interactions sont dans une couche posée par-dessus l'affichage, comme pour
l'éditeur de plateau (`plateauVue.jsx` / `plateauEditeur.jsx`). La carte réutilise
`PlateauView` : la case `data-case="12"` est la zone `hex:12`.

```
server/
    partie.js            stockage, file d'attente, filtrage (générique)
    partieRoutes.js      routes Express

client/src/Game/Ti5/engine/
    etat.js              appliquer une action à un état, visibilité (partagé)
    miseEnPlace.js       état initial d'une partie Ti5 (partagé)
    sync.js              interrogation périodique, envoi immédiat des actions, chat
    Parties.jsx          outil : liste et création
    Preparation.jsx      sièges, lancement
    Partie.jsx           en-tête (tour, phase, qui joue), onglets, fiche d'un composant
    Interaction.jsx      pions, zones, emplacements, glisser d'un composant
    Espace.jsx           onglet espace
    PlateauJoueur.jsx    onglet plateau joueur
    Technologie.jsx      onglet technologie
    PlateauGeneral.jsx   onglet plateau général (déroulé, pioches) ; les dés sont dans le volet de droite
    Journal.jsx          historique des coups
```

Attributs lus par l'engine dans les affichages existants :

| attribut | posé dans | zone |
|---|---|---|
| `data-case="<i>"` | `plateauVue.jsx` | `hex:<i>` |
| `data-emplacement="planete:<k>"` | `systeme.jsx` | `hex:<i>:planete:<k>` |
| `data-emplacement="tour:<t>"` | `faction.jsx` | `joueur:<u>:tour:<t>` |
| `data-emplacement="boite:<n>"` | `deroule.jsx` | `general:boite:<n>` |
| `data-emplacement="initiative:<n>"` | `deroule.jsx` | `general:initiative:<n>` (la dernière case occupée, soit le nombre de joueurs, est le responsable du sénat) |
| `data-emplacement="points:<n>"`, `infamie:<n>`, `sieges:<n>` | `deroule.jsx` | `general:points:<n>`... (cases des compteurs) |
| `data-emplacement="militaire:<t>"`, `evenement:<t>` | `deroule.jsx` | `general:militaire:<t>`... (carte affichée en entier) |
| `data-emplacement="agents"` + `data-filtre="<id>"` | `faction.jsx` | `joueur:<u>:agents`, limité aux agents de ce type |
| `data-tech="<k>"` | `techSheet.jsx` | compteur de la technologie `k` |

Les pions d'un emplacement sont affichés dedans par un portail React
(`Emplacements` dans `Interaction.jsx`) : l'affichage n'en sait rien.

Gestes : glisser un pion le déplace ; Ctrl + glisser déplace tout le groupe ; une
unité `transportable` déposée sur un vaisseau (`ship`) embarque dessus, et Maj +
déposer embarque n'importe quel pion sur un autre ; un clic ouvre sa fiche
(dégâts, usé, face, possession, embarquer ou débarquer, envoyer vers une zone,
retirer). Une unité embarquée s'affiche dans le pion de son porteur et le suit.

Apparence des pions : une unité a l'icône de son type (`public/ti/unit_icon`),
seule sur la carte ; un agent est un cube de sa couleur ; les cubes du sac sont
noir (mercenaire) et blanc (plan de relique) ; les cartes d'une main sont
affichées en entier.

`etat.js` et `miseEnPlace.js` sont du JavaScript sans dépendance, chargés à la fois
par le client et par le serveur (`../client/src/Game/Ti5/engine/`), pour que les
deux appliquent exactement la même logique.

L'outil s'ouvre à `/GE/ti5/tools/partie` (liste) et `/GE/ti5/tools/partie?id=12`.

## étapes

0. cette doc — fait
1. socle serveur : parties, état, coups, filtrage — fait
2. socle client : liste, préparation, en-tête, synchronisation, journal — fait
3. espace : carte, unités, dégâts, transport, hexagones au bord — fait
4. plateau joueur : feuille, compteurs, agents, réserve, main, éléments actifs — fait
5. pioches et dés — fait
6. technologie et plateau général — fait
7. chat — fait
8. raccourcis de `upgrade.md` — mobiliser, rechercher et fouiller sont faits
   (fiche d'un système) ; les clics sur le texte (`#res(2)`, `#use#log`) restent à faire

Ce qui a été laissé de côté est dans `a-faire.md`.
