# Implémentabilité des règles TI5 dans l'outil de partie

Pour chaque technologie, habilité, unité et planète : ce que l'outil de partie applique, **comment il touche à l'interface**, et ce qu'il resterait à scripter. Analyse du 10 novembre 2026, tenue à jour à chaque script écrit (dernière mise à jour : 11 novembre 2026).

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
| Technologies | 93 | 60 | 0 | 33 | 19 | 19 | 28 |
| Habilités | 48 | 20 | 2 | 26 | 9 | 7 | 8 |
| Unités | 104 | 46 | 58 | 0 | 10 | 13 | 17 |
| Planètes | 29 | 23 | 2 | 4 | 14 | 11 | 6 |
| Mercenaires | 40 | 14 | 19 | 7 | 18 | 20 | 0 |
| Promesses | 17 | 5 | 2 | 10 | 7 | 1 | 0 |
| Agents et reliques | 2 | 2 | 0 | 0 | 0 | 2 | 0 |
| **Total** | **333** | **170** | **83** | **80** | **77** | **73** | **59** |

Les trois dernières colonnes comptent les scripts écrits (une carte peut en avoir deux : « bouton existant modifié + nouveau bouton »).

## Technologies

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 139 | Assimilation | **oui** | bouton existant modifié | Fiche d'un système : « Prendre possession » et « Revendiquer » posent une infanterie sur une planète sans propriétaire ; « Mobiliser » en pose une de plus, gratuite, sur une planète sauvage. | — |
| 140 | Culture courtisane | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : diplomates à −1. « Entretien » : +1 influence par alliance en jeu chez vous (éléments actifs et cases de tour). | — |
| 141 | Diversité | **oui** | bouton existant modifié | « Entretien » : +1 influence par planète possédée. | — |
| 180 | Bâtiment résistant | **oui** | automatique | Conflit, bombardement : −1 aux tireurs sur une planète que vous possédez, −2 si vous y avez une structure. | — |
| 181 | Troupe d'élite | **oui** | automatique | Conflit, combat terrestre : +1 à vos infanteries. | — |
| 182 | Bombe bactériologique | **oui** | automatique | Conflit, bombardement : vos dégâts sont verts ; une infanterie biologique qu'ils détruisent en entraîne deux autres, identiques, de la planète (dégât encaissé ou glissé). | — |
| 183 | Bio stimulant | **oui** | bouton existant modifié | Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent) : une fenêtre propose de l'utiliser et de payer 2 ressources à la place. | — |
| 184 | Manipulation mentale | **oui** | nouveau bouton | Fiche d'un système, à côté de chaque planète : « Manipulation mentale » use un diplomate et pose une infanterie (une de vos unités dans le système ou un système voisin). | — |
| 185 | Récupération | **oui** | bouton existant modifié | Conflit : « Terminer le combat » reçoit une case « Récupération », cochée d'office ; +1 ressource par unité détruite pendant le combat ; rouge gris si deux factions l'ont cochée. | Coalition et partage des ressources : à la main. |
| 186 | Bouclier déflecteur | **oui** | automatique + bouton existant modifié | Conflit, canons spatiaux : −1 aux canons qui visent vos vaisseaux. Déplacement assisté : « Déplacer » est rouge gris à travers un champ d'astéroïdes, sauf avec cette technologie. | — |
| 187 | Apprentissage | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Apprentissage » remplace un de vos agents par un autre agent de base (celui de votre faction s'il le réimplémente). | — |
| 188 | Capsule de transport | **oui** | automatique | Capacité des vaisseaux (avertissement d'embarquement, chargement du déplacement assisté) : +1, +2 pour un transporteur. | — |
| 189 | Capsule de secours | **oui** | nouveau bouton | Conflit : cadre « Sauvetage » d'un combat — un jet par infanterie d'un vaisseau détruit (6 ou moins sur un dé de 10), puis un bouton par arrivée possible. | Accord du propriétaire du dock : non géré, comme demandé. |
| 190 | Écoles militaires | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : amiraux à −1. Fiche d'un système : « Combat spatial » donne +1 au premier combat que vous ouvrez dans le tour. | — |
| 191 | Logistique améliorée | **oui** | bouton existant modifié + automatique | Recrutement (Ctrl + clic) : logisticiens à −1. Capacité logistique : 3, plus 1 par logisticien posé sur la technologie (onglet Technologie) — taille d'une flotte au déplacement, production d'un dock. | — |
| 192 | PC | **oui** | automatique | Conflit, combat spatial : +1 si le système contient votre vaisseau amiral ou un de vos docks. | — |
| 193 | IA industrielle | **oui** | automatique | Production ouverte avec un dock (Ctrl + clic) : 2 unités de plus ; sur une planète militaire, le coût total baisse de 2. | — |
| 194 | Arme amplifiée | **oui** | nouveau bouton + automatique | Plateau joueur, « Actions de mes technologies » : « Arme amplifiée » pose un scientifique sur un type de vaisseau de votre feuille. Conflit, combat spatial : +2 à ces vaisseaux. | — |
| 195 | Réparation improvisée | **oui** | nouveau bouton | Fiche d'un de vos vaisseaux endommagés : « Réparation improvisée » use un logisticien et répare (1 ressource par dégât). | Vaisseau « non bloqué » : non vérifié. |
| 196 | Système de visée | **oui** | automatique | Conflit, canons spatiaux et bombardement : +1 à vos tireurs. | — |
| 197 | Blindage en duranium | **oui** | automatique | Résistance +1 des vaisseaux amiraux, soleils de guerre, cuirassés et transporteurs (par type d'unité) ; affichée en vert, « 3 (+1) », dans Conflit. Texte de la carte complété (transporteurs). | — |
| 198 | Soleil de guerre | **oui** | automatique | Onglet Technologie : quand la dernière case de recherche est cochée, un soleil de guerre de la faction arrive dans les éléments actifs. | Pas de message si un soleil de guerre est produit sans la technologie. |
| 200 | Art du commerce | **oui** | bouton existant modifié + nouveau bouton | Recrutement (Ctrl + clic) : négociants à −1. Plateau joueur, « Actions de mes technologies » : « Art du commerce » utilise la technologie, la faction choisie gagne 2 commerce. | Réduction des dettes par la livraison : à la main. |
| 201 | École politique | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : politiciens à −1. Phase de proposition : « Piocher » donne 2 propositions de plus, même pour 0 influence. | — |
| 202 | Centre de coordination | **oui** | automatique | Conflit, combat spatial : +1 si le système contient un de vos docks ou votre vaisseau amiral. | — |
| 205 | Rapport de force | **oui** | nouveau bouton | Conflit, cadre de blocage d'un déplacement : « Rapport de force » use un diplomate, +2 à votre contrôle pour ce blocage. | Autres évaluations du contrôle : non calculées. |
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
| 218 | Exploration | **oui** | bouton existant modifié | Onglet Espace, phase de science : l'exploration (Ctrl + clic sur un emplacement vide) est réservée à qui a la technologie ; la ligne « explorer » est retirée des scientifiques. | — |
| 231 | Cartographie de l'espace | **oui** | automatique | Conflit, combat spatial et canons : −1 aux attaques contre vos vaisseaux dans un système à anomalie. | — |
| 232 | Exploitation du vide | **oui** | bouton existant modifié + nouveau bouton | « Entretien » : +1 ressource par système vide dominé (+3 pour une nébuleuse). Un système vide disputé ouvre un conflit de domination (onglet Conflit) ; « Entretien » est rouge gris tant qu'il n'est pas résolu. | — |
| 233 | Moteur à gravité | **oui** | bouton existant modifié | Déplacement assisté : case « Moteur à gravité » — +1 mouvement, des scientifiques sont utilisés au départ. | — |
| 234 | Stratégie de saut | **oui** | automatique | Déplacement assisté puis Conflit : des vaisseaux arrivés par un trou de ver ont, ce tour, la frappe en premier et +1 au combat spatial. | — |
| 235 | Canon longue portée | **oui** | automatique | Conflit, canons spatiaux : la portée de vos canons passe à 2 (liste « Mes canons spatiaux à portée »). | — |
| 236 | Camouflage | **oui** | automatique | Blocage d'un déplacement : vos vaisseaux ne sont pas arrêtés par des unités. Conflit, combat spatial : tant qu'ils n'ont engagé personne, un engagement de faction ne les atteint pas (il faut les cibler). | — |
| 237 | Micro-téléporteur | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Micro-téléporteur » use un logisticien. | Le déplacement des unités se fait à la main (structures non vérifiées). |
| 238 | Stargate | **oui** | automatique | Déplacement assisté : chaque système où vous avez un dock a un trou de ver alpha. | — |
| 239 | Moteur FTL | **oui** | automatique | Déplacement assisté : +1 mouvement à tous vos vaisseaux. | — |
| 242 | Médecine | **oui** | bouton existant modifié | Conflit : avant « Retirer » une de vos unités biologiques détruites, « Médecine : jet » (5 ou moins) permet de la capturer — elle va dans vos éléments actifs. | La remise en jeu (use un logisticien, planète à structure) se fait à la main. |
| 244 | Bouclier amplifié | **oui** | automatique | Résistance : +2 pour votre vaisseau amiral et vos systèmes de défense, +1 pour vos boucliers mobiles (en vert dans Conflit). | — |
| 245 | Cuve de clonage | **oui** | nouveau bouton | Fiche d'un système, à côté de « Mobiliser » : « Cuve de clonage » use aussi un scientifique — une infanterie de plus, tout gratuit. | — |
| 246 | Drain Spatial | **oui** | nouveau bouton | Conflit, cadre de blocage : avant d'entrer dans un système où vous avez un vaisseau amiral, un soleil de guerre ou un système de défense, vous exigez 1 ressource par vaisseau ou laissez passer ; le joueur paie ou s'arrête. | — |
| 247 | Réseau d'ingérence | **oui** | automatique | Onglet Vote : un de vos scientifiques posé sur votre plateau de vote vaut 2 voix. | — |
| 248 | Laser longue portée | **oui** | automatique | Conflit, canons spatiaux : votre vaisseau amiral a un canon (6, 3 dés) ; un canon tire une case plus loin si un scientifique est aussi utilisé. | — |
| 250 | Grappin de capture | **oui** | nouveau bouton | Conflit : un combat terminé reste affiché, résolu, jusqu'à la fin de la phase ; « Grappin de capture » y use un logisticien et capture un vaisseau adverse détruit. | « Si vous contrôlez le système » : non vérifié. |
| 251 | Argumentation véhémente | **oui** | nouveau bouton | Onglet Vote : « Argumentation véhémente » use un politicien (qui ne reste pas sur le plateau) et 1 influence ; 2 voix s'ajoutent tout de suite au décompte. | — |
| 252 | Stratégie dominante | **oui** | automatique | Conflit, combat spatial : +1 à vos unités à frappe en premier ; cibler un de vos vaisseaux coûte −4. | — |
| 253 | Avantage aérien | **oui** | automatique | Conflit, combat terrestre : vos infanteries ont la frappe en premier. | — |
| 269 | Commerce profitable | **oui** | automatique | Livraison commerciale : +1 à vos livraisons, +1 commerce quand vous en recevez une. | — |
| 270 | Connexion | **oui** | bouton existant modifié | Tout bouton qui utilise un agent : sans l'agent demandé, une fenêtre propose un négociant à sa place pour 2 commerce. | Pas pour les agents du déplacement assisté. |
| 273 | Exploitation de masse | non | — | — | Dépend de l'action « Esclaves » de Kabal (habilité 157), qui n'existe pas dans l'outil : non fait. |
| 274 | Enrôlement | non | — | — | Dépend des esclaves de Kabal (habilité 157), qui n'existent pas dans l'outil : non fait. |
| 399 | Adaptation des réacteurs | non | automatique (prévu) | — | À brancher sur le déplacement assisté. (difficile) |
| 400 | Adaptation de la visée | non | automatique (prévu) | — | Annule le malus de tempête à l'écran de combat, une fois celui-ci scripté. (moyenne) |
| 402 | Vaccin | non | nouveau bouton (prévu) | — | Bouton : +4 points ; faveur si personne n'a découvert le vaccin avant. (moyenne) |
| 403 | Arme bactériologique | non | nouveau bouton (prévu) | — | Bouton : use un scientifique, jet de 5 par infanterie du système choisi. (moyenne) |
| 419 | Réparation improvisée (Conglomérat mercantile d'Hacan) | **oui** | nouveau bouton | Version de Hacan de « Réparation improvisée » (195) : même bouton, sur la fiche d'un vaisseau endommagé. | Vaisseau « non bloqué » : non vérifié. |
| 445 | Station météorologique | non | automatique (prévu) | — | Message orange si une station météorologique est produite sans cette technologie. (facile) |
| 446 | Tempête électromagnétique | non | nouveau bouton (prévu) | — | Bouton : use un scientifique, lance un canon (4,4) ; nébuleuse et cible choisies. (moyenne) |
| 447 | Générateur de tempête | non | nouveau bouton + automatique (prévu) | — | Bouton : use un scientifique, −3 ressources ; malus de combat à saisir à la main. (moyenne) |
| 448 | Exploitation des tempêtes | non | nouveau bouton (prévu) | — | Deux boutons : +3 ressources au ravitaillement ; use un scientifique, +4 ressources. (facile) |
| 481 | SIG-1 | non | nouveau bouton (prévu) | — | Bouton : donne le signal n° 1 au joueur (sens du texte à confirmer). (facile) |
| 482 | SIG-2 | non | nouveau bouton (prévu) | — | Bouton : donne le signal n° 2 au joueur (sens du texte à confirmer). (facile) |
| 483 | SIG-3 | non | nouveau bouton (prévu) | — | Bouton : donne le signal n° 3 au joueur (sens du texte à confirmer). (facile) |
| 484 | SIG-4 | non | nouveau bouton (prévu) | — | Bouton : donne le signal n° 4 au joueur (sens du texte à confirmer). (facile) |
| 592 | Recomposition | non | nouveau bouton + automatique (prévu) | — | Bouton de fin de combat : dés selon les pertes biologiques, puis production offerte. (moyenne) |
| 593 | Croissance | non | nouveau bouton (prévu) | — | Bouton : remplace un vaisseau biologique choisi par un autre coûtant jusqu'à 2 de plus. (moyenne) |
| 594 | Vie fructifiante | non | bouton existant modifié (prévu) | — | Variante du script de « Sève de vie » (à écrire) : 2 points rendus. (moyenne) |
| 787 | Réseau | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : +2 influence par satellite possédé. (facile) |
| 788 | Stratégie d'évitement | non | automatique (prévu) | — | Début de combat : malus −1 sur des vaisseaux choisis, à l'écran de combat. (moyenne) |
| 789 | Contact mercenaire | non | nouveau bouton + automatique (prévu) | — | Bouton : use la carte, produit un vaisseau payé en influence ; portée non vérifiée. (moyenne) |
| 791 | Stimulant | non | nouveau bouton (prévu) | — | Bouton : use la carte, rend disponible un agent usé choisi. (moyenne) |
| 803 | Prévision des combats | non | nouveau bouton (prévu) | — | Bouton : use un scientifique ; frappe en premier donnée à une flotte choisie. (moyenne) |
| 804 | Calcul de probabilité | non | nouveau bouton (prévu) | — | Bouton : montre au seul joueur la prochaine carte du plateau déroulé. (moyenne) |
| 805 | Anticipation | non | nouveau bouton + automatique (prévu) | — | Bouton : use la carte et un scientifique ; le déplacement de « Memoria » reste manuel. (facile) |
| 806 | Opportunité prédite | non | nouveau bouton (prévu) | — | Bouton : ajoute un agent de base choisi sur la case de recrutement 4. (moyenne) |
| 807 | Relais d'influence | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : +2 influence par station possédée. (facile) |
| 816 | Ouverture de faille | non | nouveau bouton (prévu) | — | Bouton : use carte et scientifique, crée un jeton oméga dans un système choisi. (moyenne) |
| 817 | Communication avec les êtres de la faille | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, −4 influence, donne une « Nef de la rupture » choisie. (moyenne) |
| 818 | Énergie de la faille | non | automatique (prévu) | — | Bonus permanent : script sur l'écran de combat, +1 aux vaisseaux en combat spatial. (moyenne) |
| 819 | Soldats déphasés | non | automatique (prévu) | — | Bonus permanent : script sur l'écran de combat, +1 aux forces terrestres. (moyenne) |
| 820 | Stabilisateur de rupture | non | automatique (prévu) | — | À brancher sur le jet de trou de ver oméga du déplacement assisté. (difficile) |
| 821 | Extraction de la faille | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : +3 ressources par « Faille » dominée (domination à déterminer). (moyenne) |
| 857 | Piraterie informatique | non | nouveau bouton (prévu) | — | Deux boutons de conversion : 1 commerce en 2 ressources ou en 2 influence. (facile) |

## Habilités

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 24 | Libre échange | **oui** | automatique | Conflit, « Retirer » : détruire une unité commerciale non militaire rapporte 1 infamie à qui a infligé le dernier dégât. | — |
| 36 | Vente au Bazaar | non | à définir (prévu) | — | Marché public avec achats par les autres factions : transactions non gérées. (difficile) |
| 144 | Clé de l'empire | **oui** | nouveau bouton | Fiche du système, à côté de Mecatol Rex, production : « Clé de l'empire » — un logisticien est dépensé, les systèmes de défense de la planète perdent leurs dégâts. | — |
| 145 | Destin légendaire | **oui** | bouton existant modifié | « Entretien » : +1 point par planète légendaire possédée. Prendre une planète légendaire (possession, revendication) : +1 point et +1 infamie. | — |
| 146 | Mandat | non | automatique (prévu) | — | Mandats liés aux transactions et au contrôle permanent de Mecatol Rex. (difficile) |
| 156 | Raid | non | automatique (prévu) | — | Mot-clé à ajouter à l'écran de combat : bombardement qui capture les infanteries. (moyenne) |
| 157 | Esclaves | **oui** | nouveau bouton | Plateau joueur : « Esclaves : dépenser un esclave (+1 ressource) ». Un esclave est une infanterie d'un autre camp posée dans vos éléments actifs. | Capturer une infanterie : à la main (la déplacer dans ses éléments actifs). |
| 158 | Exécuter les otages | non | à définir (prévu) | — | Contraint le vote d'une autre faction : votes non gérés au-delà du décompte. (difficile) |
| 159 | Restituer les otages | non | nouveau bouton (prévu) | — | Bouton lors d'une livraison : rend jusqu'à 2 esclaves, infanteries posées chez le receveur. (moyenne) |
| 160 | Conclave secret | **partiel** | bouton existant modifié | « Entretien » aux tours 1, 4, 6, 8, 9 et 10 : un objectif militaire est pioché dans la main. | Marquer l'objectif précédent : à la main. |
| 166 | Vassalisation forcée | non | nouveau bouton (prévu) | — | Bouton : détruit un diplomate, marque une faction choisie vassale ; condition vérifiée à la main. (moyenne) |
| 167 | Fierté | **partiel** | bouton existant modifié | Conflit d'accord (revendication) : « Accepter » est grisé pour le camp qui possède la planète revendiquée. | Décompte des points : à la main. |
| 168 | Seigneur | non | nouveau bouton + automatique (prévu) | — | Bouton : transforme un agent choisi en Seigneur ; déclencheurs constatés à la main. (moyenne) |
| 254 | Domination | non | nouveau bouton (prévu) | — | Bouton : désigne une planète ; +2 points en fin de tour si contrôlée. (moyenne) |
| 404 | Aide humanitaire | non | automatique (prévu) | — | Compteur du commerce livré par faction, puis points attribués trois tours plus tard. (moyenne) |
| 406 | Mouvement pirate | non | automatique (prévu) | — | Déplacement automatique des pirates avec recherche de chemin : déplacement non géré. (difficile) |
| 427 | Sève de vie | **oui** | bouton existant modifié | « Entretien » : chaque unité biologique du joueur posée sur la carte récupère 1 de résistance. | — |
| 441 | Étude des tempêtes | **oui** | nouveau bouton | Fiche d'un système sans planète, phase de science : use un scientifique, active le système, +2 de recherche tempête (+4 dans une nébuleuse), notée au journal de recherche. | — |
| 442 | Tempête spatiale | **oui** | automatique | Posée sur la table, elle vaut pour tous : −1 au mouvement (déplacement assisté), −1 aux canons spatiaux et à tous les combats (Conflit). | — |
| 443 | Fin de la tempête | **oui** | nouveau bouton | Fiche de la carte (posée sur la table), phase d'événement : « Appliquer la fin de la tempête » — la Tempête spatiale est retirée de la table, chaque faction marque 2 points par niveau de connaissance de tempête, celle qui en a le plus (seule) 3 de plus ; les stations météorologiques ne génèrent plus de recherche tempête. | — |
| 452 | Péage aux frontières | non | nouveau bouton + automatique (prévu) | — | Bouton d'événement : +3 commerce à qui domine chaque système à trou de ver alpha. (moyenne) |
| 453 | Offre d'asile | non | nouveau bouton (prévu) | — | Bouton : planète choisie, points gagnés, 6 « Milice » et un entrepôt créés, alliance donnée. (moyenne) |
| 486 | Cache | non | nouveau bouton (prévu) | — | Bouton : prend un fragment présent dans un système dominé (domination à déterminer). (moyenne) |
| 487 | BDD technique | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 1 de recherche par fragment de relique possédé, notée au journal de recherche. | — |
| 491 | Présence de cache | **oui** | automatique | Explorer (Ctrl + clic sur un emplacement vide) : un fragment de relique tiré du sac est posé sur le système découvert. | — |
| 515 | Distorsion gravitationnelle | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : une touche de force « numéro du tour » par unité du système. (moyenne) |
| 522 | Diplomatie pirate | **oui** | nouveau bouton | Bandeau « À faire », phase de diplomatie, quand un vaisseau pirate est sur la carte (toute faction) : use un diplomate, 3 commerce, l'alliance « Pacte pirate » arrive dans les éléments actifs (une fois par tour). | — |
| 523 | Combat pirate | non | automatique (prévu) | — | Engagements automatiques d'une faction non jouée, selon plusieurs critères de priorité. (difficile) |
| 528 | Combat du Khan | non | automatique (prévu) | — | Combat automatique contre des flottes désignées : flottes et engagements non gérés. (difficile) |
| 529 | Déplacement du Khan | non | automatique (prévu) | — | Vote spécial puis déplacement et blocage du Khan : ni l'un ni l'autre gérés. (difficile) |
| 530 | Débarquement du Khan | non | nouveau bouton (prévu) | — | Bouton : 1D6 « Soldat du Khan » créés sur chaque planète voisine choisie. (moyenne) |
| 558 | Rébellion en cours | **oui** | automatique | « Nouveau tour » : 1D3 rebelles de plus sur chaque planète possédée par un joueur où il y en a déjà (dé lancé par le serveur, annoncé). | — |
| 560 | Négocier avec les rebelles | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, lance 3 dés à 4 (précis) contre les rebelles. (moyenne) |
| 561 | Rébellion armée | non | automatique (prévu) | — | Repérer les planètes à 6 rebelles et y ouvrir un combat terrestre. (moyenne) |
| 563 | Armer les rebelles | non | nouveau bouton + automatique (prévu) | — | Bouton : −3 ressources ; le +1 des rebelles se saisit à l'écran de combat. (facile) |
| 720 | Vote du conclave | non | nouveau bouton (prévu) | — | Bouton : jets des « Soutien politique », puis 1D10 ou 3D10 de votes. (moyenne) |
| 722 | Achat de votes | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, donne un soutien au Conclave, +5 commerce deux tours après. (moyenne) |
| 725 | Milice au coeur du pouvoir | **oui** | automatique | « Nouveau tour », à partir du tour 8, habilité posée sur la table : 1D10 miliciens mercenaires sur Mecatol Rex (2D10 si la loi « Ouverture bureau des mercenaires » est en jeu). | — |
| 764 | Confrérie de mercenaire | **oui** | bouton existant modifié + nouveau bouton | Recrutement (Ctrl + clic sur un mercenaire) : le surcoût du tour est ignoré. Bandeau « À faire » du recrutement : « piocher un mercenaire » (dans la main, à poser sur la case de son choix), une fois par tour. | — |
| 765 | Signal | **oui** | bouton existant modifié | « Entretien » : un marqueur de signal est posé sur un système tiré au hasard. | — |
| 814 | Rupture de l'espace-temps | **oui** | automatique | Déplacement assisté : passage par un trou de ver oméga, un dé de 10 par vaisseau (3 ou moins bloqué, 9 ou plus une touche), dans le cadre de blocage. | — |
| 815 | Étude des failles | **oui** | nouveau bouton | Fiche d'une Faille, phase de science : use un scientifique, active le système, +2 de recherche de rupture, notée au journal de recherche. | — |
| 837 | Réfugiés | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : crée 2 « Milice » sur chaque planète des réfugiés. (moyenne) |
| 838 | Entraîner les milices | non | nouveau bouton (prévu) | — | Bouton unique : −4 ressources, amiral posé sur la carte ; +2 des milices au combat. (moyenne) |
| 839 | Enrôlement des milices | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, donne 3 « Milice » d'une planète choisie au joueur. (moyenne) |
| 844 | Maître du pillage | **oui** | automatique | Chaque pillage rapporte 1 commerce de plus. | — |
| 895 | Sans influence | **oui** | bouton existant modifié | Recrutement, propositions et boutons de script qui coûtent de l'influence : payés en ressources. « Entretien » : aucune influence gagnée. | Autres dépenses d'influence : à la main. |
| 896 | Infiltration | **oui** | automatique + nouveau bouton | Conflit, « Retirer » : détruire un vaisseau donne un token Infiltration (éléments actifs, aux couleurs de la faction touchée). Plateau joueur, science : « Infiltration : +4 recherche » — use un scientifique et 2 infiltrations (usées jusqu'au nouveau tour), recherche notée au journal. | Prendre 2 infiltrations envers la même faction : à la main. |

## Unités

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 7 | Cuirassé | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 8 | Croiseur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 9 | Transporteur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 10 | Destroyeur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 11 | Frégate marchande | **oui** | nouveau bouton + automatique | Fiche de l'unité : « Livraison commerciale (3) » si une autre faction a un comptoir dans le système — un négociant est utilisé, la frégate dépensée, les dettes réduites. Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 12 | Infanterie | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 13 | Mech | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 14 | Dock | **partiel** | nouveau bouton | Phase de production : Ctrl + clic sur le dock ouvre une production comptée (un logisticien utilisé ; capacité logistique du joueur, vaisseaux et mechs ; le reste de la réserve est cerclé de rouge ; pose dans le système du dock). | Réparation et comptoir non contrôlés selon le système du dock. |
| 15 | Système de défense | **oui** | nouveau bouton | Conflit, canons spatiaux : listé dans « Mes canons spatiaux à portée » (notation « 6** » lue : 6, 2 dés) ; le choisir use un amiral et pose un marqueur d'activation. | — |
| 16 | Usine | **oui** | bouton existant modifié | « Entretien » : +2 ressources par usine posée sur la carte. | — |
| 17 | Soleil de guerre | **oui** | automatique | Produire un soleil de guerre sans la technologie « Soleil de guerre » demande une confirmation. | — |
| 20 | Frégate marchande (Conglomérat mercantile d'Hacan) | **oui** | nouveau bouton + automatique | Fiche de l'unité : « Livraison commerciale (3) » si une autre faction a un comptoir dans le système — un négociant est utilisé, la frégate dépensée, les dettes réduites. Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 21 | Soleil d'or (Conglomérat mercantile d'Hacan) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | −2 commerce au déplacement ; comptoir. |
| 22 | Mecha d'archéologie (Conglomérat mercantile d'Hacan) | **oui** | bouton existant modifié | « Fouiller la ruine » n'use pas de scientifique sur une planète où le joueur a un Mecha d'archéologie. | — |
| 23 | Statue en or (Conglomérat mercantile d'Hacan) | **oui** | bouton existant modifié + automatique | « Entretien » : +1 point par statue. Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 35 | Bazaar (Conglomérat mercantile d'Hacan) | partiel | à définir (prévu) | Caractéristiques de l'unité déjà utilisées. | Renvoie à « Vente au Bazaar » : marché et transactions non gérés. (difficile) |
| 148 | Salai Sai Corian (Héritiers de Winnu) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bonus à l'écran de combat : +1 par vaisseau adverse engagé ; production 1 non suivie. (moyenne) |
| 151 | Gloire au juste (Héritiers de Winnu) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement selon le possesseur de Mecatol Rex ; texte à clarifier. (moyenne) |
| 152 | Raideur (Kabal de l’ombre) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Raid et furtif : mots-clés à ajouter à l'écran de combat. (moyenne) |
| 153 | Arche de l'ombre (Kabal de l’ombre) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Raid et furtif : mots-clés à ajouter à l'écran de combat. (moyenne) |
| 154 | Camp de travail (Kabal de l’ombre) | **partiel** | nouveau bouton | Fiche de l'unité, production : « Camp de travail : +4 ressources » — le camp est usé, un esclave dépensé. | Effet de destruction : à la main. |
| 155 | Portail de repli (Kabal de l’ombre) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : replace ici les « Raideur » détruits au tour précédent. (moyenne) |
| 162 | Quetzalcoalt (Volée argentée) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Point de fin de combat avec trois vaisseaux militaires engagés. |
| 163 | Destroyeur (Volée argentée) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 influence ; la seconde attaque se relance à l'écran de combat. (facile) |
| 164 | Complexe de guerre (Volée argentée) | **partiel** | bouton existant modifié | « Entretien » : un destroyeur de la faction est posé dans le système du complexe. | Contrôle du système non vérifié ; +1 des destroyeurs des systèmes adjacents au combat. |
| 165 | Centre d'expansion (Volée argentée) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : marque un système choisi ; +1 au combat spatial là pour ce tour. (moyenne) |
| 171 | Mech Aérien (Volée argentée) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Autoriser ce mech dans l'écran de combat spatial ; réparation 2 non suivie. (moyenne) |
| 172 | J.N.S. Hylarim (Université de Jol-Nar) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. (moyenne) |
| 173 | Cuirassé (Université de Jol-Nar) | oui | — | Bombardement noté « 5\*\* » : vérifier que l'outil lit bien cette notation. | — |
| 174 | Destroyeur (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 175 | Bouclier mobile (Université de Jol-Nar) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. (moyenne) |
| 176 | Laboratoire (Université de Jol-Nar) | **oui** | bouton existant modifié | « Rechercher » rapporte 1 de recherche de plus sur une planète où le joueur a un Laboratoire. | — |
| 177 | Système de défense (Université de Jol-Nar) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche, retirée à la main. (facile) |
| 178 | Sphère de dyson (Université de Jol-Nar) | **partiel** | nouveau bouton | Fiche de l'unité, phase de science : use un scientifique, +2 ressources par niveau de connaissance spatiale. | Règle de pose (nébuleuse, supernova) non vérifiée. |
| 199 | Soleil de guerre (Université de Jol-Nar) | **oui** | automatique | Confirmation à la production sans la technologie ; valeur de contrôle lue par `#con`. | — |
| 243 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 407 | Vaisseau pirate (Pirate) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Touches visant d'abord les vaisseaux de commerce ; furtif dans une anomalie. |
| 423 | Letani (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 428 | Arbre gardien (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 431 | Transporteur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 444 | Station Météorologique | **oui** | bouton existant modifié | « Entretien » : 2 de recherche tempête et 1 de recherche spatiale par station, notées au journal de recherche ; plus de recherche tempête après la « Fin de la tempête ». | Règle de pose (système sans planète) non vérifiée. |
| 461 | Cuirassé (Omni-esprit d'Arborec) | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 462 | Croiseur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 463 | Destroyeur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 464 | Fruit de vie (Omni-esprit d'Arborec) | **partiel** | nouveau bouton | Fiche de l'unité : « Livraison commerciale (5) » si une autre faction a un comptoir dans le système. | — |
| 465 | Arbre père (Omni-esprit d'Arborec) | **oui** | bouton existant modifié | « Entretien » : un Fruit de vie est créé dans l'espace du système de l'arbre. | — |
| 466 | Épineux géant (Omni-esprit d'Arborec) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Autoriser ses attaques dans l'écran de combat pendant le bombardement. (moyenne) |
| 467 | Arbre mère (Omni-esprit d'Arborec) | **oui** | bouton existant modifié | « Entretien » : autant de Letani que le niveau de connaissance génétique, posés sur la planète de l'arbre. | — |
| 470 | Graine d'eden (Omni-esprit d'Arborec) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Résistance sans plafond à permettre ; bouton posant « New eden » à 6 de résistance. (moyenne) |
| 472 | Duha Menaimon (Omni-esprit d'Arborec) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Jet et nombre d'attaques selon la connaissance génétique : écran de combat à étendre. (moyenne) |
| 490 | Armageddon | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense 3 fragments militaires et un scientifique ; portée du canon non gérée. (moyenne) |
| 496 | Cuirassé impérial | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Réaction automatique d'une unité neutre aux engagements des autres joueurs. (difficile) |
| 509 | Dinosaure | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 511 | Garde impériale | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 512 | Station de combat | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 513 | Canon ancien | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 514 | Canon restauré | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 516 | Mech géant | **oui** | automatique | Compte pour 3 dans la capacité d'un vaisseau (avertissement à l'embarquement, déplacement assisté) ; valeur de contrôle lue par `#con`. | — |
| 524 | frégate du khan (Invasion du grand Khan) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | À sa destruction : touche de 6 ou 4 infligée au destructeur. (moyenne) |
| 525 | Palais du khan (Invasion du grand Khan) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Malus de visée par frégate du khan. |
| 527 | Soldat du Khan (Invasion du grand Khan) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 554 | Monument éternel | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | « Dégâts : pillage 3 au lieu » : lu comme un pillage de 3 à la destruction, à confirmer ; points par contributions. |
| 557 | Rebelle (Rébellion inter-planétaire) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif : mot-clé à ajouter à l'écran de combat. (moyenne) |
| 568 | Indigène | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un diplomate, lance 4 dés à 3 contre cette unité. (moyenne) |
| 569 | Vaisseau portail | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Sert de trou de ver alpha : à brancher sur le déplacement assisté. (difficile) |
| 570 | Cuve de Clonage | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de production : crée 2 infanteries sur la planète de la cuve. (moyenne) |
| 571 | Arbre de vie éternelle | **partiel** | nouveau bouton | Fiche de l'unité, phase de production : l'arbre est usé et prend 1 dégât, +4 commerce. | Soin en phase de science (coût « #regen(2) » à préciser) ; points du décompte. |
| 572 | Étoile de mort | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de déplacement : use logisticien, amiral et scientifique ; valeur de contrôle non calculée. (moyenne) |
| 573 | Vaisseau gigantesque | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 574 | Ravageur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 575 | Corsaire | **oui** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | — |
| 576 | Vaisseau antique | **oui** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. (4 commerce et 1 point) | — |
| 578 | Canon de Meer | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 582 | Telluran | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif : mot-clé à ajouter à l'écran de combat. (moyenne) |
| 590 | Colonie Ladaran | **partiel** | bouton existant modifié + automatique | « Entretien » : une infanterie de la faction est créée à bord. Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Points du décompte. |
| 591 | Destroyeur Tak'Qav | oui | — | Bombardement noté `#bomb(6)` sans nombre de dés : notation à vérifier. | — |
| 597 | Myru Vos | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif à ajouter ; +2 commerce à la destruction d'un vaisseau de commerce. (moyenne) |
| 598 | Magmus | **oui** | nouveau bouton | Fiche de l'unité : « Un vaisseau détruit ici » — +1 de recherche militaire, notée au journal de recherche. | — |
| 599 | Ggrocuto Rinn | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Déplacement furtif et exploration par déplacement : à brancher sur le déplacement assisté. (difficile) |
| 600 | Nekro Acidos | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Nombre d'attaques selon la connaissance militaire : écran de combat à étendre. (moyenne) |
| 601 | Riftwalker Meian | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Déplacement furtif : à brancher sur le déplacement assisté. (difficile) |
| 723 | Milicien mercenaire (Conclave secret) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 732 | S'Ula Mentarion | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Marqueur posé à la destruction d'un vaisseau de commerce ; bouton : le dépenser, livraison 5. (moyenne) |
| 745 | Olivier Dubois | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bonus +2 à des infanteries choisies, à l'écran de combat terrestre. (moyenne) |
| 746 | Bombardier Lourd | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 747 | Combattant Voyageur | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use l'unité, −3 ressources ; déplacement du pion manuel, distance non vérifiée. (moyenne) |
| 766 | Memoria (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense un signal, +4 cases de recherche de signal. (facile) |
| 767 | Memoria B (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense un signal, +4 cases de recherche de signal. (facile) |
| 768 | Memoria A (Le Nomade) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton signal facile ; furtivité et malus d'anomalie liés au déplacement. (difficile) |
| 769 | Memoria D (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton signal facile ; jet de 6 par infanterie détruite pour la sauver. (moyenne) |
| 770 | Memoria C (Le Nomade) | **partiel** | bouton existant modifié | « Entretien » : une frégate marchande est créée dans le système. | Dépense d'un signal ; revendication. |
| 786 | Centre de contrebande (Le Nomade) | **oui** | bouton existant modifié | « Entretien » : 3 ressources et 3 influence, moins 1 par autre centre de contrebande à 3 systèmes ou moins. | — |
| 810 | Nef de la rupture (Rupture de l'espace-temps) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Ignore blocage et trous de ver oméga. |
| 835 | Milice (Réfugiés) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 836 | Entrepôt d'aide (Réfugiés) | **partiel** | automatique | Conflit, « Retirer » : le camp qui a infligé le dernier dégât gagne le pillage, s'il a encore une unité dans le système. | Commerce posé sur l'entrepôt : à prendre à la main. |
| 845 | Croiseur (Pirate Mentak) | oui | — | Caractéristiques et précision déjà utilisées par l'outil. | — |
| 846 | Troupe de détournement (Pirate Mentak) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Attaque en dernier et capture des vaisseaux détruits : écran de combat à étendre. (moyenne) |
| 847 | Soleil de capturé (Pirate Mentak) | oui | — | Texte informatif (non productible) ; bombardement noté « 6\*\*\* » à vérifier. | — |
| 849 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 850 | Armageddon | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | À sa destruction : change de propriétaire avec 1 de résistance restante. (moyenne) |
| 854 | vaisseau relique | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Quatre boutons dépensant chacun un fragment ; le bonus de mouvement reste manuel. (moyenne) |
| 856 | Lune noire (Pirate Mentak) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Ciblage obligatoire : notion de cible absente de l'écran de combat. (moyenne) |
| 868 | Forge du vide (Fantômes de Creuss) | **oui** | bouton existant modifié | « Entretien » : 1 ressource, 1 influence et 1 de recherche s'il y a un trou de ver delta dans son système. | — |
| 893 | Usine (Virus de Nekro) | **partiel** | bouton existant modifié + nouveau bouton | « Entretien » : +2 ressources (script de l'Usine) ; production comptée par `#prod(3, Drone)`. | Dévastation pour réduire un coût. |

## Planètes

Planètes et stations dont le texte porte un effet. « (passé) » : laissé de côté pour l'instant — texte ambigu, ou mécanique trop lourde.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 27 | Canon ancien | **oui** | nouveau bouton | Fiche du système : « Réparer » (use un logisticien, 1 ressource par dégât : vos unités du système et le canon) ; « Restaurer le canon » (dépense un scientifique et 2 fragments militaires : l'unité devient un Canon restauré, sa carte arrive dans les éléments actifs, +2 points). | — |
| 30 | Canon restauré | **partiel** | nouveau bouton | Fiche du système : « Réparer » (use un logisticien, 1 ressource par dégât). | 1 point au décompte. |
| 31 | Astéroïde d'or | **oui** | nouveau bouton | Phase de production, « Revenus de la phase » : +3 commerce pour qui le possède. | — |
| 33 | SR-42 | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche spatiale. Fiche du système : « SR-42 : 3 ressources » — la station est activée (une fois), 1 de recherche militaire, génétique et sociale. | — |
| 34 | Mecatol Rex (Winnu) | **oui** | nouveau bouton + bouton existant modifié | Fiche du système, combat terrestre : « Dissoudre la Garde impériale » (12 influence, les Gardes de la planète sont retirées). Prendre possession de Mecatol Rex donne aussi la carte Mecatol Rex spéciale. | Faveurs des autres factions comptées 4 : à la main. |
| 38 | Station de mercenaire | non | — (passé) | — | Marché de mercenaires, achats par livraison : actions de commerce à créer. (difficile) |
| 41 | Atlas | **oui** | automatique | « Nouveau tour » : un Ravageur neutre est ajouté sur Atlas. | — |
| 45 | Anneau monde | **oui** | nouveau bouton + bouton existant modifié | Selon l'agent posé sur la station : logisticien — « Entretien » +2 ressources et +2 commerce ; scientifique — « Revenus de la phase » de science, 3 de recherche ; négociant — « Revenus de la phase » de production, 2 frégates marchandes ; diplomate — bouton « une faveur (4 commerce) » ; politique — bouton « piocher 3 lois » ; amiral — « Produire ici » (2 unités). | Ajouter une des lois piochées à l'agenda : à la main. |
| 46 | Wanno | **oui** | bouton existant modifié | Prendre possession ou revendiquer Wanno : +1 infamie. | — |
| 47 | SR-124 | **partiel** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche sociale, notées au journal de recherche. | Votes au prévote avec l'accord du possesseur. |
| 49 | Cormund | **oui** | bouton existant modifié + automatique | « Fouiller la ruine » : rouge gris sans 3 infanteries du joueur. « Nouveau tour » : chaque unité présente subit une attaque de force 4 (un dé par unité, 1 dégât sur 4 ou moins). | — |
| 56 | Station de combat | **oui** | nouveau bouton | Phase de science, « Revenus de la phase » : 2 de recherche militaire. Fiche du système, production : « Réparer » (use un logisticien, 1 ressource par dégât). | — |
| 59 | Jeollr | **oui** | automatique | Conflit : les bombardements contre Jeollr ont −2. | — |
| 60 | Perimeter | **oui** | bouton existant modifié | « Livraison commerciale » : +1 commerce si le joueur possède Perimeter. | — |
| 61 | Avar | **oui** | bouton existant modifié | « Revendiquer » : rouge gris sans unité du joueur sur la planète. | Perte de la possession quand la dernière unité part : à la main (« Abandonner »). |
| 62 | Loki | **oui** | automatique | Conflit, combats sur la planète : −1 aux attaques contre la faction qui la possède. | — |
| 69 | Relique | **oui** | nouveau bouton | Fiche du système, science : « Forger la relique » (3 fragments et 1 fragment ancien) — la carte de la Relique reforgée arrive dans les éléments actifs. | — |
| 71 | Starpoint | **oui** | nouveau bouton | Fiche du système, diplomatie : use un diplomate, 3 influence, une faveur neutre (jeton sans propriétaire). | — |
| 72 | Hopeld | **oui** | nouveau bouton | Fiche du système, phase de production : dépense un logisticien, pose un Mech géant sur la planète (que l'on possède). | — |
| 74 | Velnor | non | — (passé) | — | Fragments posés sur la planète, déplacement d'une flotte : texte à préciser. (difficile) |
| 75 | Elysium | **oui** | nouveau bouton + bouton existant modifié | Fiche du système, science : « Poser un scientifique » (la planète est activée, il y reste). « Entretien » : 1 de recherche militaire, spatiale, génétique et sociale par scientifique posé. | — |
| 131 | Relique reforgée | **oui** | bouton existant modifié | « Entretien » : +1 point pour qui la possède. | — |
| 229 | Mecatol Rex (spécial) | non | — (passé) | — | Dépenser un agent au choix pour obtenir un politique : choix de l'agent à faire. (facile) |
| 275 | Shar | **oui** | automatique | Déplacement assisté : la nébuleuse du système de Shar ne gêne pas les déplacements de qui possède Shar. | — |
| 469 | New eden | **oui** | bouton existant modifié | « Entretien » : 2 Letani posés sur la planète. | — |
| 473 | SIG-1 à SIG-4 | **oui** | nouveau bouton | Fiche du système, phase de science : « Obtenir » use un scientifique, la carte va dans les éléments actifs. | — |
| 508 | Université polytechnique | non | — (passé) | — | Agent tiré au ravitaillement, achats par commerce ou livraison. (difficile) |
| 783 | Arcturus | **oui** | bouton existant modifié + automatique | « Revendiquer » : rouge gris sans unité du joueur sur la planète. Y poser des unités sans 2 niveaux de connaissance spatiale (et génétique pour des unités biologiques) affiche un avertissement, sans rien empêcher. | — |
| 784 | Anneau Arcturus | **oui** | bouton existant modifié + nouveau bouton | « Entretien » : une frégate marchande créée dans le système ; « Produire ici » (`#prod`) ; fiche du système, science : « Recherche sociale, spatiale et libre » (use un scientifique). | — |

## Mercenaires

Cartes mercenaire (dans les éléments actifs de qui les a recrutées). Un bouton de mercenaire use sa carte (elle s'estompe) jusqu'au « Nouveau tour ». « Utilisable comme » un agent : glisser le cube noir du mercenaire (ou sa carte) sur un type d'agent de « Mes agents » — les types à 0 y restent affichés — ou de sa feuille ; ensuite, dès qu'un agent de ce type est utilisé ou dépensé, une fenêtre demande qui agit, l'agent de base ou le mercenaire (utilisé : sa carte est usée ; dépensé : elle est retirée du jeu). Sans agent de ce type, le mercenaire agit d'office. Les mercenaires de combat ont chacun leur bouton sous le combat. « (passé) » : laissé de côté pour l'instant.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 219 | Rear Admiral Farran | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des cuirassés −1 : à la main. |
| 220 | Suffi An | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des croiseurs −1 : à la main. |
| 221 | Trillossa Aun Mirik | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Le destroyeur de plus : à la main. |
| 280 | Evelyne Delouis | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Coût des transporteurs −1, vitesse +1 : à la main. |
| 281 | Claire Gibson | **oui** | nouveau bouton | Combat terrestre : « Claire Gibson : +1 à vos infanteries » — la carte est usée, le bonus vaut pour ce combat. | — |
| 282 | Ipswitch | non | — | — | Livraison envers n'importe quelle unité : hors du bouton de livraison actuel. (passé) |
| 283 | M'aban | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Construire un second bâtiment : à la main. |
| 284 | So Ata | **partiel** | nouveau bouton | Combat spatial, deux boutons : « désigner un vaisseau » (début du combat : la carte est usée, un rappel s'affiche) ; « capturer un vaisseau détruit » (avant « Retirer » : le vaisseau adverse va dans vos éléments actifs, sans ses dégâts). | La restriction d'engagement du vaisseau désigné : à la main. |
| 285 | Doctor Carrina | **partiel** | nouveau bouton | Fiche de la carte, science : la carte est usée, 1 de recherche sociale, militaire, génétique et spatiale (journal de recherche). | Activer une planète ; ignorer un niveau de prérequis : à la main. |
| 286 | Xuange | **oui** | nouveau bouton | Fiche de la carte, science : la carte est usée, le joueur choisit X — 2X influence dépensée, X de recherche sociale. | — |
| 287 | Aktaran | **oui** | nouveau bouton | Fiche de la carte, diplomatie : la carte est usée, 4 de recherche (journal de recherche). | La livraison qui le déclenche n'est pas vérifiée. |
| 288 | Yvin Korduul | **oui** | nouveau bouton | Fiche de la carte, diplomatie : la carte est usée, 5 influence, une de vos faveurs est créée. | — |
| 289 | Sai Seravus (astrophysicienne) | **oui** | nouveau bouton | Fiche de la carte, science : la carte est usée, 1 de recherche spatiale par système à anomalie où vous avez une unité. | — |
| 290 | Taïk jedz | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Placer puis retirer l'unité liée au mercenaire : à la main. (passé) |
| 291 | Ahk Ravin | **partiel** | nouveau bouton | Fiche de la carte, science : la carte est usée, 3 ressources, 2 fragments de relique piochés. | Activer la ruine : à la main. |
| 292 | Carth de Sabledor | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Le vaisseau de commerce gratuit : à la main. |
| 293 | Elder Qanoj | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Ses 3 votes : non reliés au vote de l'outil. (passé) |
| 294 | Z'eu | non | — | — | Votes générés par le mercenaire : non reliés au vote de l'outil. (passé) |
| 295 | Viscount Unlenn | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Déplacement hors des règles de blocage : à la main. (passé) |
| 297 | Artuno | **oui** | nouveau bouton | Fiche de la carte, diplomatie : la carte est usée, 1 commerce par alliance en cours chez vous. | — |
| 298 | Acamar | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Votes copiés sur une autre faction : non reliés au vote de l'outil. (passé) |
| 299 | Sharsiss | **oui** | nouveau bouton + bouton existant modifié | Combat spatial : un bouton par autre faction du combat — la carte est usée, autant de ses unités que vous en avez au combat ont +1 (les premières qui tirent). Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 300 | Harrugh Gefhara | non | — | — | Votes générés par le mercenaire : non reliés au vote de l'outil. (passé) |
| 301 | S'Ula Mentarion | non | — | — | Pose d'une unité liée dans un système non contrôlé. (passé) |
| 302 | Ta Zern | **oui** | nouveau bouton | Fiche de la carte, science : la carte est usée, 1 de recherche génétique par planète que vous possédez. | — |
| 303 | Baggil Wildpaw | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Mercenaire posé sur la planète d'une autre faction, revenu détourné : à la main. (passé) |
| 304 | George Nobin | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Livraison augmentée de X : à la main. (passé) |
| 349 | Sal Gavda | **oui** | nouveau bouton | Fiche de la carte, diplomatie : la carte est usée, 1 commerce par faction (vous comprise) qui possède une planète dans un système où vous avez une unité. | — |
| 350 | Skarvald | **oui** | nouveau bouton + bouton existant modifié | Bombardement : « Skarvald : voler du commerce » — la carte est usée, 3 dés lancés par le serveur, chaque 5 ou moins vole 1 commerce à la faction qui possède la planète. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | « Système que vous contrôlez » non vérifié. |
| 351 | Vasra Ivo | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Portée des canons +1 : à la main. |
| 352 | Suldhan Wraeg | non | — | — | Marqueurs qui annulent une anomalie pour vos déplacements. (passé) |
| 353 | Agnlan Oln | **partiel** | nouveau bouton | Fiche de la carte, science : la carte est usée, un plan de relique est pioché dans votre main. | Fabriquer une relique en ignorant 2 fragments : à la main. |
| 354 | Richtyrian | non | — | — | Bonus d'infanterie sur le monde où il est posé : le propriétaire d'une carte posée sur la carte du jeu n'est pas connu. (passé) |
| 355 | Mirik Aun Sissiri | **oui** | nouveau bouton + bouton existant modifié | Fiche d'un système, phase de mandat : « Mirik Aun Sissiri : +1 au combat spatial dans ce système » — la carte est usée, le bonus vaut jusqu'à la prochaine phase de mandat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 356 | Henry Storcher | **oui** | nouveau bouton + bouton existant modifié | Combat spatial : « Henry Storcher : +N commerce » — la carte est usée, 1 commerce par vaisseau que vous avez perdu dans ce combat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 357 | Jace X | **oui** | nouveau bouton + bouton existant modifié | Combat terrestre : « Jace X : +1 à vos unités terrestres » — la carte est usée, le bonus vaut pour ce combat. Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | — |
| 358 | Shipmonger Zsknck | **oui** | nouveau bouton | Fiche d'un de vos vaisseaux non biologiques endommagés, production : la carte du mercenaire est usée, le vaisseau perd ses dégâts sans rien payer. | — |
| 359 | Sai Seravus (cartographe de Creuss) | non | — | — | Trous de ver alpha et bêta adjacents : règle de déplacement. (passé) |
| 729 | Gabriel Gibbs | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Mobilisation jusqu'à la capacité logistique : à la main. |
| 910 | Ilyane Vorsk | **partiel** | bouton existant modifié | Utilisable comme l'agent indiqué : glisser son cube noir (ou sa carte) sur ce type d'agent de « Mes agents » ; quand un agent de ce type est utilisé ou dépensé, une fenêtre propose le mercenaire à sa place. | Ses votes en plus : non reliés au vote de l'outil. (passé) |

## Promesses

Cartes de la réserve de promesses, chez la faction qui les garde (éléments actifs ou promesse à durée) ; le marqueur posé dessus est celui de la faction qui a fait la promesse. « (passé) » : laissé de côté pour l'instant.

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 224 | Vassal | **partiel** | bouton existant modifié + nouveau bouton | Conflit d'accord : « Accepter » est grisé pour le camp qui possède la planète revendiquée. Fiche de la carte : « Promesse rompue » (monde natal perdu) — retour à la réserve, la faction du marqueur gagne 1 infamie. | Donner sa faveur aux tours pairs ; fins de promesse sans infamie : à la main. |
| 225 | Pacte de non-agression | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — la carte retourne à la réserve, son marqueur est retiré, la faction qui l'a faite gagne 1 infamie. | — |
| 226 | Redevance de protection | non | — | — | Paiements au choix de deux factions à chaque ravitaillement. (passé) |
| 227 | Soutien politique | non | — | — | Issue annoncée et vote à hauteur de la promesse : non relié au vote de l'outil. (passé) |
| 228 | Concession commerciale | non | — | — | Effet pas clair pour l'outil. (passé) |
| 262 | Embuscade | non | — | — | Unité d'une autre faction posée et contrôlée le temps d'un combat. (passé) |
| 335 | Accord de recherche | **oui** | nouveau bouton | Fiche de la carte : « +2 recherche », notée au journal de recherche. | Le déclenchement (la faction recherche une technologie) est à la main. |
| 336 | Commerce d'esclave | non | — | — | Jet par infanterie détruite, capture et dette. (passé) |
| 368 | Protecteur de l'empire | non | — | — | Bonus de combat contre une faction plus infâme. (passé) |
| 369 | Pupille de l'empire | non | — | — | Réaction des Winnu à une conquête. (passé) |
| 370 | Accès aux archives impériales | **oui** | nouveau bouton | Fiche de la carte, science : use un scientifique, Mecatol Rex est activée, 3 de recherche pour vous et autant pour les Winnu (journal de recherche). | — |
| 383 | Promesse de vente | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — retour à la réserve, la faction qui l'a faite gagne 1 infamie. | L'élément promis et l'échéance : à la main. |
| 384 | Frontière ouverte | **oui** | nouveau bouton | Fiche de la carte : « Promesse rompue » — retour à la réserve, la faction qui l'a faite gagne 1 infamie. | — |
| 421 | Partage de technologie | non | — | — | Technologie d'une autre faction dont on bénéficie. (passé) |
| 454 | Tuteur des réfugiés | non | — | — | Lié aux réfugiés, non représentés. (passé) |
| 458 | Pacte pirate | **partiel** | nouveau bouton | Obtenu par « Diplomatie pirate ». Fiche de la carte, ravitaillement : « payer 2 ressources » (une fois par tour). | Les pirates vous ignorent : à la main. |
| 870 | Passage de Creuss | non | — | — | Usage des trous de ver delta : règle de déplacement. (passé) |

## Agents et reliques

Agents spéciaux et reliques qui remplacent un agent (même fenêtre de choix que les mercenaires « utilisables comme »).

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 142 | Héritier (agent des Winnu) | **oui** | bouton existant modifié | Quand un politique (si vous possédez Mecatol Rex) ou un amiral (sinon) est utilisé ou dépensé, la fenêtre propose un Héritier à sa place ; sans agent de ce type, l'Héritier agit d'office. Dépensé, il va sur la case du tour + 2 de votre feuille au lieu d'être détruit. | Le reprendre au tour dit : à la main (le glisser dans ses agents). |
| 396 | Noble cryogénisé (relique) | **oui** | bouton existant modifié | Glisser la carte sur un type d'agent de « Mes agents » : elle s'utilise comme cet agent (fenêtre de choix) ; quand elle devrait être dépensée, elle est usée. Usée, elle redevient disponible au « Nouveau tour ». | Changer de type : glisser la carte sur un autre type. |

## Mots-clés d'unité

Deux sortes : les **capacités** écrites dans le texte d'une unité (`#furtif`, `#can(6,2)`…, définies dans les remplacements) et les **étiquettes** de son champ « mots-clés » (`ship`, `mil`…). Le nombre d'unités est celui des unités dont le texte cite la capacité.

### Capacités (texte de l'unité)

| Mot-clé | Règle | Unités | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---:|---|---|---|---|
| `#bomb` bombardement | Attaque contre les forces terrestres. | 12 | **oui** | automatique | Conflit, « Bombardement » : les unités de l'espace qui ont `#bomb(valeur, dés)` ou la notation à étoiles (« 5\*\* » : 5, 2 dés) tirent sur la planète. | — |
| `#can` canon spatial | Attaque à distance, portée 1 par défaut. | 11 | **oui** | nouveau bouton | Conflit, « Canons spatiaux » : chaque joueur voit ses canons à portée avec leur distance (`#can(valeur, dés)` ou « 6\*\* ») ; en choisir un use un amiral et pose un marqueur d'activation. Portée 2 avec Canon longue portée. | « portée 0 » écrite sur une unité : non lue. (facile) |
| `#fpre` frappe en premier | L'unité attaque avant les autres. | 6 | **oui** | automatique | Conflit : phases 1 et 2 du combat (frappe en premier, puis ses dégâts) avant les autres attaques. | — |
| `#prec` précis | Pas de malus en ciblant une unité. | 6 | **oui** | automatique | Conflit : « Cibler » ne coûte pas −2 à cette unité. | — |
| `#con` contrôle | Valeur de contrôle de l'unité (1 par défaut). | 16 | **oui** | automatique | Blocage d'un déplacement, conflits de contrôle et de domination : chaque unité militaire vaut la valeur écrite (`#con(3)`), sinon 1 ; +1 avec Rayon tracteur. | Test de domination hors Exploitation du vide. (moyenne) |
| `#furtif` furtif | Tant qu'ils n'ont engagé personne, ces vaisseaux doivent être ciblés. | 7 | **oui** | automatique | Conflit, combat spatial : un engagement de faction n'atteint pas une unité furtive qui n'a rien engagé ; il faut la cibler. | — |
| `#deplfurtif` déplacement furtif | Ne peut pas être bloqué par des vaisseaux adverses en se déplaçant. | 4 | **oui** | automatique | Cadre de blocage : ces vaisseaux ne comptent pas parmi ceux à arrêter ; un groupe entièrement furtif ne s'arrête pas pour des unités. | — |
| `#pill` pillage | Qui détruit l'unité gagne le commerce indiqué (ou ce que dit le texte) — sauf s'il n'a aucune unité dans le système. | 16 | **oui** | automatique | Chaque dégât note son auteur sur l'unité touchée (marque `degatDe`). Conflit, « Retirer » : le camp du dernier dégât gagne le pillage lu dans le texte — commerce, points, infamie, recherche (notée au journal) — s'il a encore une unité dans le système ; le bouton l'annonce (« Retirer (butin) »). | Pillage hors de l'écran de combat (unité retirée à la main) : non géré. |
| `#comp` comptoir commercial | Permet de recevoir une livraison. | 11 | **oui** | automatique | Livraison commerciale : seules les factions qui ont une unité à comptoir dans le système peuvent être livrées. | — |
| `#livr` livraison commerciale | L'unité, non bloquée, livre du commerce à une faction qui a un comptoir dans le système. | 6 | **oui** | nouveau bouton | Fiche de l'unité : « Livraison commerciale (n) » — choix de la faction s'il y a plusieurs comptoirs, commerce donné, dettes réduites, négociant utilisé et unité dépensée selon son texte. | « Non bloquée » : non vérifié. |
| `#rep` réparation | Permet de réparer : 1 ressource par point de résistance. | 4 | **partiel** | — | Fiche d'un système : « Réparer » paie 1 ressource par dégât. | Le bouton ne vérifie pas qu'une unité à réparation est dans le système. (facile) |
| `#prod` production | Produit des unités en payant leur coût (type et quantité indiqués). | 5 | **oui** | nouveau bouton | Phase de production : Ctrl + clic sur l'unité ouvre une production (un logisticien utilisé, marqueur d'activation, bandeau « n / quantité », réserve cerclée de rouge pour ce qu'elle ne produit pas, « Terminer »). `#prod(#clog, …)` : la capacité logistique. Une station ou une planète qui porte `#prod` (Anneau Arcturus) : bouton « Produire ici » de la fiche du système. Poser hors du système de la production demande une confirmation. | Règles fines de pose (unité spatiale ou terrestre, vaisseau non bloqué) : non vérifiées. |
| `#raid` raid | Bombardement qui capture les infanteries. | 2 | non | automatique (prévu) | — | Conflit, bombardement : infanterie touchée capturée au lieu d'être détruite. (moyenne) |
| `#tvd`, `#tvo` trous de ver | L'unité compte comme un trou de ver (delta), ou les ignore (oméga). | 4 | **partiel** | automatique | Déplacement assisté : trous de ver des tuiles et des tokens ; jet du trou de ver oméga. | Une unité qui vaut trou de ver (Hil Colish) ; la Nef de la rupture qui ignore l'oméga. (moyenne) |
| `#use`, `#spend`, `#dep`, `#act`, `#destroy` | Symboles : utiliser, dépenser, placer, activer, destruction. | — | — | — | Symboles de rédaction, sans effet propre. | — |

### Étiquettes (champ « mots-clés »)

| Étiquette | Sens | Implémenté | Ce que fait l'outil |
|---|---|---|---|
| `ship` | Vaisseau | **oui** | Combat spatial et cible des canons ; déplacement assisté ; porte les unités transportables ; ne se pose pas sur une planète. |
| `mil` | Militaire | **oui** | Tire au combat ; compte pour le blocage et le contrôle ; se déplace avec un amiral. |
| `terre` | Terrestre | **oui** | Seule une unité terrestre se pose sur une planète. |
| `transportable` | Transportable | **oui** | Embarque sur un vaisseau (glisser, ou « Charger » du déplacement assisté), avec avertissement de capacité. |
| `trans` | Transport | **oui** | Se déplace avec un amiral ; +2 de capacité avec « Capsule de transport ». |
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
