// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: map;

/*
 * Authors: Ryan Stanley (stanleyrya@gmail.com), Jason Morse (jasonkylemorse@gmail.com)
 * Description: Scriptable code to display Google Maps image widget with nearby points of
 * interest, sourced from Wikipedia. Clicking on the map opens a list of locations with photos,
 * titles, and quick links to Wikipedia and Google Maps directions.
 */

/**
 * Class that can read and write JSON objects using the file system.
 *
 * This is a minified version but it can be replaced with the full version by copy pasting this code!
 * https://github.com/stanleyrya/scriptable-playground/blob/main/json-file-manager/json-file-manager.js
 *
 * Usage:
 *  * write(relativePath, jsonObject): Writes JSON object to a relative path.
 *  * read(relativePath): Reads JSON object from a relative path.
 */
class JSONFileManager{write(e,r){const t=this.getFileManager(),i=this.getCurrentDir()+e,l=e.split("/");if(l>1){const e=l[l.length-1],r=i.replace("/"+e,"");t.createDirectory(r,!0)}if(t.fileExists(i)&&t.isDirectory(i))throw"JSON file is a directory, please delete!";t.writeString(i,JSON.stringify(r))}read(e){const r=this.getFileManager(),t=this.getCurrentDir()+e;if(!r.fileExists(t))throw"JSON file does not exist! Could not load: "+t;if(r.isDirectory(t))throw"JSON file is a directory! Could not load: "+t;r.downloadFileFromiCloud(t);const i=JSON.parse(r.readString(t));if(null!==i)return i;throw"Could not read file as JSON! Could not load: "+t}getFileManager(){try{return FileManager.iCloud()}catch(e){return FileManager.local()}}getCurrentDir(){const e=this.getFileManager(),r=module.filename;return r.replace(e.fileName(r,!0),"")}}
const jsonFileManager = new JSONFileManager();

/**
 * Class that can write logs to the file system.
 *
 * This is a minified version but it can be replaced with the full version by copy pasting this code!
 * https://github.com/stanleyrya/scriptable-playground/blob/main/file-logger/file-logger.js
 *
 * Usage:
 *  * log(line): Adds the log line to the class' internal log object.
 *  * writeLogs(relativePath): Writes the stored logs to the relative file path.
 */
class FileLogger{constructor(){this.logs=""}log(e){e instanceof Error?console.error(e):console.log(e),this.logs+=new Date+" - "+e+"\n"}writeLogs(e){const r=this.getFileManager(),t=this.getCurrentDir()+e,i=e.split("/");if(i>1){const e=i[i.length-1],l=t.replace("/"+e,"");r.createDirectory(l,!0)}if(r.fileExists(t)&&r.isDirectory(t))throw"Log file is a directory, please delete!";r.writeString(t,this.logs)}getFileManager(){try{return FileManager.iCloud()}catch(e){return FileManager.local()}}getCurrentDir(){const e=this.getFileManager(),r=module.filename;return r.replace(e.fileName(r,!0),"")}}
const logger = new FileLogger();

/**
 * Class that can capture the time functions take in milliseconds then export them to a CSV.
 *
 * This is a minified version but it can be replaced with the full version by copy pasting this code!
 * https://github.com/stanleyrya/scriptable-playground/blob/main/performance-debugger/performance-debugger.js
 *
 * Usage:
 *  * wrap(fn, args): Wrap the function calls you want to monitor with this wrapper.
 *  * appendPerformanceDataToFile(relativePath): Use at the end of your script to write the metrics to the CSV file at the relative file path.
 */
