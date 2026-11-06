# engine
on ne demande pas a l'engine d'implémenter ou de validé les régles du jeu mais de permettre au joueur de manipuler les composent pour representer tout les états possibles.

de maniére non prioritaire on va lui demander de facilité a effectuer les actions correctes sans se limiter a cele ci.


## état du jeu

doit afficher l 'état du jeu voir component.md
doit sauvegarder l'état du jeu

## coup

un coup est un ensemble d'action (action = principalement déplacement de composant) cohérent en groupe

un joueur peux effectuer une ou plusieurs actions sur sa version locale puis les envoyer en bloc au serveur qui les transmet au autre joueur = un coup

l'historique des coups doit etre stocké et consultable 
