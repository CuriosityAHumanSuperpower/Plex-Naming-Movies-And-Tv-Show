/*
PLEX.TV MOVIES & TV SHOW FORMAT
16/01/2022
*/

////////////////////////////////////////////////////////////////////////////////////////////
//IMPORTS & CONST
////////////////////////////////////////////////////////////////////////////////////////////

//IMPORTS
import themoviedb from "./middlewares/themoviedb";
import sleep from "./middlewares/sleep";
import { rename, existsSync, mkdirSync } from 'fs';
import { sync } from "glob";

//DOTENV
import { config as _config } from 'dotenv';
_config({path : './config.env'});

//CONST
const EXTENSIONS = [ 'avi', 'mkv', 'mp4', 'flv', 'MKV' ]

////////////////////////////////////////////////////////////////////////////////////////////
//FUNCTIONS
////////////////////////////////////////////////////////////////////////////////////////////

const zeroPad = (num, places = 2) => String(num).padStart(places, '0')

/*
const extension = ( arrayOfPaths ) => {

	const extension = []

	arrayOfPaths.forEach(file => {
		var ext = file.split(".")
		if(ext.length === 2){
			ext = ext.at(-1)
			if(!extension.includes(ext)){
				extension.push(ext)
			}
		}
	})

	return extension
}
*/

const getfileNameData = ( path ) => {

	try {

		//CHECK IF IT IS A FILE PATH AND NOT A FOLDER ONE
		if( path.split(".").length === 2){

			const [name, ref, langArray] = path.split("/").at(-1).split(".")[0].split("_")
			const season = parseInt( ref.slice(1,3) )
			const episode = parseInt( ref.slice(4) )
			const root = path.split("/").slice(0,-1).join("/")
			const ext = path.split(".").at(-1)
			return {root, name, season, episode, ext}
		}

		return null

	} catch {

		console.log("> ERROR ON : ", path)
		return null 

	}
}

function getfiles ( root = "./" ) {
	
	const files = sync(root + '/**/*')

	return files

}

