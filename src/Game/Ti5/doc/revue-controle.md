# Revue du système de contrôle et de domination (20 novembre 2026)

Revue demandée par Loïc : cohérence du code, scripts des cartes qui parlent de contrôle,
actions de phase, règles peu claires. Les textes cités sont ceux de la base à cette date.

## 1. Le code

### Ce qui est en place après la revue

| Principe | Où |
|---|---|
| Un seul calcul du contrôle | `engine/regleControle.js` : `unitesDuLieu` (quelles unités comptent pour un lieu), `campsDeControle` (contrôle de chaque camp), `evaluerControle` (faut-il un conflit ?) |
| L'action qui demande le contrôle est toujours dite | conflit de contrôle : « X veut prendre possession de… », « …pour la construction de… », « …pour « nom de l'effet » » ; conflit de domination : la carte qui l'a demandé, « un Racket », ou « à la main » |
| L'action s'exécute quand le conflit est gagné, rien ne se passe sinon | `demanderControle` (`Controle.jsx`) : l'action attend la conclusion du demandeur (« Contrôle acquis : faire l'action »), ou est annulée sans effet (« Renoncer ») |

Règle appliquée par `evaluerControle` : un conflit s'ouvre toujours, sauf si aucune autre faction
ne peut participer (unités militaires sur place, possession de la planète), ou s'il n'y a que des
neutres que la faction qui agit dépasse.

Passent par ce chemin : la prise de possession d'une planète et d'une station, la construction
(`payerProduction`), les boutons de carte (`ActionsScript.jsx`, champ `controle`), Skarvald
(`Combat.jsx`), le Grappin de capture (`CombatResolu.jsx`).

### Corrigé pendant la revue

- Trois calculs du contrôle coexistaient (test préalable, conflit de contrôle, conflit de
  domination) : ils utilisent maintenant `campsDeControle`.
- La construction ouvrait le conflit mais demandait de refaire le geste : elle part maintenant
  toute seule à la conclusion du conflit.
