# combats (onglet Combat)

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

## prêt au combat, en deux temps

Chaque joueur présent se dit « Prêt au combat ». Quand tous le sont, toutes les
attaques partent en un seul coup, celles des neutres comprises :

| étape | sens |
|---|---|
| 0 | engagements ; au « prêt » de tous, la frappe préventive part |
| 1 | frappe préventive lancée : on répartit les dégâts ; au « prêt » de tous, les autres attaques partent |
| 2 | tout est lancé |

Sans unité à frappe préventive, on passe de 0 à 2. Une unité détruite ne tire
pas. Si deux joueurs se disent prêts en même temps, un bouton « Lancer les
attaques » apparaît pour tous (un double clic ne relance pas les dés). Un
combat ne compte qu'une salve : il n'y a pas de nouvelle manche ; pour
recommencer, terminer le combat et le rouvrir depuis la fiche du système.

## dés et dégâts

- Le serveur lance les dés à 10 faces (action `des` avec `c` et `marque`) ; le
  résultat reste sur l'unité.
- Un dé touche s'il est supérieur ou égal à l'attaque, + 2 avec une cible
  spécifique. Vert = touche. Ctrl + clic inverse un dé.
- Chaque dé qui touche porte un dégât rouge, qu'on glisse sur une unité
  (`data-degat`, géré par `Plan`) : elle prend 1 dégât.

Marques sur l'unité, propres à chaque sorte de combat (suffixe `C`, `T`, `B`
pour canons, terrestre, bombardement) : `engage`, `des` (« 7,3 »), `desF` (dés
inversés), `desA` (dégâts attribués).

## neutres

Engagement calculé, recalculé à chaque changement :

- **agressifs** (`agg`) : toujours — factions par nombre de cibles, puis
  points, puis initiative ; leurs militaires, puis leurs non-militaires ;
- **défensifs** (`def`) : seulement les factions qui engagent les neutres,
  jamais leurs non-militaires.

## ce que l'engine ne fait pas

- vérifier l'ordre d'initiative des annonces ni la stabilité des engagements ;
- répartir les dégâts selon la règle : les joueurs glissent les dégâts ;
- appliquer les malus autres que le −2 (nébuleuse, unités à malus) ni le
  blocage des canons et des bombardements : Ctrl + clic sur les dés ;
- la portée des canons au-delà de 1, et la furtivité pour les neutres.

## choix faits sans réponse, à confirmer

1. Dé à 10 faces ; touche si supérieur ou égal à l'attaque ; le multiplicateur
   (« 5** », « 7*4 ») est le nombre de dés.
2. Cible spécifique : il faut faire attaque + 2.
3. `#bomb(a,n)` et `#can(a,n)` : `a` est le seuil, `n` le nombre de dés.
4. Canons : tirent ceux du système et des systèmes voisins, planètes comprises.
5. Combat terrestre : toutes les unités de la planète sont des cibles ; seules
   celles à mot-clé `mil` tirent.
