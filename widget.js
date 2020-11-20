// Refresh interval in hours
const refreshInterval = 6
// Imagesize suffix. Find a list of valid suffixes: https://www.flickr.com/services/api/misc.urls.html
const sizeIndicator = 'b'

// URL prototype to use for loading a list of photos from the photoset with given ID
const getPhotosUrl = (apiKey, userId, photosetId) => `https://www.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${apiKey}&photoset_id=${photosetId}&user_id=${userId}&format=json&nojsoncallback=1`
// URL prototype to use for loading the list of available photosets
const getPhotosetsUrl = (apiKey, userId) => `https://www.flickr.com/services/rest/?method=flickr.photosets.getList&api_key=${apiKey}&user_id=${userId}&format=json&nojsoncallback=1`
// URL prototype to use for loading the image
const imgUrlPrototype = (server, id, secret, size) => `https://live.staticflickr.com/${server}/${id}_${secret}_${size}.jpg`


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
	const {apiKey, userId} = params;
	let widget = new ListWidget()
	let selection = await getRandomPic(apiKey, userId)
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
 * Get a random image. Images inside of the JSON file are addressed in the 
 * following way:
 * 
 * server: 7372
 * id: 12502775644
 * secret: acfd415fa7
 */
async function getRandomPic(apiKey, userId)
{
	try
	{
		const photosetId = await getPhotosetId(apiKey, userId)
		if(photosetId)
		{
			let data = await new Request(getPhotosUrl(apiKey, userId, photosetId)).loadJSON()
			let photos = data.photoset.photo
			let num = Math.floor((Math.random() * (photos.length - 1)));
			let pic = photos[num]
			let imgUrl = buildImgUrl(pic['server'], pic['id'], pic['secret'])
			console.log(`Loading img ${imgUrl}`)
			let imgRequest = new Request(imgUrl)
			let img = await imgRequest.loadImage()
			return {image: img, title: pic['title']}
		}
	}
	catch (e)
	{
		console.error(e)
		return null
	}
}

/*
 * Gets the complete image URL by inserting values into the placeholders of
 * the defined image URL prototype.
 */
function buildImgUrl(server, id, secret)
{
	return imgUrlPrototype(server, id, secret, sizeIndicator)
}

/*
 * Get random photosetId from available photosets
 */
async function getPhotosetId(apiKey, userId)
{
	try
	{
		let data = await new Request(getPhotosetsUrl(apiKey, userId)).loadJSON()
		let photosets = data.photosets.photoset
		let num = Math.floor((Math.random() * (photosets.length - 1)));
		let set = photosets[num]
		let photosetId = set['id']
		console.log(`Chosen photosetId: ${photosetId}`)
		return photosetId
	}
	catch (e)
	{
		console.error(e)
		return null
	}
}

module.exports = {
    createWidget
}
