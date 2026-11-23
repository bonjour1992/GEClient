# décompte des votes

Fait (section « Décompte des votes » de l'onglet Vote, `engine/Vote.jsx`).
L'engine compte et classe ; il n'applique pas la loi.

## ce qui est compté

Pour chaque loi du tour (ligne du plateau de vote) et chaque colonne (Contre,
Pour, 1 à 6), les voix de chaque joueur :

- seuls les politiciens comptent : 2 voix dans la case, 1 voix dans sa partie
  droite ; les autres agents valent 0 ;
- plus un ajustement manuel (boutons − / + de chaque case, compteur
  `vote:<tour>:<loi>:<colonne>:<joueur>`), possible à tout moment : voix
  annoncées au prévote, effets que l'engine ne connaît pas ;
- plus les voix que donnent les règles en jeu, chacune sur sa ligne du
  décompte : Premier ministre (mandat 223) donne 2 voix à la faction qui l'a,
  aux élections de ministres, dans la colonne où elle a le plus de voix.

Les colonnes 1 à 6 désignent des joueurs ou des numéros selon le vote : aux
joueurs de s'entendre.

## trois temps

1. **Prévote** (visible) : chacun note ses voix annoncées avec les ajustements.
2. **Vote** (caché) : chacun pose ses agents sur son plateau, puis se dit
   « Prêt à révéler » (compteur `joueur:<u>:votePret`). Quand tous le sont,
   tous les plateaux sont révélés dans le même coup. Un plateau encore caché
   ne compte pas.
3. **Ajustements** : le tableau reste modifiable. Le responsable du sénat
   (joueur de la dernière case d'initiative) départage toutes les égalités,
   pour / contre compris : son bouton ↑ fait passer un vote devant ses
   ex æquo (compteur `vote:<tour>:<loi>:ordre:<colonne>`). Une égalité entre
   factions dans l'effet d'une loi (Concours scientifique, Soutien au
   conclave) se départage de même sous son bouton « Résoudre » : ↑ fait
   passer une faction devant (compteur `agenda:<tour>:<loi>:rang:<faction>`).

## secret

Un agent posé sur un plateau de vote caché n'apparaît ni dans l'état ni dans
le journal des autres joueurs. Quand il en ressort vers une zone publique, le
journal le montre sans dire de quelle case il vient.