class PerformanceDebugger{constructor(){this.performanceResultsInMillis={}}async wrap(e,t){const r=Date.now(),i=await e.apply(null,t),s=Date.now();return this.performanceResultsInMillis[e.name]=s-r,i}appendPerformanceDataToFile(e){const t=this.getFileManager(),r=this.getCurrentDir()+e,i=e.split("/");if(i>1){const e=i[i.length-1],s=r.replace("/"+e,"");t.createDirectory(s,!0)}if(t.fileExists(r)&&t.isDirectory(r))throw"Performance file is a directory, please delete!";let s,n,l=Object.getOwnPropertyNames(this.performanceResultsInMillis);if(t.fileExists(r)){console.log("File exists, reading headers. To keep things easy we're only going to write to these headers."),t.downloadFileFromiCloud(r),n=t.readString(r),s=this.getFirstLine(n).split(",")}else console.log("File doesn't exist, using available headers."),n=(s=l).toString();n=n.concat("\n");for(const e of s)this.performanceResultsInMillis[e]&&(n=n.concat(this.performanceResultsInMillis[e])),n=n.concat(",");n=n.slice(0,-1),t.writeString(r,n)}getFirstLine(e){var t=e.indexOf("\n");return-1===t&&(t=void 0),e.substring(0,t)}getFileManager(){try{return FileManager.iCloud()}catch(e){return FileManager.local()}}getCurrentDir(){const e=this.getFileManager(),t=module.filename;return t.replace(e.fileName(t,!0),"")}}
const performanceDebugger = new PerformanceDebugger();

/*
 * Parameters
 *
 * apiKey: [REQUIRED] The Google Maps API Key.
 * forceWidgetView: Loads the widget even if run directly from scriptable. Useful for seeing the widget view's logs.
 * writeLogsIfException: Writes the script's logs to a file if there is an exception. Be careful, right now it will overrite the file every time there is an exception.
 * logPerformanceMetrics: Stores function performance metrics each time the script runs. Appends how long each function takes in milliseconds to a CSV if they are wrapped by the performanceWrapper.
 *
 * Attempts to load parameters in this order:
 * 1. Widget parameters
 * 2. JSON file "./storage/scriptname.json"
 * 3. Hard-coded parameters right here:
 */

 // Get user's current latitude and longitude
 const getCurrentLocation = async() => {
 	await Location.setAccuracyToHundredMeters();
 	return Location.current().then((res) => {
 		return {
 			'latitude': res.latitude,
 			'longitude': res.longitude
 		};
 	}, err => log(err));
 };

const scriptParams = {
	apiKey: 'XXX',
	forceWidgetView: false,
	writeLogsIfException: false,
	logPerformanceMetrics: false,
	overrideLatitude: getCurrentLocation.latitude,
	overrideLongitude: getCurrentLocation.longitude
}

const widgetParams = args.widgetParameter ? JSON.parse(args.widgetParameter) : undefined;

let storedParams;
try {
	storedParams = jsonFileManager.read("storage/" + Script.name() + ".json");
} catch (err) {
	logger.log(err);
}

const params = widgetParams || storedParams || scriptParams;
const { apiKey } = params;

// Refresh interval in hours
const refreshInterval = 6;

/*******************************
 ****** UTILITY FUNCTIONS ******
 *******************************/



/*
 * Given coordinates, return a description of the current location in words (town name, etc.).
 * Object returned has two properties:
 * {
 *   "areaOfInterest": "Spot Pond - Middlesex Fells Reservation",
 *   "generalArea": "Medford, MA"
 * }
 *
 * More information here: https://github.com/stanleyrya/scriptable-playground/blob/main/reverse-geocode-tests.js
 */
const getLocationDescription = async(location) => {
	return Location.reverseGeocode(location.latitude, location.longitude).then((res) => {
		const response = res[0];

		let areaOfInterest = "";
		if (response.inlandWater) {
			areaOfInterest += response.inlandWater
		} else if (response.ocean) {
			areaOfInterest += response.ocean;
		}
		if (areaOfInterest && response.areasOfInterest) {
			areaOfInterest += ' - ';
		}
		if (response.areasOfInterest) {
			// To keep it simple, just grab the first one.
			areaOfInterest += response.areasOfInterest[0];
		}

		let generalArea = "";
		if (response.locality) {
			generalArea += response.locality;
		}
		if (generalArea && response.administrativeArea) {
			generalArea += ', ';
		}
		if (response.administrativeArea) {
			generalArea += response.administrativeArea;
		}

		return {
			areaOfInterest: areaOfInterest ? areaOfInterest : null,
			generalArea: generalArea ? generalArea : null
		};
	}, err => log(`Could not reverse geocode location: ${err}`));
};

// Utility function to increment alphabetically for map markers
const nextChar = (c) => {
	return String.fromCharCode(c.charCodeAt(0) + 1);
}

/*******************************
 **** GOOGLE MAPS FUNCTIONS ****
 *******************************/

