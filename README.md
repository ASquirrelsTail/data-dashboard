# Data Dashboard

Stream One Milestone Project: Interactive Frontend Development - Code Institute

This is a data dashboard I have created to allow business owners and marketers to visualise customer spend and their locations using charts and a map. As a demo users can view sample data, or upload their own data to view on the dashboard.

The site can be viewed on [GitHub Pages here](https://asquirrelstail.github.io/data-dashboard/).
 
## UX

### Goals

- Data should be displayed visually using graphs and charts.
- Location information from the data should be displayed on a map.
- The map should be interactive, and allow users to filter the data based on location.
- It should be easy to find the data you need, whether that is a date range or location.
- The dashboard should be easy to use and understand, whether reading the instructions or experimenting.

### Target Audience

The target audience is owners of small to medium businesses, managers and marketers. They will be somewhat tech savvy, and likely to be working from a desktop or laptop computer.

### User Stories

Joan runs a florists, and wants to see if flyering local suburbs generates increased sales in the area immediately afterwards, and if it's worth doing again in future.

Stanley is looking to relocate his business to a larger warehouse, and wants to see where his deliveries are concentrated to help him make the best choice of location.

Beth is the marketing manager for a mail order cosmetics company and wants to see if there are regions where the company is missing out on potential untapped customers.

### Wireframe

Based on the goals and user stories I put together a quick wireframe to show the layout of the graphs and map. Although not primarily aimed at mobile devices the dashboard should be responsive and adjust its layout to fit, even if not all features are included.

![alt text]( https://asquirrelstail.github.io/data-dashboard/pre-prod/wireframe.JPG "Wireframe")

### Visuals

The dashboard should be clean and uncluttered. It should use plain sans-serif fonts on a plain white background. Bright block colours should be used to differentiate data.

It should look functional and appeal to people who have a job to get done.

## Features

### Existing Features

- The dashboard has a responsive layout, adjusting elements to resize events. At larger resolutions it aims to display the entire dashboard without scrolling.
- The dashboard features graphs and pie charts to visualise data.
- The dashboard has an adjustable date range to filter data.
- The dashboard has an interactive map to visualise and filter data by selection.
- As well as selecting from various sample data sets, users can also load their own .csv files to view on the dashboard.

### Features Left to Implement

- Help button which explains how the dashboard can be used.
- A message for users of borwsers lacking ES6 support that they must use a more modern browser.
- A heatmap view would be useful for users to visualise spend on the map itself, but due to the potential scale of data sets is particularly difficult to implement.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- [JQuery v3.3.1](https://jquery.com/)
    - JQuery is used for DOM manipulation, some AJAX functions and general simplification of code.
- [JQuery UI v1.12.1](https://jqueryui.com/) 
	- A custom build of JQuery UI is used to create a datepicker for selecting date ranges
- [dc.js v2.1.8](http://dc-js.github.io/dc.js/)
    - dc.js creates the charts used in the dashboard, it uses [Crossfilter v1.3.12](http://square.github.io/crossfilter/) for sorting and filtering data, and [D3.js v3.15.17](https://d3js.org/) to plot them.
- [Google Maps Javascript API v3.35](https://developers.google.com/maps/documentation/javascript/tutorial)
	- The Google Maps API is used to create a custom map, with interatcive data points marked on. The [MarkerClusterer utility](https://github.com/googlemaps/v3-utility-library/tree/master/markerclusterer) is used to cluster markers for efficiency and usability when a large number of markers is on display.
- [Postcodes.io](https://postcodes.io/)
	- The free, open source Postcodes.io API is used to get location data from postcodes to draw on the map. It was chosen instead of making hundreds of calls to the Google Maps Places API, which could potentially incur large charges, and as the dashboard only requires location coordinate data.
	- Postcodes.io was also used to generate random postcodes, and to find postcodes within a certain radius for the [test data generator](https://asquirrelstail.github.io/data-dashboard/generator.html).
- [Random User Generator](https://randomuser.me/)
	- Randomuser.me was used by the customer data generator to generate random names for customers.
- [Jasmine 3.3.0](https://jasmine.github.io/)
	- Jasmine was used as a testing framework to check functionality and robustness of code.

### Tools

- [GIMP 2.10.8](https://www.gimp.org/)
	- GNU Image Manipulation Program was used to create the images for markers and clusters based on Google's [default marker image](https://developers.google.com/maps/documentation/javascript/custom-markers#customizing_a_map_marker).

## Testing

The site has been tested on a variety of devices, using different browsers and resolutions to ensure compatability and responsiveness.

Automated testing was carried out using Jasmine, these tests can be run [here](https://asquirrelstail.github.io/data-dashboard/testing/). Due to the graphical nature of the dashboard the [test specs](https://github.com/ASquirrelsTail/data-dashboard/tree/master/testing/spec) mainly focus on ensuring user input is correctly validated and handled.

Manual testing was carried out throughout development using a small consistent data set to ensure results (graphs, maps etc.) displayed data correctly for various situations. Larger data sets were used to test how well the dashboard handled large amounts of data.

Specialised data sets for each scenario were used to walk through user stories and ensure the dashboard helped them achieve their aims. These data sets can be selected when the dashboard loads. You can generate your own using the [test data generator](https://asquirrelstail.github.io/data-dashboard/generator.html). More complicated scenarios were made by stitching together multiple generated data sets.

A/B user testing was used to compare map markers and determine which design was easiest to understand. A/B testing was also used to see how marker clicks should react consistently with expectations, for example double clicks, and clicking to add/remove from the selection.

## Deployment

The site has been deployed from the master branch to GitHub Pages [here](https://asquirrelstail.github.io/data-dashboard/).

The Google Maps API key used in this project is restricted to the URL of its GitHub Pages deployment. If you would like to deploy this project elsewhere the API key in index.html should be replaced by one of your own. You can find out how to request an API key [here](https://cloud.google.com/maps-platform/).

## Known Issues

The dashboard does not function in Internet Explorer due to the use of JavaScript ES6 promises, async/await and arrow functions.

Over time some of the postcodes from the test data sets have been removed from use. These are filtered out of the data set, however this results in some data not being displayed as expected (for instance fewer total transactions).

The Google Maps API triggers two click events and a double click event when the map is double clicked, resulting in marker clusters being rapidly selected/deselected when they are double clicked. I tried removing doubleclicks completely and debouncing single clicks, but it made single clicks feel less responsive.

## Credits

### Acknowledgements

The idea of using the marker mouseover/out events to disable regular double click zooming in Google Maps came from [here](https://github.com/google-map-react/google-map-react/issues/319), although it required an additional event listener on bounds_changed to enable double click zooming again, as marker clusters are removed when the zoom level is changed.

Ben Marshall's [guide](https://benmarshall.me/styling-file-inputs/) to styling file inputs was used to bring it in line with other elements on the dashboard.


