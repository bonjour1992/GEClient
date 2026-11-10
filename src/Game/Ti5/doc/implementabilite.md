# Implémentabilité des règles TI5 dans l'outil de partie

Pour chaque technologie, habilité, unité et mot-clé d'unité : ce que l'outil de partie applique, **comment il touche à l'interface**, et ce qu'il resterait à scripter. Analyse du 10 novembre 2026, tenue à jour à chaque script écrit (dernière mise à jour : 11 novembre 2026).

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
| Technologies | 93 | 26 | 2 | 65 | 9 | 11 | 11 |
| Habilités | 46 | 1 | 1 | 44 | 0 | 1 | 1 |
| Unités | 102 | 29 | 73 | 0 | 0 | 0 | 0 |
| **Total** | **241** | **56** | **76** | **109** | **9** | **12** | **12** |

Les trois dernières colonnes comptent les scripts écrits (une carte peut en avoir deux : « bouton existant modifié + nouveau bouton »).

## Technologies

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 139 | Assimilation | **oui** | bouton existant modifié | Fiche d'un système : « Prendre possession » et « Revendiquer » posent une infanterie sur une planète sans propriétaire ; « Mobiliser » en pose une de plus, gratuite, sur une planète sauvage. | — |
| 140 | Culture courtisane | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : diplomates à −1. « Entretien » : +1 influence par alliance en jeu chez vous (éléments actifs et cases de tour). | — |
| 141 | Diversité | **oui** | bouton existant modifié | « Entretien » : +1 influence par planète possédée. | — |
| 180 | Bâtiment résistant | **oui** | automatique | Conflit, bombardement : −1 aux tireurs sur une planète que vous possédez, −2 si vous y avez une structure. | — |
| 181 | Troupe d'élite | **oui** | automatique | Conflit, combat terrestre : +1 à vos infanteries. | — |
| 182 | Bombe bactériologique | non | nouveau bouton (prévu) | — | Bouton après bombardement : détruit deux infanteries biologiques identiques par infanterie touchée. (moyenne) |
| 183 | Bio stimulant | **oui** | bouton existant modifié | Tout bouton qui dépense un agent (trêve, déplacement depuis un système activé, relique, Ctrl + clic sur un agent) : une fenêtre propose de l'utiliser et de payer 2 ressources à la place. | — |
| 184 | Manipulation mentale | **oui** | nouveau bouton | Fiche d'un système, à côté de chaque planète : « Manipulation mentale » use un diplomate et pose une infanterie (une de vos unités dans le système ou un système voisin). | — |
| 185 | Récupération | **oui** | bouton existant modifié | Conflit : « Terminer le combat » reçoit une case « Récupération », cochée d'office ; +1 ressource par unité détruite pendant le combat ; rouge gris si deux factions l'ont cochée. | Coalition et partage des ressources : à la main. |
| 186 | Bouclier déflecteur | **oui** | automatique + bouton existant modifié | Conflit, canons spatiaux : −1 aux canons qui visent vos vaisseaux. Déplacement assisté : « Déplacer » est rouge gris à travers un champ d'astéroïdes, sauf avec cette technologie. | — |
| 187 | Apprentissage | **oui** | nouveau bouton | Plateau joueur, « Actions de mes technologies » : « Apprentissage » remplace un de vos agents par un autre agent de base (celui de votre faction s'il le réimplémente). | — |
| 188 | Capsule de transport | **oui** | automatique | Capacité des vaisseaux (avertissement d'embarquement, chargement du déplacement assisté) : +1, +2 pour un transporteur. | — |
| 189 | Capsule de secours | **oui** | nouveau bouton | Conflit : cadre « Sauvetage » d'un combat — un jet par infanterie d'un vaisseau détruit (6 ou moins sur un dé de 10), puis un bouton par arrivée possible. | Accord du propriétaire du dock : non géré, comme demandé. |
| 190 | Écoles militaires | **oui** | bouton existant modifié | Recrutement (Ctrl + clic) : amiraux à −1. Fiche d'un système : « Combat spatial » donne +1 au premier combat que vous ouvrez dans le tour. | — |
| 191 | Logistique améliorée | **partiel** | bouton existant modifié | Recrutement (Ctrl + clic) : logisticiens à −1. | Bouton détruisant un logisticien posé sur la carte ; capacité logistique non suivie. |
| 192 | PC | non | automatique (prévu) | — | Bonus +1 à l'écran de combat si dock ou vaisseau amiral dans le système. (moyenne) |
| 193 | IA industrielle | non | automatique (prévu) | — | Réduction de 2 en production sur planète militaire ; limite de production non suivie. (moyenne) |
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
| 209 | Archéologie | non | nouveau bouton (prévu) | — | Boutons : pioche 2 fragments, en garde un ; use un scientifique, pioche un plan. (moyenne) |
| 210 | Université | non | nouveau bouton (prévu) | — | Bouton : use un agent choisi, ajoute un agent du même type au tour suivant. (moyenne) |
| 211 | Pillage | non | nouveau bouton (prévu) | — | Bouton : retire 2 commerce à une faction choisie et vous les donne. (moyenne) |
| 212 | Propagande | non | nouveau bouton (prévu) | — | Bouton : détruit un diplomate ; l'infamie évitée reste gérée à la main. (facile) |
| 213 | Réseau de commerce | non | nouveau bouton (prévu) | — | Deux boutons de conversion : 1 influence en 1 ressource, et l'inverse. (facile) |
| 214 | Extorsion | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, dette de 3 pour une faction choisie, durée 3 tours. (moyenne) |
| 216 | Science intégrée | **partiel** | bouton existant modifié | Recrutement (Ctrl + clic) : scientifiques à −1. | Bouton : use un scientifique, +4 cases de recherche à une faction choisie. |
| 217 | Rayon tracteur | non | automatique (prévu) | — | Effet permanent sur la valeur de contrôle, que l'outil ne calcule pas. (difficile) |
| 218 | Exploration | non | nouveau bouton (prévu) | — | Bouton : use un scientifique et un logisticien, pioche une tuile, emplacement choisi. (moyenne) |
| 231 | Cartographie de l'espace | non | automatique (prévu) | — | Malus −1 à l'écran de combat si le système contient une anomalie. (moyenne) |
| 232 | Exploitation du vide | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : ressources selon les systèmes vides dominés (domination à déterminer). (moyenne) |
| 233 | Moteur à gravité | non | nouveau bouton + automatique (prévu) | — | Bouton : use un ou deux scientifiques ; le bonus de vitesse reste manuel. (facile) |
| 234 | Stratégie de saut | non | automatique (prévu) | — | À brancher sur le déplacement assisté (trous de ver). (difficile) |
| 235 | Canon longue portée | non | automatique (prévu) | — | Portée des canons non gérée : l'outil n'a pas de notion de distance. (difficile) |
| 236 | Camouflage | non | automatique (prévu) | — | Effet permanent de furtivité, à brancher sur le déplacement assisté. (difficile) |
| 237 | Micro-téléporteur | non | nouveau bouton (prévu) | — | Bouton : use un logisticien ; déplace des pions choisis entre deux planètes à structure. (moyenne) |
| 238 | Stargate | non | automatique (prévu) | — | À brancher sur le déplacement assisté (trous de ver). (difficile) |
| 239 | Moteur FTL | non | automatique (prévu) | — | À brancher sur le déplacement assisté. (difficile) |
| 242 | Médecine | non | nouveau bouton + automatique (prévu) | — | Boutons : jet de capture à la destruction ; use un logisticien, replace les capturées. (moyenne) |
| 244 | Bouclier amplifié | non | automatique (prévu) | — | Effet permanent : résistance majorée de trois unités (modificateur de caractéristique à créer). (moyenne) |
| 245 | Cuve de clonage | non | nouveau bouton (prévu) | — | Bouton : use un scientifique, mobilisation gratuite avec une infanterie de plus, planète choisie. (moyenne) |
| 246 | Drain Spatial | non | automatique (prévu) | — | Réaction au déplacement d'un autre joueur : à brancher sur le déplacement assisté. (difficile) |
| 247 | Réseau d'ingérence | non | nouveau bouton (prévu) | — | Bouton : use un scientifique, +2 votes au décompte. (facile) |
| 248 | Laser longue portée | non | automatique (prévu) | — | Portée non gérée ; ajouter `#can(6,3)` au vaisseau amiral reste faisable. (difficile) |
| 250 | Grappin de capture | non | nouveau bouton (prévu) | — | Bouton de fin de combat : use un logisticien, capture un vaisseau détruit choisi. (moyenne) |
| 251 | Argumentation véhémente | non | nouveau bouton (prévu) | — | Bouton : use un politicien, −1 influence, +2 votes au décompte. (facile) |
| 252 | Stratégie dominante | non | automatique (prévu) | — | Bonus +1 des unités à frappe en premier ; malus de ciblage non géré. (moyenne) |
| 253 | Avantage aérien | non | automatique (prévu) | — | Effet permanent : donner la frappe en premier aux infanteries dans l'écran de combat. (moyenne) |
| 269 | Commerce profitable | non | bouton existant modifié (prévu) | — | Suppose une action « livraison » à créer ; un script y ajouterait +1. (moyenne) |
| 270 | Connexion | non | nouveau bouton + automatique (prévu) | — | Effet permanent : tout bouton usant un agent devrait accepter un négociant payé 2 commerce. (difficile) |
| 273 | Exploitation de masse | non | bouton existant modifié (prévu) | — | Variante du bouton « Esclaves » : +2 ressources ; même ajout pour « Camp de travail ». (facile) |
| 274 | Enrôlement | non | nouveau bouton (prévu) | — | Bouton : use un logisticien, pose 2 esclaves sur une planète choisie ; recapture manuelle. (moyenne) |
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
| 24 | Libre échange | non | automatique (prévu) | — | À la destruction d'une unité commerciale non militaire : +1 infamie au destructeur. (moyenne) |
| 36 | Vente au Bazaar | non | à définir (prévu) | — | Marché public avec achats par les autres factions : transactions non gérées. (difficile) |
| 144 | Clé de l'empire | non | nouveau bouton (prévu) | — | Bouton : détruit un logisticien, répare le système de défense de Mecatol Rex. (moyenne) |
| 145 | Destin légendaire | non | bouton existant modifié + automatique (prévu) | — | Bouton de ravitaillement : +1 point par planète légendaire contrôlée (contrôle à déterminer). (moyenne) |
| 146 | Mandat | non | automatique (prévu) | — | Mandats liés aux transactions et au contrôle permanent de Mecatol Rex. (difficile) |
| 156 | Raid | non | automatique (prévu) | — | Mot-clé à ajouter à l'écran de combat : bombardement qui capture les infanteries. (moyenne) |
| 157 | Esclaves | non | nouveau bouton (prévu) | — | Bouton : dépense un esclave, +1 ressource. (facile) |
| 158 | Exécuter les otages | non | à définir (prévu) | — | Contraint le vote d'une autre faction : votes non gérés au-delà du décompte. (difficile) |
| 159 | Restituer les otages | non | nouveau bouton (prévu) | — | Bouton lors d'une livraison : rend jusqu'à 2 esclaves, infanteries posées chez le receveur. (moyenne) |
| 160 | Conclave secret | non | nouveau bouton (prévu) | — | Bouton aux tours prévus : pioche un objectif militaire secret, marque le précédent. (facile) |
| 166 | Vassalisation forcée | non | nouveau bouton (prévu) | — | Bouton : détruit un diplomate, marque une faction choisie vassale ; condition vérifiée à la main. (moyenne) |
| 167 | Fierté | non | — | Règles d'interdiction et de décompte, sans action à déclencher. | — |
| 168 | Seigneur | non | nouveau bouton + automatique (prévu) | — | Bouton : transforme un agent choisi en Seigneur ; déclencheurs constatés à la main. (moyenne) |
| 254 | Domination | non | nouveau bouton (prévu) | — | Bouton : désigne une planète ; +2 points en fin de tour si contrôlée. (moyenne) |
| 404 | Aide humanitaire | non | automatique (prévu) | — | Compteur du commerce livré par faction, puis points attribués trois tours plus tard. (moyenne) |
| 406 | Mouvement pirate | non | automatique (prévu) | — | Déplacement automatique des pirates avec recherche de chemin : déplacement non géré. (difficile) |
| 427 | Sève de vie | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : retire 1 dégât à chaque unité biologique du joueur. (moyenne) |
| 441 | Étude des tempêtes | non | nouveau bouton (prévu) | — | Deux boutons : use un scientifique, +2 ou +4 cases de recherche tempête. (facile) |
| 442 | Tempête spatiale | non | automatique (prévu) | — | Malus de combat et de canon faisables ; malus de mouvement lié au déplacement. (difficile) |
| 443 | Fin de la tempête | non | nouveau bouton (prévu) | — | Bouton d'événement : points selon les connaissances de tempête de chaque faction. (moyenne) |
| 452 | Péage aux frontières | non | nouveau bouton + automatique (prévu) | — | Bouton d'événement : +3 commerce à qui domine chaque système à trou de ver alpha. (moyenne) |
| 453 | Offre d'asile | non | nouveau bouton (prévu) | — | Bouton : planète choisie, points gagnés, 6 « Milice » et un entrepôt créés, alliance donnée. (moyenne) |
| 486 | Cache | non | nouveau bouton (prévu) | — | Bouton : prend un fragment présent dans un système dominé (domination à déterminer). (moyenne) |
| 487 | BDD technique | non | nouveau bouton (prévu) | — | Bouton : +1 case de recherche par fragment de relique possédé. (facile) |
| 491 | Présence de cache | non | automatique (prévu) | — | À l'exploration d'un système : y créer un fragment de relique tiré au hasard. (moyenne) |
| 515 | Distorsion gravitationnelle | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : une touche de force « numéro du tour » par unité du système. (moyenne) |
| 522 | Diplomatie pirate | non | nouveau bouton (prévu) | — | Bouton pour toute faction : use un diplomate, −3 commerce, donne « Pacte pirate ». (facile) |
| 523 | Combat pirate | non | automatique (prévu) | — | Engagements automatiques d'une faction non jouée, selon plusieurs critères de priorité. (difficile) |
| 528 | Combat du Khan | non | automatique (prévu) | — | Combat automatique contre des flottes désignées : flottes et engagements non gérés. (difficile) |
| 529 | Déplacement du Khan | non | automatique (prévu) | — | Vote spécial puis déplacement et blocage du Khan : ni l'un ni l'autre gérés. (difficile) |
| 530 | Débarquement du Khan | non | nouveau bouton (prévu) | — | Bouton : 1D6 « Soldat du Khan » créés sur chaque planète voisine choisie. (moyenne) |
| 558 | Rébellion en cours | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : +1D3 « Rebelle » sur chaque planète non neutre qui en contient. (moyenne) |
| 560 | Négocier avec les rebelles | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, lance 3 dés à 4 (précis) contre les rebelles. (moyenne) |
| 561 | Rébellion armée | non | automatique (prévu) | — | Repérer les planètes à 6 rebelles et y ouvrir un combat terrestre. (moyenne) |
| 563 | Armer les rebelles | non | nouveau bouton + automatique (prévu) | — | Bouton : −3 ressources ; le +1 des rebelles se saisit à l'écran de combat. (facile) |
| 720 | Vote du conclave | non | nouveau bouton (prévu) | — | Bouton : jets des « Soutien politique », puis 1D10 ou 3D10 de votes. (moyenne) |
| 722 | Achat de votes | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, donne un soutien au Conclave, +5 commerce deux tours après. (moyenne) |
| 725 | Milice au coeur du pouvoir | non | nouveau bouton (prévu) | — | Bouton dès le tour 8 : 1D10 ou 2D10 « Milicien mercenaire » créés sur Mecatol Rex. (moyenne) |
| 764 | Confrérie de mercenaire | **partiel** | bouton existant modifié | Recrutement (Ctrl + clic sur un mercenaire) : le surcoût du tour est ignoré. | Bouton piochant un mercenaire, posé sur une case de recrutement choisie. |
| 765 | Signal | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : crée un marqueur de signal sur un système tiré au hasard. (moyenne) |
| 814 | Rupture de l'espace-temps | **oui** | automatique | Déplacement assisté : passage par un trou de ver oméga, un dé de 10 par vaisseau (3 ou moins bloqué, 9 ou plus une touche), dans le cadre de blocage. | — |
| 815 | Étude des failles | non | nouveau bouton (prévu) | — | Bouton : use un scientifique, +2 cases de recherche de rupture. (facile) |
| 837 | Réfugiés | non | bouton existant modifié (prévu) | — | Bouton de ravitaillement : crée 2 « Milice » sur chaque planète des réfugiés. (moyenne) |
| 838 | Entraîner les milices | non | nouveau bouton (prévu) | — | Bouton unique : −4 ressources, amiral posé sur la carte ; +2 des milices au combat. (moyenne) |
| 839 | Enrôlement des milices | non | nouveau bouton (prévu) | — | Bouton : use un diplomate, donne 3 « Milice » d'une planète choisie au joueur. (moyenne) |
| 844 | Maître du pillage | non | bouton existant modifié (prévu) | — | Suppose une action « pillage » à créer ; un script y ajouterait +1 commerce. (moyenne) |

## Unités

| n° | Nom | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---|---|---|---|
| 7 | Cuirassé | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 8 | Croiseur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 9 | Transporteur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 10 | Destroyeur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 11 | Frégate marchande | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un négociant, détruit la frégate, livraison de 3 à une faction choisie. (moyenne) |
| 12 | Infanterie | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 13 | Mech | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 14 | Dock | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Limite de production 3, réparation et comptoir : à contrôler selon le système du dock. (moyenne) |
| 15 | Système de défense | oui | — | Canon noté « 6\*\* » : vérifier que l'outil lit bien cette notation. | — |
| 16 | Usine | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : +2 ressources par usine possédée. (facile) |
| 17 | Soleil de guerre | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Message orange si produit sans la technologie « Soleil de guerre ». (facile) |
| 20 | Frégate marchande (Conglomérat mercantile d'Hacan) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un négociant, détruit la frégate, livraison de 3 à une faction choisie. (moyenne) |
| 21 | Soleil d'or (Conglomérat mercantile d'Hacan) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −2 commerce au déplacement ; comptoir et pillage supposent des actions à créer. (moyenne) |
| 22 | Mecha d'archéologie (Conglomérat mercantile d'Hacan) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Variante d'une action « fouille » à créer, sans user de scientifique. (moyenne) |
| 23 | Statue en or (Conglomérat mercantile d'Hacan) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : +1 point par statue ; pillage non géré. (facile) |
| 35 | Bazaar (Conglomérat mercantile d'Hacan) | partiel | à définir (prévu) | Caractéristiques de l'unité déjà utilisées. | Renvoie à « Vente au Bazaar » : marché et transactions non gérés. (difficile) |
| 148 | Salai Sai Corian (Héritiers de Winnu) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bonus à l'écran de combat : +1 par vaisseau adverse engagé ; production 1 non suivie. (moyenne) |
| 151 | Gloire au juste (Héritiers de Winnu) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement selon le possesseur de Mecatol Rex ; texte à clarifier. (moyenne) |
| 152 | Raideur (Kabal de l’ombre) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Raid et furtif : mots-clés à ajouter à l'écran de combat. (moyenne) |
| 153 | Arche de l'ombre (Kabal de l’ombre) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Raid et furtif : mots-clés à ajouter à l'écran de combat. (moyenne) |
| 154 | Camp de travail (Kabal de l’ombre) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use le camp, dépense un esclave, +4 ressources ; effet de destruction manuel. (moyenne) |
| 155 | Portail de repli (Kabal de l’ombre) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : replace ici les « Raideur » détruits au tour précédent. (moyenne) |
| 162 | Quetzalcoalt (Volée argentée) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de fin de combat : +1 point si trois vaisseaux militaires engagés et survie. (moyenne) |
| 163 | Destroyeur (Volée argentée) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 influence ; la seconde attaque se relance à l'écran de combat. (facile) |
| 164 | Complexe de guerre (Volée argentée) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Ravitaillement : crée un destroyeur si système contrôlé ; +1 des destroyeurs adjacents au combat. (moyenne) |
| 165 | Centre d'expansion (Volée argentée) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : marque un système choisi ; +1 au combat spatial là pour ce tour. (moyenne) |
| 171 | Mech Aérien (Volée argentée) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Autoriser ce mech dans l'écran de combat spatial ; réparation 2 non suivie. (moyenne) |
| 172 | J.N.S. Hylarim (Université de Jol-Nar) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. (moyenne) |
| 173 | Cuirassé (Université de Jol-Nar) | oui | — | Bombardement noté « 5\*\* » : vérifier que l'outil lit bien cette notation. | — |
| 174 | Destroyeur (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 175 | Bouclier mobile (Université de Jol-Nar) | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. (moyenne) |
| 176 | Laboratoire (Université de Jol-Nar) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : +1 case de recherche quand la planète est activée pour rechercher. (facile) |
| 177 | Système de défense (Université de Jol-Nar) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : −1 ressource pour annuler une touche, retirée à la main. (facile) |
| 178 | Sphère de dyson (Université de Jol-Nar) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un scientifique, +2 ressources par niveau de science spatiale. (facile) |
| 199 | Soleil de guerre (Université de Jol-Nar) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Message orange sans la technologie (facile) ; valeur de contrôle 3 non calculée. (moyenne) |
| 243 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 407 | Vaisseau pirate (Pirate) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Touches visant les vaisseaux de commerce, furtif en anomalie : écran de combat à étendre. (moyenne) |
| 423 | Letani (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 428 | Arbre gardien (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 431 | Transporteur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 444 | Station Météorologique | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : +2 cases de recherche tempête par station. (facile) |
| 461 | Cuirassé (Omni-esprit d'Arborec) | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 462 | Croiseur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 463 | Destroyeur (Omni-esprit d'Arborec) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 464 | Fruit de vie (Omni-esprit d'Arborec) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : détruit le fruit, livraison de 5 à une faction choisie. (moyenne) |
| 465 | Arbre père (Omni-esprit d'Arborec) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : crée un « Fruit de vie » dans le système de l'arbre. (moyenne) |
| 466 | Épineux géant (Omni-esprit d'Arborec) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Autoriser ses attaques dans l'écran de combat pendant le bombardement. (moyenne) |
| 467 | Arbre mère (Omni-esprit d'Arborec) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : crée des « Letani » jusqu'au niveau de connaissance génétique. (moyenne) |
| 470 | Graine d'eden (Omni-esprit d'Arborec) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Résistance sans plafond à permettre ; bouton posant « New eden » à 6 de résistance. (moyenne) |
| 472 | Duha Menaimon (Omni-esprit d'Arborec) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Jet et nombre d'attaques selon la connaissance génétique : écran de combat à étendre. (moyenne) |
| 490 | Armageddon | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : dépense 3 fragments militaires et un scientifique ; portée du canon non gérée. (moyenne) |
| 496 | Cuirassé impérial | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Réaction automatique d'une unité neutre aux engagements des autres joueurs. (difficile) |
| 509 | Dinosaure | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 511 | Garde impériale | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 512 | Station de combat | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Valeur de contrôle : calcul du contrôle par planète ou système à créer. (moyenne) |
| 513 | Canon ancien | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 514 | Canon restauré | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 516 | Mech géant | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Compter 3 dans l'avertissement de capacité ; valeur de contrôle non calculée. (moyenne) |
| 524 | frégate du khan (Invasion du grand Khan) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | À sa destruction : touche de 6 ou 4 infligée au destructeur. (moyenne) |
| 525 | Palais du khan (Invasion du grand Khan) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Malus de visée par frégate : ciblage non géré à l'écran de combat. (moyenne) |
| 527 | Soldat du Khan (Invasion du grand Khan) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 554 | Monument éternel | partiel | à définir (prévu) | Caractéristiques de l'unité déjà utilisées. | Comptoir, pillage et points par contributions : actions de commerce à créer. (moyenne) |
| 557 | Rebelle (Rébellion inter-planétaire) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif : mot-clé à ajouter à l'écran de combat. (moyenne) |
| 568 | Indigène | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : use un diplomate, lance 4 dés à 3 contre cette unité. (moyenne) |
| 569 | Vaisseau portail | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Sert de trou de ver alpha : à brancher sur le déplacement assisté. (difficile) |
| 570 | Cuve de Clonage | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de production : crée 2 infanteries sur la planète de la cuve. (moyenne) |
| 571 | Arbre de vie éternelle | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Boutons : +1 dégât et +4 commerce ; use un scientifique, −1 dégât. (moyenne) |
| 572 | Étoile de mort | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de déplacement : use logisticien, amiral et scientifique ; valeur de contrôle non calculée. (moyenne) |
| 573 | Vaisseau gigantesque | oui | — | Caractéristiques et bombardement déjà utilisés par l'outil. | — |
| 574 | Ravageur | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 575 | Corsaire | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Pillage : suppose une action « pillage » à créer. (moyenne) |
| 576 | Vaisseau antique | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Pillage : suppose une action « pillage » à créer. (moyenne) |
| 578 | Canon de Meer | oui | — | Caractéristiques et canon déjà utilisés par l'outil. | — |
| 582 | Telluran | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif : mot-clé à ajouter à l'écran de combat. (moyenne) |
| 590 | Colonie Ladaran | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : crée une infanterie à bord ; pillage non géré. (moyenne) |
| 591 | Destroyeur Tak'Qav | oui | — | Bombardement noté `#bomb(6)` sans nombre de dés : notation à vérifier. | — |
| 597 | Myru Vos | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Furtif à ajouter ; +2 commerce à la destruction d'un vaisseau de commerce. (moyenne) |
| 598 | Magmus | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton : +1 case de recherche militaire quand un vaisseau est détruit dans son système. (facile) |
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
| 770 | Memoria C (Le Nomade) | partiel | nouveau bouton (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton signal facile ; création d'une frégate au ravitaillement ; revendication manuelle. (moyenne) |
| 786 | Centre de contrebande (Le Nomade) | partiel | bouton existant modifié (prévu) | Caractéristiques de l'unité déjà utilisées. | Bouton de ravitaillement : +3 ressources et influence, réduits selon les centres proches. (moyenne) |
| 810 | Nef de la rupture (Rupture de l'espace-temps) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Ignore blocage et trous de ver oméga : à brancher sur le déplacement assisté. (difficile) |
| 835 | Milice (Réfugiés) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 836 | Entrepôt d'aide (Réfugiés) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Compteur de commerce sur l'entrepôt, alimenté par les livraisons à la planète. (moyenne) |
| 845 | Croiseur (Pirate Mentak) | oui | — | Caractéristiques et précision déjà utilisées par l'outil. | — |
| 846 | Troupe de détournement (Pirate Mentak) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Attaque en dernier et capture des vaisseaux détruits : écran de combat à étendre. (moyenne) |
| 847 | Soleil de capturé (Pirate Mentak) | oui | — | Texte informatif (non productible) ; bombardement noté « 6\*\*\* » à vérifier. | — |
| 849 | Infanterie (Université de Jol-Nar) | oui | — | Aucun effet particulier : caractéristiques déjà utilisées. | — |
| 850 | Armageddon | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | À sa destruction : change de propriétaire avec 1 de résistance restante. (moyenne) |
| 854 | vaisseau relique | partiel | nouveau bouton + automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Quatre boutons dépensant chacun un fragment ; le bonus de mouvement reste manuel. (moyenne) |
| 856 | Lune noire (Pirate Mentak) | partiel | automatique (prévu) | Caractéristiques de l'unité déjà utilisées. | Ciblage obligatoire : notion de cible absente de l'écran de combat. (moyenne) |

## Mots-clés d'unité

Deux sortes : les **capacités** écrites dans le texte d'une unité (`#furtif`, `#can(6,2)`…, définies dans les remplacements) et les **étiquettes** de son champ « mots-clés » (`ship`, `mil`…). Le nombre d'unités est celui des unités dont le texte cite la capacité.

### Capacités (texte de l'unité)

| Mot-clé | Règle | Unités | Implémenté | Interface | Ce que fait l'outil | Reste à faire (faisabilité) |
|---|---|---:|---|---|---|---|
| `#bomb` bombardement | Attaque contre les forces terrestres. | 12 | **partiel** | automatique | Conflit, « Bombardement » : les unités de l'espace qui ont `#bomb(valeur, dés)` tirent sur la planète. | Notation à étoiles (« 5\*\* ») non lue : seule `#bomb(5,2)` l'est. (facile) |
| `#can` canon spatial | Attaque à distance, portée 1 par défaut. | 11 | **partiel** | automatique | Conflit, « Canons spatiaux » : les unités du système et des systèmes voisins qui ont `#can(valeur, dés)` tirent sur les vaisseaux. | Notation à étoiles (« 6\*\* ») non lue ; portée autre que 1. (facile, moyenne) |
| `#fpre` frappe en premier | L'unité attaque avant les autres. | 6 | **oui** | automatique | Conflit : phases 1 et 2 du combat (frappe en premier, puis ses dégâts) avant les autres attaques. | — |
| `#prec` précis | Pas de malus en ciblant une unité. | 6 | **oui** | automatique | Conflit : « Cibler » ne coûte pas −2 à cette unité. | — |
| `#con` contrôle | Valeur de contrôle de l'unité (1 par défaut). | 16 | **partiel** | automatique | Blocage d'un déplacement et conflit de contrôle : chaque unité militaire vaut 1. | Lire la valeur écrite sur l'unité (`#con(3)`) ; test de domination. (moyenne) |
| `#furtif` furtif | Tant qu'ils n'ont engagé personne, ces vaisseaux doivent être ciblés. | 7 | non | automatique (prévu) | — | Conflit : interdire l'engagement de faction contre une unité furtive qui n'a rien engagé. (moyenne) |
| `#deplfurtif` déplacement furtif | Ne peut pas être bloqué par des vaisseaux adverses en se déplaçant. | 4 | non | automatique (prévu) | — | Cadre de blocage : ne pas compter ces vaisseaux dans ceux à arrêter. (facile) |
| `#pill` pillage | Qui détruit l'unité gagne le commerce indiqué. | 16 | non | automatique (prévu) | — | Conflit : à « Retirer », donner le commerce au camp qui a détruit l'unité (à désigner s'ils sont plusieurs). (moyenne) |
| `#comp` comptoir commercial | Permet de recevoir une livraison. | 11 | non | bouton existant modifié (prévu) | — | Vérifié par une action « livraison » qui reste à créer. (moyenne) |
| `#livr` livraison commerciale | L'unité, non bloquée, livre du commerce à une faction qui a un comptoir dans le système. | 6 | **partiel** | nouveau bouton | Seule la livraison d'« Art du commerce » existe (plateau joueur). | Bouton de livraison sur la fiche de l'unité : commerce donné, dettes réduites. (moyenne) |
| `#rep` réparation | Permet de réparer : 1 ressource par point de résistance. | 4 | **partiel** | — | Fiche d'un système : « Réparer » paie 1 ressource par dégât. | Le bouton ne vérifie pas qu'une unité à réparation est dans le système. (facile) |
| `#prod` production | Produit des unités en payant leur coût (type et quantité indiqués). | 5 | **partiel** | — | Case « Production » de la réserve : glisser une unité retire son coût des ressources. | Type, quantité et lieu de production non vérifiés. (moyenne) |
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
