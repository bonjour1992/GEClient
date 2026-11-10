# Implémentabilité des règles TI5 dans l'outil de partie

Tableau d'analyse du 10 novembre 2026 : pour chaque technologie, habilité et unité, ce que l'outil de partie applique déjà et ce qu'il resterait à scripter.
Colonnes : **n°** (identifiant), **Nom** (faction liée entre parenthèses), **Implémenté** (`oui`, `partiel`, `non`), **Faisabilité** du reste à faire, **Diagnostic** (quoi faire, ou pourquoi c'est difficile).
Faisabilité : `facile` = script d'action construite ou bouton qui change des compteurs / use un agent ; `moyenne` = bouton avec choix, plusieurs pions, dés ou état de la carte ; `difficile` = déplacement, effet permanent ou à tout moment, réaction pendant le tour d'un autre, trou de ver ; `sans objet` = rien à automatiser.
Quand un texte mêle plusieurs effets, la faisabilité est celle de la partie la plus difficile ; le diagnostic signale la partie simple.

## Résumé chiffré

| Type | Total | oui | partiel | non | facile | moyenne | difficile | sans objet |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Technologies | 93 | 0 | 4 | 89 | 20 | 59 | 14 | 0 |
| Habilités | 46 | 0 | 1 | 45 | 7 | 29 | 9 | 1 |
| Unités | 102 | 29 | 73 | 0 | 11 | 55 | 7 | 29 |
| **Total** | **241** | **29** | **78** | **134** | **38** | **143** | **30** | **30** |

## Technologies

| n° | Nom | Implémenté | Faisabilité | Diagnostic |
|---|---|---|---|---|
| 139 | Assimilation | non | moyenne | Bouton : crée une infanterie gratuite sur une planète choisie (neutre obtenue ou sauvage). |
| 140 | Culture courtisane | partiel | facile | Reste : bouton de ravitaillement, +1 influence par alliance en jeu. |
| 141 | Diversité | non | moyenne | Bouton de ravitaillement : +1 influence par planète possédée, à compter sur la carte. |
| 180 | Bâtiment résistant | non | moyenne | Malus automatique au bombardement selon le propriétaire de la planète et ses structures. |
| 181 | Troupe d'élite | non | moyenne | Bonus permanent : script sur l'écran de combat, +1 aux infanteries en combat terrestre. |
| 182 | Bombe bactériologique | non | moyenne | Bouton après bombardement : détruit deux infanteries biologiques identiques par infanterie touchée. |
| 183 | Bio stimulant | non | moyenne | Bouton : use un agent choisi au lieu de le détruire, −2 ressources. |
| 184 | Manipulation mentale | non | moyenne | Bouton : use un diplomate, crée une infanterie sur une planète adjacente choisie. |
| 185 | Récupération | non | moyenne | Bouton de fin de combat : +1 ressource par vaisseau détruit pendant ce combat. |
| 186 | Bouclier déflecteur | non | difficile | Malus de canon faisable à l'écran de combat ; astéroïdes liés au déplacement. |
| 187 | Apprentissage | non | moyenne | Bouton : remplace un agent choisi par un agent de base choisi. |
| 188 | Capsule de transport | non | moyenne | Effet permanent : majorer la capacité lue par l'avertissement (+1, transporteur +2). |
| 189 | Capsule de secours | non | difficile | Réaction à une destruction, avec jet et accord d'un autre joueur. |
| 190 | Écoles militaires | partiel | moyenne | Reste : +1 au premier combat activé du tour, à suivre dans l'écran de combat. |
| 191 | Logistique améliorée | partiel | moyenne | Reste : bouton détruisant un logisticien posé sur la carte ; capacité logistique non suivie. |
| 192 | PC | non | moyenne | Bonus +1 à l'écran de combat si dock ou vaisseau amiral dans le système. |
| 193 | IA industrielle | non | moyenne | Réduction de 2 en production sur planète militaire ; limite de production non suivie. |
| 194 | Arme amplifiée | non | moyenne | Bouton : détruit un scientifique, marque un type de vaisseau ; +2 à l'écran de combat. |
| 195 | Réparation improvisée | non | moyenne | Bouton : use un logisticien, répare un vaisseau choisi. |
| 196 | Système de visée | non | moyenne | Bonus permanent +1 aux canons et bombardements, à appliquer dans l'écran de combat. |
| 197 | Blindage en duranium | non | moyenne | Effet permanent : +1 de résistance pour trois types de vaisseaux (modificateur de caractéristique). |
| 198 | Soleil de guerre | non | facile | Message orange si un soleil de guerre est produit sans cette technologie. |
| 200 | Art du commerce | non | moyenne | Recrutement : copier le script existant. Livraison de 2 : bouton avec faction choisie. |
| 201 | École politique | non | facile | Recrutement : copier le script existant. Bouton : pioche 2 lois supplémentaires. |
| 202 | Centre de coordination | non | moyenne | Bonus +1 à l'écran de combat si dock ou vaisseau amiral dans le système. |
| 205 | Rapport de force | non | facile | Bouton : use un diplomate ; le +2 de contrôle reste manuel (contrôle non calculé). |
| 206 | Réparation | non | moyenne | Bouton : use un diplomate, dette de 3 pour une faction choisie, durée 3 tours. |
| 207 | Brevet | non | difficile | Réaction à la recherche d'un autre joueur ; à défaut, bouton +1 commerce. |
| 208 | Trading | non | moyenne | Bouton : use un négociant, note la prédiction ; +2 commerce si le vote la confirme. |
| 209 | Archéologie | non | moyenne | Boutons : pioche 2 fragments, en garde un ; use un scientifique, pioche un plan. |
| 210 | Université | non | moyenne | Bouton : use un agent choisi, ajoute un agent du même type au tour suivant. |
| 211 | Pillage | non | moyenne | Bouton : retire 2 commerce à une faction choisie et vous les donne. |
| 212 | Propagande | non | facile | Bouton : détruit un diplomate ; l'infamie évitée reste gérée à la main. |
| 213 | Réseau de commerce | non | facile | Deux boutons de conversion : 1 influence en 1 ressource, et l'inverse. |
| 214 | Extorsion | non | moyenne | Bouton : use un diplomate, dette de 3 pour une faction choisie, durée 3 tours. |
| 216 | Science intégrée | partiel | moyenne | Reste : bouton, use un scientifique, +4 cases de recherche à une faction choisie. |
| 217 | Rayon tracteur | non | difficile | Effet permanent sur la valeur de contrôle, que l'outil ne calcule pas. |
| 218 | Exploration | non | moyenne | Bouton : use un scientifique et un logisticien, pioche une tuile, emplacement choisi. |
| 231 | Cartographie de l'espace | non | moyenne | Malus −1 à l'écran de combat si le système contient une anomalie. |
| 232 | Exploitation du vide | non | moyenne | Bouton de ravitaillement : ressources selon les systèmes vides dominés (domination à déterminer). |
| 233 | Moteur à gravité | non | facile | Bouton : use un ou deux scientifiques ; le bonus de vitesse reste manuel. |
| 234 | Stratégie de saut | non | difficile | Dépend du déplacement par trou de ver, pas encore géré. |
| 235 | Canon longue portée | non | difficile | Portée des canons non gérée : l'outil n'a pas de notion de distance. |
| 236 | Camouflage | non | difficile | Effet permanent de furtivité, lié au déplacement, pas encore géré. |
| 237 | Micro-téléporteur | non | moyenne | Bouton : use un logisticien ; déplace des pions choisis entre deux planètes à structure. |
| 238 | Stargate | non | difficile | Dépend des trous de ver et du déplacement, pas encore gérés. |
| 239 | Moteur FTL | non | difficile | Dépend du déplacement, pas encore géré. |
| 242 | Médecine | non | moyenne | Boutons : jet de capture à la destruction ; use un logisticien, replace les capturées. |
| 244 | Bouclier amplifié | non | moyenne | Effet permanent : résistance majorée de trois unités (modificateur de caractéristique à créer). |
| 245 | Cuve de clonage | non | moyenne | Bouton : use un scientifique, mobilisation gratuite avec une infanterie de plus, planète choisie. |
| 246 | Drain Spatial | non | difficile | Réaction au déplacement d'un autre joueur, pas encore gérée. |
| 247 | Réseau d'ingérence | non | facile | Bouton : use un scientifique, +2 votes au décompte. |
| 248 | Laser longue portée | non | difficile | Portée non gérée ; ajouter `#can(6,3)` au vaisseau amiral reste faisable. |
| 250 | Grappin de capture | non | moyenne | Bouton de fin de combat : use un logisticien, capture un vaisseau détruit choisi. |
| 251 | Argumentation véhémente | non | facile | Bouton : use un politicien, −1 influence, +2 votes au décompte. |
| 252 | Stratégie dominante | non | moyenne | Bonus +1 des unités à frappe en premier ; malus de ciblage non géré. |
| 253 | Avantage aérien | non | moyenne | Effet permanent : donner la frappe en premier aux infanteries dans l'écran de combat. |
| 269 | Commerce profitable | non | moyenne | Suppose une action « livraison » à créer ; un script y ajouterait +1. |
| 270 | Connexion | non | difficile | Effet permanent : tout bouton usant un agent devrait accepter un négociant payé 2 commerce. |
| 273 | Exploitation de masse | non | facile | Variante du bouton « Esclaves » : +2 ressources ; même ajout pour « Camp de travail ». |
| 274 | Enrôlement | non | moyenne | Bouton : use un logisticien, pose 2 esclaves sur une planète choisie ; recapture manuelle. |
| 399 | Adaptation des réacteurs | non | difficile | Dépend du déplacement, pas encore géré. |
| 400 | Adaptation de la visée | non | moyenne | Annule le malus de tempête à l'écran de combat, une fois celui-ci scripté. |
| 402 | Vaccin | non | moyenne | Bouton : +4 points ; faveur si personne n'a découvert le vaccin avant. |
| 403 | Arme bactériologique | non | moyenne | Bouton : use un scientifique, jet de 5 par infanterie du système choisi. |
| 419 | hacan:Réparation improvisée | non | moyenne | Bouton : use un logisticien, répare un vaisseau choisi. |
| 445 | Station météorologique | non | facile | Message orange si une station météorologique est produite sans cette technologie. |
| 446 | Tempête électromagnétique | non | moyenne | Bouton : use un scientifique, lance un canon (4,4) ; nébuleuse et cible choisies. |
| 447 | Générateur de tempête | non | moyenne | Bouton : use un scientifique, −3 ressources ; malus de combat à saisir à la main. |
| 448 | Exploitation des tempêtes | non | facile | Deux boutons : +3 ressources au ravitaillement ; use un scientifique, +4 ressources. |
| 481 | SIG-1 | non | facile | Bouton : donne le signal n° 1 au joueur (sens du texte à confirmer). |
| 482 | SIG-2 | non | facile | Bouton : donne le signal n° 2 au joueur (sens du texte à confirmer). |
| 483 | SIG-3 | non | facile | Bouton : donne le signal n° 3 au joueur (sens du texte à confirmer). |
| 484 | SIG-4 | non | facile | Bouton : donne le signal n° 4 au joueur (sens du texte à confirmer). |
| 592 | Recomposition | non | moyenne | Bouton de fin de combat : dés selon les pertes biologiques, puis production offerte. |
| 593 | Croissance | non | moyenne | Bouton : remplace un vaisseau biologique choisi par un autre coûtant jusqu'à 2 de plus. |
| 594 | Vie fructifiante | non | moyenne | Variante du script de « Sève de vie » (à écrire) : 2 points rendus. |
| 787 | Réseau | non | facile | Bouton de ravitaillement : +2 influence par satellite possédé. |
| 788 | Stratégie d'évitement | non | moyenne | Début de combat : malus −1 sur des vaisseaux choisis, à l'écran de combat. |
| 789 | Contact mercenaire | non | moyenne | Bouton : use la carte, produit un vaisseau payé en influence ; portée non vérifiée. |
| 791 | Stimulant | non | moyenne | Bouton : use la carte, rend disponible un agent usé choisi. |
| 803 | Prévision des combats | non | moyenne | Bouton : use un scientifique ; frappe en premier donnée à une flotte choisie. |
| 804 | Calcul de probabilité | non | moyenne | Bouton : montre au seul joueur la prochaine carte du plateau déroulé. |
| 805 | Anticipation | non | facile | Bouton : use la carte et un scientifique ; le déplacement de « Memoria » reste manuel. |
| 806 | Opportunité prédite | non | moyenne | Bouton : ajoute un agent de base choisi sur la case de recrutement 4. |
| 807 | Relais d'influence | non | facile | Bouton de ravitaillement : +2 influence par station possédée. |
| 816 | Ouverture de faille | non | moyenne | Bouton : use carte et scientifique, crée un jeton oméga dans un système choisi. |
| 817 | Communication avec les êtres de la faille | non | moyenne | Bouton : use un diplomate, −4 influence, donne une « Nef de la rupture » choisie. |
| 818 | Énergie de la faille | non | moyenne | Bonus permanent : script sur l'écran de combat, +1 aux vaisseaux en combat spatial. |
| 819 | Soldats déphasés | non | moyenne | Bonus permanent : script sur l'écran de combat, +1 aux forces terrestres. |
| 820 | Stabilisateur de rupture | non | difficile | Dépend du passage par trou de ver oméga, pas encore géré. |
| 821 | Extraction de la faille | non | moyenne | Bouton de ravitaillement : +3 ressources par « Faille » dominée (domination à déterminer). |
| 857 | Piraterie informatique | non | facile | Deux boutons de conversion : 1 commerce en 2 ressources ou en 2 influence. |

## Habilités

| n° | Nom | Implémenté | Faisabilité | Diagnostic |
|---|---|---|---|---|
| 24 | Libre échange | non | moyenne | À la destruction d'une unité commerciale non militaire : +1 infamie au destructeur. |
| 36 | Vente au Bazaar | non | difficile | Marché public avec achats par les autres factions : transactions non gérées. |
| 144 | Clé de l'empire | non | moyenne | Bouton : détruit un logisticien, répare le système de défense de Mecatol Rex. |
| 145 | Destin légendaire | non | moyenne | Bouton de ravitaillement : +1 point par planète légendaire contrôlée (contrôle à déterminer). |
| 146 | Mandat | non | difficile | Mandats liés aux transactions et au contrôle permanent de Mecatol Rex. |
| 156 | Raid | non | moyenne | Mot-clé à ajouter à l'écran de combat : bombardement qui capture les infanteries. |
| 157 | Esclaves | non | facile | Bouton : dépense un esclave, +1 ressource. |
| 158 | Exécuter les otages | non | difficile | Contraint le vote d'une autre faction : votes non gérés au-delà du décompte. |
| 159 | Restituer les otages | non | moyenne | Bouton lors d'une livraison : rend jusqu'à 2 esclaves, infanteries posées chez le receveur. |
| 160 | Conclave secret | non | facile | Bouton aux tours prévus : pioche un objectif militaire secret, marque le précédent. |
| 166 | Vassalisation forcée | non | moyenne | Bouton : détruit un diplomate, marque une faction choisie vassale ; condition vérifiée à la main. |
| 167 | Fierté | non | sans objet | Règles d'interdiction et de décompte, sans action à déclencher. |
| 168 | Seigneur | non | moyenne | Bouton : transforme un agent choisi en Seigneur ; déclencheurs constatés à la main. |
| 254 | Domination | non | moyenne | Bouton : désigne une planète ; +2 points en fin de tour si contrôlée. |
| 404 | Aide humanitaire | non | moyenne | Compteur du commerce livré par faction, puis points attribués trois tours plus tard. |
| 406 | Mouvement pirate | non | difficile | Déplacement automatique des pirates avec recherche de chemin : déplacement non géré. |
| 427 | Sève de vie | non | moyenne | Bouton de ravitaillement : retire 1 dégât à chaque unité biologique du joueur. |
| 441 | Étude des tempêtes | non | facile | Deux boutons : use un scientifique, +2 ou +4 cases de recherche tempête. |
| 442 | Tempête spatiale | non | difficile | Malus de combat et de canon faisables ; malus de mouvement lié au déplacement. |
| 443 | Fin de la tempête | non | moyenne | Bouton d'événement : points selon les connaissances de tempête de chaque faction. |
| 452 | Péage aux frontières | non | moyenne | Bouton d'événement : +3 commerce à qui domine chaque système à trou de ver alpha. |
| 453 | Offre d'asile | non | moyenne | Bouton : planète choisie, points gagnés, 6 « Milice » et un entrepôt créés, alliance donnée. |
| 486 | Cache | non | moyenne | Bouton : prend un fragment présent dans un système dominé (domination à déterminer). |
| 487 | BDD technique | non | facile | Bouton : +1 case de recherche par fragment de relique possédé. |
| 491 | Présence de cache | non | moyenne | À l'exploration d'un système : y créer un fragment de relique tiré au hasard. |
| 515 | Distorsion gravitationnelle | non | moyenne | Bouton de ravitaillement : une touche de force « numéro du tour » par unité du système. |
| 522 | Diplomatie pirate | non | facile | Bouton pour toute faction : use un diplomate, −3 commerce, donne « Pacte pirate ». |
| 523 | Combat pirate | non | difficile | Engagements automatiques d'une faction non jouée, selon plusieurs critères de priorité. |
| 528 | Combat du Khan | non | difficile | Combat automatique contre des flottes désignées : flottes et engagements non gérés. |
| 529 | Déplacement du Khan | non | difficile | Vote spécial puis déplacement et blocage du Khan : ni l'un ni l'autre gérés. |
| 530 | Débarquement du Khan | non | moyenne | Bouton : 1D6 « Soldat du Khan » créés sur chaque planète voisine choisie. |
| 558 | Rébellion en cours | non | moyenne | Bouton de ravitaillement : +1D3 « Rebelle » sur chaque planète non neutre qui en contient. |
| 560 | Négocier avec les rebelles | non | moyenne | Bouton : use un diplomate, lance 3 dés à 4 (précis) contre les rebelles. |
| 561 | Rébellion armée | non | moyenne | Repérer les planètes à 6 rebelles et y ouvrir un combat terrestre. |
| 563 | Armer les rebelles | non | facile | Bouton : −3 ressources ; le +1 des rebelles se saisit à l'écran de combat. |
| 720 | Vote du conclave | non | moyenne | Bouton : jets des « Soutien politique », puis 1D10 ou 3D10 de votes. |
| 722 | Achat de votes | non | moyenne | Bouton : use un diplomate, donne un soutien au Conclave, +5 commerce deux tours après. |
| 725 | Milice au coeur du pouvoir | non | moyenne | Bouton dès le tour 8 : 1D10 ou 2D10 « Milicien mercenaire » créés sur Mecatol Rex. |
| 764 | Confrérie de mercenaire | partiel | moyenne | Reste : bouton piochant un mercenaire, posé sur une case de recrutement choisie. |
| 765 | Signal | non | moyenne | Bouton de ravitaillement : crée un marqueur de signal sur un système tiré au hasard. |
| 814 | Rupture de l'espace-temps | non | difficile | Déclenché par le passage dans un trou de ver oméga ; à défaut, bouton 1D10. |
| 815 | Étude des failles | non | facile | Bouton : use un scientifique, +2 cases de recherche de rupture. |
| 837 | Réfugiés | non | moyenne | Bouton de ravitaillement : crée 2 « Milice » sur chaque planète des réfugiés. |
| 838 | Entraîner les milices | non | moyenne | Bouton unique : −4 ressources, amiral posé sur la carte ; +2 des milices au combat. |
| 839 | Enrôlement des milices | non | moyenne | Bouton : use un diplomate, donne 3 « Milice » d'une planète choisie au joueur. |
| 844 | Maître du pillage | non | moyenne | Suppose une action « pillage » à créer ; un script y ajouterait +1 commerce. |

## Unités

| n° | Nom | Implémenté | Faisabilité | Diagnostic |
|---|---|---|---|---|
| 7 | Cuirassé | oui | sans objet | Caractéristiques et bombardement déjà utilisés par l'outil. |
| 8 | Croiseur | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 9 | Transporteur | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 10 | Destroyeur | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 11 | Frégate marchande | partiel | moyenne | Bouton : use un négociant, détruit la frégate, livraison de 3 à une faction choisie. |
| 12 | Infanterie | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 13 | Mech | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 14 | Dock | partiel | moyenne | Limite de production 3, réparation et comptoir : à contrôler selon le système du dock. |
| 15 | Système de défense | oui | sans objet | Canon noté « 6\*\* » : vérifier que l'outil lit bien cette notation. |
| 16 | Usine | partiel | facile | Bouton de ravitaillement : +2 ressources par usine possédée. |
| 17 | Soleil de guerre | partiel | facile | Message orange si produit sans la technologie « Soleil de guerre ». |
| 20 | Frégate marchande (Conglomérat mercantile d'Hacan) | partiel | moyenne | Bouton : use un négociant, détruit la frégate, livraison de 3 à une faction choisie. |
| 21 | Soleil d'or (Conglomérat mercantile d'Hacan) | partiel | moyenne | Bouton : −2 commerce au déplacement ; comptoir et pillage supposent des actions à créer. |
| 22 | Mecha d'archéologie (Conglomérat mercantile d'Hacan) | partiel | moyenne | Variante d'une action « fouille » à créer, sans user de scientifique. |
| 23 | Statue en or (Conglomérat mercantile d'Hacan) | partiel | facile | Bouton de ravitaillement : +1 point par statue ; pillage non géré. |
| 35 | Bazaar (Conglomérat mercantile d'Hacan) | partiel | difficile | Renvoie à « Vente au Bazaar » : marché et transactions non gérés. |
| 148 | Salai Sai Corian (Héritiers de Winnu) | partiel | moyenne | Bonus à l'écran de combat : +1 par vaisseau adverse engagé ; production 1 non suivie. |
| 151 | Gloire au juste (Héritiers de Winnu) | partiel | moyenne | Bouton de ravitaillement selon le possesseur de Mecatol Rex ; texte à clarifier. |
| 152 | Raideur (Kabal de l’ombre) | partiel | moyenne | Raid et furtif : mots-clés à ajouter à l'écran de combat. |
| 153 | Arche de l'ombre (Kabal de l’ombre) | partiel | moyenne | Raid et furtif : mots-clés à ajouter à l'écran de combat. |
| 154 | Camp de travail (Kabal de l’ombre) | partiel | moyenne | Bouton : use le camp, dépense un esclave, +4 ressources ; effet de destruction manuel. |
| 155 | Portail de repli (Kabal de l’ombre) | partiel | moyenne | Bouton de ravitaillement : replace ici les « Raideur » détruits au tour précédent. |
| 162 | Quetzalcoalt (Volée argentée) | partiel | moyenne | Bouton de fin de combat : +1 point si trois vaisseaux militaires engagés et survie. |
| 163 | Destroyeur (Volée argentée) | partiel | facile | Bouton : −1 influence ; la seconde attaque se relance à l'écran de combat. |
| 164 | Complexe de guerre (Volée argentée) | partiel | moyenne | Ravitaillement : crée un destroyeur si système contrôlé ; +1 des destroyeurs adjacents au combat. |
| 165 | Centre d'expansion (Volée argentée) | partiel | moyenne | Bouton : marque un système choisi ; +1 au combat spatial là pour ce tour. |
| 171 | Mech Aérien (Volée argentée) | partiel | moyenne | Autoriser ce mech dans l'écran de combat spatial ; réparation 2 non suivie. |
| 172 | J.N.S. Hylarim (Université de Jol-Nar) | partiel | moyenne | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. |
| 173 | Cuirassé (Université de Jol-Nar) | oui | sans objet | Bombardement noté « 5\*\* » : vérifier que l'outil lit bien cette notation. |
| 174 | Destroyeur (Université de Jol-Nar) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 175 | Bouclier mobile (Université de Jol-Nar) | partiel | moyenne | Bouton : −1 ressource pour annuler une touche ; valeur de contrôle non calculée. |
| 176 | Laboratoire (Université de Jol-Nar) | partiel | facile | Bouton : +1 case de recherche quand la planète est activée pour rechercher. |
| 177 | Système de défense (Université de Jol-Nar) | partiel | facile | Bouton : −1 ressource pour annuler une touche, retirée à la main. |
| 178 | Sphère de dyson (Université de Jol-Nar) | partiel | facile | Bouton : use un scientifique, +2 ressources par niveau de science spatiale. |
| 199 | Soleil de guerre (Université de Jol-Nar) | partiel | moyenne | Message orange sans la technologie (facile) ; valeur de contrôle 3 non calculée. |
| 243 | Infanterie (Université de Jol-Nar) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 407 | Vaisseau pirate (Pirate) | partiel | moyenne | Touches visant les vaisseaux de commerce, furtif en anomalie : écran de combat à étendre. |
| 423 | Letani (Omni-esprit d'Arborec) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 428 | Arbre gardien (Omni-esprit d'Arborec) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 431 | Transporteur (Omni-esprit d'Arborec) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 444 | Station Météorologique | partiel | facile | Bouton de ravitaillement : +2 cases de recherche tempête par station. |
| 461 | Cuirassé (Omni-esprit d'Arborec) | oui | sans objet | Caractéristiques et bombardement déjà utilisés par l'outil. |
| 462 | Croiseur (Omni-esprit d'Arborec) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 463 | Destroyeur (Omni-esprit d'Arborec) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 464 | Fruit de vie (Omni-esprit d'Arborec) | partiel | moyenne | Bouton : détruit le fruit, livraison de 5 à une faction choisie. |
| 465 | Arbre père (Omni-esprit d'Arborec) | partiel | moyenne | Bouton de ravitaillement : crée un « Fruit de vie » dans le système de l'arbre. |
| 466 | Épineux géant (Omni-esprit d'Arborec) | partiel | moyenne | Autoriser ses attaques dans l'écran de combat pendant le bombardement. |
| 467 | Arbre mère (Omni-esprit d'Arborec) | partiel | moyenne | Bouton de ravitaillement : crée des « Letani » jusqu'au niveau de connaissance génétique. |
| 470 | Graine d'eden (Omni-esprit d'Arborec) | partiel | moyenne | Résistance sans plafond à permettre ; bouton posant « New eden » à 6 de résistance. |
| 472 | Duha Menaimon (Omni-esprit d'Arborec) | partiel | moyenne | Jet et nombre d'attaques selon la connaissance génétique : écran de combat à étendre. |
| 490 | Armageddon | partiel | moyenne | Bouton : dépense 3 fragments militaires et un scientifique ; portée du canon non gérée. |
| 496 | Cuirassé impérial | partiel | difficile | Réaction automatique d'une unité neutre aux engagements des autres joueurs. |
| 509 | Dinosaure | partiel | moyenne | Valeur de contrôle : calcul du contrôle par planète ou système à créer. |
| 511 | Garde impériale | partiel | moyenne | Valeur de contrôle : calcul du contrôle par planète ou système à créer. |
| 512 | Station de combat | partiel | moyenne | Valeur de contrôle : calcul du contrôle par planète ou système à créer. |
| 513 | Canon ancien | oui | sans objet | Caractéristiques et canon déjà utilisés par l'outil. |
| 514 | Canon restauré | oui | sans objet | Caractéristiques et canon déjà utilisés par l'outil. |
| 516 | Mech géant | partiel | moyenne | Compter 3 dans l'avertissement de capacité ; valeur de contrôle non calculée. |
| 524 | frégate du khan (Invasion du grand Khan) | partiel | moyenne | À sa destruction : touche de 6 ou 4 infligée au destructeur. |
| 525 | Palais du khan (Invasion du grand Khan) | partiel | moyenne | Malus de visée par frégate : ciblage non géré à l'écran de combat. |
| 527 | Soldat du Khan (Invasion du grand Khan) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 554 | Monument éternel | partiel | moyenne | Comptoir, pillage et points par contributions : actions de commerce à créer. |
| 557 | Rebelle (Rébellion inter-planétaire) | partiel | moyenne | Furtif : mot-clé à ajouter à l'écran de combat. |
| 568 | Indigène | partiel | moyenne | Bouton : use un diplomate, lance 4 dés à 3 contre cette unité. |
| 569 | Vaisseau portail | partiel | difficile | Sert de trou de ver alpha : trous de ver non gérés. |
| 570 | Cuve de Clonage | partiel | moyenne | Bouton de production : crée 2 infanteries sur la planète de la cuve. |
| 571 | Arbre de vie éternelle | partiel | moyenne | Boutons : +1 dégât et +4 commerce ; use un scientifique, −1 dégât. |
| 572 | Étoile de mort | partiel | moyenne | Bouton de déplacement : use logisticien, amiral et scientifique ; valeur de contrôle non calculée. |
| 573 | Vaisseau gigantesque | oui | sans objet | Caractéristiques et bombardement déjà utilisés par l'outil. |
| 574 | Ravageur | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 575 | Corsaire | partiel | moyenne | Pillage : suppose une action « pillage » à créer. |
| 576 | Vaisseau antique | partiel | moyenne | Pillage : suppose une action « pillage » à créer. |
| 578 | Canon de Meer | oui | sans objet | Caractéristiques et canon déjà utilisés par l'outil. |
| 582 | Telluran | partiel | moyenne | Furtif : mot-clé à ajouter à l'écran de combat. |
| 590 | Colonie Ladaran | partiel | moyenne | Bouton de ravitaillement : crée une infanterie à bord ; pillage non géré. |
| 591 | Destroyeur Tak'Qav | oui | sans objet | Bombardement noté `#bomb(6)` sans nombre de dés : notation à vérifier. |
| 597 | Myru Vos | partiel | moyenne | Furtif à ajouter ; +2 commerce à la destruction d'un vaisseau de commerce. |
| 598 | Magmus | partiel | facile | Bouton : +1 case de recherche militaire quand un vaisseau est détruit dans son système. |
| 599 | Ggrocuto Rinn | partiel | difficile | Déplacement furtif et exploration par déplacement : pas encore gérés. |
| 600 | Nekro Acidos | partiel | moyenne | Nombre d'attaques selon la connaissance militaire : écran de combat à étendre. |
| 601 | Riftwalker Meian | partiel | difficile | Déplacement furtif : dépend du déplacement, pas encore géré. |
| 723 | Milicien mercenaire (Conclave secret) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 732 | S'Ula Mentarion | partiel | moyenne | Marqueur posé à la destruction d'un vaisseau de commerce ; bouton : le dépenser, livraison 5. |
| 745 | Olivier Dubois | partiel | moyenne | Bonus +2 à des infanteries choisies, à l'écran de combat terrestre. |
| 746 | Bombardier Lourd | oui | sans objet | Caractéristiques et bombardement déjà utilisés par l'outil. |
| 747 | Combattant Voyageur | partiel | moyenne | Bouton : use l'unité, −3 ressources ; déplacement du pion manuel, distance non vérifiée. |
| 766 | Memoria (Le Nomade) | partiel | facile | Bouton : dépense un signal, +4 cases de recherche de signal. |
| 767 | Memoria B (Le Nomade) | partiel | facile | Bouton : dépense un signal, +4 cases de recherche de signal. |
| 768 | Memoria A (Le Nomade) | partiel | difficile | Bouton signal facile ; furtivité et malus d'anomalie liés au déplacement. |
| 769 | Memoria D (Le Nomade) | partiel | moyenne | Bouton signal facile ; jet de 6 par infanterie détruite pour la sauver. |
| 770 | Memoria C (Le Nomade) | partiel | moyenne | Bouton signal facile ; création d'une frégate au ravitaillement ; revendication manuelle. |
| 786 | Centre de contrebande (Le Nomade) | partiel | moyenne | Bouton de ravitaillement : +3 ressources et influence, réduits selon les centres proches. |
| 810 | Nef de la rupture (Rupture de l'espace-temps) | partiel | difficile | Ignore blocage et trous de ver oméga : dépend du déplacement. |
| 835 | Milice (Réfugiés) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 836 | Entrepôt d'aide (Réfugiés) | partiel | moyenne | Compteur de commerce sur l'entrepôt, alimenté par les livraisons à la planète. |
| 845 | Croiseur (Pirate Mentak) | oui | sans objet | Caractéristiques et précision déjà utilisées par l'outil. |
| 846 | Troupe de détournement (Pirate Mentak) | partiel | moyenne | Attaque en dernier et capture des vaisseaux détruits : écran de combat à étendre. |
| 847 | Soleil de capturé (Pirate Mentak) | oui | sans objet | Texte informatif (non productible) ; bombardement noté « 6\*\*\* » à vérifier. |
| 849 | Infanterie (Université de Jol-Nar) | oui | sans objet | Aucun effet particulier : caractéristiques déjà utilisées. |
| 850 | Armageddon | partiel | moyenne | À sa destruction : change de propriétaire avec 1 de résistance restante. |
| 854 | vaisseau relique | partiel | moyenne | Quatre boutons dépensant chacun un fragment ; le bonus de mouvement reste manuel. |
| 856 | Lune noire (Pirate Mentak) | partiel | moyenne | Ciblage obligatoire : notion de cible absente de l'écran de combat. |

## Par où commencer

1. **Art du commerce** (technologie 200) : le script de réduction de recrutement existant, appliqué aux négociants (la livraison viendra après).
2. **École politique** (technologie 201) : même script pour les politiciens, plus un bouton qui pioche 2 lois.
3. **Argumentation véhémente** (technologie 251) : bouton : use un politicien, −1 influence, +2 votes.
4. **Réseau d'ingérence** (technologie 247) : bouton : use un scientifique, +2 votes.
5. **Étude des tempêtes** (habilité 441) : deux boutons : use un scientifique, +2 ou +4 cases de recherche tempête.
6. **Étude des failles** (habilité 815) : bouton : use un scientifique, +2 cases de recherche de rupture.
7. **Exploitation des tempêtes** (technologie 448) : deux boutons : +3 ressources au ravitaillement ; use un scientifique, +4 ressources.
8. **Culture courtisane** (technologie 140) : finir la carte : bouton de ravitaillement, +1 influence par alliance en jeu.
9. **Usine** (unité 16) : bouton de ravitaillement : +2 ressources par usine possédée (unité de base, servira à tous).
10. **Réseau de commerce** (technologie 213) : deux boutons de conversion influence ↔ ressource ; même modèle pour Piraterie informatique (857).
