/*
 * Authors: Ryan Stanley (stanleyrya@gmail.com), Jason Morse (jasonkylemorse@gmail.com)
 * Description: Scriptable code to display Google Maps image widget with nearby points of 
 * interest, sourced from Wikipedia. Clicking on the map opens a list of locations with photos,
 * titles, and quick links to Wikipedia and Google Maps directions. 
 */


// Use true to load widget from scriptable (as opposed to the list view).
// Can also be set in the widget parameters object.
const debug = false;

const scriptParams = null //{
//     apiKey: 'XXX',
//     debug: false
// }

const params = JSON.parse(args.widgetParameter) || loadStoredParameters(Script.name()) || scriptParams;

// Refresh interval in hours
const refreshInterval = 6

const performanceResultsInMillis = {};

/*******************************
 ****** UTILITY FUNCTIONS ******
 *******************************/

function getCurrentDir() {
    const fm = FileManager.local();
    const thisScriptPath = module.filename;
    return thisScriptPath.replace(fm.fileName(thisScriptPath, true), '');
}

/**
 * Attempts to load the file ./storage/name.json
 * Returns null if it cannot be loaded.
 */
function loadStoredParameters(name) {
    let fm;
    try {
        fm = FileManager.iCloud();
    } catch(e) {
        fm = FileManager.local();
    }

    const storageDir = getCurrentDir() + "storage";
    const parameterPath = storageDir + "/" + name + ".json";

    if (!fm.fileExists(storageDir)) {
        console.log("Storage folder does not exist!");
        return null;
    } else if (!fm.isDirectory(storageDir)) {
        console.log("Storage folder exists but is not a directory!");
        return null;
    } else if (!fm.fileExists(parameterPath)) {
        console.log("Parameter file does not exist!");
        return null;
    } else if (fm.isDirectory(parameterPath)) {
        console.log("Parameter file is a directory!");
        return null;
    }

    // Doesn't fail with local filesystem
    fm.downloadFileFromiCloud(parameterPath);

    const parameterJSON = JSON.parse(fm.readString(parameterPath));
    if (parameterJSON !== null) {
        return parameterJSON;
    } else {
        console.log("Could not load parameter file as JSON!");
        return null;
    }
}

const performanceWrapper = async (fn, args) => {
	const start = Date.now();
	const result = await fn.apply(null, args);
	const end = Date.now();
	performanceResultsInMillis[fn.name] = (end - start);
	return result;
 }

/**
 * Attempts to write the file ./storage/name-performance-metrics.csv
 * Returns false if it cannot be written.
 */
function appendPerformanceDataToFile(name, performanceMetrics) {
    let fm;
    try {
        fm = FileManager.iCloud();
    } catch(e) {
        fm = FileManager.local();
    }

    const storageDir = getCurrentDir() + "storage";
    const metricsPath = storageDir + "/" + name + '-performance-metrics.csv';

    if (!fm.fileExists(storageDir)) {
        console.log("Storage folder does not exist! Creating now.");
        fm.createDirectory(storageDir);
    } else if (!fm.isDirectory(storageDir)) {
        console.error("Storage folder exists but is not a directory!");
        return false;
    }

    if (fm.fileExists(metricsPath) && fm.isDirectory(metricsPath)) {
        console.error("Metrics file is a directory, please delete!");
        return false;
    }

    let headersAvailable = Object.getOwnPropertyNames(performanceMetrics);

    let headers;
    let fileData;

    if (fm.fileExists(metricsPath)) {
        console.log("File exists, reading headers. To keep things easy we're only going to write to these headers.");

         // Doesn't fail with local filesystem
        fm.downloadFileFromiCloud(metricsPath);

        fileData = fm.readString(metricsPath);
        const firstLine = getFirstLine(fileData);
        headers = firstLine.split(',');
    } else {
        console.log("File doesn't exist, using available headers.");
        headers = headersAvailable;
        fileData = headers.toString();
    }

    // Append the data if it exists for the available headers
    fileData = fileData.concat("\n");
    for (const header of headers) {
        if (performanceMetrics[header]) {
            fileData = fileData.concat(performanceMetrics[header]);
        }
        fileData = fileData.concat(",");
    }
    fileData = fileData.slice(0, -1);

    fm.writeString(metricsPath, fileData);
}

function getFirstLine(text) {
    var index = text.indexOf("\n");
    if (index === -1) index = undefined;
    return text.substring(0, index);
}

// Get user's current latitude and longitude
const getCurrentLocation = async () => {
	await Location.setAccuracyToHundredMeters();
	return Location.current().then((res) => { 
		return {
			'latitude': res.latitude, 
			'longitude': res.longitude 
		};
	}, err => console.error(`Could not get current location: ${err}`));
};

