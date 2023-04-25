# Plex-Naming-Movies-&-Tv-Show

## Description
Naming and organizing TV show and movies files for a Plex server as it is discribed on [plex documentation](https://support.plex.tv/articles/naming-and-organizing-your-tv-show-files/).

## How does the script work? 
0. First a **congif.env** file with the following variables are requiered : **THE_MOVIE_DB_AUTH_TOKEN** and **THE_MOVIE_DB_API_KEY**. More information [The Movie DB API](https://www.themoviedb.org/documentation/api).
1. By running the code _node index.js_ the follwing operations happen : 
2. For all and every files stored in the **_input** folder 
3. some information are gathered such as _path_, _file name_, _file extension_;  
4. _title_, _season number_ and _episode number_ are collected thank to regex applied on the file name;
5. the success of the applied regexes allows to determine the type of file: movie or TV series.
6. The _title_ is used on the Movie Data Base (TMDB) API to found more information such as _publication year_ or the _TMDB id_.
7. In the end all those data are used to rename and organized the files according to the Plex methodology. 

