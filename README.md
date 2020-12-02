# scriptable-widget-interest-map


![A medium-sized widget view of Boston Common.](media/3DFC39F6-962E-4255-9337-DBAD908AAAC6.jpeg?raw=true)

![A medium-sized widget view of Spot Pond.](media/C9BF6F28-93CC-4F8F-A848-58FD1CDB901B.png?raw=true)

## Performance Metrics
Performance metrics are stored in a CSV file and can be read easily using the "Charty" app with this shortcut:

https://www.icloud.com/shortcuts/932366757e124075ae6f755da89563eb

In this graph we noticed that getCurrentLocation with 10 meter accuracy would occasionally take a long time to execute. The other APIs were consistently reasonable.

![A graph depicting getCurrentLocation taking much longer than the other APIs](media/BB6E2934-E843-4F2F-9668-3C4890FA22DD.png?raw=true "getCurrentLocation Latency with 10 meter accuracy")

We modified getCurrentLocation to use 100 meter accuracy and as you can see it's latency dropped considerably and stayed consistent. What's interesting is now we saw our other APIs spike and take a while to execute. Our current theory is that the widget was run from inside a car that was trying to connect to the house's wifi. The bad connection probably caused the spike. It's unlikely that both Wikipedia and Google Maps had issues at the same time.

![A graph depicting getCurrentLocation taking less time consistently after being set to 100 meters. The other APIs have a blip with higher latency but that's believed to be related to internet access.](media/94455C7B-176B-4DA3-8754-A4CDC5AB482A.png?raw=true "getCurrentLocation Latency with 100 meter accuracy in the second half")

After additional testing the spikes have not occurred again. Everything looks normal!

![A graph depicting all APIs with normal latency.](media/B6B02EBA-BCE4-45BC-A7B1-15C5B5363CBF.png?raw=true "APIs are back to normal latency")
