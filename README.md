# scriptable-widget-interest-map

A widget built using the iOS app Scriptable. It displays nearby Wikipedia articles and allows you to either read them or get Google Maps directions to them.

<p align="center">
	<img src="media/D43ECEA3-0EF5-494B-A668-9954258A37D5.gif" width="333" height="720"/>
</p>

## Quickstart

1. [Get an API key from Google.](https://developers.google.com/maps/documentation/javascript/get-api-key)
2. Make sure to [enable Billing](https://console.cloud.google.com/project/_/billing/enable) on the Google Cloud Project. [Learn more here](https://developers.google.com/maps/gmp-get-started).
3. [Enable Google Maps Static API for your API key](https://console.developers.google.com/apis/library/static-maps-backend.googleapis.com)
4. [Download the Scriptable App for iOS.](https://scriptable.app/)
5. [Copy and paste widget.js into a new script on the Scriptable app.](https://raw.githubusercontent.com/bring-larry-to-life/scriptable-widget-interest-map/main/widget.js)
6. [Edit the script params section of the script to use your API key:](https://github.com/bring-larry-to-life/scriptable-widget-interest-map/blob/c770af05d7299316b4dd38d7accdeb8d0f2aabf1/widget.js#L13-L16)
```
const scriptParams = {
	apiKey: 'XXX', <--- Put the API key here!
	forceWidgetView: false,
	writeLogsIfException: false,
	logPerformanceMetrics: false
}
```
7. Create a new Scriptable widget on your home screen and edit it to use the script you downloaded.
8. Enjoy!

## Other ways to load parameters

Sometimes storing widget parameters in the script itself is too limiting. For reasons explained below the script will attempt to load parameters in this order:

 1. Parameters passed in from the widget on the home screen.
    * This is great for displaying multiple of the same widget on your home screen. Think different locations, different sizes, etc.
    * This is also great for sharing the script file without risking sharing sensitive information (API key).
 2. JSON file "./storage/scriptname.json".
    * This is great when you are using tools that update the script's file regularly. For example, [this developer tool](https://github.com/stanleyrya/scriptable-script-updater) updates scripts using Github. By storing the parameters in a file you won't have to go into the file and rewrite your parameters each time the file is downloaded/updated again.
    * This is also useful for sensitive information (API key).
 3. Hard-coded parameters at the top of the file.

## Common Problems

### "Error: Cannot parse response to an image."

This is most typically an issue with Google Maps' account settings. If you copy-paste the Google Maps URL to your browser you will likely see this message:

"The Google Maps Platform server rejected your request. You must enable Billing on the Google Cloud Project at https://console.cloud.google.com/project/_/billing/enable Learn more at https://developers.google.com/maps/gmp-get-started"

We'll attempt to add better logs at some point in the future 👍.

## Debugging Tools

There are three useful tools for debugging built-in to this script. They can all be turned on by setting their parameter to true. They are:

1. forceWidgetView: Loads the widget even if run directly from scriptable. Useful for seeing the widget view's logs.
2. writeLogsIfException: Writes the script's logs to a file if there is an exception. Be careful, right now it will overrite the file every time there is an exception.
3. logPerformanceMetrics: Stores function performance metrics each time the script runs. Appends how long each function takes in milliseconds to a CSV if they are wrapped by the performanceWrapper.

### Failure Logs
If turned on, the script will write it's logs to the file system whenever it encounters a failure. The logs of the script are stored in the scriptable folder under `storage/scriptname-logs.txt`.

Please note that the logs will be overwritten each time there is a new failure if this feature is turned on.

[Here's an issue where the failure logs where useful.](https://github.com/bring-larry-to-life/scriptable-widget-interest-map/issues/12)

### Performance Metrics
If turned on, performance metrics are stored in a CSV file. They can be found in the scriptable folder under `storage/scriptname-performance-metrics.csv`.

CSV files could be read directly or visualized in Excel and Google Sheets. They can also be read easily using the [Charty](https://chartyios.app/) app with this shortcut:

https://www.icloud.com/shortcuts/932366757e124075ae6f755da89563eb

<p align="center">
	<img src="media/0F9651FC-E5F9-43FD-A1A5-5FA6B1FF395D.gif" width="333" height="720"/>
</p>

Here's an investigation where the performance logs were useful:

|  Performance Graph   |   Investigation  |
| --- | --- |
| ![A graph depicting getCurrentLocation taking much longer than the other APIs](media/BB6E2934-E843-4F2F-9668-3C4890FA22DD.png?raw=true "getCurrentLocation Latency with 10 meter accuracy") | In this graph we noticed that getCurrentLocation with 10 meter accuracy would occasionally take a long time to execute. This was surprising because other apps seem to get the current location quickly and the latency is inconsistent. |
| ![A graph depicting getCurrentLocation taking less time consistently after being set to 100 meters. The other APIs have a blip with higher latency but that's believed to be related to internet access.](media/94455C7B-176B-4DA3-8754-A4CDC5AB482A.png?raw=true "getCurrentLocation Latency with 100 meter accuracy in the second half") | We modified getCurrentLocation to use 100 meter accuracy and not only did it's latency drop considerably but it stayed consistent. What's interesting is now the other APIs spiked. It's unlikely that both Wikipedia and Google Maps had issues at the same time so we believe the latency spikes were caused by a bug or an issue local to the phone running the script. Our current theory is that the widget was run from inside a car that was trying to connect to a house's wifi causing a bad internet connection. |
| ![A graph depicting all APIs with normal latency.](media/B6B02EBA-BCE4-45BC-A7B1-15C5B5363CBF.png?raw=true "APIs are back to normal latency") | After additional testing the spikes have not occurred again. Everything looks normal! |
