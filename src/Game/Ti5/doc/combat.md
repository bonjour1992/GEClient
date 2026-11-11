# combats (onglet Conflit)

L'engine ne juge pas les règles : il affiche, lance les dés et laisse les
joueurs répartir les dégâts. Code : `engine/Combat.jsx`.

## sortes de combat et lieux

Plusieurs combats peuvent être en cours, chacun dans un sous-onglet (rouge si
j'y ai des unités, gris sinon). Un combat est repéré par son lieu, `i` étant la
case du système et `k` une de ses planètes :

| lieu | sorte | qui tire | cibles |
|---|---|---|---|
| `41` | combat spatial | vaisseaux militaires de l'espace du système | les vaisseaux du système |
| `41c` | canons spatiaux | unités qui ont `#can(a,n)`, dans le système ou un système voisin (portée 1), planètes comprises | les vaisseaux du système |
| `41p0` | combat terrestre | unités militaires de la planète | les unités de la planète |
| `41p0b` | bombardement | unités de l'espace du système qui ont `#bomb(a,n)` | les unités de la planète |
| `41p0r` | raid | unités de l'espace du système qui ont `#raid(a,n)` (« 5\*\* ») | les infanteries de la planète (capturées) |

Compteurs : `combat:<lieu>` (1 = en cours), `combat:<lieu>:etape`,
`combat:<lieu>:pret:<u>`.

Ouverture depuis la fiche d'un système (onglet Espace) : « Combat spatial » et
« Canons spatiaux » en tête, « Combat terrestre » et « Bombardement » à côté de
chaque planète. L'ouverture est envoyée tout de suite, sans attendre le coup en
cours. « Terminer le combat » ferme le sous-onglet et efface ses marques.

## affichage

Une colonne par faction présente, dans l'ordre d'initiative, puis « Neutres »
(unités sans propriétaire). Dans chaque colonne : les tireurs à distance qui ne
sont pas des cibles (« Bombardent », « Canons », avec l'endroit d'où ils tirent),
puis les cibles, **Militaires** (mot-clé `mil`) et **Non militaires**.

Une ligne par unité : nom (cliquer ouvre sa fiche, on y dépose un dégât),
attaque et nombre de dés, résistance (`PV`), dégâts subis, « frappe
préventive » (`#fpre`), « détruit » avec un bouton « Retirer » (« désactivé »
pour une unité `#indes`). Liseré doré : unité qui n'est pas sur la fiche de
faction de son joueur (mercenaire, relique, spéciale).

Attaque : `combat` × `combat_touche` pour le spatial et le terrestre ; les deux
nombres de `#bomb(a,n)` ou `#can(a,n)` pour le bombardement et les canons.

## engagements

Chaque unité qui tire a une liste ordonnée, visible de tous :

| code | sens |
|---|---|
| `@c12` | l'unité c12, cible spécifique : −2 pour toucher (sauf `#prec`) |
| `j3` | les militaires du joueur 3 |
| `J3` | ses non-militaires — seulement après ses militaires (sauf s'il n'en a pas) |
| `n`, `N` | les neutres, militaires puis non-militaires |

Saisie : cocher ses unités, puis « Engager » (en-tête d'un bloc de cibles) ou
« Cibler » (ligne d'une cible). Les cibles spécifiques passent avant les
factions. Chaque entrée a ↑ et ×.

## quatre phases (six avec la Troupe de détournement)

Affichées en tête du combat (`PHASES_COMBAT`, `data-phase-combat`), la phase
en cours en gras :

1. frappe en premier (unités `#fpre`) ;
2. dégâts de la frappe en premier ;
3. autres attaques ;
4. dégâts ;
5. dernières attaques (unités qui attaquent « après toutes les autres » :
   Troupe de détournement, étiquette « attaque en dernier ») ;
6. dégâts des dernières attaques.

Les phases 5 et 6 ne sont affichées que si une telle unité tire.

Chaque joueur présent se dit « Prêt au combat ». Quand tous le sont, toutes les
attaques de la phase partent en un seul coup, celles des neutres comprises :

| étape (compteur) | phase affichée | sens |
|---|---|---|
| 0 | 1 (ou 3 sans frappe en premier) | engagements ; au « prêt » de tous, la frappe en premier part |
| 1 | 2 | frappe en premier lancée : chacun encaisse ; au « prêt » de tous, les autres attaques partent |
| 2 | 4 | autres attaques lancées : chacun encaisse ; s'il reste des dernières attaques, au « prêt » de tous elles partent |
| 3 | 6 | dernières attaques lancées : chacun encaisse |

Sans unité à frappe en premier, on passe de 0 à 2 (les phases 1 et 2 sont
barrées). Une unité détruite ne tire
pas. Si deux joueurs se disent prêts en même temps, un bouton « Lancer les
attaques » apparaît pour tous (un double clic ne relance pas les dés). Un
combat ne compte qu'une salve : il n'y a pas de nouvelle manche ; pour
recommencer, terminer le combat et le rouvrir depuis la fiche du système.

## dés et dégâts

- Le serveur lance les dés à 10 faces (action `des` avec `c` et `marque`) ; le
  résultat reste sur l'unité.
- Un dé touche s'il est inférieur ou égal à la valeur de combat (5 : touche
  sur 5 ou moins), − 2 avec une cible spécifique. Vert = touche. Ctrl + clic
  inverse un dé.
- Bonus / malus manuels, par unité qui tire (boutons − / +) : `ajust`
  s'ajoute à la valeur de combat, `ajustN` au nombre d'attaques (1 dé au
  moins). Effacés avec le combat.
- **Qui encaisse** : les dégâts d'un tireur (dés qui touchent, pas encore
  attribués) vont à son premier engagement qui a encore une unité debout
  (`cibleActuelle`). Le surplus passe donc à l'engagement suivant ; sans
  engagement restant, il est perdu. La ligne des dés le dit (« → à encaisser
  par : … »).
- **Le joueur visé répartit** : chacune de ses unités visées et debout a un
  bouton « ✹ Encaisser 1 » (`encaisser`) ; l'en-tête de son camp dit combien
  il lui en reste. Le dé est marqué attribué et l'unité prend 1 dégât, dans
  le même coup (`si` : refusé si un autre vient de le faire).
- **Neutres** : appliqués d'office (`degatsNeutres`), à l'unité qui a le moins
  de résistance restante d'abord, une unité étant achevée avant la suivante.
  C'est le navigateur d'un seul joueur qui l'envoie (le premier du combat dans
  l'ordre d'initiative) ; les autres ont le bouton « Appliquer aux neutres »
  si rien n'est parti.