- Les systèmes de défense (« le #con affecte aussi l'espace ») ne comptaient pas dans le contrôle
  spatial : `unitesDuLieu` les ajoute à l'espace de leur système.
- « Rapport de force » (#205) n'existait que dans les blocages : le bouton est aussi dans les
  conflits de contrôle et de domination.
- Station : la prise était immédiate avec un simple drapeau dans le système ; sans aucune unité
  dans l'espace, une confirmation est maintenant demandée (« Vous devez contrôler le système »).
- Libellés qui disaient « contrôle » pour une possession : scripts `mandat`, `mandat-epuiser`,
  `avar`, infobulle de Réparation.

### Limites connues

- Si la page du demandeur est rechargée pendant le conflit, l'action n'attend plus : à la
  conclusion, le contrôle reste acquis pour ce lieu jusqu'à la fin de la phase
  (`controleAcquis:…`) et un message demande de refaire l'action.
- La prise de possession garde son propre bouton dans le conflit (elle n'utilise pas
  `demanderControle`, mais le même calcul).
- Le conflit d'accord de la revendication (« Revendiquer ») n'est pas un test de contrôle : c'est
  un droit de refus des camps qui ont des unités militaires dans le système.
- Le test de blocage (`Blocage.jsx`) est un mécanisme à part, non repris ici.
- Un test de domination vaut pour son sujet (la carte qui le demande), pendant le tour :
  `dominant:<case>:s<sujet>` — voir la section 6.

## 2. Cartes qui demandent le contrôle (#con)

| Carte | Texte | État |
|---|---|---|
| tech#403 Arme bactériologique | « Dans un système que vous contrôlez… » | **fait** : `controle: "systeme"` |
| tech#446 Tempête électromagnétique | « activer une nébuleuse que vous contrôlez » | **fait** : `controle: "systeme"` |
| tech#448 Exploitation des tempêtes | « activer une nébuleuse que vous contrôlez » | **fait** : `controle: "systeme"` |
| tech#250 Grappin de capture | « si vous avez le #con du système à la fin du combat » | **fait** : `demanderControleSysteme` |
| mercenaire#350 Skarvald | « dans un système que vous contrôlez » | **fait** : `demanderControleSysteme` |
| unit#164 Complexe de guerre | « #Ravit: #con du système: #dep destroyeur. » | **non vérifié** : effet automatique du ravitaillement, le destroyeur est posé dans tous les cas (voir question 5) |
| habilite#166 Vassalisation forcée | « Si vous avez le #con de 5 systèmes avec des planètes d'une faction » | **à la main** : cinq systèmes à la fois (voir question 5) |
| Promesse#964 Chemin du vide | « Les anomalies sous le #con des Empyréens » | **approximation** : Empyréens seuls dans l'espace, avec vous au plus ; ni test ni conflit (question 5) |
| tech#274 Enrôlement | « placer #esc(2)… sur la planète sous votre contrôle » | **aucun test** : texte ambigu (question 20) |
| mercenaire#301 S'Ula Mentarion | « système qui n'est pas sous le #con d'une autre faction » | pas de script |
| relique#365 Vaisseau gigantesque | « système sous votre #con » + planète militaire en #poss | pas de script de pose |
| relique#387 Spectre de l'empereur | « #Decomp: Si vous contrôlez votre système natal » | pas de script (décompte à la main) |
| relique#397 Sphère de dyson | « dans un système que vous contrôlez » | pas de script de pose ; la construction, elle, passe par le contrôle |

Modificateurs du contrôle : Rapport de force #205 (**fait**, partout), Rayon tracteur #217
(déjà dans `controleDe`), systèmes de défense #15, #177, #892, #909 (**fait** : comptent aussi
dans l'espace). Les valeurs « #Con(n) » des unités sont toutes lues par `controleDe`.

## 3. Cartes qui demandent la domination (#dom)

| Carte | État |
|---|---|
| tech#232 Exploitation du vide | vérifiée : seul dans l'espace, sinon conflit de domination |
| tech#821 Extraction de la faille | vérifiée (`dominantDe`) ; une faille disputée retient le ravitaillement |
| habilite#452 Péage aux frontières | vérifiée (`dominantDe`) |
| habilite#486 Cache | vérifiée (`dominantDe`) |
| habilite#942 Racket | ouvre un test de domination, appliqué à sa clôture |
| tech#185 Récupération | **non vérifiée** : case cochée d'office à « Terminer le combat » |
| Agenda#315 Guerre totale, objectifs militaires #376, #378, #379, #381, #382 | pas de script : à la main |

## 4. Actions de phase

### Ce que disent les textes

| Phase | Action | Condition écrite |
|---|---|---|
| 10 Revendication | Prendre possession d'une planète | contrôle de la planète |
| | Revendiquer (diplomate) | une unité dans le système, et aucune unité militaire ne s'y oppose |
| | Station | contrôle du système |
| 11 Science | Rechercher | « activer une planète que vous contrôlez » |
| | Fouiller une ruine | rien |
| 12 Production | Unité terrestre qui produit une unité spatiale | « l'espace du système que vous devez contrôler » |
| | Unité spatiale qui produit une unité spatiale | rien |
| | Mobiliser | possession |
| 13 Construction | Structure terrestre ou spatiale | contrôle de la planète ou du système |

### Écarts entre le texte et l'outil (non corrigés : à décider)

1. **Rechercher** : le texte demande le contrôle de la planète ; l'outil accepte « une unité ou un
   drapeau dans le système ».
2. **Production d'une unité spatiale par un dock** : le texte demande le contrôle de l'espace ;
   l'outil ne vérifie rien.
3. **Prise de possession** : le texte dit « que vous contrôlez » ; l'outil exige une infanterie
   (un mech seul contrôle, selon la règle).
4. **Station** : le texte du « Jeu en ligne » dit « une unité ou un drapeau dans le système » ; la
   règle dit « Vous devez contrôler le système » (l'outil demande maintenant une confirmation
   sans unité dans l'espace).

### Actions qui devraient sans doute demander le contrôle

1. **Fouiller une ruine** : aucune condition, alors que rechercher sur la même planète exige le
   contrôle.
2. **Unité spatiale qui produit une unité spatiale** : rien, alors que la même pose depuis une
   unité terrestre exige le contrôle de l'espace.
3. **Mobiliser** : la possession suffit, même sur une planète occupée par l'ennemi.
4. **Débarquer « vers des planètes où vous avez un dock »** : ni « non bloquée » ni contrôle.
5. **Cartes qui posent une unité** sans le dire : Vaisseau portail (relique#393), Manipulation
   mentale (tech#184).

## 5. Règles peu claires : questions à trancher

1. **Qui génère du contrôle ?** La règle #1033 parle des unités militaires ; le mot-clé #con dit
   « le contrôle de vos unités ». Les unités non militaires de la faction qui agit comptent-elles
   toujours, seulement pour construire, ou jamais ? (L'outil : oui pour construire et pour les
   effets de carte, non pour prendre possession.)
2. **Contrôle nul sans opposant** : 0 contre 0 échoue-t-il ? Cas : premier vaisseau produit par un
   dock dans un espace vide, première structure spatiale, Complexe de guerre.
3. **Possession et espace** : la possession d'une planète donne-t-elle du contrôle dans l'espace
   du système ? La « possession d'un système » (mot-clé #poss, règle #1033) existe-t-elle ?
4. **« le #con affecte aussi l'espace »** : ces 3 comptent-ils aussi pour la domination et le
   blocage ? En plus du contrôle sur la planète, ou à sa place ? (L'outil : en plus, pour le
   contrôle et la domination.)
5. **Le contrôle comme état** (Chemin du vide, S'Ula Mentarion, Spectre de l'empereur,
   Vassalisation forcée, Complexe de guerre) : hors action, qui « contrôle » ? Faut-il un conflit
   par système ? Plusieurs factions peuvent-elles contrôler le même système ?
6. **Domination** : une faction seule avec des unités non militaires domine-t-elle ? La possession
   vaut-elle 2 dans une domination de planète (Guerre totale) ? Combien de temps vaut un test (tout
   le tour dans l'outil) ? « Systèmes vides » : sans planète, ou sans autre unité ?
7. **Coalition et domination** (Récupération : « cette #dom peut être résolue en coalition ») :
   comment, alors que la domination est exclusive ?
8. **Attaque ou non** : prendre possession est « une attaque » (phase 10), mais « s'opposer au
   contrôle n'est pas une attaque » (#1033), et pour une station seulement « si le possesseur
   s'y oppose ». Contre qui, et avec quelles conséquences (trêve, alliance) ?
9. **Revendication** : le possesseur sans unité peut-il refuser ? Une station se revendique-t-elle
   ainsi ? « Une unité dans le système » inclut-il un drapeau ?
10. **Stations** : reprendre son agent fait-il perdre la station ? La Station de combat a #Con(3)
    mais pas le mot-clé militaire : s'oppose-t-elle ?
11. **Participation** : une faction peut-elle partager ses unités entre soutien et opposition ? Le
    possesseur sans unité peut-il soutenir avec ses 2 ?
12. **Échec du test** : peut-on retenter dans la phase ? Le diplomate de Rapport de force est-il
    rendu ? La planète reste-t-elle activée ?
13. **Durée d'un contrôle acquis** : une action, ou la phase (choix de l'outil) ?
14. **Construction** : la deuxième structure coûte-t-elle un logisticien (phase) ou n'importe quel
    agent (mot-clé #cons) ? Les structures d'une autre faction comptent-elles ? « Pas deux fois la
    même structure » vaut-il dans l'espace ?
15. **Production** : « non bloqué » pour un dock — bloqué par les troupes de la planète ou par
    les vaisseaux de l'espace ?
16. **Blocage** : l'égalité suffit (« égaliser »), alors que le contrôle exige de dépasser.
17. **Structures et changement de possession** : que deviennent les structures d'une faction quand
    une autre prend la planète ?
18. **Neutres** : les neutres « défensifs » s'opposent-ils aussi ? Une possession neutre vaut-elle 2 ?
19. **Avar, Arcturus** (« ne peut pas être en votre #poss sans unité dessus ») : la possession
    tombe-t-elle dès que la dernière unité part ?
20. **Enrôlement** : la planète doit-elle être contrôlée (test), ou les esclaves sont-ils posés
    « sous vos ordres » ?
21. **Abandonner une possession** : permis à tout moment ? (Bouton de l'outil, aucune règle.)

## 6. Décisions de Loïc (20 novembre, soir) et ce qui en a été fait

| Décision | Dans l'outil |
|---|---|
| Les unités militaires et la possession génèrent du contrôle ; d'autres effets peuvent en ajouter, mais sans unité militaire ni possession une faction ne participe pas | `campsDeControle` (`regleControle.js`) : plus d'option « toutes mes unités » ; une unité non militaire ne compte que si son texte porte `#con(n)`, pour un camp qui participe ; Rapport de force réservé aux camps qui participent |
| Un test de contrôle non opposé réussit toujours (0 contre 0) | `demanderControle` : plus d'obstacle « contrôle nul » (construction, cartes, station) |
| Pas de durée au contrôle | le contrôle vaut pour l'action qui l'a demandé ; `controleAcquis` ne sert plus qu'une fois, quand la page a été rechargée pendant le conflit |
| Domination : un seul test par sujet, la gagnante fait l'action, personne à égalité ; pas de réouverture | `dominant:<case>:s<sujet>` ; le test ouvert à la main choisit son sujet (Extraction de la faille, Péage aux frontières, Cache) ; Racket et Exploitation du vide ont le leur |
| Le contrôle n'est jamais une « attaque » ; le terme devient « engagement » | textes de la base (règle #1033, phases 05, 07, 10, 18, Tuteur des réfugiés, mot-clé #infa) ; les « attaques » d'une unité au combat (jets) ne sont pas renommées |
| Récupération : domination entre les factions qui l'ont, ou contre toutes ; une seule : contrôle simple | `Combat.jsx` (« Terminer le combat ») ouvre le test ; `Domination` (`Controle.jsx`) le tranche et verse le butin |
| Fouiller une ruine demande le contrôle ; mobiliser la possession et le contrôle ; pas de recherche ni de fouille pendant un conflit de contrôle sur la même planète | `controlePlanete` (`Espace.jsx`) → `demanderControle`, motif « action de phase » ; rechercher et la production d'une unité spatiale par une unité terrestre y passent aussi (textes des phases 11 et 12) |
| Test de blocage au bombardement et au débarquement | `regleBlocage.js` (calcul), `BlocageAction.jsx` (onglet Conflit) — section 7 |

Restent ouvertes : les questions 3, 4, 9 à 12, 14 à 21 de la section 5, et « le contrôle comme état »
(question 5 : a priori un conflit par système, exemple à fournir).

## 7. Le blocage dans les règles

Test de blocage d'une action (règle #1033 et exemple de Loïc) : les autres factions engagent, unité par
unité, leurs unités militaires de l'espace du système pour bloquer, ou des unités pour aider ; la
faction qui agit égalise le surplus avec ses propres unités (militaires d'abord), qui sont bloquées.
Toute unité qui a servi, ou qui a fait son action, est engagée pour la phase. Une faction ne subit le
test qu'une fois par lieu et par phase.

Le test se fait là où est l'unité qui agit : l'espace de son système (vaisseaux, structures spatiales)
ou sa planète (unités de la planète) — choix de l'outil, la règle ne le dit pas (question 15).

| Où le blocage est évoqué | Texte | État |
|---|---|---|
| phase 03 Déplacement | blocage case par case | **fait** (`Blocage.jsx`) |
| phase 07 Bombardement | « activer une unité avec #bomb non bloquée » | **fait** : test au premier « Prêt au combat » (raid compris) |
| phase 08 Débarquement, 1.1 / 1.2.1 | « évaluer le blocage », « unité non bloquée qui transporte » | **fait** : test au premier glisser d'un vaisseau vers une planète (sauf planète où l'on a un dock) |
| phase 08, 1.2.2 et mot-clé #livr | livraison commerciale avec une unité non bloquée | **fait** : test au bouton « Livraison commerciale » |
| phase 05 Canons spatiaux | « activer une unité avec #can non bloquée » | **fait** : test au premier « Prêt au combat », là où est chaque unité qui tire |
| phase 12 Production | source « non bloquée », vaisseau non bloqué pour embarquer, réparation d'unités non bloquées | **fait** pour l'unité qui produit (Ctrl + clic) et pour « Réparer toutes mes unités » ; pas pour une planète ou une station qui produit, ni pour le vaisseau qui embarque |
| tech#195, tech#419 Réparation improvisée | « vaisseau non bloqué », « unité non bloquée » | **fait** pour le vaisseau réparé ; « un système où vous avez une unité non bloquée » (#419) non vérifié |
| mots-clés mitose, fusion | « non bloqué » | à faire : ces capacités n'ont pas de bouton |
| tech#246 Drain spatial | « ou à être bloqué dans le système précédent » | **fait** (blocage de déplacement) |
| #deplfurtif, Camouflage | non bloqué par des vaisseaux en se déplaçant | **fait** |
| rupture gravitationnelle, trou de ver oméga, hab#814 | blocage sur un jet | **fait** |
| tech#820 Stabilisateur de rupture | ignore les touches des trous de ver oméga | **fait** |
| unit#810 Nef de la rupture | « ignore le blocage et les touches des #tvo » | à faire (sens à préciser : blocage du trou de ver seulement ?) |
| mercenaire#295 Viscount Unlenn | déplacement « en ignorant les règles de blocage » | à la main |
| hab#1022 Physiologie gashlai | les supernovas ne bloquent pas vos déplacements | à vérifier dans le déplacement assisté |
| Promesse#384 Frontière ouverte | « si la faction bloque un de vos mouvements : #spend, elle gagne #infa(1) » | à faire : bouton proposé au joueur bloqué quand le blocage est conclu |
| Promesse#226 Redevance de protection | « si vous engagez ou bloquez le Mentak : #spend » | à faire : même principe |
| règle #1033, « contrôle et diplomatie » | bloquer un vaisseau de commerce d'une faction endettée lui permet de mettre fin à ses dettes | à faire : bouton proposé au joueur bloqué |
| règle #1033, « coalition » | plusieurs factions font un seul test puis leurs actions à la suite | non géré : chaque faction passe son test |
| règle #1033 (spécial) | les neutres bloquent | **fait** : d'office, un joueur peut en décider autrement |
| hab#529 Déplacement du Khan | blocage du Khan | non géré |