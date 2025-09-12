/*
PLEX.TV MOVIES & TV SHOW FORMAT
16/01/2022
*/

////////////////////////////////////////////////////////////////////////////////////////////
//IMPORTS & CONST
////////////////////////////////////////////////////////////////////////////////////////////

//IMPORTS
const themoviedb = require("./middlewares/themoviedb")
const sleep = require("./middlewares/sleep")
const fs = require('fs')
const glob = require("glob")

//DOTENV
const dotenv = require('dotenv');
dotenv.config({path : './config.env'})

//CONST

const VIDEO_EXT = [
	".mp4",
	".m4v",
	".mov",
	".avi",
	".mpeg",
	".mkv",
	".mpg" ,
	".wmv",
	".ogm",
	".srt"
]

const DEFAULT_TV_SHOW_REGEX = {
	SEASON_AND_EPISODE : /[Ss](?<season>\d{1,2})[Ee](?<episode>\d{1,2})/gm,
	TV_SHOW_TITLE : /(?<title>[a-zA-Z\. ]{0,20})[Ss]\d{1,2}[Ee]\d{1,2}/gm,
	TV_SHOW : /^(?<title>[a-zA-Z0-9\.\- ]*)[Ss](?<season>\d{1,2})[Ee](?<episode>\d{1,2})/gm,
	MOVIE : /^(?<title>[a-zA-Z0-9\.\- ]*)[( .][0-9]{4}[) .]/gm, 
}

const DEFAULT_PATHS = {
	INPUT : '_input', 
	OUTPUT : '_output', //'\\\\MYCLOUD-HE1NBD\\alex\\@MULTIMEDIA\\SERIES_plex',
	PATTERNS_FILE :'_patterns.txt',
}

const DEFAULT_TV_SHOWS_PATTERNS = (root_path, title, season, episode, tmdbID, year, extension) => {
	
	const file_name = `${title} (${year}) {tmdb-${tmdbID}} - s${season}e${episode}.${extension}`

	const folders = `${root_path}/${title}/Season ${season}/`

	const full_path = folders.season_folder + file_name

	return {folders, file_name, full_path}
}

const DEFAULT_OUTPUT_PATH  = (root_path, {title, season, episode, id, year, ext} = video_info , isTvShow = true) => {

	let subfolder = isTvShow ? '_TV Show' : '_Movies';

	if(isTvShow){
		var file_name = `${title} (${year}) {tmdb-${id}} - s${season}e${episode}.${ext}`
		var folders = `${root_path}/${subfolder}/${title} (${year}) {tmdb-${id}}/Season ${season}/`
	} else {
		var file_name = `${title} (${year}) {tmdb-${id}}.${ext}`
		var folders = `${root_path}/${subfolder}/${title} (${year})/`
	}

	const full_path = folders + file_name
	return {folders, file_name, full_path}
}

const zeroPad = (num, places = 2) => String(num).padStart(places, '0')

////////////////////////////////////////////////////////////////////////////////////////////
//FUNCTIONS
////////////////////////////////////////////////////////////////////////////////////////////

//OPERATING ON FILES
////////////////////////////////////////////////////////////////////////////////////////////
function getfiles ( root = "./", pattern = `/**/*{${VIDEO_EXT.join(',')}}` ) {
	
	const files = glob.sync(root + pattern)

	return files

}

function getFolders ( root = "./" ) {
	
	const files = glob.sync(root + '/**/*')

	return files.filter(element => element.split(".").length === 1)

}

function textFileToArray( txt_file = DEFAULT_PATHS.PATTERNS_FILE){

	return fs.readFileSync(txt_file).toString().split("\n")

}

function createFolders( path ){ //folder1/folder2/.../folderN

	const folders = path.split("/")

	var previousFolder = folders[0]

	for( var i = 1; i <= folders.length  ; i++){

		if (!fs.existsSync(previousFolder)){
			fs.mkdirSync(previousFolder);
		}

		previousFolder = `${previousFolder}/${folders[i]}`

	}

}

function removeEmptyFolders(root_path){

	const files = glob.sync(`${root_path}/**/*`, { nodir: true })

	if (files.length === 0 && fs.existsSync(path)) fs.rmSync(root_path, { recursive: true, force: true });

	fs.mkdirSync(root_path)

}

//GETTING DATA
////////////////////////////////////////////////////////////////////////////////////////////

const getDataFromRegex = (regex, text) => {

	const regData = regex.exec( text )
	regex.exec("")//TO PREVENT PROBLEM

	if(!regData){
		console.log("> Regex ", regex, " not found in ", text)
		return null
	}

	return regData.groups

}

/**
 * Description
 *
 * @param   folder  The folder where the files are stored before being renamed and moved .
 * @returns A json with of path dans patterns or title names.
 */
const getTvShowPattensAndPath = ( folder = DEFAULT_PATHS.INPUT, title_tv_show_regex = DEFAULT_TV_SHOW_REGEX.TV_SHOW_TITLE ) => {
	
	const files = getfiles(folder) 
	
	return files.map(path => {

		const file_name = path.split("/").at(-1)
		const {title} = getDataFromRegex(title_tv_show_regex, file_name)
		
		return {
			path, 
			title_pattern : title
		}
	})

}


async function getDataFromTMDB ( seach_title, type = "tv" ) {

	//INIT 
	const data = {}

	//SEARCH DATA FORM THE MOVIE DB (tmdb)
	const tmdb = new themoviedb()
	const result = await tmdb.search( seach_title, type )

	if(!!result){
		data.date = result.first_air_date?.slice(0,4) || result.release_date?.slice(0,4)
		data.id = result.id
		data.title = result.title || result.name
	}

	//RETURN 
	return data

}