- À la main, toujours possible : chaque dé qui touche porte un dégât rouge,
  qu'on glisse sur une unité (`data-degat`, géré par `Plan`).

Marques sur l'unité, propres à chaque sorte de combat (suffixe `C`, `T`, `B`
pour canons, terrestre, bombardement) : `engage`, `des` (« 7,3 »), `desF` (dés
inversés), `desA` (dégâts attribués), `ajust`, `ajustN` (ajustements manuels).

## neutres

Engagement calculé, recalculé à chaque changement :

- **agressifs** (`agg`) : toujours — factions par nombre de cibles, puis
  points, puis initiative ; leurs militaires, puis leurs non-militaires ;
- **défensifs** (`def`) : seulement les factions qui engagent les neutres,
  jamais leurs non-militaires.

Un neutre défensif furtif (Rebelle) ne répond qu'aux factions qui le ciblent.

## mécaniques d'unités (11 novembre)

- **raid** (Kabal de l'ombre) : bouton « Raid » à côté d'une planète quand une
  unité à raid est dans l'espace. Seules les infanteries sont des cibles ; s'il y
  a d'autres unités militaires sur la planète, un engagement de groupe est
  refusé : il faut cibler. Une infanterie touchée part dans les éléments actifs
  du raideur (esclave). Sans infanterie, les raideurs tirent sans engager et une
  réussite permet de capturer un esclave du possesseur (compteur
  `combat:<lieu>:esclave`). Les effets des bombardements s'appliquent (Jeollr,
  Système de visée, Bâtiment résistant ; Système de défense annule).
- **furtif** : aussi au combat terrestre ; Vaisseau pirate furtif dans une
  anomalie ; Lune noire (« doit être ciblée ») jamais atteinte par un groupe.
- **attaques** : Destroyeur de la Volée argentée ×2 (marque `deuxAttaques` du
  tour, posée par son bouton) ; Duha Menaimon et Nekro Acidos : niveau de
  connaissance génétique / militaire (0 : pas d'attaque).
- **bonus et malus** : Salai Sai Corian (+1 par vaisseau adverse visé), Complexe
  de guerre (destroyers à 1 système ou moins, +1), Olivier Dubois (+2 aux
  infanteries cochées, marque `dubois`), Stratégie d'évitement (vaisseaux cochés,
  marque `evitement` : −1, et −1 pour qui ne vise qu'eux), Palais du khan (−1 par
  frégate du khan pour qui l'engage, à la place du −2), Prévision des combats
  (compteur `joueur:<u>:prevision` : frappe en premier).
- **dégâts** : « Annuler 1 » (J.N.S. Hylarim, Bouclier mobile, Système de
  défense : 1 ressource, le dé est attribué sans dégât) ; touches du Vaisseau
  pirate d'abord aux vaisseaux de commerce ; marque `degatPar` (unité qui a
  infligé le dernier dégât).
- **destruction** : Frégate du khan (jet de riposte, marques `khan`,
  `khanPris`, retrait bloqué avant), Armageddon (#490 créé pour le destructeur,
  1 de résistance), Camp de travail (2 esclaves libérés), Myru Vos (+2 commerce),
  Memoria D (jet de 6, infanterie posée à bord, marque `memoria`) ; Duha Menaimon
  au bombardement (jet, Letani, marque `duha`) ; Épineux géant tire au
  bombardement de sa planète ; Mech aérien tire au combat spatial depuis sa planète.
- **Troupe de détournement** (Pirate Mentak) : tire seule au 3e temps (étape 3,
  phases 5 et 6) ; un vaisseau dont le dernier dégât vient d'elle (`degatPar`) a
  « Retirer (capturé) » : marques de combat effacées, dégâts à 0, déplacé dans
  `joueur:<camp>:actif` avec ce camp pour propriétaire.

## ce que l'engine ne fait pas

- vérifier l'ordre d'initiative des annonces ni la stabilité des engagements ;
- choisir à la place d'un joueur quelle unité encaisse : c'est lui qui répartit ;
- appliquer les malus autres que le −2 et ceux des scripts (nébuleuse) ni le
  blocage des canons et des bombardements : Ctrl + clic sur les dés ;
- la portée des canons au-delà de 1 hors scripts.

## choix faits sans réponse, à confirmer

1. Dé à 10 faces ; touche si inférieur ou égal à l'attaque (tranché le
   2026-11-10) ; le multiplicateur (« 5** », « 7*4 ») est le nombre de dés.
2. Cible spécifique : il faut faire attaque − 2 ou moins.
3. `#bomb(a,n)` et `#can(a,n)` : `a` est le seuil, `n` le nombre de dés.
4. Canons : tirent ceux du système et des systèmes voisins, planètes comprises.
5. Combat terrestre : toutes les unités de la planète sont des cibles ; seules
   celles à mot-clé `mil` tirent.
