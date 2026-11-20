# Implémentabilité des règles TI5 dans l'outil de partie

Pour chaque technologie, habilité, unité, planète et événement : ce que l'outil de partie applique, **comment il touche à l'interface**, et ce qu'il resterait à scripter. Analyse du 10 novembre 2026, tenue à jour à chaque script écrit (dernière mise à jour : 20 novembre 2026).

Depuis le 20 novembre 2026, une « fenêtre de choix » citée dans ces tableaux est un cadre de l'onglet Décision, qui s'ouvre tout seul : l'action part une fois la décision prise. Seule la confirmation d'un bouton rouge gris (« Normalement impossible… ») reste une fenêtre du navigateur.

Colonnes :

- **Implémenté** : `oui`, `partiel`, `non` (en gras : un script de règles existe, voir `engine/scripts.js` et l'outil « Scripts de règles »).
- **Interface** : ce que le script change pour le joueur.
  - **nouveau bouton** : un bouton (ou un cadre avec ses boutons) qui n'existait pas ;
  - **bouton existant modifié** : un bouton de base de l'outil garde sa place mais change de comportement (coût, effet en plus, fenêtre de choix, condition) ;
  - **automatique** : ni l'un ni l'autre — un calcul appliqué d'office (valeur de combat, résistance, capacité) ou une réaction à l'action d'un joueur, avec un message.
  - « (prévu) » : script pas encore écrit ; c'est la forme envisagée, à confirmer.
- **Ce que fait l'outil** : où cela se passe et ce qui est appliqué.
- **Reste à faire (faisabilité)** : `facile` = bouton qui change des compteurs ou use un agent ; `moyenne` = bouton avec choix, plusieurs pions, dés ou état de la carte ; `difficile` = effet permanent ou à tout moment, réaction pendant le tour d'un autre ; `sans objet` = rien à automatiser.

Un script ne joue que si le joueur possède sa carte (technologie débloquée, habilité de sa faction) et s'il n'est pas désactivé dans l'outil « Scripts de règles ». Tout reste faisable à la main.

## Résumé chiffré

| Type | Total | oui | partiel | non | nouveaux boutons | boutons existants modifiés | automatiques |
|---|---:|---:|---:|---:|---:|---:|---:|
| Technologies | 101 | 94 | 4 | 3 | 43 | 19 | 45 |
| Habilités | 63 | 40 | 8 | 15 | 33 | 6 | 16 |
| Unités | 113 | 73 | 40 | 0 | 25 | 4 | 42 |
| Planètes | 30 | 25 | 2 | 3 | 15 | 8 | 12 |
| Mercenaires | 40 | 18 | 17 | 5 | 18 | 21 | 2 |
| Promesses | 19 | 16 | 3 | 0 | 14 | 2 | 4 |
| Agents et reliques | 2 | 2 | 0 | 0 | 0 | 2 | 0 |
| Événements | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| **Total** | **378** | **278** | **74** | **26** | **158** | **62** | **121** |

Les trois dernières colonnes comptent les scripts écrits (une carte peut en avoir deux : « bouton existant modifié + nouveau bouton »).

## Technologies

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 139 | Assimilation | **oui** | bouton existant modifié | Fiche d'un système : « Prendre possession » et « Revendiquer » posent une infanterie sur une planète sans propriétaire ; « Mobiliser » en pose une de plus, gratuite, sur une planète sauvage. | — |
| 140 | Culture courtisane | **oui** | bouton existant modifié + automatique | Recrutement (Ctrl + clic) : diplomates à −1. Ravitaillement automatique : +1 influence par alliance en jeu chez vous (éléments actifs et cases de tour). | — |
| 141 | Diversité | **oui** | automatique | Ravitaillement automatique : +1 influence par planète possédée. | — |
| 180 | Bâtiment résistant | **oui** | automatique | Conflit, bombardement : −1 aux tireurs sur une planète que vous possédez, −2 si vous y avez une structure. | — |
| 181 | Troupe d'élite | **oui** | automatique | Conflit, combat terrestre : +1 à vos infanteries. | — |
| 182 | Bombe bactériologique | **oui** | automatique | Conflit, bombardement : vos dégâts sont verts ; une infanterie biologique qu'ils détruisent en entraîne deux autres, identiques, de la planète (dégât encaissé ou glissé). | — |
| 183 | Bio stimulant | **oui** | bouton existant modifié | Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent) : une fenêtre propose de l'utiliser et de payer 2 ressources à la place. | — |
| 184 | Manipulation mentale | **oui** | nouveau bouton | Fiche d'un système, à côté de chaque planète : « Manipulation mentale » use un diplomate et pose une infanterie (une de vos unités dans le système ou un système voisin). | — |
| 185 | Récupération | **oui** | bouton existant modifié | Conflit : « Terminer le combat » reçoit une case « Récupération », cochée d'office (+1 ressource par unité détruite pendant le combat). Seul dans l'espace : gain immédiat. Sinon un test de domination « Récupération » s'ouvre : chaque camp soutient une des factions qui la demandent, s'engage contre toutes ou s'abstient, le résultat qui réunit le plus de contrôle l'emporte ; une seule faction à la demander : test de contrôle simple. Le gain est versé à la clôture du test. | — |
| 186 | Bouclier déflecteur | **oui** | bouton existant modifié + automatique | Conflit, canons spatiaux : −1 aux canons qui visent vos vaisseaux. Déplacement assisté : « Déplacer » est rouge gris à travers un champ d'astéroïdes, sauf avec cette technologie. | — |
| 187 | Apprentissage | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Apprentissage » remplace un de vos agents par un autre agent de base (celui de votre faction s'il le réimplémente). | — |
| 188 | Capsule de transport | **oui** | automatique | Capacité des vaisseaux (avertissement d'embarquement, chargement du déplacement assisté) : +1, +2 pour un transporteur. | — |
| 189 | Capsule de secours | **oui** | nouveau bouton | Conflit : cadre « Sauvetage » d'un combat — un jet par infanterie d'un vaisseau détruit (6 ou moins sur un dé de 10), puis un bouton par arrivée possible. | Accord du propriétaire du dock : non géré, comme demandé. |
| 190 | Écoles militaires | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : amiraux à −1. Fiche d'un système : « Combat spatial » donne +1 au premier combat que vous ouvrez dans le tour. | — |
| 191 | Logistique améliorée | **oui** | bouton existant modifié + automatique | Recrutement (Ctrl + clic) : logisticiens à −1. Capacité logistique : 3, plus 1 par logisticien posé sur la technologie (onglet Technologie) — taille d'une flotte au déplacement, production d'un dock. | — |
| 193 | IA industrielle | **oui** | automatique | Production ouverte avec un dock (Ctrl + clic) : 2 unités de plus ; sur une planète militaire, le coût total baisse de 2. | — |
| 194 | Arme amplifiée | **oui** | nouveau bouton + automatique | Plateau joueur, « Actions de mes technologies » : « Arme amplifiée » pose un scientifique sur un type de vaisseau de votre feuille. Conflit, combat spatial : +2 à ces vaisseaux. | — |
| 195 | Réparation improvisée | **oui** | nouveau bouton | Fiche d'un de vos vaisseaux endommagés : « Réparation improvisée » use un logisticien et répare (1 ressource par dégât) ; test de blocage d'abord si d'autres factions peuvent bloquer le vaisseau. | — |
| 196 | Système de visée | **oui** | automatique | Conflit, canons spatiaux et bombardement : +1 à vos tireurs. | — |
| 197 | Blindage en duranium | **oui** | automatique | Résistance +1 des vaisseaux amiraux, soleils de guerre, cuirassés et transporteurs (par type d'unité) ; affichée en vert, « 3 (+1) », dans Conflit. Texte de la carte complété (transporteurs). | — |
| 198 | Soleil de guerre | **oui** | automatique | Onglet Technologie : quand la dernière case de recherche est cochée, un soleil de guerre de la faction arrive dans les éléments actifs. | Pas de message si un soleil de guerre est produit sans la technologie. |
| 200 | Art du commerce | **oui** | bouton existant modifié + nouveau bouton | Recrutement (Ctrl + clic) : négociants à −1. Plateau joueur, « Actions de mes technologies » : « Art du commerce » utilise la technologie, la faction choisie gagne 2 commerce. | Réduction des dettes par la livraison : à la main. |
| 201 | École politique | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : politiciens à −1. Phase de proposition : « Piocher » donne 2 propositions de plus, même pour 0 influence. | — |
| 202 | Centre de coordination | **oui** | automatique | Conflit, combat spatial : +1 si le système contient un de vos docks ou votre vaisseau amiral. | — |
| 205 | Rapport de force | **oui** | nouveau bouton | Conflit, cadre de blocage d'un déplacement : « Rapport de force » use un diplomate, +2 à votre contrôle pour ce blocage ; même bouton dans les conflits de contrôle et de domination et dans les tests de blocage d'une action (bombardement, débarquement) — seulement pour un camp qui participe. | — |
| 206 | Réparation | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Réparation » use un diplomate, la faction choisie reçoit une dette de 3 à payer dans 3 tours. | Le bouton ne vérifie pas qu'une planète vient d'être prise. |
| 207 | Brevet | **oui** | automatique | Onglet Technologie : quand un autre joueur coche une case d'une technologie que vous possédez, +1 commerce (une fois par tour, par faction et par technologie), avec un message. | — |
| 208 | Trading | **oui** | automatique | « Phase suivante » à la fin de la phase de vote : un négociant posé (à la main) sur votre plateau de vote est votre prédiction ; +2 commerce si sa case est première de sa loi. | — |
| 209 | Archéologie | **oui** | bouton existant modifié + nouveau bouton | Fiche d'un système : « Fouiller la ruine » rapporte deux fragments, dont vous gardez un (choix en haut du volet de droite). Bandeau de la phase de science : « Archéologie : piocher un plan » use la technologie et un scientifique. | — |
| 210 | Université | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Université » use la technologie et l'agent choisi ; un agent du même type vous attend sur la case du tour suivant. | — |
| 211 | Pillage | **oui** | bouton existant modifié | Fiche d'un système : « Prendre possession » d'une planète d'une autre faction (et le conflit de contrôle) lui vole 2 commerce. | — |
| 212 | Propagande | **oui** | bouton existant modifié | Plateau général : le « + » de la piste d'infamie ouvre une fenêtre — dépenser un diplomate pour ne pas gagner le point. | — |
| 213 | Réseau de commerce | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : deux boutons de conversion, influence en ressources et l'inverse. | Les paiements eux-mêmes ne prennent pas l'autre ressource d'office. |
| 214 | Extorsion | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Extorsion » use un diplomate, dette de 3 pour la faction choisie, à payer dans 3 tours. | — |
| 216 | Science intégrée | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : scientifiques à −1. Livraison commerciale : une fenêtre propose d'user un scientifique, la faction livrée gagne 4 cases de recherche d'une technologie que vous possédez. | Les 4 cases se cochent à la main chez la faction livrée. |
| 217 | Rayon tracteur | **oui** | automatique | Conflit : dans le blocage d'un déplacement et les conflits de contrôle et de domination, vos vaisseaux à plus de 1 de résistance comptent 1 de contrôle de plus. | — |
| 218 | Exploration efficace | **oui** | bouton existant modifié | Onglet Espace, phase de science : tout joueur explore (Ctrl + clic sur un emplacement vide) en usant un scientifique et un logisticien. Avec la technologie, un seul des deux : s'il a les deux, l'onglet Décision fait choisir lequel. | — |
| 231 | Cartographie de l'espace | **oui** | automatique | Conflit, combat spatial et canons : −1 aux attaques contre vos vaisseaux dans un système à anomalie. | — |
| 232 | Exploitation du vide | **oui** | nouveau bouton + automatique | Ravitaillement automatique : +1 ressource par système vide dominé (+3 pour une nébuleuse). Un système vide disputé ouvre un conflit de domination (onglet Conflit) ; Ravitaillement automatique est rouge gris tant qu'il n'est pas résolu. | — |
| 233 | Moteur à gravité | **oui** | bouton existant modifié | Déplacement assisté : case « Moteur à gravité » — +1 mouvement, des scientifiques sont utilisés au départ. | — |
| 234 | Stratégie de saut | **oui** | automatique | Déplacement assisté puis Conflit : des vaisseaux arrivés par un trou de ver ont, ce tour, la frappe en premier et +1 au combat spatial. | — |
| 235 | Canon longue portée | **oui** | automatique | Conflit, canons spatiaux : la portée de vos canons passe à 2 (liste « Mes canons spatiaux à portée »). | — |
| 236 | Camouflage | **oui** | automatique | Blocage d'un déplacement : vos vaisseaux ne sont pas arrêtés par des unités. Conflit, combat spatial : tant qu'ils n'ont engagé personne, un engagement de faction ne les atteint pas (il faut les cibler). | — |
| 237 | Micro-téléporteur | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Micro-téléporteur » use un logisticien. | Le déplacement des unités se fait à la main (structures non vérifiées). |
| 238 | Stargate | **oui** | automatique | Déplacement assisté : chaque système où vous avez un dock a un trou de ver alpha. | — |
| 239 | Moteur FTL | **oui** | automatique | Déplacement assisté : +1 mouvement à tous vos vaisseaux. | — |
| 242 | Médecine | **oui** | bouton existant modifié | Conflit : avant « Terminer le combat » une de vos unités biologiques détruites, « Médecine : jet » (5 ou moins) permet de la capturer — elle va dans vos éléments actifs. | La remise en jeu (use un logisticien, planète à structure) se fait à la main. |
| 244 | Bouclier amplifié | **oui** | automatique | Résistance : +2 pour votre vaisseau amiral et vos systèmes de défense, +1 pour vos boucliers mobiles (en vert dans Conflit). | — |
| 245 | Cuve de clonage | **oui** | nouveau bouton | Fiche d'un système, à côté de « Mobiliser » : « Cuve de clonage » use aussi un scientifique — une infanterie de plus, tout gratuit. | — |
| 246 | Drain Spatial | **oui** | nouveau bouton | Conflit, cadre de blocage : avant d'entrer dans un système où vous avez un vaisseau amiral, un soleil de guerre ou un système de défense, vous exigez 1 ressource par vaisseau ou laissez passer ; le joueur paie ou s'arrête. | — |
| 247 | Réseau d'ingérence | **oui** | automatique | Onglet Vote : un de vos scientifiques posé sur votre plateau de vote vaut 2 voix. | — |
| 248 | Laser longue portée | **oui** | automatique | Conflit, canons spatiaux : votre vaisseau amiral a un canon (6, 3 dés) ; un canon tire une case plus loin si un scientifique est aussi utilisé. | — |
| 250 | Grappin de capture | **oui** | nouveau bouton | Conflit : un combat terminé reste affiché, résolu, jusqu'à la fin de la phase ; « Grappin de capture » y use un logisticien et capture un vaisseau adverse détruit, si vous contrôlez le système (conflit de contrôle si d'autres peuvent s'y opposer). | — |
| 251 | Argumentation véhémente | **oui** | nouveau bouton | Onglet Vote : « Argumentation véhémente » use un politicien (qui ne reste pas sur le plateau) et 1 influence ; 2 voix s'ajoutent tout de suite au décompte. | — |
| 252 | Stratégie dominante | **oui** | automatique | Conflit, combat spatial : +1 à vos unités à frappe en premier ; cibler un de vos vaisseaux coûte −4. | — |
| 253 | Avantage aérien | **oui** | automatique | Conflit, combat terrestre : vos infanteries ont la frappe en premier. | — |
| 269 | Commerce profitable | **oui** | automatique | Livraison commerciale : +1 à vos livraisons, +1 commerce quand vous en recevez une. | — |
| 270 | Connexion | **oui** | bouton existant modifié | Tout bouton qui utilise un agent : sans l'agent demandé, une fenêtre propose un négociant à sa place pour 2 commerce. | Pas pour les agents du déplacement assisté. |
| 273 | Exploitation de masse | **oui** | bouton existant modifié | Plateau joueur, « Esclaves » : un esclave dépensé rapporte 2 ressources ; fiche du Camp de travail : 6 ressources au lieu de 4. | — |
| 274 | Enrôlement | **partiel** | nouveau bouton | Fiche d'un système, à côté d'une planète où vous avez une structure, débarquement : use un logisticien et la structure, 2 de vos esclaves sont posés sur la planète sous votre contrôle. | Recapture à la fin du combat terrestre : à la main. |
| 399 | Adaptation des réacteurs | **oui** | automatique | Déplacement assisté : le −1 au mouvement de la Tempête spatiale est ignoré. | — |
| 400 | Adaptation de la visée | **oui** | automatique | Conflit : le −1 de la Tempête spatiale ne s'applique pas à vos unités ; la tempête finie, le Générateur de tempête ne vous touche plus. | — |
| 402 | Vaccin | **oui** | nouveau bouton | Plateau joueur, une seule fois : « Vaccin » +4 points, et une faveur neutre si personne ne l'avait avant ce tour. | — |
| 403 | Arme bactériologique | **oui** | nouveau bouton | Fiche d'un système, bombardement : use un scientifique, un dé par infanterie adverse des planètes du système — détruite sur 5 ou moins (1 si son propriétaire a le Vaccin). Le système doit être contrôlé (conflit de contrôle si d'autres peuvent s'y opposer). | — |
| 419 | Réparation improvisée (Conglomérat mercantile d'Hacan) | **oui** | nouveau bouton | Version de Hacan de « Réparation improvisée » (195) : même bouton, sur la fiche d'un vaisseau endommagé (test de blocage compris). | « Dans un système où vous avez une unité non bloquée » : non vérifié. |
| 445 | Station météorologique | **oui** | bouton existant modifié | Production : produire une Station météorologique sans cette technologie demande une confirmation. | — |
| 446 | Tempête électromagnétique | **partiel** | nouveau bouton | Fiche d'une nébuleuse, canons spatiaux : use un scientifique, active la nébuleuse, 4 dés de canon à 4 lancés par le serveur. La nébuleuse doit être contrôlée (conflit de contrôle si d'autres peuvent s'y opposer). | Répartition des touches à portée 1 : à la main. |
| 447 | Générateur de tempête | **partiel** | nouveau bouton + automatique | Fiche d'un système, combat spatial : la technologie et un scientifique sont usés, 3 ressources — tous les vaisseaux du système ont −1 au combat ce tour (la tempête finie, pas les factions qui ont Adaptation de la visée). | La flotte ciblée (−1 de plus) : à la main. |
| 448 | Exploitation des tempêtes | **oui** | nouveau bouton + automatique | Ravitaillement automatique : +3 ressources tant que la Tempête spatiale est active. Fiche d'une nébuleuse, science : use un scientifique et active le système, +4 ressources. La nébuleuse doit être contrôlée (conflit de contrôle si d'autres peuvent s'y opposer). | — |
| 481 | SIG-1 | **oui** | nouveau bouton | Plateau joueur : « SIG-1 : obtenir le signal n° 1 » — la carte cachée du signal 1 (tirée à la mise en place de Signal capté) arrive face visible dans vos éléments actifs, son marqueur libre « Signal 1 » quitte la table. | — |
| 482 | SIG-2 | **oui** | nouveau bouton | Plateau joueur : « SIG-2 : obtenir le signal n° 2 » (comme SIG-1). | — |
| 483 | SIG-3 | **oui** | nouveau bouton | Plateau joueur : « SIG-3 : obtenir le signal n° 3 » (comme SIG-1). | — |
| 484 | SIG-4 | **oui** | nouveau bouton | Plateau joueur : « SIG-4 : obtenir le signal n° 4 » (comme SIG-1). | — |
| 592 | Recomposition | **oui** | nouveau bouton | Conflit, « Terminer le combat » : le coût de vos unités biologiques détruites dans la phase est cumulé. Onglet Décision : le jet (autant de dés, réussite sur 3 ou moins), le nombre de réussites gardé, puis les vaisseaux produits dans le système choisi tant que leur coût cumulé tient dans ce nombre — un généticien (ou un logisticien) usé par vaisseau. | — |
| 593 | Croissance | **oui** | nouveau bouton | Fiche d'un de vos vaisseaux biologiques, production : deux boutons (use la technologie, ou use un généticien) ; le vaisseau de remplacement, qui coûte jusqu'à 2 de plus, se choisit dans l'onglet Décision. | — |
| 594 | Vie fructifiante | **oui** | automatique | Ravitaillement automatique : Sève de vie rend 2 de résistance au lieu d'une. | — |
| 787 | Réseau | **oui** | automatique | Ravitaillement automatique : +2 influence par satellite — stations possédées (planètes de type station) et unités satellites sur la carte. | — |
| 788 | Stratégie d'évitement | **oui** | nouveau bouton | Conflit, combat spatial, avant les attaques : « Stratégie d'évitement : vaisseaux cochés » — ils ont −1 au combat, et un tireur dont le premier engagement ne vise qu'eux a −1. | — |
| 789 | Contact mercenaire | **oui** | nouveau bouton | Fiche d'un système à portée 2 d'un satellite que vous possédez, diplomatie : la technologie est usée, un vaisseau militaire de votre faction (onglet Décision) est produit dans le système, payé en influence. | — |
| 791 | Stimulant | **oui** | nouveau bouton | Plateau joueur : la technologie est usée, une fenêtre numérotée fait choisir un agent usé (cube noir d'un mercenaire compris), qui redevient disponible. | — |
| 803 | Prévision des combats | **oui** | nouveau bouton | Fiche d'un système, combat spatial : la technologie et un scientifique sont usés — vos vaisseaux de ce système ont la frappe en premier ce tour (écran de combat). | — |
| 804 | Calcul de probabilité | **oui** | nouveau bouton | Plateau joueur : « Calcul de probabilité » consulte pour vous seul les cartes face cachée du déroulé du tour prochain ; leur contenu s'affiche dans votre journal. | — |
| 805 | Anticipation | **partiel** | nouveau bouton | Plateau joueur, combat spatial, quand Memoria est sur la carte : la technologie et un scientifique sont usés. | Le déplacement de Memoria : à la main. |
| 806 | Opportunité prédite | **oui** | nouveau bouton | Plateau joueur, recrutement (une fois par tour) : une fenêtre numérotée fait choisir un agent de base ; un agent de ce type est pris dans le sac (ou créé) et posé sur la case de recrutement 4. | « À tout moment » : limité à une fois par tour. |
| 807 | Relais d'influence | **oui** | automatique | Ravitaillement automatique : +2 influence par station possédée. | — |
| 816 | Ouverture de faille | **oui** | nouveau bouton | Fiche d'un système : la technologie et un scientifique sont usés, un jeton trou de ver oméga est posé dans le système. | — |
| 817 | Communication avec les êtres de la faille | **oui** | nouveau bouton | Fiche d'un système où est une Nef de la rupture qui n'est pas à vous : use un diplomate, 4 influence, la Nef passe sous votre contrôle. | — |
| 818 | Énergie de la faille | **oui** | automatique | Conflit, combat spatial : +1 à vos vaisseaux. | — |
| 819 | Soldats déphasés | **oui** | automatique | Conflit, combat terrestre : +1 à vos forces terrestres. | — |
| 820 | Stabilisateur de rupture | **oui** | automatique | Cadre de blocage, passage par un trou de ver oméga : un jet de 9 ou plus ne donne plus de touche à vos vaisseaux. | — |
| 821 | Extraction de la faille | **oui** | automatique | Ravitaillement automatique : +3 ressources par Faille dominée (seul dans son espace, ou vainqueur d'un test de domination ce tour) ; une Faille disputée retient le ravitaillement jusqu'au test. | — |
| 857 | Piraterie informatique | **oui** | nouveau bouton | Plateau joueur, deux boutons : le commerce choisi (fenêtre) est converti à 2 ressources, ou à 2 influence, chacun. | — |
| 871 | Navigation delta (Fantômes de Creuss) | **oui** | automatique | Déplacement assisté : les trous de ver delta sont utilisables ; sans cette technologie ni la promesse Passage de Creuss, l'étape demande une confirmation. | — |
| 941 | Pluie d'astéroïdes (Pirate Mentak) | **oui** | nouveau bouton | Fiche d'un système, à côté d'une planète à portée 3 d'un champ d'astéroïdes non activé : le champ le plus proche est activé, un logisticien et un amiral sont usés, le marqueur « Ciblage astéroïde » est posé. Au bombardement, « attaque 4 sur chaque unité » : un dé par unité de la planète, 1 dégât sur 4 ou moins, marqueur retiré. | — |
| 959 | Fouille des nébuleuses (Les Empyréens WIP) | **oui** | nouveau bouton | Fiche d'une nébuleuse, science : use un scientifique, active la nébuleuse, +1 fragment spatial. | — |
| 1025 | Réacteurs solaires (Braises de Muaat WIP) | **oui** | automatique | Déplacement assisté : +1 au mouvement de vos soleils de guerre. | — |
| 1026 | Coque stellaire (Braises de Muaat WIP) | **oui** | automatique | Résistance de vos soleils de guerre : +1 (Conflit, fiche de l'unité). | — |
| 1027 | Armement solaire (Braises de Muaat WIP) | **oui** | automatique | Conflit, combat spatial : +2 pour vos soleils de guerre. | — |
| 1028 | Forge stellaire (Braises de Muaat WIP) | non | nouveau bouton (prévu) | — | Production de 3 vaisseaux ou mechs par un soleil de guerre dans une supernova. (moyenne) |
| 1029 | Canon solaire (Braises de Muaat WIP) | non | automatique (prévu) | — | Canon 5*** portée 2 dans une supernova : la portée au-delà de 1 n'est pas gérée. (moyenne) |
| 1030 | Cœur instable (Braises de Muaat WIP) | non | nouveau bouton (prévu) | — | Marqueur « Instable », explosion au bombardement suivant, système remplacé par une supernova. (difficile) |

## Habilités

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 24 | Libre échange | **oui** | automatique | Conflit, « Terminer le combat » : détruire un vaisseau de commerce non militaire rapporte 1 infamie à qui a infligé le dernier dégât. | — |
| 36 | Vente au Bazaar | non | à définir (prévu) | — | Marché public avec achats par les autres factions : transactions non gérées. (difficile) |
| 144 | Clé de l'empire | **oui** | nouveau bouton | Fiche du système, à côté de Mecatol Rex, production : « Clé de l'empire » — un logisticien est dépensé, les systèmes de défense de la planète perdent leurs dégâts. | — |
| 145 | Destin légendaire | **oui** | bouton existant modifié | Ravitaillement automatique : +1 point par planète légendaire possédée. La faction qui vous prend une planète légendaire (possession, revendication) gagne +1 point et +1 infamie. | — |
| 146 | Mandat | **partiel** | bouton existant modifié + nouveau bouton | Onglet Transactions : un mandat donné sans contrôler Mecatol Rex, hors d'une transaction que vous proposez, ou à une faction qui en a déjà un, est signalé et demande une confirmation à l'application. Plateau joueur : « Mandat : révoquer » (use un diplomate, choix dans l'onglet Décision) et « Mandat : épuiser / rétablir » selon que vous contrôlez Mecatol Rex. | Effets propres à chaque mandat : à la main. |
| 156 | Raid | **oui** | nouveau bouton + automatique | Fiche d'un système, à côté d'une planète : « Raid » (une unité à raid dans l'espace). Conflit, combat « Raid » : seules les infanteries sont des cibles (s'il y a d'autres unités militaires, il faut cibler) ; chaque infanterie touchée est capturée (éléments actifs du raideur). Sans infanterie, une réussite capture un esclave de qui possède la planète. Les effets des bombardements s'appliquent. | — |
| 157 | Esclaves | **oui** | nouveau bouton | Plateau joueur : « Esclaves : dépenser un esclave (+1 ressource) ». Un esclave est une infanterie d'un autre camp posée dans vos éléments actifs. | Capturer une infanterie : à la main (la déplacer dans ses éléments actifs). |
| 158 | Exécuter les otages | **partiel** | nouveau bouton | Plateau joueur, prévote : « Exécuter les otages » dépense un de vos esclaves de la faction choisie (onglet Décision) ; un message rappelle ce qu'elle doit faire. | Vote forcé ou infamie de la faction visée : à la main. |
| 159 | Restituer les otages | **oui** | nouveau bouton | Fiche de votre unité qui livre : « Restituer les otages » rend jusqu'à 2 de vos esclaves à la faction à comptoir du système, posés avec son comptoir (planète ou bord). | — |
| 160 | Conclave secret | **partiel** | automatique | Ravitaillement automatique aux tours 1, 4, 6, 8, 9 et 10 : un objectif militaire est pioché dans la main. | Marquer l'objectif précédent : à la main. |
| 166 | Vassalisation forcée | **partiel** | nouveau bouton | Plateau joueur, diplomatie : un diplomate est dépensé, la promesse Vassal de la faction choisie (onglet Décision) arrive dans vos éléments actifs avec son marqueur. | Condition (5 systèmes, natal pour 3) : à vérifier à la main. |
| 167 | Fierté | **partiel** | bouton existant modifié | Conflit d'accord (revendication) : « Accepter » est grisé pour le camp qui possède la planète revendiquée. | Décompte des points : à la main. |
| 168 | Seigneur | **partiel** | nouveau bouton | Plateau joueur : « Seigneur » transforme un de vos agents disponibles (amiral, politique ou diplomate, choix dans l'onglet Décision) en Seigneur. | Déclencheurs (destruction, vote de siège, vassal) : constatés à la main. |
| 254 | Domination | **oui** | nouveau bouton | Fiche d'un système, ravitaillement à partir du tour 7, à côté d'une planète légendaire ou militaire que vous ne possédez pas : « Domination : désigner ». Plateau joueur : « Domination : +2 points » si vous la possédez. | — |
| 404 | Aide humanitaire (Peste lointaine) | **oui** | nouveau bouton | Fiche d'une de vos unités à livraison, dans un système à trou de ver alpha ou bêta : « Aide humanitaire : livrer » compte son commerce pour votre faction. Le décompte est sur la carte « Bilan de l'aide humanitaire » (#1038). | — |
| 406 | Mouvement pirate | non | automatique (prévu) | — | Déplacement automatique des pirates avec recherche de chemin : déplacement non géré. (difficile) |
| 427 | Sève de vie | **oui** | automatique | Ravitaillement automatique : chaque unité biologique du joueur posée sur la carte récupère 1 de résistance. | — |
| 441 | Étude des tempêtes | **oui** | nouveau bouton | Fiche d'un système sans planète, phase de science : use un scientifique, active le système, +2 de recherche tempête (+4 dans une nébuleuse), notée au journal de recherche. | — |
| 442 | Tempête spatiale | **oui** | automatique | Posée sur la table, elle vaut pour tous : −1 au mouvement (déplacement assisté), −1 aux canons spatiaux et à tous les combats (Conflit). | — |
| 443 | Fin de la tempête | **oui** | nouveau bouton | Fiche de la carte (posée sur la table), phase d'événement : « Appliquer la fin de la tempête » — la Tempête spatiale est retirée de la table, chaque faction marque 2 points par niveau de connaissance de tempête, celle qui en a le plus (seule) 3 de plus ; les stations météorologiques ne génèrent plus de recherche tempête. | — |
| 452 | Péage aux frontières | **oui** | nouveau bouton | Fiche de la carte, phase d'événement : « Percevoir le péage aux frontières » — 3 commerce à la faction qui domine chaque système à trou de ver alpha ; un système disputé sans test de domination clos ne rapporte rien (rouge gris). | — |
| 453 | Offre d'asile | **oui** | nouveau bouton | Fiche d'un système, phase d'événement, à côté d'une de vos planètes (l'habilité sur la case Événement du tour) : autant de points que son influence, sa carte est retirée, 6 Milices et un Entrepôt d'aide y sont posés, l'alliance Tuteur des réfugiés arrive chez vous. | — |
| 486 | Cache | **oui** | nouveau bouton | Fiche d'un système qui contient un fragment de relique, revendication : « Cache : prendre un fragment » si vous dominez le système. | — |
| 487 | BDD technique | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 1 de recherche par fragment de relique possédé, notée au journal de recherche. | — |
| 491 | Présence de cache | **oui** | bouton existant modifié | Explorer (Ctrl + clic sur un emplacement vide) : un fragment de relique tiré du sac est posé sur le système découvert. | — |
| 515 | Distorsion gravitationnelle | **oui** | nouveau bouton | Fiche du système qui porte l'habilité (Avar), ravitaillement : un dé par unité du système, 1 dégât si le dé fait le numéro du tour ou moins ; une fois par tour. | — |
| 522 | Diplomatie pirate | **oui** | nouveau bouton | Bandeau « À faire », phase de diplomatie, quand un vaisseau pirate est sur la carte (toute faction) : use un diplomate, 3 commerce, l'alliance « Pacte pirate » arrive dans les éléments actifs (une fois par tour). | — |
| 523 | Combat pirate | non | automatique (prévu) | — | Engagements automatiques d'une faction non jouée, selon plusieurs critères de priorité. (difficile) |
| 528 | Combat du Khan | non | automatique (prévu) | — | Combat automatique contre des flottes désignées : flottes et engagements non gérés. (difficile) |
| 529 | Déplacement du Khan | non | automatique (prévu) | — | Vote spécial puis déplacement et blocage du Khan : ni l'un ni l'autre gérés. (difficile) |
| 530 | Débarquement du Khan | **oui** | nouveau bouton | Bandeau « À faire », débarquement, quand le Palais du khan est sur la carte : 1D6 Soldats du Khan sur chaque planète à portée 1, une fois par tour pour la table. | — |
| 558 | Rébellion en cours | **oui** | automatique | « Nouveau tour » : 1D3 rebelles de plus sur chaque planète possédée par un joueur où il y en a déjà (dé lancé par le serveur, annoncé). | — |
| 560 | Négocier avec les rebelles | **oui** | nouveau bouton | Fiche d'un système, à côté d'une planète où il y a des Rebelles, diplomatie : use un diplomate, 3 dés à 4, chaque réussite retire un Rebelle. | — |
| 561 | Rébellion armée | **partiel** | nouveau bouton | Bandeau « À faire », combat terrestre : un combat terrestre est ouvert sur chaque planète où il y a 6 Rebelles ou plus. | Reprise de la planète à la revendication : à la main. |
| 563 | Armer les rebelles | **oui** | nouveau bouton + automatique | Plateau joueur, combat terrestre, quand des Rebelles sont sur la carte : 3 ressources, les Rebelles ont +1 au combat ce tour (une fois par tour pour la table). | « Vos unités adjacentes » : non vérifié. |
| 720 | Vote du conclave | **partiel** | nouveau bouton + automatique | Bandeau « À faire », quand le Conclave secret est sur la table : prévote — un dé par Soutien politique du Conclave, activé sur 2 ou moins ; vote — 1D10 voix (3D10 si « Soutien au conclave » est en jeu). Onglet Vote : colonne « Conclave » du décompte, ses voix contre « Lutte contre la corruption », pour « Ouverture bureau des mercenaires » et « Soutien au conclave ». | « Dissolution du sénat » (pour lui-même, avec ses Soutiens politiques) : ajustement manuel de sa colonne. |
| 722 | Achat de votes | **oui** | nouveau bouton | Bandeau « À faire », diplomatie, quand le Conclave secret est sur la table, une fois par tour : use un diplomate, un Soutien politique de valeur 3 à votre marqueur est posé chez le Conclave, 5 commerce vous attendent sur votre case du tour T+2. | — |
| 725 | Milice au coeur du pouvoir | **oui** | automatique | « Nouveau tour », à partir du tour 8, habilité posée sur la table : 1D10 miliciens mercenaires sur Mecatol Rex (2D10 si la loi « Ouverture bureau des mercenaires » est en jeu). | — |
| 764 | Confrérie de mercenaire | **oui** | bouton existant modifié + nouveau bouton | Recrutement (Ctrl + clic sur un mercenaire) : le surcoût du tour est ignoré. Bandeau « À faire » du recrutement : « piocher un mercenaire » (dans la main, à poser sur la case de son choix), une fois par tour. | — |
| 765 | Signal | **oui** | automatique | Ravitaillement automatique : un marqueur de signal est posé sur un système tiré au hasard. | — |
| 814 | Rupture de l'espace-temps | **oui** | automatique | Déplacement assisté : passage par un trou de ver oméga, un dé de 10 par vaisseau (3 ou moins bloqué, 9 ou plus une touche), dans le cadre de blocage. | — |
| 815 | Étude des failles | **oui** | nouveau bouton | Fiche d'une Faille, phase de science : use un scientifique, active le système, +2 de recherche de rupture, notée au journal de recherche. | — |
| 837 | Réfugiés | **oui** | nouveau bouton | Bandeau « À faire », ravitaillement : 2 Milices sur chaque planète des Réfugiés (celles qui ont un Entrepôt d'aide), une fois par tour pour la table. | — |
| 838 | Entraîner les milices | **oui** | nouveau bouton + automatique | Plateau joueur du détenteur de Tuteur des réfugiés, une fois par partie : 4 ressources, un amiral est posé sur l'alliance ; tant qu'il y est, les Milices ont +2 au combat. | — |
| 839 | Enrôlement des milices | **oui** | nouveau bouton | Fiche d'un système, à côté d'une planète des Réfugiés, pour le détenteur de Tuteur des réfugiés : use un diplomate, la planète est activée, 3 Milices passent sous votre contrôle. | — |
| 844 | Maître du pillage | **oui** | automatique | Chaque pillage rapporte 1 commerce de plus. | — |
| 895 | Sans influence | **oui** | bouton existant modifié | Recrutement, propositions et boutons de script qui coûtent de l'influence : payés en ressources. Ravitaillement automatique : aucune influence gagnée. | Autres dépenses d'influence : à la main. |
| 896 | Infiltration | **oui** | nouveau bouton + automatique | Conflit, « Terminer le combat » : détruire un vaisseau donne un token Infiltration (éléments actifs, aux couleurs de la faction touchée). Plateau joueur, science : « Infiltration : +4 recherche » — use un scientifique et 2 infiltrations (usées jusqu'au nouveau tour), recherche notée au journal. | Prendre 2 infiltrations envers la même faction : à la main. |
| 913 | École militaire (Fédération de Sol WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 915 | Nomade (Clan de Saar WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 916 | Pillage (Clan de Saar WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 917 | Cartographie du chaos (Clan de Saar WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 919 | Menace (Néo-peste WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 920 | Contamination (Néo-peste WIP) | non | automatique (prévu) | — | Bombardement : les unités touchées deviennent des Infanteries infectées (#1014) au lieu d'être détruites — à brancher sur « Terminer le combat ». (moyenne) |
| 922 | Recherche des alphas (Sardakk N'orr WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 923 | Menace (Sardakk N'orr WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 925 | Droit de passage (Les Empyréens WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 926 | Émanation du vide (Les Empyréens WIP) | **oui** | automatique | Déplacement assisté : aucune nébuleuse ne met fin à vos mouvements. | — |
| 927 | Influent (Les Empyréens WIP) | non | — | Habilité vide d'une faction WIP : nom seul, pas de texte de règle. | Texte à écrire. (sans objet) |
| 942 | Racket (Pirate Mentak) | **oui** | nouveau bouton | Fiche d'un système, ravitaillement, à côté d'une planète d'une autre faction dans un système où vous avez des unités militaires : « Racket » ouvre un test de domination (onglet Conflit) ; à sa clôture, si vous dominez, vous gagnez les ressources de la planète et son propriétaire les perd. Une fois par tour et par planète. | — |
| 1022 | Physiologie gashlai (Braises de Muaat WIP) | **oui** | automatique | Déplacement assisté : une supernova sur le trajet n'est plus un obstacle. | — |
| 1023 | Étude de la forge (Braises de Muaat WIP) | **oui** | nouveau bouton | Fiche d'une supernova, science : use un scientifique, active le système, 4 de recherche de forge d'arme notée au journal de recherche. | Recherche de forge sur une planète : comme les autres sciences, à la main. |
| 1038 | Bilan de l'aide humanitaire (Peste lointaine) | **oui** | nouveau bouton | Fiche de la carte : « Aide humanitaire : faire le décompte » — 1 point par 4 commerce livrés, une faveur neutre à qui en a livré le plus (seul) ; les cartes « Aide humanitaire » et « Bilan de l'aide humanitaire » sont retirées. L'événement « Peste lointaine » (#1039) a son bouton « Mettre en place » : Vaccin et Arme bactériologique dans la main de chaque joueur, Aide humanitaire au tour T, le bilan au tour T+3. | — |

## Unités

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 7 | Cuirassé | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 8 | Croiseur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 9 | Transporteur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 10 | Destroyeur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 11 | Frégate marchande | **oui** | nouveau bouton + automatique | Fiche de l'unité : « Livraison commerciale (3) » si une autre faction a un comptoir dans le système — un négociant est utilisé, la frégate dépensée, les dettes réduites. Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 12 | Infanterie | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 13 | Mech | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 14 | Dock | **partiel** | nouveau bouton | Phase de production : Ctrl + clic sur le dock ouvre une production comptée (un logisticien utilisé ; capacité logistique du joueur, vaisseaux et mechs ; le reste de la réserve est cerclé de rouge ; pose dans le système du dock). | Réparation et comptoir non contrôlés selon le système du dock. |
| 15 | Système de défense | **oui** | nouveau bouton | Conflit, canons spatiaux : listé dans « Mes canons spatiaux à portée » (notation « 6** » lue : 6, 2 dés) ; le choisir use un amiral et pose un marqueur d'activation. | — |
| 16 | Usine | **oui** | automatique | Ravitaillement automatique : +2 ressources par usine posée sur la carte. | — |
| 17 | Soleil de guerre | **oui** | automatique | Produire un soleil de guerre sans la technologie « Soleil de guerre » demande une confirmation. | — |
| 20 | Frégate marchande (Conglomérat mercantile d'Hacan) | **oui** | nouveau bouton + automatique | Fiche de l'unité : « Livraison commerciale (3) » si une autre faction a un comptoir dans le système — un négociant est utilisé, la frégate dépensée, les dettes réduites. Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 21 | Soleil d'or (Conglomérat mercantile d'Hacan) | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | −2 commerce au déplacement ; comptoir. |
| 22 | Mecha d'archéologie (Conglomérat mercantile d'Hacan) | **oui** | bouton existant modifié | « Fouiller la ruine » n'use pas de scientifique sur une planète où le joueur a un Mecha d'archéologie. | — |
| 23 | Statue en or (Conglomérat mercantile d'Hacan) | **oui** | automatique | Ravitaillement automatique : +1 point par statue. Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 35 | Bazaar (Conglomérat mercantile d'Hacan) | partiel | à définir (prévu) | Caractéristiques de l'unité déjà utilisées. | Renvoie à « Vente au Bazaar » : marché et transactions non gérés. (difficile) |
| 148 | Salai Sai Corian (Héritiers de Winnu) | **partiel** | automatique | Conflit, combat spatial : +1 par vaisseau adverse que visent ses engagements. | Production 1 non suivie. |
| 151 | Gloire au juste (Héritiers de Winnu) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Ravitaillement automatique selon le possesseur de Mecatol Rex ; texte à clarifier. (moyenne) |
| 152 | Raideur (Kabal de l’ombre) | **oui** | nouveau bouton + automatique | Conflit : raid (combat « Raid », 5 ×2), frappe en premier, furtif. | — |
| 153 | Arche de l'ombre (Kabal de l’ombre) | **oui** | nouveau bouton + automatique | Conflit : raid (combat « Raid », 5 ×4), frappe en premier, furtif. | — |
| 154 | Camp de travail (Kabal de l’ombre) | **oui** | nouveau bouton + automatique | Fiche de l'unité, production : « Camp de travail : +4 ressources » — le camp est usé, un esclave dépensé. Conflit, « Terminer le combat » : détruit, 2 esclaves de son propriétaire sont dépensés et le destructeur pose 2 de ses infanteries sur la planète. | Le choix des esclaves revient au destructeur : l'outil prend ceux des autres factions d'abord, à corriger à la main. |
| 155 | Portail de repli (Kabal de l’ombre) | **partiel** | bouton existant modifié | Phase de construction, case « Construction » : glisser le portail vers un système le reforge au lieu de le construire — aucun logisticien utilisé, un scientifique et 2 fragments spatiaux dépensés, +1 point. | Ravitaillement automatique : replace ici les « Raideur » détruits au tour précédent. (moyenne) |
| 162 | Quetzalcoalt (Volée argentée) | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Point de fin de combat avec trois vaisseaux militaires engagés. |
| 163 | Destroyeur (Volée argentée) | **oui** | nouveau bouton | Fiche de l'unité, combat spatial : « Deux attaques (1 influence) » — l'écran de combat lui donne deux fois plus de dés ce tour. | — |
| 164 | Complexe de guerre (Volée argentée) | **partiel** | automatique | Ravitaillement automatique : un destroyeur de la faction est posé dans le système du complexe. Conflit, combat spatial : vos destroyers ont +1 (non cumulable) dans son système et les systèmes adjacents. | Contrôle du système non vérifié. |
| 165 | Centre d'expansion (Volée argentée) | **oui** | nouveau bouton + automatique | Fiche d'un système où vous n'avez pas d'unité, ravitaillement (une fois par tour, avec un Centre d'expansion sur la carte) : +1 au combat spatial dans ce système pour le tour. | — |
| 171 | Mech Aérien (Volée argentée) | **partiel** | automatique | Conflit, combat spatial : depuis une planète du système, il tire (il n'est pas une cible). | Réparation 2 non suivie. |
| 172 | J.N.S. Hylarim (Université de Jol-Nar) | **oui** | nouveau bouton | Conflit, combat spatial : « Annuler 1 (1 ressource) » sur une autre de vos unités qui doit encaisser — le dégât est annulé. | — |
| 173 | Cuirassé (Université de Jol-Nar) | oui | — | Bombardement noté « 5\*\* » : vérifier que l'outil lit bien cette notation. | — |
| 174 | Destroyeur (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 175 | Bouclier mobile (Université de Jol-Nar) | **oui** | nouveau bouton | Conflit, combat terrestre : « Annuler 1 (1 ressource) » sur une autre de vos unités de la planète qui doit encaisser — le dégât est annulé. | — |
| 176 | Laboratoire (Université de Jol-Nar) | **oui** | bouton existant modifié | « Rechercher » rapporte 1 de recherche de plus sur une planète où le joueur a un Laboratoire. | — |
| 177 | Système de défense (Université de Jol-Nar) | **oui** | nouveau bouton | Conflit, bombardement et raid : « Annuler 1 (1 ressource) » sur une autre de vos unités de la planète qui doit encaisser — le dégât est annulé. | — |
| 178 | Sphère de dyson (Université de Jol-Nar) | **partiel** | nouveau bouton | Fiche de l'unité, phase de science : use un scientifique, +2 ressources par niveau de connaissance spatiale. | Règle de pose (nébuleuse, supernova) non vérifiée. |
| 199 | Soleil de guerre (Université de Jol-Nar) | **oui** | automatique | Confirmation à la production sans la technologie ; valeur de contrôle lue par `#con`. | — |
| 243 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 407 | Vaisseau pirate (Pirate) | **oui** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. Ses dés qui font 0 touchent d'abord un vaisseau de commerce du camp visé ; furtif dans un système à anomalie. | — |
| 423 | Letani (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 428 | Arbre gardien (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 431 | Transporteur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 444 | Station Météorologique | **oui** | bouton existant modifié + automatique | Ravitaillement automatique : 2 de recherche tempête et 1 de recherche spatiale par station, notées au journal de recherche ; plus de recherche tempête après la « Fin de la tempête ». | Règle de pose (système sans planète) non vérifiée. |
| 461 | Cuirassé (Omni-esprit d'Arborec) | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 462 | Croiseur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 463 | Destroyeur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 464 | Fruit de vie (Omni-esprit d'Arborec) | **partiel** | nouveau bouton | Fiche de l'unité : « Livraison commerciale (5) » si une autre faction a un comptoir dans le système. | — |
| 465 | Arbre père (Omni-esprit d'Arborec) | **oui** | automatique | Ravitaillement automatique : un Fruit de vie est créé dans l'espace du système de l'arbre. | — |
| 466 | Épineux géant (Omni-esprit d'Arborec) | **oui** | automatique | Conflit, bombardement de sa planète : il attaque aussi les unités terrestres, avec sa valeur de combat. | — |
| 467 | Arbre mère (Omni-esprit d'Arborec) | **oui** | automatique | Ravitaillement automatique : autant de Letani que le niveau de connaissance génétique, posés sur la planète de l'arbre. | — |
| 470 | Graine d'eden (Omni-esprit d'Arborec) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Résistance sans plafond à permettre ; bouton posant « New eden » à 6 de résistance. (moyenne) |
| 472 | Duha Menaimon (Omni-esprit d'Arborec) | **oui** | nouveau bouton + automatique | Conflit, combat spatial : autant d'attaques que votre niveau de connaissance génétique. Bombardement : « Duha Menaimon : jet » — au plus ce niveau, un Letani est posé sur la planète. | — |
| 490 | Armageddon conquis | **partiel** | nouveau bouton | Fiche de l'unité, science (Reforger) : 3 fragments militaires, un scientifique est posé sur l'unité et y reste. | Portée du canon +1 et 2 points de plus au décompte : à la main. |
| 496 | Cuirassé impérial | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Réaction automatique d'une unité neutre aux engagements des autres joueurs. (difficile) |
| 509 | Dinosaure | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 511 | Garde impériale | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 512 | Station de combat | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 513 | Canon ancien | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 514 | Canon restauré | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 516 | Mech géant | **oui** | automatique | Compte pour 3 dans la capacité d'un vaisseau (avertissement à l'embarquement, déplacement assisté) ; valeur de contrôle lue par `#con`. | — |
| 524 | Frégate du Khan (Invasion du grand Khan) | **oui** | nouveau bouton | Conflit : détruite, « Riposte du khan » — son destructeur lance un dé (6 ou moins, 4 si l'unité qui l'a détruite a la frappe en premier) et encaisse 1 dégât sur une de ses unités ; elle se retire ensuite. | — |
| 525 | Palais du Khan (Invasion du grand Khan) | **oui** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. L'engager (ciblé ou dans un groupe) coûte −1 pour toucher par frégate du khan, moitié moins (arrondi au-dessus) avec #prec ; ce malus remplace le −2 du ciblage. | — |
| 527 | Soldat du Khan (Invasion du grand Khan) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 554 | Monument éternel | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | « Dégâts : pillage 3 au lieu » : lu comme un pillage de 3 à la destruction, à confirmer ; points par contributions. |
| 557 | Rebelle (Rébellion interplanétaire) | **oui** | automatique | Conflit, combat terrestre : furtif — un engagement de groupe ne l'atteint pas, et il ne riposte qu'à qui le cible. | — |
| 568 | Indigène | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un diplomate, lance 4 dés à 3 contre cette unité. (moyenne) |
| 569 | Vaisseau portail | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Sert de trou de ver alpha : à brancher sur le déplacement assisté. (difficile) |
| 570 | Cuve de Clonage | **oui** | nouveau bouton | Fiche de l'unité, production : la cuve est usée, 2 infanteries de votre faction sont posées sur sa planète. | — |
| 571 | Arbre de vie éternelle | **partiel** | nouveau bouton | Fiche de l'unité, phase de production : l'arbre est usé et prend 1 dégât, +4 commerce. | Soin en phase de science (coût « #regen(2) » à préciser) ; points du décompte. |
| 572 | Étoile de la mort | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de déplacement : use logisticien, amiral et scientifique ; valeur de contrôle non calculée. (moyenne) |
| 573 | Vaisseau gigantesque | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 574 | Ravageur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 575 | Corsaire | **oui** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 576 | Vaisseau antique | **oui** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. (4 commerce et 1 point) | — |
| 578 | Canon de Meer | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 582 | Telluran | **oui** | automatique | Conflit, combat spatial : frappe en premier, furtif. | — |
| 590 | Colonie Ladaran | **partiel** | automatique | Ravitaillement automatique : une infanterie de la faction est créée à bord. Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Points du décompte. |
| 591 | Destroyeur Tak'Qav | oui | — | Bombardement noté `#bomb(6)` sans nombre de dés : notation à vérifier. | — |
| 597 | Myru Vos | **oui** | automatique | Conflit : précis, furtif ; « Terminer le combat » d'un vaisseau de commerce qu'il a détruit : +2 commerce. | — |
| 598 | Magmus | **oui** | nouveau bouton | Fiche de l'unité : « Un vaisseau détruit ici » — +1 de recherche militaire, notée au journal de recherche. | — |
| 599 | Ggrocuto Rinn | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Déplacement furtif et exploration par déplacement : à brancher sur le déplacement assisté. (difficile) |
| 600 | Nekro Acidos | **oui** | automatique | Conflit, combat terrestre : autant d'attaques que votre niveau de connaissance militaire (aucune à 0). | — |
| 601 | Riftwalker Meian | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Déplacement furtif : à brancher sur le déplacement assisté. (difficile) |
| 723 | Milicien mercenaire (Conclave secret) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 732 | S'Ula Mentarion | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Marqueur posé à la destruction d'un vaisseau de commerce ; bouton : le dépenser, livraison 5. (moyenne) |
| 745 | Olivier Dubois | **oui** | nouveau bouton | Conflit, combat terrestre : « Olivier Dubois : +2 aux infanteries cochées » — au plus votre capacité logistique, pour ce combat. | — |
| 746 | Bombardier Lourd | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 747 | Combattant Voyageur | **partiel** | nouveau bouton | Fiche de l'unité, débarquement : l'unité est usée, 3 ressources. | Le déplacement (3 de distance au plus) : à la main. |
| 766 | Memoria (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense un signal, +4 cases de recherche de signal. (facile) |
| 767 | Memoria B (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense un signal, +4 cases de recherche de signal. (facile) |
| 768 | Memoria A (Le Nomade) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton signal facile ; furtivité et malus d'anomalie liés au déplacement. (difficile) |
| 769 | Memoria D (Le Nomade) | **partiel** | nouveau bouton | Conflit : une de vos infanteries détruites — « Memoria D : jet (6 ou moins) », puis « Poser sur Memoria D » (à bord). | Dépense d'un signal (recherche de signal) : à la main. |
| 770 | Memoria C (Le Nomade) | **partiel** | automatique | Ravitaillement automatique : une frégate marchande est créée dans le système. | Dépense d'un signal ; revendication. |
| 786 | Centre de contrebande (Le Nomade) | **oui** | automatique | Ravitaillement automatique : 3 ressources et 3 influence, moins 1 par autre centre de contrebande à 3 systèmes ou moins. | — |
| 810 | Nef de la rupture (Rupture de l'espace-temps) | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Ignore blocage et trous de ver oméga. |
| 835 | Milice (Réfugiés) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 836 | Entrepôt d'aide (Réfugiés) | **partiel** | automatique | Conflit, « Terminer le combat » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Commerce posé sur l'entrepôt : à prendre à la main. |
| 845 | Croiseur (Pirate Mentak) | oui | — | Caractéristiques et précision déjà utilisées par l'outil. | — |
| 846 | Troupe de détournement (Pirate Mentak) | **oui** | automatique | Conflit, combats spatial et terrestre : elle attaque en dernier (phases 5 et 6 « Dernières attaques », après les dégâts des autres attaques) ; un vaisseau qu'elle détruit est capturé — « Terminer le combat » l'envoie, réparé, dans les éléments actifs de son camp, qui en devient propriétaire. | — |
| 847 | Soleil capturé (Pirate Mentak) | oui | — | Texte informatif (non productible) ; bombardement noté « 6\*\*\* » à vérifier. | — |
| 849 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 850 | Armageddon | **oui** | automatique | Conflit, « Terminer le combat » : son destructeur prend le contrôle d'un Armageddon (#490) avec 1 de résistance restante. | — |
| 854 | Vaisseau relique | **oui** | nouveau bouton + automatique | Fiche de l'unité, quatre boutons : fragment militaire, +3 au combat spatial ce tour ; fragment spatial, +3 mouvement et déplacement furtif ce tour (déplacement assisté) ; fragment civil, rempli d'infanteries de votre faction jusqu'à sa capacité ; fragment ancien, posé sur le vaisseau : réparé, et +1 de résistance par fragment ancien posé dessus (compté au combat). | — |
| 856 | Lune noire (Pirate Mentak) | **oui** | automatique | Conflit : un engagement de groupe ne l'atteint jamais — elle doit être ciblée. | — |
| 868 | Forge du vide (Fantômes de Creuss) | **oui** | automatique | Ravitaillement automatique : 1 ressource, 1 influence et 1 de recherche s'il y a un trou de ver delta dans son système. | — |
| 893 | Usine (Virus de Nekro) | **partiel** | nouveau bouton + automatique | Ravitaillement automatique : +2 ressources (script de l'Usine) ; production comptée par `#prod(3, Drone)`. | Dévastation pour réduire un coût. |
| 960 | Dynamo (Les Empyréens WIP) | partiel | — | Caractéristiques et #furtif déjà utilisés par l'outil (Conflit). | Ignorer 2 dégâts en usant l'unité et un diplomate : à la main. (moyenne) |
| 1013 | Infanterie (Néo-peste WIP) | oui | — | Caractéristiques déjà utilisées ; sans le mot-clé « transportable », elle ne s'embarque pas. | — |
| 1014 | Infanterie infectée (Néo-peste WIP) | partiel | — | Caractéristiques déjà utilisées ; non transportable. | « Ne peut jamais être déplacée » : non vérifié. (moyenne) |
| 1015 | Cuirassé (Néo-peste WIP) | oui | — | Caractéristiques déjà utilisées ; bombardement 5 à une seule attaque. | — |
| 1016 | Bombe bactériologique (Néo-peste WIP) | partiel | — | Caractéristiques et bombardement 5** déjà utilisés par l'outil. | La détruire quand elle bombarde : à la main. (facile) |
| 1017 | Alpha (Sardakk N'orr WIP) | oui | — | Caractéristiques déjà utilisées (combat 6). | — |
| 1018 | Exotrirème (Sardakk N'orr WIP) | partiel | — | Caractéristiques déjà utilisées (combat 3). | 1 dégât infligé quand il est détruit : à la main. (moyenne) |
| 1019 | Transporteur (Sardakk N'orr WIP) | partiel | — | Caractéristiques déjà utilisées (capacité 3, mouvement 1). | Débarquer à la fin du déplacement : à la main. (moyenne) |
| 1024 | Soleil de guerre (Braises de Muaat WIP) | oui | — | Caractéristiques déjà utilisées ; de type vaisseau amiral, il ne demande pas la technologie Soleil de guerre. | — |

## Planètes

Planètes et stations dont le texte porte un effet. « (passé) » : laissé de côté pour l'instant — texte ambigu, ou mécanique trop lourde.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 27 | Canon ancien | **oui** | nouveau bouton | Fiche du système : « Réparer » (use un logisticien, 1 ressource par dégât : vos unités du système et le canon) ; « Restaurer le canon » (science, Reforger : dépense un scientifique et 2 fragments militaires ; l'unité devient un Canon restauré, sa carte arrive dans les éléments actifs, +2 points). | — |
| 30 | Canon restauré | **partiel** | nouveau bouton | Fiche du système : « Réparer » (use un logisticien, 1 ressource par dégât). | 1 point au décompte. |
| 31 | Astéroïde d'or | **oui** | nouveau bouton | Phase de production, « Revenus de la phase » : +3 commerce pour qui le possède. | — |
| 33 | SR-42 | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche spatiale. Fiche du système : « SR-42 : 3 ressources » — la station est activée (une fois), 1 de recherche militaire, génétique et sociale. | — |
| 34 | Mecatol Rex (Winnu) | **oui** | bouton existant modifié + nouveau bouton | Fiche du système, combat terrestre : « Dissoudre la Garde impériale » (12 influence, les Gardes de la planète sont retirées). Prendre possession de Mecatol Rex donne aussi la carte Mecatol Rex spéciale. | Faveurs des autres factions comptées 4 : à la main. |
| 38 | Station de mercenaire | non | — (passé) | — | Marché de mercenaires, achats par livraison : actions de commerce à créer. (difficile) |
| 41 | Atlas | **oui** | automatique | « Nouveau tour » : un Ravageur neutre est ajouté sur Atlas. | — |
| 45 | Anneau monde | **oui** | bouton existant modifié + nouveau bouton + automatique | Selon l'agent posé sur la station : logisticien — Ravitaillement automatique +2 ressources et +2 commerce ; scientifique — « Revenus de la phase » de science, 3 de recherche ; négociant — « Revenus de la phase » de production, 2 frégates marchandes ; diplomate — bouton « une faveur (4 commerce) » ; politique — bouton « piocher 3 lois » ; amiral — « Produire ici » (2 unités). | Ajouter une des lois piochées à l'agenda : à la main. |
| 46 | Wanno | **oui** | bouton existant modifié | Prendre possession ou revendiquer Wanno : +1 infamie. | — |
| 47 | SR-124 | **partiel** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche sociale, notées au journal de recherche. | Votes au prévote avec l'accord du possesseur. |
| 49 | Cormund | **oui** | bouton existant modifié + automatique | « Fouiller la ruine » : rouge gris sans 3 infanteries du joueur. « Nouveau tour » : chaque unité présente subit une attaque de force 4 (un dé par unité, 1 dégât sur 4 ou moins). | — |
| 56 | Station de combat | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche militaire. Fiche du système, production : « Réparer » (use un logisticien, 1 ressource par dégât). | — |
| 59 | Jeollr | **oui** | automatique | Conflit : les bombardements contre Jeollr ont −2. | — |
| 60 | Perimeter | **oui** | bouton existant modifié | « Livraison commerciale » : +1 commerce si le joueur possède Perimeter. | — |
| 61 | Avar | **oui** | bouton existant modifié | « Revendiquer » : rouge gris sans unité du joueur sur la planète. | Perte de la possession quand la dernière unité part : à la main (« Abandonner »). |
| 62 | Loki | **oui** | automatique | Conflit, combats sur la planète : −1 aux attaques contre la faction qui la possède. | — |
| 69 | Relique | **oui** | nouveau bouton | Fiche du système, science : « Forger la relique » (Reforger : dépense un scientifique, 3 fragments et 1 fragment ancien) — la carte de la Relique reforgée arrive dans les éléments actifs. | — |
| 71 | Starpoint | **oui** | nouveau bouton | Fiche du système, diplomatie : use un diplomate, 3 influence, une faveur neutre (jeton sans propriétaire). | — |
| 72 | Hopeld | **oui** | nouveau bouton | Fiche du système, phase de production : dépense un logisticien, pose un Mech géant sur la planète (que l'on possède). | — |
| 74 | Velnor | non | — (passé) | — | Fragments posés sur la planète, déplacement d'une flotte : texte à préciser. (difficile) |
| 75 | Elysium | **oui** | bouton existant modifié + nouveau bouton + automatique | Fiche du système, science : « Poser un scientifique » (la planète est activée, il y reste). Ravitaillement automatique : 1 de recherche militaire, spatiale, génétique et sociale par scientifique posé. | — |
| 131 | Relique reforgée | **oui** | automatique | Ravitaillement automatique : +1 point pour qui la possède. | — |
| 229 | Mecatol Rex (spécial) | **oui** | nouveau bouton | Fiche de la carte, recrutement : une fenêtre numérotée fait choisir un de vos agents disponibles, il est dépensé ; un politique (du sac, sinon créé) arrive dans vos agents. | — |
| 275 | Shar | **oui** | automatique | Déplacement assisté : la nébuleuse du système de Shar ne gêne pas les déplacements de qui possède Shar. | — |
| 469 | New eden | **oui** | automatique | Ravitaillement automatique : 2 Letani posés sur la planète. | — |
| 473 | SIG-1 à SIG-4 | **oui** | nouveau bouton | Fiche du système, phase de science : « Obtenir » use un scientifique, la carte va dans les éléments actifs. | — |
| 508 | Université polytechnique | non | — (passé) | — | Agent tiré au ravitaillement, achats par commerce ou livraison. (difficile) |
| 783 | Arcturus | **oui** | bouton existant modifié + automatique | « Revendiquer » : rouge gris sans unité du joueur sur la planète. Y poser des unités sans 2 niveaux de connaissance spatiale (et génétique pour des unités biologiques) affiche un avertissement, sans rien empêcher. | — |
| 784 | Anneau Arcturus | **oui** | nouveau bouton + automatique | Ravitaillement automatique : une frégate marchande créée dans le système ; « Produire ici » (`#prod`) ; fiche du système, science : « Recherche sociale, spatiale et libre » (use un scientifique). | — |
| 1041 | Haven | **oui** | automatique | Ravitaillement automatique : posséder Haven compte comme posséder une planète natale, elle donne la faveur du ravitaillement. | Les autres effets liés aux planètes natales (Vassal, Spectre de l'empereur) : à la main. |

## Mercenaires

Cartes mercenaire (dans les éléments actifs de qui les a recrutées). Le cube noir du mercenaire est posé sur sa carte tant qu'il est disponible : tout ce qui l'utilise (son bouton, ou son emploi comme agent) envoie ce cube dans les agents usés, et sans cube sur sa carte le bouton est rouge gris ; à l'« Entretien », chaque carte mercenaire retrouve son cube (un cube neuf si elle n'en a jamais eu). « Utilisable comme » un agent : glisser le cube noir du mercenaire (ou sa carte) sur un type d'agent de « Mes agents » — les types à 0 y restent affichés — ou de sa feuille ; ensuite, dès qu'un agent de ce type est utilisé ou dépensé, une fenêtre demande qui agit, l'agent de base ou le mercenaire (utilisé : son cube part dans les agents usés ; dépensé : sa carte est retirée du jeu). Sans agent de ce type, le mercenaire agit d'office. Les mercenaires de combat ont chacun leur bouton sous le combat. « (passé) » : laissé de côté pour l'instant.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 219 | Rear Admiral Farran | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des cuirassés −1 : à la main. |
| 220 | Suffi An | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des croiseurs −1 : à la main. |
| 221 | Trillossa Aun Mirik | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Le destroyeur de plus : à la main. |
| 280 | Evelyne Delouis | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des transporteurs −1, vitesse +1 : à la main. |
| 281 | Claire Gibson | **oui** | nouveau bouton | Combat terrestre : « Claire Gibson : +1 à vos infanteries » — son cube part dans les agents usés, le bonus vaut pour ce combat. | — |
| 282 | Ipswitch | non | — | — | Livraison envers n'importe quelle unité : hors du bouton de livraison actuel. (passé) |
| 283 | M'aban | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Construire un second bâtiment : à la main. |
| 284 | So Ata | **partiel** | nouveau bouton | Combat spatial, deux boutons : « désigner un vaisseau » (début du combat : son cube part dans les agents usés, un rappel s'affiche) ; « capturer un vaisseau détruit » (avant « Terminer le combat » : le vaisseau adverse va dans vos éléments actifs, sans ses dégâts). | La restriction d'engagement du vaisseau désigné : à la main. |
| 285 | Doctor Carrina | **partiel** | nouveau bouton | Fiche de la carte, science : son cube part dans les agents usés, 1 de recherche sociale, militaire, génétique et spatiale (journal de recherche). | Activer une planète ; ignorer un niveau de prérequis : à la main. |
| 286 | Xuange | **oui** | nouveau bouton | Fiche de la carte, science : son cube part dans les agents usés, le joueur choisit X — 2X influence dépensée, X de recherche sociale. | — |
| 287 | Aktaran | **oui** | nouveau bouton | Fiche de la carte, diplomatie : son cube part dans les agents usés, 4 de recherche (journal de recherche). | La livraison qui le déclenche n'est pas vérifiée. |
| 288 | Yvin Korduul | **oui** | nouveau bouton | Fiche de la carte, diplomatie : son cube part dans les agents usés, 5 influence, une de vos faveurs est créée. | — |
| 289 | Oriane Tesh (astrophysicienne, ex-Sai Seravus) | **oui** | nouveau bouton | Fiche de la carte, science : son cube part dans les agents usés, 1 de recherche spatiale par système à anomalie où vous avez une unité. | — |
| 290 | Taïk jedz | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Placer puis retirer l'unité liée au mercenaire : à la main. (passé) |
| 291 | Ahk Ravin | **oui** | bouton existant modifié | « Fouiller la ruine » : quand Ahk Ravin est le scientifique de la fouille (son cube posé sur le type Scientifique, choisi dans la fenêtre ou d'office), une fenêtre propose de dépenser 3 ressources pour 2 fragments au lieu d'un. | — |
| 292 | Carth de Sabledor | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Le vaisseau de commerce gratuit : à la main. |
| 293 | Elder Qanoj | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Ses 3 votes : non reliés au vote de l'outil. (passé) |
| 294 | Z'eu | **oui** | nouveau bouton | Fiche du mercenaire, phase de vote : son cube est usé, X commerce (4 au plus) sont dépensés pour X voix sur la loi et le vote choisis dans l'onglet Décision ; elles s'ajoutent à votre colonne du décompte. | — |
| 295 | Viscount Unlenn | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Déplacement hors des règles de blocage : à la main. (passé) |
| 297 | Artuno | **oui** | nouveau bouton | Fiche de la carte, diplomatie : son cube part dans les agents usés, 1 commerce par alliance en cours chez vous. | — |
| 298 | Acamar | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Votes copiés sur une autre faction : non reliés au vote de l'outil. (passé) |
| 299 | Sharsiss | **oui** | bouton existant modifié + nouveau bouton | Combat spatial : un bouton par autre faction du combat — son cube part dans les agents usés, autant de ses unités que vous en avez au combat ont +1 (les premières qui tirent). Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 300 | Harrugh Gefhara | **oui** | automatique | « Phase suivante », en quittant la phase de vote : 1 commerce par loi résolue selon votre vote majoritaire. | — |
| 301 | S'Ula Mentarion | non | — | — | Pose d'une unité liée dans un système non contrôlé. (passé) |
| 302 | Ta Zern | **oui** | nouveau bouton | Fiche de la carte, science : son cube part dans les agents usés, 1 de recherche génétique par planète que vous possédez. | — |
| 303 | Baggil Wildpaw | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Mercenaire posé sur la planète d'une autre faction, revenu détourné : à la main. (passé) |
| 304 | George Nobin | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Livraison augmentée de X : à la main. (passé) |
| 349 | Sal Gavda | **oui** | nouveau bouton | Fiche de la carte, diplomatie : son cube part dans les agents usés, 1 commerce par faction (vous comprise) qui possède une planète dans un système où vous avez une unité. | — |
| 350 | Skarvald | **oui** | bouton existant modifié + nouveau bouton | Bombardement : « Skarvald : voler du commerce » — son cube part dans les agents usés, 3 dés lancés par le serveur, chaque 5 ou moins vole 1 commerce à la faction qui possède la planète. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. Le système doit être contrôlé (conflit de contrôle si d'autres peuvent s'y opposer). | — |
| 351 | Vasra Ivo | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Portée des canons +1 : à la main. |
| 352 | Suldhan Wraeg | non | — | — | Marqueurs qui annulent une anomalie pour vos déplacements. (passé) |
| 353 | Agnlan Oln | **partiel** | nouveau bouton | Fiche de la carte, science : son cube part dans les agents usés, un plan de relique est pioché dans votre main. | Fabriquer une relique en ignorant 2 fragments : à la main. |
| 354 | Richtyrian | non | — | — | Bonus d'infanterie sur le monde où il est posé : le propriétaire d'une carte posée sur la carte du jeu n'est pas connu. (passé) |
| 355 | Mirik Aun Sissiri | **oui** | bouton existant modifié + nouveau bouton | Fiche d'un système, phase de mandat : « Mirik Aun Sissiri : +1 au combat spatial dans ce système » — son cube part dans les agents usés, le bonus vaut jusqu'à la prochaine phase de mandat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 356 | Henry Storcher | **oui** | bouton existant modifié + nouveau bouton | Combat spatial : « Henry Storcher : +N commerce » — son cube part dans les agents usés, 1 commerce par vaisseau que vous avez perdu dans ce combat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 357 | Jace X | **oui** | bouton existant modifié + nouveau bouton | Combat terrestre : « Jace X : +1 à vos unités terrestres » — son cube part dans les agents usés, le bonus vaut pour ce combat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 358 | Shipmonger Zsknck | **oui** | nouveau bouton | Fiche d'un de vos vaisseaux non biologiques endommagés, production : le cube du mercenaire part dans les agents usés, le vaisseau perd ses dégâts sans rien payer. | — |
| 359 | Sai Seravus (cartographe de Creuss) | non | — | — | Trous de ver alpha et bêta adjacents : règle de déplacement. (passé) |
| 729 | Gabriel Gibbs | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Mobilisation jusqu'à la capacité logistique : à la main. |
| 910 | Ilyane Vorsk | **oui** | bouton existant modifié + automatique | Utilisable comme l'agent indiqué (cube noir ou carte glissé sur ce type d'agent). Onglet Vote : son cube ou sa carte posé sur une case de vote compte comme un politicien, et rapporte 1 voix de plus par autre faction dont c'est le vote majoritaire. | — |

## Promesses

Cartes de la réserve de promesses, chez la faction qui les garde (éléments actifs ou promesse à durée) ; le marqueur posé dessus est celui de la faction qui a fait la promesse. « (passé) » : laissé de côté pour l'instant.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 224 | Vassal | **partiel** | bouton existant modifié + nouveau bouton | Conflit d'accord : « Accepter » est grisé pour le camp qui possède la planète revendiquée. Fiche de la carte : « Promesse rompue » (monde natal perdu) — retour à la réserve, la faction du marqueur gagne 1 infamie. | Donner sa faveur aux tours pairs ; fins de promesse sans infamie : à la main. |
| 225 | Pacte de non-agression | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — la carte retourne à la réserve, son marqueur est retiré, la faction qui l'a faite gagne 1 infamie. | — |
| 226 | Redevance de protection | **partiel** | nouveau bouton | Fiche de la promesse, chez la faction qui la détient : « payer 2 commerce au Mentak » (ravitaillement, une fois par tour), « dépenser la promesse » (sans payer), « le Mentak y met fin » (retour à la réserve, il gagne 1 infamie). Dépensée d'office quand le détenteur bloque les Mentaks et que le blocage porte (déplacement, test de blocage d'une action). | Les Mentaks ne peuvent pas engager le détenteur : non vérifié. Dépense quand le détenteur les engage : au bouton. |
| 227 | Soutien politique | **oui** | nouveau bouton | Fiche de la promesse : prévote, « engager la promesse » — la loi et le vote annoncés se choisissent dans l'onglet Décision. Après le vote, « régler d'après le décompte » compare les voix de la faction à la valeur de la promesse : tenue, elle retourne à la réserve ; sinon la faction gagne 1 infamie. « respecté » et « non respecté » restent pour régler à la main. | — |
| 228 | Concession commerciale | **oui** | bouton existant modifié | Fiche d'une unité à livraison, dans le système de Mecatol Rex : le détenteur du mandat (non épuisé) figure parmi les factions à comptoir, il peut être livré. | — |
| 262 | Embuscade | **oui** | nouveau bouton | Fiche de la promesse : « Embuscade » — le système se choisit dans l'onglet Décision ; la Volée argentée répond dans le sien : poser un destroyer (un logisticien usé, 2 ressources) ou gagner 1 infamie. Conflit : ce destroyer est au détenteur pour ce combat spatial, frappe en premier et a +2 ; « Terminer le combat » le rend à la Volée. | — |
| 335 | Accord de recherche | **oui** | nouveau bouton | Fiche de la carte : « +2 recherche », notée au journal de recherche. | Le déclenchement (la faction recherche une technologie) est à la main. |
| 336 | Commerce d'esclave | **oui** | nouveau bouton | Conflit, combat terrestre : sur la ligne d'une infanterie que le détenteur a détruite, « Commerce d'esclave : jet » — sur 2 ou moins, « Terminer le combat » l'envoie dans les éléments actifs de la Kabal et pose une dette de 1 de la Kabal envers lui, à payer dans 3 tours. | — |
| 368 | Protecteur de l'empire | **oui** | nouveau bouton | Conflit, combats spatial et terrestre : « Protecteur de l'empire » use un politique du détenteur ; le Winnu a un bouton pour lui. +1 par politique usé (cumulables) pour les unités du détenteur, contre une faction qui a plus d'infamie que lui. | — |
| 369 | Pupille de l'empire | **oui** | nouveau bouton | Fiche de la promesse, revendication : « on m'a conquis une planète » — le conquérant se choisit dans l'onglet Décision ; le Winnu répond dans le sien : user un politique (le conquérant gagne 1 infamie) ou gagner 1 infamie. | — |
| 370 | Accès aux archives impériales | **oui** | nouveau bouton | Fiche de la carte, science : use un scientifique, Mecatol Rex est activée, 3 de recherche pour vous et autant pour les Winnu (journal de recherche). | — |
| 383 | Promesse de vente | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — retour à la réserve, la faction qui l'a faite gagne 1 infamie. | L'élément promis et l'échéance : à la main. |
| 384 | Frontière ouverte | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — retour à la réserve, la faction qui l'a faite gagne 1 infamie. Proposé d'office (onglet Décision) au joueur dont un vaisseau est arrêté par le blocage de cette faction. | — |
| 421 | Partage de technologie | **oui** | automatique | Onglet Technologie : la faction qui pose son marqueur sur une technologie débloquée de l'autre, tant que l'alliance est en jeu entre elles, a les scripts de cette technologie. | — |
| 454 | Tuteur des réfugiés | **oui** | nouveau bouton | Fiche de la promesse : « j'engage mes Réfugiés » (promesse dépensée, +1 infamie). Fiche d'un système, phase d'événement, à côté d'une planète à Entrepôt d'aide : l'entrepôt est usé, 4 commerce posés dessus sont dépensés, +1 faveur des Réfugiés. | — |
| 458 | Pacte pirate | **partiel** | nouveau bouton | Obtenu par « Diplomatie pirate ». Fiche de la carte, ravitaillement : « payer 2 ressources » (une fois par tour). | Les pirates vous ignorent : à la main. |
| 870 | Passage de Creuss | **oui** | automatique | Déplacement assisté : une étape par un trou de ver delta n'est plus signalée (sans cette promesse ni Navigation delta, elle demande une confirmation). | — |
| 963 | Conspirer ensemble (Les Empyréens WIP) | **oui** | automatique | Onglet Vote, décompte : pour chaque loi, si le vote majoritaire du détenteur (la colonne où il a, seule, le plus de voix) est le même que celui des Empyréens, il a 1 voix de plus dans cette colonne, une fois les deux plateaux révélés. | — |
| 964 | Chemin du vide (Les Empyréens WIP) | **oui** | automatique | Déplacement assisté : une supernova, un champ d'astéroïdes ou une nébuleuse que contrôlent les Empyréens (eux seuls, avec vous au plus, y ont des unités) ne gêne pas votre trajet. | — |

## Agents et reliques

Agents spéciaux et reliques qui remplacent un agent (même fenêtre de choix que les mercenaires « utilisables comme »).

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 142 | Héritier (agent des Winnu) | **oui** | bouton existant modifié | Quand un politique (si vous possédez Mecatol Rex) ou un amiral (sinon) est utilisé ou dépensé, la fenêtre propose un Héritier à sa place ; sans agent de ce type, l'Héritier agit d'office. Dépensé, il va sur la case du tour + 2 de votre feuille au lieu d'être détruit. | Le reprendre au tour dit : à la main (le glisser dans ses agents). |
| 396 | Noble cryogénisé (relique) | **oui** | bouton existant modifié | Glisser la carte sur un type d'agent de « Mes agents » : elle s'utilise comme cet agent (fenêtre de choix) ; quand elle devrait être dépensée, elle est usée. Usée, elle redevient disponible à l'Ravitaillement automatique. | Changer de type : glisser la carte sur un autre type. |

## Événements

Chaque événement a un bouton « Mettre en place » sur sa fiche (clic sur la carte, une fois révélée sur sa case Événement du déroulé). T est le tour de sa case. Le bouton fait tout ce que dit le texte de la carte ; il ne sert qu'une fois (rouge gris ensuite). Les dés (rébellion, systèmes tirés au sort) sont lancés par le serveur et notés au journal.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 450 | Tempête spatiale | **oui** | nouveau bouton | « Tempête spatiale » sur la case Événement du tour T+1, « Fin de la tempête » sur celle du tour T+5, la feuille de technologie « Tempête stellaire » chez chaque joueur (onglet Technologie). | — |
| 455 | Catastrophe lointaine | **oui** | nouveau bouton | « Péage aux frontières » aux tours T+1 et T+2, « Offre d'asile » au tour T+2, les promesses « Tuteur des réfugiés » dans la réserve de promesses. | — |
| 459 | Recrudescence de la piraterie | **oui** | nouveau bouton | La faction neutre « Pirate » sur la table ; 2 Vaisseaux pirates sur chaque champ d'astéroïdes, chaque nébuleuse et chaque rupture gravitationnelle qui ne touche pas une case natale. | — |
| 485 | Signal capté | **oui** | nouveau bouton | « Présence de cache » au tour T ; les 4 signaux mélangés, cachés et numérotés (un marqueur « Signal N » par signal sur la table) ; SIG-1 à SIG-4 chez chaque joueur ; les 4 tuiles SIG mélangées aux 12 tuiles du dessus de la pioche ; un fragment de relique, tiré du sac, sur chaque système exploré — ceux de la carte qui ne sont ni sur une case du plateau de départ, ni sur une case natale (paramètres de départ, visibles dans « Infos de la partie »). | — |
| 553 | Grand Khan | **oui** | nouveau bouton | La faction neutre « Invasion du grand Khan » sur la case Événement du tour T+1. | — |
| 526 | Invasion du grand Khan (arrivée) | **oui** | nouveau bouton | Fiche de la faction neutre, phase d'événement du tour où elle est sur la case Événement : « Faire arriver le grand Khan » — un système non spécial de la carte (ni natal, ni système d'événement ou spécial) est tiré au sort, 1 Palais du Khan et 25 Frégates du Khan y sont posés. Une fois par partie. | — |
| 562 | Rébellion interplanétaire | **oui** | nouveau bouton | La faction neutre « Rébellion interplanétaire » sur la table, l'agenda « Collaboration contre révolutionnaire » dans les lois à venir du tour T+1 ; un jet de rébellion (1D6) par planète possédée hors système natal — sauvage ou culturelle 3+, militaire 5+, autre 4+ — et 1D3 Rebelles par jet réussi. | — |
| 719 | Comment la démocratie meurt | **oui** | nouveau bouton | La faction neutre « Conclave secret » sur la table ; quatre agendas dans les lois à venir des tours T+2 à T+5. | — |
| 823 | Rupture de l'espace-temps | **oui** | nouveau bouton | « Rupture de l'espace-temps » et « Étude des failles » sur la table, la feuille « Rupture » chez chaque joueur ; Akhenar entouré des failles (moitié des joueurs, arrondie au supérieur, + 1) dans les systèmes secondaires, chaque faille avec ses 3 Nefs de la rupture ; un jeton trou de ver oméga sur autant de systèmes de la carte, tirés au sort. | Sans place libre dans les systèmes secondaires, les tuiles vont dans la réserve de tuiles : pose à la main. |
| 1039 | Peste lointaine | **oui** | nouveau bouton | « Vaccin » et « Arme bactériologique » chez chaque joueur, « Aide humanitaire » au tour T, « Bilan de l'aide humanitaire » au tour T+3. | — |

Ce que les événements mettent en jeu a sa ligne dans les autres tableaux :

- **habilités posées sur le déroulé ou la table** (tableau Habilités) : Tempête spatiale (442), Fin de la tempête (443), Péage aux frontières (452), Offre d'asile (453), Présence de cache (491), Aide humanitaire (404) et son bilan (1038), Rupture de l'espace-temps (814), Étude des failles (815) — toutes implémentées ;
- **règles des factions neutres** (tableau Habilités) : Pirate — Diplomatie pirate (522) faite, Mouvement pirate (406) et Combat pirate (523) non ; Grand Khan — Débarquement (530) fait, Combat (528) et Déplacement (529) non ; Rébellion (558, 560, 563 faites, 561 partielle) ; Conclave (720 partielle, 722 et 725 faites) ; Réfugiés (837 à 839 faites) ;
- **technologies distribuées** (tableau Technologies) : SIG-1 à SIG-4, Vaccin, Arme bactériologique, feuilles « Tempête stellaire » et « Rupture » ;
- **lois ajoutées à l'agenda** (564, 717, 721, 726, 727) : votées dans l'onglet Vote ; leur application reste manuelle, comme pour toutes les lois.

Reste hors script, pour tous les événements :

- **révéler la carte** à la phase d'événement : à la main (clic sur la carte face cachée de la case Événement, « Révéler à tous ») — un bouton du bandeau « À faire » serait facile ;
- **déplacements et combats des factions neutres** (pirates, Khan) : difficile, voir les lignes 406, 523, 528 et 529.

## Mots-clés d'unité

Deux sortes : les **capacités** écrites dans le texte d'une unité (`#furtif`, `#can(6,2)`…, définies dans les remplacements) et les **étiquettes** de son champ « mots-clés » (`ship`, `mil`…). Le nombre d'unités est celui des unités dont le texte cite la capacité.

### Capacités (texte de l'unité)

| Mot-clé | Règle | Unités | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---:|---|---|---|---|
| `#bomb` bombardement | Attaque contre les forces terrestres. | 12 | **oui** | automatique | Conflit, « Bombardement » : les unités de l'espace qui ont `#bomb(valeur, dés)` ou la notation à étoiles (« 5\*\* » : 5, 2 dés) tirent sur la planète. | — |
| `#can` canon spatial | Attaque à distance, portée 1 par défaut. | 11 | **oui** | nouveau bouton | Conflit, « Canons spatiaux » : chaque joueur voit ses canons à portée avec leur distance (`#can(valeur, dés)` ou « 6\*\* ») ; en choisir un use un amiral et pose un marqueur d'activation. Portée 2 avec Canon longue portée. « Prêt au combat » ouvre d'abord un test de blocage là où sont vos unités qui tirent, si d'autres factions peuvent les bloquer ; une unité bloquée ne tire pas. | « portée 0 » écrite sur une unité : non lue. (facile) |
| `#fpre` frappe en premier | L'unité attaque avant les autres. | 6 | **oui** | automatique | Conflit : phases 1 et 2 du combat (frappe en premier, puis ses dégâts) avant les autres attaques. | — |
| `#prec` précis | Pas de malus en ciblant une unité. | 6 | **oui** | automatique | Conflit : « Cibler » ne coûte pas −2 à cette unité. | — |
| `#con` contrôle | Valeur de contrôle de l'unité (1 par défaut). | 16 | **oui** | automatique | Blocage d'un déplacement, test de blocage d'une action, conflits de contrôle et de domination : chaque unité militaire vaut la valeur écrite (`#con(3)`), sinon 1 ; +1 avec Rayon tracteur. Une unité non militaire ne compte que si son texte lui donne une valeur, et seulement pour un camp qui a une unité militaire ou la possession. | — |
| `#furtif` furtif | Tant qu'ils n'ont engagé personne, ces vaisseaux doivent être ciblés. | 7 | **oui** | automatique | Conflit, combats spatial et terrestre : un engagement de faction n'atteint pas une unité furtive qui n'a rien engagé ; il faut la cibler. Un neutre défensif furtif ne riposte qu'à qui le cible. | — |
| `#deplfurtif` déplacement furtif | Ne peut pas être bloqué par des vaisseaux adverses en se déplaçant. | 4 | **oui** | automatique | Cadre de blocage : ces vaisseaux ne comptent pas parmi ceux à arrêter ; un groupe entièrement furtif ne s'arrête pas pour des unités. | — |
| `#pill` pillage | Qui détruit l'unité gagne le commerce indiqué (ou ce que dit le texte) — sauf s'il n'a aucune unité dans le système. | 16 | **oui** | automatique | Chaque dégât note son auteur sur l'unité touchée (marque `degatDe`). Conflit, « Terminer le combat » : le camp du dernier dégât gagne le pillage lu dans le texte — commerce, points, infamie, recherche (notée au journal) — s'il a encore une unité dans le système ; le bouton l'annonce (« Terminer le combat »). | Pillage hors de l'écran de combat (unité retirée à la main) : non géré. |
| `#comp` comptoir commercial | Permet de recevoir une livraison. | 11 | **oui** | automatique | Livraison commerciale : seules les factions qui ont une unité à comptoir dans le système peuvent être livrées. | — |
| `#livr` livraison commerciale | L'unité, non bloquée, livre du commerce à une faction qui a un comptoir dans le système. | 6 | **oui** | nouveau bouton | Fiche de l'unité : « Livraison commerciale (n) » — choix de la faction s'il y a plusieurs comptoirs, commerce donné, dettes réduites, négociant utilisé et unité dépensée selon son texte ; test de blocage d'abord si d'autres factions peuvent bloquer l'unité. | Fin des dettes d'une faction dont on bloque le vaisseau de commerce : à la main. |
| `#rep` réparation | Permet de réparer : 1 ressource par point de résistance. | 4 | **oui** | nouveau bouton | Réparation illimitée (`#rep` sans nombre : Dock) : à la phase de production (rouge gris sinon), la fiche de chacune de vos unités endommagées du système — non biologique — a « Réparer », 1 ressource par dégât, sans agent. La fiche d'un système garde « Réparer toutes mes unités » (test de blocage dans l'espace du système d'abord ; les unités bloquées ne sont pas réparées). | Réparation limitée (`#Rep 2`, Mech aérien) : non lue. (moyenne) |
| `#prod` production | Produit des unités en payant leur coût (type et quantité indiqués). | 5 | **oui** | nouveau bouton | Phase de production : Ctrl + clic sur l'unité ouvre une production (un logisticien utilisé, marqueur d'activation, bandeau « n / quantité », réserve cerclée de rouge pour ce qu'elle ne produit pas, « Terminer »). `#prod(#clog, …)` : la capacité logistique. Une station ou une planète qui porte `#prod` (Anneau Arcturus) : bouton « Produire ici » de la fiche du système. Poser hors du système de la production demande une confirmation. | Règles fines de pose (unité spatiale ou terrestre, vaisseau non bloqué) : non vérifiées. |
| `#raid` raid | Bombardement spécial qui capture les infanteries. | 2 | **oui** | nouveau bouton | Fiche d'un système, à côté d'une planète : « Raid ». Conflit, combat « Raid » : les unités à `#raid(valeur, dés)` ou « 5\*\* » de l'espace tirent sur les infanteries ; chaque infanterie touchée est capturée (éléments actifs du raideur) ; face à d'autres unités militaires, il faut cibler ; sans infanterie, une réussite capture un esclave du possesseur. | — |
| `#tvd`, `#tvo` trous de ver | L'unité compte comme un trou de ver (delta), ou les ignore (oméga). | 4 | **partiel** | automatique | Déplacement assisté : trous de ver des tuiles et des tokens ; jet du trou de ver oméga. | Une unité qui vaut trou de ver (Hil Colish) ; la Nef de la rupture qui ignore l'oméga. (moyenne) |
| `#use`, `#spend`, `#dep`, `#act`, `#destroy` | Symboles : utiliser, dépenser, placer, activer, destruction. | — | — | — | Symboles de rédaction, sans effet propre. | — |

### Étiquettes (champ « mots-clés »)

| Étiquette | Sens | Implémenté | Ce que fait l'outil |
|---|---|---|---|
| `ship` | Vaisseau | **oui** | Combat spatial et cible des canons ; déplacement assisté ; porte les unités transportables ; ne se pose pas sur une planète. |
| `mil` | Militaire | **oui** | Tire au combat ; compte pour le blocage et le contrôle ; se déplace avec un amiral. |
| `terre` | Terrestre | **oui** | Seule une unité terrestre se pose sur une planète. |
| `transportable` | Transportable | **oui** | Embarque sur un vaisseau (glisser, ou « Charger » du déplacement assisté), avec avertissement de capacité. |
| `trans` | Transport | **oui** | Se déplace avec un amiral ou un logisticien : choix « Transports déplacés par » du déplacement assisté ; +2 de capacité avec « Capsule de transport ». |
| `com` | Commerce | **oui** | Se déplace avec un négociant. |
| `civ` | Civil | **oui** | Se déplace avec un logisticien. |
| `science` | Scientifique | **oui** | Se déplace avec un scientifique. |
| `bio` | Biologique | **oui** | Ne se répare pas (« Réparer » l'ignore). |
| `struc` | Structure | **partiel** | Comptée par « Bâtiment résistant ». Les structures spatiales ne comptent pas encore au contrôle d'un système. |
| `agg` | Agressif (neutres) | **oui** | Conflit : les neutres agressifs engagent d'office. |
| `def` | Défensif (neutres) | **oui** | Conflit : les neutres défensifs engagent d'office ceux qui les engagent. |
| `space` | Structure spatiale | non | À faire : compter au contrôle du système (automatique, facile). |
| `sattelite` | Satellite | non | Sans effet dans l'outil. |

## Par où commencer

Les plus simples parmi ce qui reste (un bouton qui change des compteurs ou use un agent) :

1. **Argumentation véhémente** (technologie 251) : nouveau bouton — use un politicien, −1 influence, +2 votes.
2. **Réseau d'ingérence** (technologie 247) : nouveau bouton — use un scientifique, +2 votes.
3. **Étude des tempêtes** (habilité 441) : deux nouveaux boutons — use un scientifique, +2 ou +4 cases de recherche tempête.
4. **Étude des failles** (habilité 815) : nouveau bouton — use un scientifique, +2 cases de recherche de rupture.
5. **Exploitation des tempêtes** (technologie 448) : « Entretien » modifié (+3 ressources) et un nouveau bouton (use un scientifique, +4 ressources).
6. **Usine** (unité 16) : « Entretien » modifié — +2 ressources par usine possédée (unité de base, servira à tous).
7. **Réseau de commerce** (technologie 213) : deux nouveaux boutons de conversion influence ↔ ressource ; même modèle pour Piraterie informatique (857).
8. **Réseau** (787), **Relais d'influence** (807) : « Entretien » modifié — +2 influence par satellite ou station possédé.