// Given coordinates, return a description of the current location in words (town name, etc.).
// Object returned has two properties:
// {
//   "areaOfInterest": "Spot Pond - Middlesex Fells Reservation",
//   "generalArea": "Medford, MA"
// }
// 
// More information here: https://github.com/stanleyrya/scriptable-playground/blob/main/reverse-geocode-tests.js
const getLocationDescription = async (lat, long) => {
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
	}, err => console.log(`Could not reverse geocode location: ${err}`));
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

// Returns object containing static Google Maps image response (by city) and widget title
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

// Returns object containing static Google Maps image response (by specific location & markers)
 async function getMapsPicByCurrentLocations(apiKey, latitude, longitude, markers) {
	try {
		const uri = getMapUrlByCoordinates(apiKey, latitude, longitude, markers);
		console.log('Request URI');
		console.log(uri);
		const mapPicRequest = new Request(encodeURI(uri));
		return await mapPicRequest.loadImage();
	} catch(e) {
		console.error(e)
		return null;
	}
}

// Returns Google Maps directions direct link from current location to point of interest
const getDirectionsUrl = (currLocation, destination) => {
	return `https://www.google.com/maps/dir/${currLocation.latitude},${currLocation.longitude}/${destination.latitude},${destination.longitude}`;
}

// Returns Google Maps direct link for point of interest
const getCoordsUrl = (destination) => {
    return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
}

/*******************************
 ***** WIKIPEDIA FUNCTIONS *****
 *******************************/

const getWikiUrlByPageId = (pageId) => `https://en.wikipedia.org/?curid=${pageId}`;
const getWikiUrlByCoords = (lat, lng) => `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates|pageimages&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000`

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
		console.log('ITEM');
		console.log(item);
		const row = new UITableRow();
		const markerUrl = `http://maps.google.com/mapfiles/kml/paddle/${label}.png`
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

/*
 * Returns an instance of ListWidget that contains the contents of this widget.
 * The widget returned consists of a background image, a greyscaled gradient and
 * the image title in the slightly darker part of the grandient in the lower 
 * left corner of the widget.
 */
async function createWidget(params)
{
	const { apiKey } = params;
	let widget = new ListWidget();
	let currLocation = await performanceWrapper(getCurrentLocation);
// TODO: if cant load location fail
	let wikiArticles = await performanceWrapper(getNearbyWikiArticles, [currLocation.latitude, currLocation.longitude]);
	// let image = await performanceWrapper(getMapsPicByCity, [apiKey, 'Boston, MA']);
	let image = await performanceWrapper(getMapsPicByCurrentLocations, [apiKey, currLocation.latitude, currLocation.longitude, wikiArticles]);
	widget.backgroundImage = image;

    let startColor = new Color("#1c1c1c00")
	let endColor = new Color("#1c1c1cb4")
	let gradient = new LinearGradient()
	gradient.colors = [startColor, endColor]
	gradient.locations = [0.25, 1]
	widget.backgroundGradient = gradient
	widget.backgroundColor = new Color("1c1c1c")

    let textStack = widget.addStack();
    textStack.layoutHorizontally();
    textStack.bottomAlignContent();

    let titleStack = textStack.addStack();
    titleStack.layoutVertically();
    titleStack.bottomAlignContent();
    titleStack.addSpacer()
    
    textStack.addSpacer()

    let additionalInfoStack = textStack.addStack();
    additionalInfoStack.layoutVertically();
    additionalInfoStack.bottomAlignContent();
    additionalInfoStack.addSpacer()

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

	let interval = 1000 * 60 * 60 * refreshInterval
	widget.refreshAfterDate = new Date(Date.now() + interval)
	
	return widget
}

async function clickWidget(params) {
    const { apiKey } = params;
    let currLocation = await performanceWrapper(getCurrentLocation);
    if (!currLocation) {
        // There's a weird error where current location can't be retrieved and it fails.
        // Until we write a way to store the failure in a file, let's at least try again.
        currLocation = await performanceWrapper(getCurrentLocation);
    }
    let wikiArticles = await performanceWrapper(getNearbyWikiArticles, [currLocation.latitude, currLocation.longitude]);
    let image = await performanceWrapper(getMapsPicByCurrentLocations, [apiKey, currLocation.latitude, currLocation.longitude, wikiArticles]);
    const table = createTable(currLocation, image, wikiArticles);
    await QuickLook.present(table);
}


async function run(params) {
	if (config.runsInWidget) {
	    const widget = await createWidget(params)
	    Script.setWidget(widget)
	    Script.complete()

	// Useful for loading widget and seeing logs manually
	} else if (debug || params.debug) {
	    const widget = await createWidget(params)
	    await widget.presentMedium()

	} else {
	    await clickWidget(params)
	}
    appendPerformanceDataToFile(Script.name(), performanceResultsInMillis);
}

if (params) {
    console.log("Using params: " + JSON.stringify(params))
	await run(params);
} else {
    console.log("No valid parameters!")
}
