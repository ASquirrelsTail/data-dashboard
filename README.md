# Data Dashboard

Stream One Milestone Project: Interactive Frontend Development - Code Institute

This is a data dashboard I have created to allow business owners and marketers to visualise customer spend and their locations using charts and a map. As a demo users can view sample data, or upload their own data to view on the dashboard.

The dashboard reads data from a .csv file, gets latitude and longditude information for transactions from the customers postcode using the [Postcodes.io](https://postcodes.io/) API and plots them onto a map using [Google Maps](https://developers.google.com/maps/documentation/javascript/tutorial). The transaction data is displayed on a series of charts using [dc.js](http://dc-js.github.io/dc.js/), which can be filtered by interacting with the map.

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

![alt text](https://asquirrelstail.github.io/data-dashboard/preprod/wireframe.JPG "Wireframe")

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

- A heatmap view would be useful for users to visualise spend on the map itself, but due to the potential scale of data sets is particularly difficult to implement.

### Data Generator

To help with the generation of test data for the dashboard a basic random data generator was developed using the [Random User Generator](https://randomuser.me/) API to choose names, and [Postcodes.io](https://postcodes.io/) APIs random postcode generator and reverse geocoding.

Although not part of the actual dashboard it can be found on [Github Pages here](https://asquirrelstail.github.io/data-dashboard/generator.html).

It can be used to create a .csv file to upload to the dashboard by copying the results to a text editor and saving in .csv format.

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
	- The free, open source Postcodes.io API is used to get location data from postcodes to draw on the map. It was chosen instead of making hundreds of calls to the Google Maps Places API, which could potentially incur charges, and as the dashboard only requires location coordinate data.
	- Postcodes.io was also used to generate random postcodes, and to find postcodes within a certain radius for the [test data generator](https://asquirrelstail.github.io/data-dashboard/generator.html).
- [Modernizr](https://modernizr.com/)
	- Modernizr is used to inform users of older browsers that they need to update/upgrade in order to use the dashboard.
- [Random User Generator](https://randomuser.me/)
	- Randomuser.me was used by the customer data generator to generate random names for customers.
- [Jasmine 3.3.0](https://jasmine.github.io/)
	- Jasmine was used as a testing framework to check functionality and robustness of code.

### Tools

- [Sublime Text 3.2.1](https://www.sublimetext.com/)
	- Sublime text was used to write the code for the dashboard.
	- [Emmet](https://emmet.io/) package was used to speed up davelopment.
	- [HTML-CSS-JS Prettify](https://packagecontrol.io/packages/HTML-CSS-JS%20Prettify) package was used to prettify code layout.
- [WAMP](http://www.wampserver.com/en/)
	- WAMP Server was used as a local test server during development.
- [GIMP 2.10.8](https://www.gimp.org/)
	- GNU Image Manipulation Program was used to create the images for markers and clusters based on Google's [default marker image](https://developers.google.com/maps/documentation/javascript/custom-markers#customizing_a_map_marker).
- [Inkscape](https://inkscape.org/)
	- Inkscape was used to create the icons for the site menu.

## Testing

The site has been tested on a variety of devices, using different browsers and resolutions to ensure compatability and responsiveness.

Code was validated using the W3C online validators for [HTML](https://validator.w3.org/) and [CSS](http://jigsaw.w3.org/css-validator/). Javascript was checked using [JSLint](https://www.jslint.com/).

Manual testing was carried out throughout development using a small consistent data set to ensure results (graphs, maps etc.) displayed data correctly for various situations. Larger data sets were used to test how well the dashboard handled large amounts of data.

Specialised data sets for each scenario were used to walk through user stories and ensure the dashboard helped them achieve their aims. These data sets can be selected when the dashboard loads. You can generate your own using the [test data generator](https://asquirrelstail.github.io/data-dashboard/generator.html). More complicated scenarios were made by stitching together multiple groups of generated data.

A/B user testing was used to compare map markers and determine which design was easiest to understand. A/B testing was also used to determine how marker clicks should react consistently with expectations, for example double clicks, and clicking to add/remove from the selection.

## Deployment

The site has been deployed from the master branch to GitHub Pages [here](https://asquirrelstail.github.io/data-dashboard/).

To achieve this the latest commit was pushed to the GitHub repository for the project, then in the repository settings on the GitHub site the GitHub Pages source was set to the master branch.

The Google Maps API key used in this project is restricted to the URL of its GitHub Pages deployment. If you would like to deploy this project elsewhere the API key in index.html should be replaced by one of your own. You can find out how to request an API key [here](https://cloud.google.com/maps-platform/).

The development version of the dashboard used a different Google Maps API key, this key was stored in a seperate script file and hidden by adding its filename to the .gitignore file in the root of the repository.

## Known Issues

Randomly generating convincing test data is difficult, I've done my best to generate something that shows the capabilities of the dashboard however it is overall too uniform.

The dashboard does not function in Internet Explorer due to the use of JavaScript ES6 promises, async/await and arrow functions. Modernizr is used to show IE users (or anyone with an older browser) a notice informing them and suggesting they use a more modern browser.

Some additional functionality is lacking on touch devices due to the lack of hover states to show additional information, however this doesn't impact how the dashboard works.

Over time some of the postcodes from the test data sets are occasionally removed from use. These are filtered out of the data set, however this results in some data not being displayed as expected (for instance fewer total transactions than the data file contains).

The Google Maps API triggers two click events and a double click event when the map is double clicked, resulting in marker clusters being rapidly selected/deselected when they are double clicked. This issue has been circumvented by only listening for single clicks and waiting to see if a second click occurs before performing the required action. The downside is single cluster clicks have a quarter second delay on them and feel less responsive as a result.

Filtering the dates to begin or end on a day where no transactions occur causes a graphical glitch. This is a known issue with dc.js, and the [workaround detailed here](https://github.com/dc-js/dc.js/issues/949) partially fixes the issue, but can still cause it to appear as if transactions occured on days when none actually did. This generally only affects smaller data sets.

## Credits

### Acknowledgements

This [tutorial](https://www.tutorialspoint.com/dcjs/index.htm) on Tutorials Point was very useful in understanding many of teh features of dc.js.

The idea of using the marker mouseover/out events to disable regular double click zooming in Google Maps came from [here](https://github.com/google-map-react/google-map-react/issues/319).

Ben Marshall's [guide](https://benmarshall.me/styling-file-inputs/) to styling file inputs was used to bring it in line with other elements on the dashboard.