// Endpoint for Static Google Maps API
const googleMapsBaseUri = 'https://maps.googleapis.com/maps/api/staticmap';

/*
 * Gets the maps size for Google Maps' static API.
 * Returns the size for a square by default.
 */
const getMapSize = (widgetSize) => {
	if (widgetSize === 'medium') {
		return '800x500'
	} else {
		return '800x800'
	}
}

// Construct Google Maps API URI given city input
const getMapUrlByCity = (apiKey, city, zoom = '14') => `${googleMapsBaseUri}?center=${city}&zoom=${zoom}&size=${size}&key=${apiKey}`;

// Construct Google Maps API URI given user latitude, longitude, and list of markers
const getMapUrlByCoordinates = (apiKey, userLat, userLng, markers = [], zoom = '14', size = '800x800') => {
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

// Returns object containing static Google Maps image response (by city) and widget title
async function getMapsPicByCity(apiKey, city) {
	try {
		logger.log('Request URI');
		logger.log(getMapUrlByCity(apiKey, city));
		const mapPicRequest = new Request(encodeURI(getMapUrlByCity(apiKey, city)));
		const mapPic = await mapPicRequest.loadImage();
		return { image: mapPic, title: city };
	} catch (e) {
		logger.log(e)
		return null;
	}
}

// Returns object containing static Google Maps image response (by specific location & markers)
async function getMapsPicByCurrentLocations(apiKey, location, markers) {
	try {
		const uri = getMapUrlByCoordinates(apiKey, location.latitude, location.longitude, markers);
		logger.log('Request URI');
		logger.log(uri);
		const mapPicRequest = new Request(encodeURI(uri));
		return await mapPicRequest.loadImage();
	} catch (e) {
        logger.log("Copy-paste the Google Maps URI into Safari if this doesn't work. There is probably something wrong with the API key.");
        throw e;
	}
}

// Returns Google Maps directions direct link from current location to point of interest
const getDirectionsUrl = (location, destination) => `https://www.google.com/maps/dir/${location.latitude},${location.longitude}/${destination.latitude},${destination.longitude}`;

// Returns Google Maps direct link for point of interest
const getCoordsUrl = (destination) => `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;

/*******************************
 ***** WIKIPEDIA FUNCTIONS *****
 *******************************/

const getWikiUrlByPageId = (pageId) => `https://en.wikipedia.org/?curid=${pageId}`;
const getWikiUrlByCoords = (lat, lng) => `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates|pageimages&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000`;

/*
 * Calls wikipedia for nearby articles and modifies the object for ease of use.
 * Returns an empty array if there are no results or if there is a failure.
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
async function getNearbyWikiArticles(location) {
	try {
		const uri = getWikiUrlByCoords(location.latitude, location.longitude);
		logger.log('Request URI: ' + uri);
		const request = new Request(encodeURI(uri));
		const wikiJSON = await request.loadJSON();

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
		return response;
	} catch (e) {
		logger.log(e);
		return [];
	}
}

/*****************************************
 ***** SCRIPTABLE & WIDGET FUNCTIONS *****
 *****************************************/

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
		logger.log('ITEM');
		logger.log(item);
		const row = new UITableRow();
		const markerUrl = `http://maps.google.com/mapfiles/kml/paddle/${label}.png`;
		const imageUrl = item.thumbnail ? item.thumbnail.source : '';
		const title = item.title;
		const markerCell = row.addButton(label);
		const imageCell = row.addImageAtURL(imageUrl);
		const titleCell = row.addText(title);
		markerCell.onTap = () => Safari.open(getCoordsUrl({ latitude: item.lat, longitude: item.lng }));
		markerCell.widthWeight = 10;
		imageCell.widthWeight = 20;
		titleCell.widthWeight = 50;
		row.height = 60;
		row.cellSpacing = 10;
		row.onSelect = () => Safari.open(item.url);
		row.dismissOnSelect = false;
		table.addRow(row);
		label = nextChar(label);
	});
	return table;
}