function getFolders ( root = "./" ) {
	
	const files = sync(root + '/**/*')

	return files.filter(element => element.split(".").length === 1)

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

const path = ( title, season, episode, tmdbData ) => {

	const rootFolder = `${title} (${tmdbData.date})`
	const seasonFolder = `Season ${zeroPad(season)}`
	const fileName = `${title} (${tmdbData.date}) {tmdb-${tmdbData.id}} - s${zeroPad(season)}e${zeroPad(episode)}`
	const filePath = `${rootFolder}/${seasonFolder}/${fileName}`

	return {rootFolder, seasonFolder, fileName, filePath}

}

async function setPlexPathFromFolder( _root = "./"){

	//SCAN FOLDER
	var files = getfiles(_root)
	console.log("> FILES : ",files)

	//SET PATH
	for(const file of files){

		const fileNameData = getfileNameData(file)

		if(!!fileNameData){
			const {root, name, season, episode, ext} = fileNameData
			const data = await getDataFromTMDB(name)//NOT OPTIZED TO CALL ON EVERY FILE, BETTER ONCE BY FOLDER
			const _path = path(name, season, episode, data)
			console.log("> path : ", _path)

			//CHANGE FILE PATH 
			const newPath = `${root}/${_path.fileName}.${ext}`
			console.log(newPath)
			rename(file, newPath, () => {console.log(newPath, " renamed")})
		}
	}
}

async function setPlexTVShowsFolder( _root = "./" ){

	//SCAN FOLDER 
	const folders = getFolders(_root)

	//LOOP ON FOLDERS
	for(const folder of folders){

		//GET DATA FROM FOLDER
		var [none, title, season] = folder.split(_root)[1].split("/")
		season = season?.slice(-2) || undefined

		//GET DATA FORM TMDB
		if(title.indexOf("{tmdb") !== -1 ){
			continue
		}
		const {date, id} = await getDataFromTMDB(title)
		const fileFolder = `${title} (${date}) {tmdb-${id}}`
		var newPath = `${_root}/${fileFolder}`
		var oldPath = folder
		if(season) {
			await sleep(1000)
			const seasonFolder = `Season ${zeroPad(season)}`
			newPath += `/${seasonFolder}`
			oldPath = `${_root}/${fileFolder}/${folder.split("/").at(-1)}`
		}
		console.log("> FOLDER : ", {oldPath, newPath})
		rename(oldPath, newPath, () => {console.log(newPath, " renamed")})
	}
}

async function setPlexMoviesFiles ( _root = "./"){

	//SCAN FOLDER
	const files = getfiles(_root)

	//SET PATH
	for(const file of files){

		//NEXT IF FILE ALREADY GOOD FORMAT
		if(file.indexOf("{tmdb") !== -1 ){
			continue
		}

		//GET DATA FORM FILE NAME
		const fileName = file.split("/").at(-1)
		const [name,ext] = fileName.split(".")

		//GET DATA FROM TMDB
		const {title, date, id} = await getDataFromTMDB(name, type = "movie")
		console.log({file, name, title, date, id})

		//ON ERROR
		if(!title){
			console.log("> ERROR ON : ", file)
			continue
		}

		//RENAME 
		const newFileName = `${title.replace(":","-")} (${date}) {tmdb-${id}}`
		const newPath = `${_root}/${newFileName}.${ext}`

		console.log( {oldPath : file, newPath} )
		rename(file, newPath, () => {console.log(newPath, " renamed")})

	}

}

async function setPlexMoviesFolders ( _root = "./"){

	//SCAN FOLDER
	const files = getfiles(_root)

	console.log(files)

	for(const file of files){

		const fileName = file.split("/").at(-1)
		const folderRoot = `${_root}/${fileName.split(".")[0]}`
	
		if (!existsSync(folderRoot)){
		    mkdirSync(folderRoot);

		} else {
			const oldPath = file
			const newPath = `${folderRoot}/${fileName}`
			console.log({oldPath, newPath})
			// fs.renameSync( oldPath , newPath )
		}
	}
}

const SET_CONFIG = async( config, _input = "./input" ) => {

	for(const video of config){

//		if( config.title + config.year + config.id > 0) break

		const {title, date, id} = await getDataFromTMDB(video.substring.replace(/\./g," "))
		video.title = title
		video.year = date
		video.id = id
	}

}

async function setNameFromFolder ( config, _input = "./_input", _output = "./_output" ){ //config = {substring : , title :, date :, id :}

	//INIT
	const files = getfiles(_input)
	const regex = /[Ss](?<season>\d{1,2})[Ee](?<episode>\d{1,2})/gm;

	console.log(files, "\n")

	//LOOP

	for(const file of files){

		const fileName = file.split("/").at(-1)

		for( const data of config ){

			if(fileName.indexOf(data.substring) !== -1){

				console.log(fileName, data)

				//SET FILE NAME
				const regData = regex.exec(fileName)
				regex.exec("")//TO PREVENT PROBLEM
				const ext = fileName.split(".").at(-1)
				if(!regData){
					console.log("> error on : ", file)
					break
				}
				const {episode, season} = regData.groups
				const newName = `${data.title.replace(':','-')} (${data.year}) {tmdb-${data.id}}`
				const oldPath = file
				const newPath = `${_output}/${newName}/Season ${season}/${newName} - s${season}e${episode}.${ext}`

				//CREATE FOLDERS				
				if (!existsSync(`${_output}/${newName}`)){
					mkdirSync(`${_output}/${newName}`);
				}				
				if (!existsSync(`${_output}/${newName}/Season ${season}/`)){
					mkdirSync(`${_output}/${newName}/Season ${season}/`);
				}

				//RENAME
				rename(file, newPath,  (err) => {
					if (err) throw err;
					console.log(file, ' : Rename complete!');
				})
				break

			}

		}

	}
}

////////////////////////////////////////////////////////////////////////////////////////////
//MAIN
////////////////////////////////////////////////////////////////////////////////////////////

async function main () {

	// const files = setPlexTVShowsFolder("Z:/@MULTIMEDIA/SERIES/THRILLER")
	// setPlexMoviesFiles("./_input")
	// setPlexMoviesFolders("./_input")
	// setPlexMoviesFolders("Z:/@MULTIMEDIA/FILMS")

	const config = [
/*		{
			substring : "Oscuro Deseo",
			title : "Oscuro Deseo", 
			id : "105214", 
			year : "2020"
		},*/
		// { substring : "House.of.the.Dragon"},
		// { substring : "House of the Dragon"},
		// { substring : "house.of.the.dragon"},
		// { substring : "stranger.things"},
		// { substring : "westworld"},
		// { substring : "Westworld"},
		// { substring : "The.Sandman"},
		// { substring : "Locke.and.Key"},
		// { substring : "Black.Bird"},
		// { substring : "The.Lord.of.the.Rings.The.Rings.of.Power"},
		// { substring : "american.horror.story"},
		// { substring : "Andor"},
		// { substring : "andor"},
		// { substring : "Elite"},
		// { substring : "The.Crown"},
		// { substring : "1899"},
		// { substring : "The.Peripheral"},
		// { substring : "Wednesday"},
		// { substring : "Dark"},
		// { substring : "Lady.Voyeur"},
		// { substring : "The.Order"},
		// { substring : "The.Witcher.A.Origem"},
		// { substring : "Love.Death.And.Robots"},
		// { substring : "Fate.The.Winx.Saga"},
		// { substring : "Raised.by.Wolves"},
		// { substring : "Cidade Invisivel"},
		//{ substring : "Treason"},
		// { substring : "Salem"},
		// { substring : "Motherland.Fort.Salem"},
		{ substring : "The.White.Lotus"},
		{ substring : "The.Mandalorian"},
		{ substring : "Shadow.and.Bone"},
	]

	await SET_CONFIG(config)
	setNameFromFolder(config)

}

main()