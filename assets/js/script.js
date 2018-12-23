

$(() => {
	$("#loading_status").text("Loading test-data.csv.");

	let clientData;

	$.get("assets/data/test-data.csv")
		.then( (data) => {
			$("#loading_status").text("Parsing data.");
			clientData = d3.csv.parse(data)
			return clientData;
		})
		.then(getUniquePostcodes)
		.then(getLatLngFromPostcodes)
		.then((postcodeData) => {
			return assignLatLngIDs(postcodeData, clientData);
		})
		.then((results) => {
			return initDashboard(results[0], results[1]);
		});	

// let uniquePostcodes = getUniquePostcodes(clientData)
// 		getLatLngFromPostcodes(uniquePostcodes, clientData, assignLatLngIDs, null);
});

function initDashboard(data, locationIDs) {

	function resizeCharts() {
		let deviceWidth = $(window).innerWidth();
		let chartWidth = $("#line-graph").parent().innerWidth();
		chart.width(chartWidth);

		let pieSize = $("#spend-pie").parent().width() * 0.7;

		if (deviceWidth >= 768) {
			chart.height(Math.min(chartWidth * 0.3, 300))
				.xAxis().ticks(12);
			if (deviceWidth >= 992) {
				pieSize = $("#map").height() / 2.5;
			}else pieSize = $("#spend-pie").parent().width() * 0.4;
		}else{
			chart.height(chartWidth * 0.5)
				.xAxis().ticks(6);
		}

		spendPie.height(pieSize).width(pieSize);
		transactionPie.height(pieSize).width(pieSize);

		dc.renderAll();
	}

	$("#loading_status").text("Loading Google Maps."); //Init Google Maps

	let map = new google.maps.Map(document.getElementById("map"), {
      	zoom: 6,
       	center: {
           	lat: 52.483333, 
           	lng: -1.9
       	},
  		mapTypeControl: false,
  		scaleControl: false,
  		streetViewControl: false,
  		rotateControl: false,
  		fullscreenControl: false
    });

    $("#loading_status").text("Preparing charts."); //Set up charts

	let chart = dc.lineChart("#line-graph");

	let spendPie = dc.pieChart("#spend-pie");
	let transactionPie = dc.pieChart("#transaction-pie");

	let ndx = crossfilter(data);

	let parseDate = d3.time.format("%d/%m/%y").parse;

	data.forEach((d) => {
		d.date = parseDate(d.date);
		d.spend = parseInt(d.spend);
	});

	//Plot line chart of spend against time

	let dateDim = ndx.dimension(dc.pluck("date"));

	let totalSpend = dateDim.group().reduceSum(dc.pluck("spend"));

	let minDate = dateDim.bottom(1)[0].date;
	let maxDate = dateDim.top(1)[0].date;

	chart.margins({top: 15, right: 50, left: 50, bottom: 50})
		.brushOn(false)
		//.elasticX(true)
		.dimension(dateDim)
		.group(totalSpend)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.xAxisLabel("Month")
		.yAxis().ticks(4);

	//Create 2 pie charts to show proportion of spend and transactions attributed to the current selection
	//All values are currently selected, so group them all under "Selection"

	let selectionDim = ndx.dimension((d) => {
		if(locationIDs[d.locationID].active) return "Selection";
	});

	let spendGroup = selectionDim.group().reduceSum(dc.pluck("spend"));
	let transactionGroup = selectionDim.group().reduceCount(dc.pluck("spend"));

	spendPie.dimension(selectionDim)
		.group(spendGroup);

	transactionPie.dimension(selectionDim)
		.group(transactionGroup);

	$("#loading_status").text("Drawing charts.");

    resizeCharts();

    $("#loading_status").text("Adding map markers.");
	locationIDs.forEach((location, i) => {
		location.marker = new google.maps.Marker({position: {lat: location.lat, lng: location.lng}, map: map});
		location.active = true;
		location.marker.addListener('click', () => {

			if (!location.active) {
				location.active = true;
			}else{
				
				if (locationIDs.every((item) => item.active)) {
					locationIDs.forEach((item) => item.active = false);
					location.active = true;
				}else if (locationIDs.every((item) => !item.active || item == location)) locationIDs.forEach((item) => item.active = true);
				else location.active = false;
			}

			locationIDs.forEach((location) => {
        		if (location.active) location.marker.setOptions({'opacity': 1});
        		else location.marker.setOptions({'opacity': 0.5});
        	});

			let spendAtID = chart.dimension().group().reduce(
			(p, v) => {
				if (locationIDs[v.locationID].active) p.total += parseInt(v.spend);
				return p;
			}, (p, v) => {
				if (locationIDs[v.locationID].active) p.total -= parseInt(v.spend);
				return p;
			}, () => {
				return {total: 0}
			});
        	
        	chart.group(spendAtID)
        	.valueAccessor((d) => parseInt(d.value.total))
        	
        	//filterDim.filter(null);
        	//filterDim.filter((d) => locationIDs[d].active);
   			chart.redraw();

   			selectionDim.dispose();

   			selectionDim = ndx.dimension((d) => {
				if(locationIDs[d.locationID] && locationIDs[d.locationID].active) return "Selection";
				else return "";
			});
   			spendGroup = selectionDim.group().reduceSum(dc.pluck("spend"));

   			spendPie.dimension(selectionDim)
   				.group(spendGroup);
   			spendPie.redraw();

   			transactionGroup = selectionDim.group().reduceCount(dc.pluck("spend"));

   			transactionPie.dimension(selectionDim)
   				.group(transactionGroup);
   			transactionPie.redraw();	
        });
	});

	//Create listener to redraw charts onResize, debounce to 0.5s to avoid calling thousands of redraws

	let debounce = false;

	$(window).on("resize", () => {
		if (!debounce) {
			debounce = true;
			setTimeout(() => {
				debounce = false;

				chart.transitionDuration(0);
				spendPie.transitionDuration(0);
				transactionPie.transitionDuration(0);

				resizeCharts();

				chart.transitionDuration(500);
				spendPie.transitionDuration(500);
				transactionPie.transitionDuration(500);
			}, 500);
		}
	});

	$(".modal-cover").fadeOut();

}

