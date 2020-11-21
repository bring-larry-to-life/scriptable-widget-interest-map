// Refresh interval in hours
const refreshInterval = 6

const googleMapsBaseUri = 'https://maps.googleapis.com/maps/api/staticmap';

const nextChar = (c) => {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

const getMapUrlByCoordinates = (apiKey, userLat, userLng, markers=[], zoom = '14', size='800x800') => {
	const center = `${userLat},${userLng}`;
	if (markers.length >= 1) {
		let label = '@';
		const coords = markers.map(marker => {
			label = nextChar(label);
			return `markers=color:red|label:${label}|${marker.lat},${marker.lng}`;
		});
		return `${googleMapsBaseUri}?size=${size}&key=${apiKey}&${coords.join('&')}`;
	}
	return `${googleMapsBaseUri}?center=${center}&zoom=${zoom}&size=${size}&key=${apiKey}&markers=color:blue|${center}`;
}

// Build Google Maps API URI given city input
const getMapUrlByCity = (apiKey, city, zoom = '14') => `${googleMapsBaseUri}?center=${city}&zoom=${zoom}&size=${size}&key=${apiKey}`;

const getWikiUrlByPageId = (pageId) => `https://en.wikipedia.org/?curid=${pageId}`;
const getWikiUrlByCoords = (lat, lng) => `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates|pageimages&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000`

// Get user's current location. Returns { latitude, longitude }
const getCurrentLocation = async () => {
        Location.setAccuracyToTenMeters();
	return Location.current().then((res) => { 
		return {
			'latitude': res.latitude, 
			'longitude': res.longitude 
		};
	}, err => console.log(`Could not get current location: ${err}`));
};

const createTable = (map, items) => {
	const table = new UITable();
	const mapRow = new UITableRow();
	const mapCell = mapRow.addImage(map);
	mapCell.widthWeight = 100;
	mapRow.dismissOnSelect = false;
	mapRow.height = 400;
	table.addRow(mapRow);
	let label = 'A';
	items.forEach(item => {
		console.log('ITEM');
		console.log(item);
		const row = new UITableRow();
		const markerUrl = `http://maps.google.com/mapfiles/kml/paddle/${label}.png`
		const imageUrl = item.thumbnail ? item.thumbnail.source : '';
		const title = item.title;
		const markerCell = row.addImageAtURL(markerUrl);
		const imageCell = row.addImageAtURL(imageUrl);
		const titleCell = row.addText(title);
		markerCell.widthWeight = 20;
		imageCell.widthWeight = 20;
		titleCell.widthWeight = 40;
		row.height = 60;
		row.cellSpacing = 10;
		row.onSelect = (index) => Safari.open(items[index].url);
		row.dismissOnSelect = false;
		table.addRow(row);
		label = nextChar(label);
	});
	return table;
}

// Uncomment this if you want to run the widget locally
// const widget = await createWidget()
// if (!config.runsInWidget) 
// {
// 	await widget.presentMedium()
// }
// Script.setWidget(widget)
// Script.complete()

async function clickWidget(params) {
	const { apiKey } = params;
	let currLocation = await getCurrentLocation();
	let wikiArticles = await getNearbyWikiArticles(currLocation.latitude,currLocation.longitude);
	let selection = await getMapsPicByCurrentLocations(apiKey, currLocation.latitude, currLocation.longitude, wikiArticles);
	const table = createTable(selection.image, wikiArticles);
	await QuickLook.present(table);
}

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
	let wikiArticles = await getNearbyWikiArticles(currLocation.latitude,currLocation.longitude);
	// let selection = await getMapsPicByCity(apiKey, 'Boston, MA');
	let selection = await getMapsPicByCurrentLocations(apiKey, currLocation.latitude, currLocation.longitude, wikiArticles);
	widget.backgroundImage = selection.image
	widget.addSpacer()
	
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
 * Example Wikipedia API:
 * https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates%7Cpageimages&generator=geosearch&ggscoord=41.68365535753726|-70.19823287890266&ggsradius=10000
 * 
 * Useful Wikipedia article on how to use API with location and images:
 * https://www.mediawiki.org/wiki/API:Geosearch#Example_3:_Search_for_pages_nearby_with_images
 *
 * Useful StackOverflow article about using Wikipedia API with location and images:
 * https://stackoverflow.com/questions/24529853/how-to-get-more-info-within-only-one-geosearch-call-via-wikipedia-api
 * 
 * Example output from Wikipedia:
 * {"batchcomplete":"","query":{"pages":{"38743":{"pageid":38743,"ns":0,"title":"Cape Cod","index":-1,"coordinates":[{"lat":41.68,"lon":-70.2,"primary":"","globe":"earth"}],"thumbnail":{"source":"https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Ccnatsea.jpg/50px-Ccnatsea.jpg","width":50,"height":34},"pageimage":"Ccnatsea.jpg"}}}}
 * 
 * Example output: [{
 *   lat: 41.68
 *   lng: -70.2
 *   thumbnail: {source: "https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Ccnatsea.jpg/50px-Ccnatsea.jpg", width: 50, height: 34}
 *   title: "Cape Cod",
 *   url: https://en.wikipedia.org/?38743
 * }]
 */
async function getNearbyWikiArticles(lat, lng) {
	try {
		const uri = getWikiUrlByCoords(lat, lng);
		console.log('Request URI: ' + uri);
		const request = new Request(encodeURI(uri));
		const wikiJSON = await request.loadJSON();
		console.log('Wiki JSON: ' + JSON.stringify(wikiJSON));

		let articles;
		if (wikiJSON && wikiJSON.query && wikiJSON.query.pages) {
			articles = wikiJSON.query.pages;
		} else {
			throw new Error("Could not read data from wikipedia");
		}

		var response = Object.values(articles).map(article => ({
			"url": getWikiUrlByPageId(article.pageid),
			"title": article.title,
			"lng": article.coordinates[0].lon,
			"lat": article.coordinates[0].lat,
            "thumbnail": article.thumbnail
		}));

		console.log('Converted Wiki JSON: ' + JSON.stringify(response));
		return response;
	} catch(e) {
		console.error(e)
		return null;
	}
}

 /* 
  * Returns object containing static Google Maps image response and widget title
  */
async function getMapsPicByCurrentLocations(apiKey, latitude, longitude, markers) {
	try {
		const uri = getMapUrlByCoordinates(apiKey, latitude, longitude, markers);
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
	createWidget,
	clickWidget
}
