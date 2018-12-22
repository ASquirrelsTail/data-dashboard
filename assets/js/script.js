let map;

function initMap() {
	
}

$(() => {
	$("#loading_status").text(`Loading test-data.csv.`);

	$.get("assets/data/test-data.csv", (data) => {
		$("#loading_status").text(`Parsing data.`);
		let clientData = d3.csv.parse(data);
		let uniquePostcodes = getUniquePostcodes(clientData)
		getLatLngFromPostcodes(uniquePostcodes, clientData, assignLatLngIDs, null);
	});
});

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

function getLatLngFromPostcodes(postcodeList, data, successCallBack, failCallBack) {
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
		console.log(this.readyState, this.status);
		if (this.readyState == 4) {
			if(this.status == 200) {
				let response = JSON.parse(this.responseText);
				console.log(response);
				results = results.concat(response.result);

				$("#loading_status").text(`Checked ${results.length} out of ${noPostcodesToCheck} postcodes.`);

			    if (postcodeList.length > 0) sendNewPostcodesRequest(); //If there are still Postcodes to get data for send another request.
				else {
					successCallBack(results, data); //Otherwise move on to the next task
				}
			}else{
				console.log("Failed to retrieve postcode data.", this.status);
			}
		}
	}

	if (postcodeList.length > 0) sendNewPostcodesRequest();
	else console.log("No postcodes to check!");
}

function assignLatLngIDs(postcodeData, data, callBack) {
	let locationIDs = [];

	postcodeData.forEach((resultData) => {
		data.forEach((item) => {
			if (item.postcode == resultData.query) { //Match original postcodes with queries
				if (resultData.result == null) { //If postcodes.io returned a null reuslt that postcode is invalid, and won't be linked to a location.
					item.postcode = "Invalid Postcode";
					item.locationID = -1;
				}else{
					item.postcode = resultData.result.postcode; //If the query returned a valid postcode, set the postcode in the dataset to that 
					let uniqueIndex = locationIDs.findIndex((location) => (location.postcode == item.postcode)); //Check if that postcode already exists in the list of locations
					if (uniqueIndex < 0) { //If it doesn't, add it in and add its ID to the data
						item.locationID = locationIDs.length;
						locationIDs.push({postcode: resultData.result.postcode, lat: resultData.result.latitude, lng: resultData.result.longitude});
					}else item.locationID = uniqueIndex; //If it does, add its location ID to the data
				}
			}
		});
	});
	console.log("Data prepared: ", locationIDs, data);

	useData(locationIDs, data);
}

function useData(locationIDs, data) {

	let ndx = crossfilter(data);

	let parseDate = d3.time.format("%d/%m/%Y").parse;

	data.forEach((d) => d.date = parseDate(d.date));

	var dateDim = ndx.dimension(dc.pluck("date"));
	var totalSpendPerMonth = dateDim.group().reduceSum(dc.pluck("spend"));

	var minDate = dateDim.bottom(1)[0].date;
	var maxDate = dateDim.top(1)[0].date;

	let chart = dc.lineChart("#line-graph");

	chart.width($("#line-graph").parent().innerWidth())
		.height($("#line-graph").parent().innerHeight())
		.margins({top: 15, right: 15, left: 50, bottom: 50})
		.dimension(dateDim)
		.group(totalSpendPerMonth)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.xAxisLabel("Month")
		.yAxis().ticks(4);

	dc.renderAll();

	$("#loading_status").text(`Loading Google Maps.`);

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

	$("#loading_status").text(`Adding map markers.`);
	locationIDs.forEach((location, i) => {
		location.marker = new google.maps.Marker({position: {lat: location.lat, lng: location.lng}, map: map});
		location.marker.addListener('click', () => {

			
        });
	});

	$(".modal-cover").fadeOut();
}