//Returns an array of unique postcodes from the data set
function getUniquePostcodes(data) {
	let postcodes = [];

	if (data) data.forEach((item) => {
		if (item.postcode) {
			item.postcode = item.postcode.trim().toUpperCase();
			if (!postcodes.includes(item.postcode)) postcodes.push(item.postcode);
		}
	});

	return postcodes;
}

//Returns a list of verified postcodes and latitudes and longitudes from postcodes.io api
function getLatLngFromPostcodes(postcodeList) {
	return new Promise((resolve, reject) => {
		let results = [];
		let noPostcodesToCheck = postcodeList.length;

		function sendNewPostcodesRequest() {
			let postcodes = postcodeList.splice(0, 100); //Postcodes.io only takes bulk requests in blocks of 100 postcodes

			let xhr = new XMLHttpRequest();

			xhr.open("POST", "https://api.postcodes.io/postcodes?filter=postcode,longitude,latitude", true); //Filter by postcodes, lat and lng as these are the only things we need
			xhr.setRequestHeader("Content-Type", "application/json");

			xhr.onreadystatechange = processRequestResult;
				
			xhr.send(JSON.stringify({postcodes})); //The bulk postcode lookup requires a json object containing an array called postcodes
		}

		function processRequestResult() {
			//console.log(this.readyState, this.status);
			if (this.readyState == 4) {
				if(this.status == 200) {
					let response = JSON.parse(this.responseText);
					//console.log(response);
					results = results.concat(response.result);

					$("#loading_status").text(`Checked ${results.length} out of ${noPostcodesToCheck} postcodes.`);

				    if (postcodeList.length > 0) sendNewPostcodesRequest(); //If there are still Postcodes to get data for send another request.
					else {
						resolve(results); //Otherwise move on to the next task
					}
				}else{
					reject("Failed to retrieve postcode data. HTTP status: " + this.status);
				}
			}
		}

		if (postcodeList.length > 0) sendNewPostcodesRequest();
		else reject("No postcodes to check!");
	});	
}

//Removes duplicate values and returns a list of unique locations containing postcode, latitude and longitude
//Assigns verified postcodes to dataset, along with the ID of the corresponding location
function assignLatLngIDs(postcodeData, data) {
	let locationIDs = [];

	$("#loading_status").text("Assigning location IDs");

	postcodeData.forEach((resultData) => {
		data.forEach((item) => {
			if (item.postcode == resultData.query) { //Match original postcodes with queries
				if (resultData.result == null) { //If postcodes.io returned a null result that postcode is invalid, and won't be linked to a location.
					item.postcode = "Invalid Postcode";
					item.locationID = -1;
				}else{
					item.postcode = resultData.result.postcode; //If the query returned a valid postcode, set the postcode in the dataset to that 
					let uniqueIndex = locationIDs.findIndex((location) => (location.postcode == item.postcode)); //Check if that postcode already exists in the list of locations
					if (uniqueIndex < 0) { //If it doesn't, add it in and add its ID to the data
						item.locationID = locationIDs.length;
						locationIDs.push({postcode: resultData.result.postcode, lat: resultData.result.latitude, lng: resultData.result.longitude, active: true});
					}else item.locationID = uniqueIndex; //If it does, add its location ID to the data
				}
			}
		});
	});
	console.log("Data prepared: ", locationIDs, data);

	return [data, locationIDs];
}