async function getTMDBdataFromListOfTitles( list_of_titles ){

	const output = []

	for(const element of list_of_titles){

		//Get data from The Movie DataBase
		const {title, date, id} = await getDataFromTMDB(
			element
			.replace(/\./g," ")
			.toLowerCase()
		)

		//If nothing found, next 
		if(!title){
			continue
		}

		//Append data to the output array
		output.push({pattern : element, title, year:date, id,})

	}

	return output

}



//RENAMING AND ORGANIZING FOR PLEX SERVER
////////////////////////////////////////////////////////////////////////////////////////////

//OPTION 1 : 100% FROM REGEXS 
//------------------------------------------------------------------------------------------

async function dataPreparation (
	input = DEFAULT_PATHS.INPUT,
	output = DEFAULT_PATHS.OUTPUT,
	regexs = DEFAULT_TV_SHOW_REGEX,){

	//Get all files path 
	const files_path = getfiles(input)

	//Map on files_path the regexs
	const videos_info = files_path.map( path => {

		//Getting file name
		const file_name = path.split("/").at(-1)

		//Get file extension
		const ext = file_name.split(".").at(-1)

		//Extract data from file name with regex
		const movie_data = getDataFromRegex(regexs.MOVIE, file_name)
		const tv_show_data = getDataFromRegex(regexs.TV_SHOW, file_name)

		//Formatting the output
		const infos = {
			original_path : path, 
			title : movie_data?.title || tv_show_data?.title || null,
			episode : tv_show_data?.episode || null,
			season : tv_show_data?.season || null,
			ext,
		}

		//Cleaning title 
		infos.title = infos?.title?.replace(/\./g," ").toLowerCase()

		return infos
	})

	//Adding The MovieDB data
	for( const video_info of videos_info){

		const {date, id, title} = await getDataFromTMDB ( 
			seach_title = video_info.title, 
			type = video_info.season === null ? "movie" : "tv"
		)

		//If nothing found, next 
		if(!title){
			video_info.original_path = null
			console.log("> Video not found on The Movie DB :", seach_title)
			continue
		}

		video_info['year'] = date
		video_info['id'] = id
		video_info['title'] = title.replace(':','-').replace('?','')
	}

	//Setting output paths 
	videos_info.forEach(video_info => {

		//Apply renaming given that the file is a Tv Show or a Movie
		video_info.output = DEFAULT_OUTPUT_PATH(output, video_info, !!video_info.season) 
		
	})

	return videos_info

}

function setNewPath(videos_info) {

	for( const video_info of videos_info) {

		try { 

			if( !video_info.original_path ){
				continue
			}

			//Adding folders if necessary
			//createFolders(video_info.output.folders)
			fs.mkdirSync(video_info.output.folders, { recursive: true });

			//Renaming files
			fs.rename(video_info.original_path, video_info.output.full_path,  (err) => {
				if (err) throw err;
				console.log(video_info.original_path, ' : Rename complete!');
			})

		} catch(e) {
			console.log( e )
		}

	}

}

//OPTION 2 : FROM A _patterns.txt FILE MANUALLY UPDATED (obsolete)
//------------------------------------------------------------------------------------------

/*

async function setToPlexTVshowOrganization ( 
	input = DEFAULT_PATHS.INPUT, 
	output = DEFAULT_PATHS.OUTPUT,  
	regex = DEFAULT_TV_SHOW_REGEX.SEASON_AND_EPISODE, 
	files_pattern = DEFAULT_PATHS.PATTERNS_FILE  ){

	//Get data from The Movie DB for all pattern files listed in _patterns.txt
	const files_path = getfiles(input)
	const TMDBdata = await getTMDBdataFromListOfTitles( textFileToArray( files_pattern ) )

	//Loop on all files in _input add apply modification given the TMDB data
	for(const path of files_path){

		try {

			//Get file name  given a path
			const file_name = path.split("/").at(-1)

			//Filer on the TMDB collected data, if null go next path
			const data = TMDBdata.filter( element => file_name.indexOf(element.pattern) !== -1)[0]
			if(!data){
				continue
			}

			//Get file extention 
			const ext = file_name.split(".").at(-1)

			//Renaming file
			const {episode, season} = getDataFromRegex(regex, file_name)

			const file_tree = DEFAULT_TV_SHOWS_PATTERNS(output, data.title.replace(':','-'), season, episode, data.id, data.year, ext)

			//Create new folder if existing				
			createFolders(file_tree.folders)

			//Renaming files
			fs.rename(path, file_tree.full_path,  (err) => {
				if (err) throw err;
				console.log(path, ' : Rename complete!');
			})

		}catch(error){
			console.log(error)
		}
	}
}

*/

////////////////////////////////////////////////////////////////////////////////////////////
//MAIN
////////////////////////////////////////////////////////////////////////////////////////////

const main = async() => {

	const videos_info = await dataPreparation()
	console.log(videos_info)
	setNewPath(videos_info)
	removeEmptyFolders(DEFAULT_PATHS.INPUT)

}


// const { exec } = require('child_process');

// // Define the command you want to run
// const command = 'xcopy "D:\\APPRENTISSAGE\\PROGRAMMATION\\Plex-Naming-Movies-And-Tv-Show\\_output" "\\\\MYCLOUD-HE1NBD\\alex\\@MULTIMEDIA\\SERIES_plex" /i /z /s /compress /-y /f /v';

// // Execute the command
// exec(command, (error, stdout, stderr) => {
//   if (error) {
//     console.error(`Error executing command: ${error}`);
//     return;
//   }
//   if (stderr) {
//     console.error(`stderr: ${stderr}`);
//     return;
//   }
//   console.log(`stdout: ${stdout}`);
// });


main()