// Refresh interval in hours
const refreshInterval = 6

const getMapUrlByCoordinates = (apiKey, lat, lng, zoom = '14', size='400x400') => `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&key=${apiKey}&markers=color:blue|${lat},${lng}`;

// Build Google Maps API URI given city input
const getMapUrlByCity = (apiKey, city, zoom = '14', size='400x400') => `https://maps.googleapis.com/maps/api/staticmap?center=${city}&zoom=${zoom}&size=${size}&key=${apiKey}`;

const getWikiUrlByPageId = (pageId) => `https://en.wikipedia.org/?${pageId}`;
const getWikiUrlByCoords = (lat, lng) => `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${lat}|${lng}&format=json`;

// Get user's current location. Returns { latitude, longitude }
const getCurrentLocation = async () => {
	return Location.current().then((res) => { 
		return {
			'latitude': res.latitude, 
			'longitude': res.longitude 
		};
	}, err => console.log(`Could not get current location: ${err}`));
};

// Uncomment this if you want to run the widget locally
// const widget = await createWidget()
// if (!config.runsInWidget) 
// {
// 	await widget.presentMedium()
// }
// Script.setWidget(widget)
// Script.complete()

/*
 * Returns an instance of ListWidget that contains the contents of this widget.
 * The widget returned consists of a background image, a greyscaled gradient and
 * the image title in the slightly darker part of the grandient in the lower 
 * left corner of the widget.
 */
async function createWidget(params)
{
	const { apiKey } = params;
	let widget = new ListWidget()
	let currLocation = await getCurrentLocation();
	// let selection = await getMapsPicByCity(apiKey, 'Boston, MA');
	let selection = await getMapsPicByCurrentLocations(apiKey, currLocation.latitude, currLocation.longitude);
	widget.backgroundImage = selection.image
	widget.addSpacer()
	
	await getNearbyWikiArticles(41.68365535753726,-70.19823287890266);
	
	let startColor = new Color("#1c1c1c00")
	let endColor = new Color("#1c1c1cb4")
	let gradient = new LinearGradient()
	gradient.colors = [startColor, endColor]
	gradient.locations = [0.25, 1]
	widget.backgroundGradient = gradient
	widget.backgroundColor = new Color("1c1c1c")
	
	let titleText = widget.addText(selection.title)
	titleText.font = Font.thinSystemFont(12)
	titleText.textColor = Color.white()
	titleText.leftAlignText()
	
	let interval = 1000 * 60 * 60 * refreshInterval
	widget.refreshAfterDate = new Date(Date.now() + interval)
	
    return widget
}

/*
 * Returns object containing static Google Maps image response and widget title
 */
async function getMapsPicByCity(apiKey, city) {
	try {
		console.log('Request URI');
		console.log(getMapUrlByCity(apiKey, city));
		const mapPicRequest = new Request(encodeURI(getMapUrlByCity(apiKey, city)));
		const mapPic = await mapPicRequest.loadImage();
		return { image: mapPic, title: city };
	} catch(e) {
		console.error(e)
		return null;
	}
}

/*
 * Calls wikipedia for nearby articles and modifies the object for ease of use.
 * 
 * Example output from Wikipedia:
 * {"query":{"geosearch":[{"pageid":38743,"primary":"","dist":432.1,"ns":0,"title":"Cape Cod","lon":-70.2,"lat":41.68},{"pageid":4866309,"primary":"","dist":721.7,"ns":0,"title":"Cape Cod Coliseum","lon":-70.19622222222223,"lat":41.68996944444444},{"pageid":3051164,"primary":"","dist":738,"ns":0,"title":"Dennis-Yarmouth Regional High School","lon":-70.19363611111112,"lat":41.677974999999996},{"pageid":39230827,"primary":"","dist":779.3,"ns":0,"title":"Red Wilson Field","lon":-70.194,"lat":41.6774},{"pageid":2013195,"primary":"","dist":1120.2,"ns":0,"title":"WKPE-FM","lon":-70.189,"lat":41.691},{"pageid":58211602,"primary":"","dist":1549.7,"ns":0,"title":"Long Pond (West Yarmouth, Massachusetts)","lon":-70.1971508,"lat":41.669742},{"pageid":39494986,"primary":"","dist":1691.5,"ns":0,"title":"Yarmouth-Barnstable Regional Transfer Station","lon":-70.21765833333333,"lat":41.68823333333333},{"pageid":116666,"primary":"","dist":1769.8,"ns":0,"title":"South Yarmouth, Massachusetts","lon":-70.19972222222222,"lat":41.66777777777777},{"pageid":21797930,"primary":"","dist":1841.8,"ns":0,"title":"Dennis Beaches","lon":-70.17791666666668,"lat":41.67701388888889},{"pageid":18446199,"primary":"","dist":2105.4,"ns":0,"title":"Thomas Bray Farm","lon":-70.20805555555556,"lat":41.70111111111111}]},"batchcomplete":""}
 * 
 * Example output:
 * [{"url":"https://en.wikipedia.org/?38743","primary":"","distance":432.1,"ns":0,"title":"Cape Cod","lng":-70.2,"lat":41.68}]
 */
async function getNearbyWikiArticles(lat, lng) {
	try {
		const uri = getWikiUrlByCoords(lat, lng);
		console.log('Request URI: ' + uri);
		const request = new Request(encodeURI(uri));
		const wikiJSON = await request.loadJSON();
		console.log('Wiki JSON: ' + wikiJSON);

		let articles;
		if (wikiJSON && wikiJSON.query && wikiJSON.query.geosearch) {
			articles = wikiJSON.query.geosearch;
		} else {
			throw new Error("Could not read data from wikipedia");
		}

		const response = [];
		for (let i=0; i<articles; i++) {
			response.push({
				"url": getWikiUrlByPageId(articles[i].pageid),
				"primary": articles[i].primary,
				"distance": articles[i].dist,
				"ns": articles[i].ns,
				"title": articles[i].title,
				"lng": articles[i].lon,
				"lat": articles[i].lat
			});
		}
		console.log('Converted Wiki JSON: ' + response);
		return response;
	} catch(e) {
		console.error(e)
		return null;
	}
}

 /* 
  * Returns object containing static Google Maps image response and widget title
  */
async function getMapsPicByCurrentLocations(apiKey, latitude, longitude) {
	try {
		const uri = getMapUrlByCoordinates(apiKey, latitude, longitude);
		console.log('Request URI');
		console.log(uri);
		const mapPicRequest = new Request(encodeURI(uri));
		const mapPic = await mapPicRequest.loadImage();
		return { image: mapPic, title: 'Current Location' };
	} catch(e) {
		console.error(e)
		return null;
	}
}

module.exports = {
    createWidget
}
