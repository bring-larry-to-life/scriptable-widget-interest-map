// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: map;

/*
 * Authors: Ryan Stanley (stanleyrya@gmail.com), Jason Morse (jasonkylemorse@gmail.com)
 * Description: Scriptable code to display Google Maps image widget with nearby points of
 * interest, sourced from Wikipedia. Clicking on the map opens a list of locations with photos,
 * titles, and quick links to Wikipedia and Google Maps directions.
 */

let logs = "";
// Refresh interval in hours
const refreshInterval = 6;

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
const scriptParams = {
	apiKey: 'XXX',
	forceWidgetView: false,
	writeLogsIfException: false,
	logPerformanceMetrics: false
}

const widgetParams = args.widgetParameter ? JSON.parse(args.widgetParameter) : undefined;
const params = widgetParams || loadStoredParameters(Script.name()) || scriptParams;
const { apiKey } = params;

/*******************************
 ****** UTILITY FUNCTIONS ******
 *******************************/

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
const getLocationDescription = async(lat, long) => {
	return Location.reverseGeocode(lat, long).then((res) => {
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

function getFileManager() {
	try {
		return FileManager.iCloud();
	} catch (e) {
		return FileManager.local();
	}
}

function getCurrentDir() {
	const fm = getFileManager();
	const thisScriptPath = module.filename;
	return thisScriptPath.replace(fm.fileName(thisScriptPath, true), '');
}

/**
 * Attempts to load parameters stored in the file ./storage/name.json
 * Returns null if it cannot be loaded.
 */
function loadStoredParameters(name) {
	const fm = getFileManager();
	const storageDir = getCurrentDir() + "storage";
	const parameterPath = storageDir + "/" + name + ".json";

	if (!fm.fileExists(storageDir)) {
		log("Storage folder does not exist!");
		return null;
	} else if (!fm.isDirectory(storageDir)) {
		log("Storage folder exists but is not a directory!");
		return null;
	} else if (!fm.fileExists(parameterPath)) {
		log("Parameter file does not exist!");
		return null;
	} else if (fm.isDirectory(parameterPath)) {
		log("Parameter file is a directory!");
		return null;
	}

	// Doesn't fail with local filesystem
	fm.downloadFileFromiCloud(parameterPath);

	const parameterJSON = JSON.parse(fm.readString(parameterPath));
	if (parameterJSON !== null) {
		return parameterJSON;
	} else {
		log("Could not load parameter file as JSON!");
		return null;
	}
}

/***************************
 **** LOGGING FUNCTIONS ****
 ***************************/

function log(line) {
	if (line instanceof Error) {
		console.error(line);
	} else {
		console.log(line);
	}
	logs += new Date() + " - " + line + "\n";
}

/**
 * Attempts to write logs to the file ./storage/name-logs.txt
 */
function writeLogs(name, logs) {
	const fm = getFileManager();
	const storageDir = getCurrentDir() + "storage";
	const logPath = storageDir + "/" + name + "-logs.txt";

	if (!fm.fileExists(storageDir)) {
		log("Storage folder does not exist! Creating now.");
		fm.createDirectory(storageDir);
	} else if (!fm.isDirectory(storageDir)) {
		throw ("Storage folder exists but is not a directory!");
	}

	if (fm.fileExists(logPath) && fm.isDirectory(logPath)) {
		throw ("Log file is a directory, please delete!");
	}

	fm.writeString(logPath, logs);
}

/*******************************
 **** PERFORMANCE FUNCTIONS ****
 *******************************/

class PerformanceDebugger {

	constructor(storageFileName) {
		this.performanceResultsInMillis = {};
		this.storageFileName = storageFileName;
	}

	/**
	 * Times a function's execution in milliseconds and stores the results in the performanceResultsInMillis object.
	 *
	 * Here are two examples on how to use it, one without parameters and one with:
	 * let currLocation = await performanceWrapper(getCurrentLocation);
	 * let wikiArticles = await performanceWrapper(getNearbyWikiArticles, [currLocation.latitude, currLocation.longitude]);
	 *
	 * Here's an example of what the performanceResultsInMillis would look like after those two function calls:
	 * { "getCurrentLocation": 3200, "getNearbyWikiArticles": 312 }
	 */
	async wrap(fn, args) {
		const start = Date.now();
		const result = await fn.apply(null, args);
		const end = Date.now();
		this.performanceResultsInMillis[fn.name] = (end - start);
		return result;
	}

	/**
	 * Attempts to write the performanceResultsInMillis object to the file ./storage/name-performance-metrics.csv
	 * Returns false if it cannot be written.
	 *
	 * Example output looks like this:
	 * getCurrentLocation, getNearbyWikiArticles
	 * 3200, 312
	 * 450, 300
	 */
	appendPerformanceDataToFile() {
		const fm = getFileManager();
		const storageDir = getCurrentDir() + "storage";
		const metricsPath = storageDir + "/" + this.storageFileName + '-performance-metrics.csv';

		if (!fm.fileExists(storageDir)) {
			log("Storage folder does not exist! Creating now.");
			fm.createDirectory(storageDir);
		} else if (!fm.isDirectory(storageDir)) {
			log("Storage folder exists but is not a directory!");
			return false;
		}

		if (fm.fileExists(metricsPath) && fm.isDirectory(metricsPath)) {
			log("Metrics file is a directory, please delete!");
			return false;
		}

		let headersAvailable = Object.getOwnPropertyNames(this.performanceResultsInMillis);

		let headers;
		let fileData;

		if (fm.fileExists(metricsPath)) {
			log("File exists, reading headers. To keep things easy we're only going to write to these headers.");

			// Doesn't fail with local filesystem
			fm.downloadFileFromiCloud(metricsPath);

			fileData = fm.readString(metricsPath);
			const firstLine = this.getFirstLine(fileData);
			headers = firstLine.split(',');
		} else {
			log("File doesn't exist, using available headers.");
			headers = headersAvailable;
			fileData = headers.toString();
		}

		// Append the data if it exists for the available headers
		fileData = fileData.concat("\n");
		for (const header of headers) {
			if (this.performanceResultsInMillis[header]) {
				fileData = fileData.concat(this.performanceResultsInMillis[header]);
			}
			fileData = fileData.concat(",");
		}
		fileData = fileData.slice(0, -1);

		fm.writeString(metricsPath, fileData);
	}

	getFirstLine(text) {
		var index = text.indexOf("\n");
		if (index === -1) index = undefined;
		return text.substring(0, index);
	}

}

const performanceDebugger = new PerformanceDebugger(Script.name());

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
		log('Request URI');
		log(getMapUrlByCity(apiKey, city));
		const mapPicRequest = new Request(encodeURI(getMapUrlByCity(apiKey, city)));
		const mapPic = await mapPicRequest.loadImage();
		return { image: mapPic, title: city };
	} catch (e) {
		log(e)
		return null;
	}
}

// Returns object containing static Google Maps image response (by specific location & markers)
async function getMapsPicByCurrentLocations(apiKey, latitude, longitude, markers) {
	try {
		const uri = getMapUrlByCoordinates(apiKey, latitude, longitude, markers);
		log('Request URI');
		log(uri);
		const mapPicRequest = new Request(encodeURI(uri));
		return await mapPicRequest.loadImage();
	} catch (e) {
		log(e)
		return null;
	}
}

// Returns Google Maps directions direct link from current location to point of interest
const getDirectionsUrl = (currLocation, destination) => `https://www.google.com/maps/dir/${currLocation.latitude},${currLocation.longitude}/${destination.latitude},${destination.longitude}`;

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
async function getNearbyWikiArticles(lat, lng) {
	try {
		const uri = getWikiUrlByCoords(lat, lng);
		log('Request URI: ' + uri);
		const request = new Request(encodeURI(uri));
		const wikiJSON = await request.loadJSON();
		log('Wiki JSON: ' + JSON.stringify(wikiJSON));

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

		log('Converted Wiki JSON: ' + JSON.stringify(response));
		return response;
	} catch (e) {
		log(e);
		return [];
	}
}

/*****************************************
 ***** SCRIPTABLE & WIDGET FUNCTIONS *****
 *****************************************/

const createTable = (currLocation, map, items) => {
	const table = new UITable();
	const mapRow = new UITableRow();
	const mapCell = mapRow.addImage(map);
	mapCell.widthWeight = 100;
	mapRow.dismissOnSelect = false;
	mapRow.height = 400;
	table.addRow(mapRow);
	let label = 'A';
	items.forEach(item => {
		log('ITEM');
		log(item);
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

async function createWidget() {
	let widget = new ListWidget();
	let currLocation = await performanceDebugger.wrap(getCurrentLocation);
	let wikiArticles = await performanceDebugger.wrap(getNearbyWikiArticles, [currLocation.latitude, currLocation.longitude]);
	// let image = await performanceDebugger.wrap(getMapsPicByCity, [apiKey, 'Boston, MA']);
	let image = await performanceDebugger.wrap(getMapsPicByCurrentLocations, [apiKey, currLocation.latitude, currLocation.longitude, wikiArticles]);
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

	let currentLocationDescription = await getLocationDescription(currLocation.latitude, currLocation.longitude);
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

async function clickWidget() {
	let currLocation = await performanceDebugger.wrap(getCurrentLocation);
	let wikiArticles = await performanceDebugger.wrap(getNearbyWikiArticles, [currLocation.latitude, currLocation.longitude]);
	let image = await performanceDebugger.wrap(getMapsPicByCurrentLocations, [apiKey, currLocation.latitude, currLocation.longitude, wikiArticles]);
	const table = createTable(currLocation, image, wikiArticles);
	await QuickLook.present(table);
}

async function run() {
	if (params) {
		log("Using params: " + JSON.stringify(params));
	} else {
		log("No valid parameters!");
		return;
	}

	if (!params.apiKey || params.apiKey === 'XXX') {
		log("You must provide an API Key from Google to use this script.");
		return;
	}

	if (config.runsInWidget) {
		const widget = await createWidget();
		Script.setWidget(widget);
		Script.complete();

	} else if (params.forceWidgetView) {
		// Useful for loading widget and seeing logs manually
		const widget = await createWidget();
		await widget.presentMedium();

	} else {
		await clickWidget();
	}

	if (params.logPerformanceMetrics) {
		performanceDebugger.appendPerformanceDataToFile();
	}
}

try {
	await run();
} catch (err) {
	log(err);
	if (params.writeLogsIfException) {
		writeLogs(Script.name(), logs)
	}
	throw err;
}
