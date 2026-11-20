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
- Un test de domination vaut pour tout le tour (`dominant:<case>:tour`).

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
