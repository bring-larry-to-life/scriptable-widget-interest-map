// Refresh interval in hours
const refreshInterval = 6

// Build Google Maps API URI given city input
const getMapUrlByCity = (apiKey, city, zoom = '14', size='400x400') => `https://maps.googleapis.com/maps/api/staticmap?center=${city}&zoom=${zoom}&size=${size}&key=${apiKey}`;

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
	let selection = await getMapsPicByCity(apiKey, 'Boston, MA');
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

module.exports = {
    createWidget
}