async function createWidget(location) {
	let widget = new ListWidget();
	let wikiArticles = await performanceDebugger.wrap(getNearbyWikiArticles, [location]);
	// let image = await performanceDebugger.wrap(getMapsPicByCity, [apiKey, 'Boston, MA']);
	let image = await performanceDebugger.wrap(getMapsPicByCurrentLocations, [apiKey, location, wikiArticles]);
	widget.backgroundImage = image;

	let startColor = new Color("#1c1c1c00");
	let endColor = new Color("#1c1c1cb4");
	let gradient = new LinearGradient();
	gradient.colors = [startColor, endColor];
	gradient.locations = [0.25, 1];
	widget.backgroundGradient = gradient;
	widget.backgroundColor = new Color("1c1c1c");

	let textStack = widget.addStack();
	textStack.layoutHorizontally();
	textStack.bottomAlignContent();

	let titleStack = textStack.addStack();
	titleStack.layoutVertically();
	titleStack.bottomAlignContent();
	titleStack.addSpacer();

	textStack.addSpacer();

	let additionalInfoStack = textStack.addStack();
	additionalInfoStack.layoutVertically();
	additionalInfoStack.bottomAlignContent();
	additionalInfoStack.addSpacer();

	let currentLocationDescription = await getLocationDescription(location);
	let primaryLocationDescription;
	let secondaryLocationDescription;
	if (currentLocationDescription.areaOfInterest) {
		primaryLocationDescription = currentLocationDescription.areaOfInterest;
		secondaryLocationDescription = currentLocationDescription.generalArea ? currentLocationDescription.generalArea : null;
	} else if (currentLocationDescription.generalArea) {
		primaryLocationDescription = currentLocationDescription.generalArea;
	}

	let primaryTitleText = titleStack.addText(primaryLocationDescription);
	primaryTitleText.leftAlignText();
	primaryTitleText.textColor = Color.white();
	if (secondaryLocationDescription) {
		let secondaryTitleText = titleStack.addText(secondaryLocationDescription);
		secondaryTitleText.font = Font.thinSystemFont(12);
		secondaryTitleText.textColor = Color.white();
		secondaryTitleText.leftAlignText();
	}

	let sourceText = additionalInfoStack.addText("Wikipedia");
	sourceText.font = Font.thinSystemFont(12);
	sourceText.textColor = Color.white();
	sourceText.rightAlignText();

	let lastUpdatedDate = additionalInfoStack.addDate(new Date());
	lastUpdatedDate.applyTimeStyle();
	lastUpdatedDate.font = Font.thinSystemFont(12);
	lastUpdatedDate.textColor = Color.white();
	lastUpdatedDate.rightAlignText();

	let interval = 1000 * 60 * 60 * refreshInterval;
	widget.refreshAfterDate = new Date(Date.now() + interval);

	return widget;
}

async function clickWidget(location) {
	let wikiArticles = await performanceDebugger.wrap(getNearbyWikiArticles, [location]);
	let image = await performanceDebugger.wrap(getMapsPicByCurrentLocations, [apiKey, location, wikiArticles]);
	const table = createTable(image, wikiArticles);
	await QuickLook.present(table);
}

async function run() {
	if (params) {
		logger.log("Using params: " + JSON.stringify(params));
	} else {
		logger.log("No valid parameters!");
		return;
	}

	if (!params.apiKey || params.apiKey === 'XXX') {
		logger.log("You must provide an API Key from Google to use this script.");
		return;
	}

	let location;
	if (params.overrideLatitude && params.overrideLongitude) {
		location = {
			latitude: params.overrideLatitude,
			longitude: params.overrideLongitude
		}
	} else {
		location = await performanceDebugger.wrap(getCurrentLocation);
	}

	if (config.runsInWidget) {
		const widget = await createWidget(location);
		Script.setWidget(widget);
		Script.complete();

	} else if (params.forceWidgetView) {
		// Useful for loading widget and seeing logger.logs manually
		const widget = await createWidget(location);
		await widget.presentMedium();

	} else {
		await clickWidget(location);
	}

	if (params.logPerformanceMetrics) {
		performanceDebugger.appendPerformanceDataToFile("storage/" + Script.name() + "-performance-metrics.csv");
	}
}

try {
	await run();
} catch (err) {
	logger.log(err);
	if (params.writeLogsIfException) {
		logger.writeLogs("storage/" + Script.name() + "-logs.txt")
	}
	throw err;
}
