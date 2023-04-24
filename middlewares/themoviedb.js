/*
THE MOVIE DB API
19/12/2021
*/

////////////////////////////////////////////////////////////////////////////////////////////
//IMPORTS & CONST
////////////////////////////////////////////////////////////////////////////////////////////

const axios = require('axios')

//VARIABLES
///////////

//FOLDER TYPE 
//BASE 
const BASE = {
	baseURL: "https://api.themoviedb.org/3/",
	url: "", 
	method: "get",
	headers : {
	},
	params: {
	}
} 

const BASE_IMAGE_URL = "https://www.themoviedb.org/t/p/w1280/" // +id

const BASE_PERSON_URL = "https://www.themoviedb.org/person/" // +id

const SEARCH = (_videoTitleToSearch, _type = "tv") => {

	const request = {...BASE}

	request.url = `search/${_type}`

	request.params = {
		api_key : "", 
		language : "fr-FR", 
		page : 1, 
		query : _videoTitleToSearch, 
		include_adult : false,
	}

	return request
}

const DATA = ( _id, _type = "tv", season = 0, episode = 0, actors = false) => {

	const request = {...BASE}

	request.url = `${_type}/${_id}`

	if(season > 0 && episode > 0 ){
		request.url = request.url + "/season/1/episode/1"

	} else if (actors) {
		request.url = request.url + "/aggregate_credits"
	}

	request.params = {
		api_key : "", 
		language : "fr-FR", 
	}

	return request	

}

////////////////////////////////////////////////////////////////////////////////////////////
//CLASS
////////////////////////////////////////////////////////////////////////////////////////////

class themoviedb {

	// PRIVATE 
	#token;
	#apiKey;

	constructor( token, apiKey ){
	 	this.#token = token || process.env.THE_MOVIE_DB_AUTH_TOKEN;
	 	this.#apiKey = apiKey || process.env.THE_MOVIE_DB_API_KEY
	}

	#setAuth( request ){
		request.headers = {Authorization : `Bearer ${this.#token}`}
		request.params.api_key = this.#apiKey
		return request		
	}

	async #sendRequest( request ){
		//SEND
		const { data } = await axios.request(request)
		//RETURN 
		return data
	}

	async search( videoTitleToSearch, type = "tv") { //type : movie

		try {

			const response = await this.#sendRequest( this.#setAuth( SEARCH( videoTitleToSearch, type ) ) )
			const result = response?.results[0]

			return result 

		} catch (error){
			console.log("\t> ERROR ON SEARCH : ", videoTitleToSearch )
			console.log( error )
			return null
		}
	}

}

////////////////////////////////////////////////////////////////////////////////////////////
//MAIN
////////////////////////////////////////////////////////////////////////////////////////////
module.exports = themoviedb;