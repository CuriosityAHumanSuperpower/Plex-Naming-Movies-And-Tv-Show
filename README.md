# Plex-Naming-Movies-&-Tv-Show

## Description
Naming and organizing TV show and movies files for a Plex server as it is discribed on [plex documentation](https://support.plex.tv/articles/naming-and-organizing-your-tv-show-files/).

## Use 
1. Create a **congif.env** and add the following variables that you will get on [The Movie DB API](https://www.themoviedb.org/documentation/api)
THE_MOVIE_DB_AUTH_TOKEN=
THE_MOVIE_DB_API_KEY=
2. Move all your files in the **_input** folder
3. Edit **\_patterns.txt** file to add the pattern of the files names. For instance, for The Mandorian TV Show all files could start by _the.mandalorian._
4. Run the code : _node index.js_

