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
});


function initDashboard(data, locationIDs) {

	//Resize charts based on current device width and other elements
	function resizeCharts() {
		let deviceWidth = $(window).innerWidth();
		let chartWidth = $("#line-graph").parent().innerWidth();
		chart.width(chartWidth);

		let pieSize = $("#spend-pie").parent().parent().width() * 0.7;

		if (deviceWidth >= 768) {
			chart.height(Math.min(chartWidth * 0.3, 300));
			if (deviceWidth >= 992) {
				chart.xAxis().ticks(12);
				pieSize = $("#map").height() / 2.5;
			}else{
				chart.xAxis().ticks(8);
				pieSize = $("#spend-pie").parent().parent().width() * 0.4;
			}
		}else{
			chart.height(chartWidth * 0.5)
				.xAxis().ticks(6);
		}

		spendPie.height(pieSize).width(pieSize).innerRadius(pieSize * 0.25).externalLabels(-pieSize / 2);
		transactionPie.height(pieSize).width(pieSize).innerRadius(pieSize * 0.25).externalLabels(-pieSize / 2);

		dc.renderAll();
	}

	//Filter and update the data in the charts to reflect current map selection
	function filterByActiveMarkers(init) {
	   	//Can't use dimension filters, as they filter the results from the pie charts as well, so they always show 100%
		//filterDim.filter(null);
       	//filterDim.filter((d) => markers[d].active);

      	//Filtering results using a custom acumulator instead.
      	let selectionChart = chart.children()[1];

      	if (!init) { //If not initial setup, dispose of groups and dims that are to be replaced 
      		selectionChart.dimension().group().dispose();
      		selectionDim.dispose();
      		spendAtID.dispose();
      		spendGroup.dispose();
			spendTotal.dispose();
			transactionGroup.dispose();
   			transactionTotal.dispose();
   			nameDim.dispose();
   			topSpendersGroup.dispose();
      	}

		spendAtID = selectionChart.dimension().group().reduce(
		(p, v) => {
			if (markers[v.locationID] && markers[v.locationID].active && markers[v.locationID].getVisible()) p.total += v.spend;
			return p;
		}, (p, v) => {
			if (markers[v.locationID] && markers[v.locationID].active && markers[v.locationID].getVisible()) p.total -= v.spend;
			return p;
		}, () => {
			return {total: 0}
		});
       		
       	selectionChart.group(spendAtID)
       		.valueAccessor((d) => d.value.total);

   		selectionDim = ndx.dimension((d) => {
			if(markers[d.locationID] && markers[d.locationID].active && markers[d.locationID].getVisible()) return "Selection";
			else return "";
		});

   		spendGroup = selectionDim.group().reduceSum(dc.pluck("spend"));
   		spendGroupCleaned = {
   			all: () => {
   				let cleanGroup = spendGroup.all();
   				if (!cleanGroup.find((item) => item.key == "")) cleanGroup.push({key: "", value: 0});
   				return cleanGroup; //Fake group to fix graphical clitch from empty group after filtering dates
   			}
   		}
   		spendTotal = selectionDim.groupAll().reduceSum(dc.pluck("spend"));

   		spendPie.dimension(selectionDim)
   			.group(spendGroupCleaned);


   		transactionGroup = selectionDim.group().reduceCount(dc.pluck("spend"));
   		transactionGroupCleaned = {
   			all: () => {
   				let cleanGroup = transactionGroup.all();
   				if (!cleanGroup.find((item) => item.key == "")) cleanGroup.push({key: "", value: 0});
   				return cleanGroup; //Fake group to fix graphical clitch from empty group after filtering dates
   			}
   		}
   		transactionTotal = selectionDim.groupAll().reduceCount(dc.pluck("spend"));

   		transactionPie.dimension(selectionDim)
   			.group(transactionGroupCleaned);

   		nameDim = ndx.dimension((d) => {
			if(markers[d.locationID] && markers[d.locationID].active && markers[d.locationID].getVisible() && d.spend > 0) return d.name;
			else return "!EXCLUDE!";
		});

		topSpendersGroup = nameDim.group().reduceSum(dc.pluck("spend"));

		if(!init) {
			chart.redraw();
			spendPie.redraw();
			transactionPie.redraw();
		}

   		showTopSpenders();
	}

	function showTopSpenders() {
		let topSpenders = topSpendersGroup.top(4);
		topSpenders = topSpenders.filter((item) => item.key != "!EXCLUDE!");
		if (topSpenders.length > 3) topSpenders.pop();

		let theRest = topSpendersGroup.size() - topSpenders.length;
		if (topSpendersGroup.all().find((item) => item.key == "!EXCLUDE!")) theRest -= 1;

		let topSpendersDiv = $("#top-spenders").text("Selection: ");

		// let html = "";
		if (topSpenders[0] && topSpenders[0].value > 0) topSpendersDiv.append($("<span>").attr("title", `£${topSpenders[0].value}`).text(topSpenders[0].key));
		if (topSpenders[1] && topSpenders[1].value > 0) {
			if (topSpenders.length > 2) topSpendersDiv.append(document.createTextNode(", "));
			else topSpendersDiv.append(document.createTextNode(" and "));
			topSpendersDiv.append($("<span>").attr("title", `£${topSpenders[1].value}`).text(topSpenders[1].key));
		}
		if (topSpenders[2] && topSpenders[2].value > 0) {
			if (theRest > 0) topSpendersDiv.append(document.createTextNode(", "));
			else topSpendersDiv.append(document.createTextNode(" and "));
			topSpendersDiv.append($("<span>").attr("title", `£${topSpenders[2].value}`).text(topSpenders[2].key));
			if (theRest > 0) {
				let plural = "";
				if (theRest > 1) plural = "s";
				topSpendersDiv.append(document.createTextNode(` and ${theRest} other${plural}`));
			}
		}

		$("#total-spend").html(`<span title="£${spendTotal.value()}">Total</span>`);

		if (markers.find((item) => !item.active)) $("#clear-selection").fadeIn(300);
		else $("#clear-selection").fadeOut(300);
	}

	//Update cluster marker appearance based on whether the markers it contains are part of the active selection or not
	function redrawCluster(cluster) {
		totalCount = cluster.getMarkers().length;
		activeCount = cluster.getMarkers().filter((item) => item.active).length;
		backgroundImage = "cluster-active";

		if (activeCount == 0) backgroundImage = "cluster-inactive";
		else if (activeCount == 1) backgroundImage += "1";
		else if (activeCount < totalCount) backgroundImage += "2";

		$(cluster.clusterIcon_.div_).css({"background-image": `url("${iconPath}${backgroundImage}.png")`, transform: "translateY(-24px)"});
	}

	//Update individual marker appearance based on whether they are part of the active selection or not
	function redrawMarkers() {
		markers.forEach((item) => {
        	if (item.active) item.setOptions({icon: iconPath + "marker-active.png"});
        	else item.setOptions({icon: iconPath + "marker-inactive.png"});
        });

        markerCluster.clusters_.forEach(redrawCluster);
	}

	function resetDateInputs() {

		$("#start-date").datepicker("option", "minDate", minDate).datepicker("option", "maxDate", maxDate).datepicker('setDate', minDate);
		$("#end-date").datepicker("option", "minDate", minDate).datepicker("option", "maxDate", maxDate).datepicker('setDate', maxDate);
	}

	function hideUnusedMarkers() {
		markerSpend = locationDim.group().reduceSum(dc.pluck("spend")).all();

       	allMarkersSelected = true;
       	if (markers.find((item) => !item.active && item.getVisible())) allMarkersSelected = false;

       	markerCluster.removeMarkers(markers);
       	markers.forEach((item, i) => {
       		if (markerSpend[i].value < 1) {
       			item.setVisible(false);
       			item.active = true;
       		}else if (item.getMap() == null) {
       			if (!item.getVisible()) {
       				item.setVisible(true);
       				item.active = allMarkersSelected; //If all selected markers are active, any markers added back in will also be active
       			}
       			markerCluster.addMarker(item);
       		}
       	});
       	
       	if (!markers.find((item) => item.active && item.getVisible())) markers.forEach((item) => item.active = true); //If no visible markers are active after filtering, make all markers active
       	
       	filterByActiveMarkers();

       	redrawMarkers();
	}

	function changeDateFilter() {

		let startDate = $("#start-date").val().split("/");
		let endDate = $("#end-date").val().split("/");

		let newMinDate = new Date(`${startDate[2]}-${startDate[1]}-${startDate[0]}`);
		let newMaxDate = new Date(`${endDate[2]}-${endDate[1]}-${endDate[0]}`);

		if (newMinDate == "Invalid Date") {
			newMinDate = minDate;
			$("#start-date").datepicker('setDate', minDate);
		}
		if (newMaxDate == "Invalid Date") {
			newMaxDate = maxDate;
			$("#end-date").datepicker('setDate', maxDate);
		}

		$("#start-date").datepicker("option", "maxDate", newMaxDate);
		$("#end-date").datepicker("option", "minDate", newMinDate);

		dateFilterDim.filter(null);
       	dateFilterDim.filter(dc.filters.RangedFilter(newMinDate, newMaxDate));
       	chart.focus([newMinDate, newMaxDate]);

       	hideUnusedMarkers();
	}

	// function changeMinSpendFilter() {
	// 	let newMinSpend = parseInt($("#min-spend").val());

	// 	spendFilterDim.filter(null);
 //       	spendFilterDim.filter(dc.filters.RangedFilter(newMinSpend, maxSpend + 1)); //filter for min spend

 //       	hideUnusedMarkers();
	// }

	//Initialise Google Maps
	$("#loading_status").text("Loading Google Maps.");

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
  		fullscreenControl: false,
  		styles: [
  			{featureType: "poi", stylers: [{visibility: "off"}]}, 
  			{featureType: "transit", stylers: [{visibility: "off"}]}]
    });

    iconPath = "assets/images/b/";

    //Create map markers from the location data, and add to array
    markers = [];

    $("#loading_status").text("Adding map markers.");
	locationIDs.forEach((location, i) => {
		let newMarker = new google.maps.Marker({position: {lat: location.lat, lng: location.lng}, title: location.postcode, map: map});
		newMarker.active = true; //Extend the marker object with active property
		markers.push(newMarker);
	});

	//Add listener for marker clicks, filter and redraw
	markers.forEach((marker) =>{
		marker.addListener("click", function() {
			
			if (!this.active) this.active = true; //If the clicked marker was inactive, make it active
			else if (markers.every((item) => item.active || !item.getVisible())) { //If all markers were active, make them all inactive, except this one
					markers.forEach((item) => {if (item.getVisible()) item.active = false});
					this.active = true;
			}else if (markers.find((item) => (item.active && item.getVisible()) && item != this)) this.active = false; //If at least some of the other markers are active, make this one inactive
			else markers.forEach((item) => item.active = true); //Otherwise this is the only active marker, so set them all to active

        	filterByActiveMarkers();

        	redrawMarkers();
        });
	});

	//Initilise marker clusterer from MarkerClusterer API for Google Maps using array of markers
	let markerCluster = new MarkerClusterer(map, markers,
            {averageCenter: true, 
            	zoomOnClick: false,
            	styles: [{
 					url: iconPath + "cluster-active.png",
					height: 48,
					width: 55,
					anchor: [10, 0],
					textColor: "#000",
					textSize: 15,
            	}]});

	//Add listener for cluster clicks, filter and redraw
	map.addListener("clusterclick", (cluster) =>{
		clusterMarkers = cluster.getMarkers()

		// if (clusterMarkers.every((item) => !item.active)) clusterMarkers.forEach((item) => item.active = true); //If all, or some of the markers in the cluster are inactive, make them all active
		// else 
		if (clusterMarkers.find((item) => !item.active)) clusterMarkers.forEach((item) => item.active = true);
		else if (markers.every((item) => item.active || !item.getVisible())) { //If all the markers are active, make them all inactive except these ones
			markers.forEach((item) => {if (item.getVisible()) item.active = false});
			clusterMarkers.forEach((item) => item.active = true);
		}else if (markers.find((item) => (item.active && item.getVisible()) && !clusterMarkers.includes(item))) clusterMarkers.forEach((item) => item.active = false);//If at least one marker outside the cluster is active, make the cluster inactive
		else markers.forEach((item) => item.active = true); //Finally if all the markers are inactive, except these ones make them all active 

		filterByActiveMarkers();

		redrawMarkers();
	});

    //Listen for changes to clusters so they can be redrawn as appropriate
    map.addListener("cluster_redraw", redrawCluster);

    //Listen for bound change, and reset double click to zoom
    map.addListener("bounds_changed", () => {
    	map.set("disableDoubleClickZoom", false);
    });

    //Set up charts
    $("#loading_status").text("Preparing charts.");

	let chart = dc.compositeChart("#line-graph");

	let spendPie = dc.pieChart("#spend-pie");
	let transactionPie = dc.pieChart("#transaction-pie");

	let parseDate = d3.time.format("%d/%m/%y").parse;

	data.forEach((d) => {
		d.date = parseDate(d.date);
		d.spend = parseInt(d.spend);
	});

	let ndx = crossfilter(data);

	//Plot composite line chart of spend against time

	let dateDim = ndx.dimension(dc.pluck("date"));

	let totalSpend = dateDim.group().reduceSum(dc.pluck("spend"));

	let minDate = dateDim.bottom(1)[0].date;
	let maxDate = dateDim.top(1)[0].date;

	let spendAtID;

	let dateFilterDim = ndx.dimension(dc.pluck("date")); //Create new dimensions for filtering, as filtering the current one doesn't filter that chart
	// let spendFilterDim = ndx.dimension(dc.pluck("spend"));
	// let maxSpend = spendFilterDim.top(1)[0].spend;
	// console.log(maxSpend);
	let locationDim = ndx.dimension(dc.pluck("locationID")); //Create a new dimesion for tracking which markers are in the current filter

	// let minDateString = minDate.toISOString().split("T")[0];
	// let maxDateString = maxDate.toISOString().split("T")[0];

	chart.margins({top: 15, right: 50, left: 70, bottom: 30})
		.brushOn(false)
		.transitionDuration(500)
		.shareTitle(false)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.yAxis().ticks(4).tickFormat((v) => {
			if (v >= 1000) v = (v/1000).toFixed(1);
			return "£" + v;
		});

	chart.compose([
		dc.lineChart(chart)
			.dimension(dateDim)
			.group(totalSpend)
			.title((d) => `${d.key.toDateString()}: £${d.value}`)
			//.interpolate("basis")
			.evadeDomainFilter(true)
			.colors("#3498db")
			.transitionDuration(500),
		dc.lineChart(chart)
			.dimension(dateDim)
			.title((d) => `${d.key.toDateString()}: £${d.value.total}`)
			//.interpolate("basis")
			.evadeDomainFilter(true)
			.colors("#e74c3c")
			.transitionDuration(500)
	]);

	//Create 2 pie charts to show proportion of spend and transactions attributed to the current selection
	//All values are currently selected, so group them all together for now.

	//Declare variables for various goups, to be assigned in filterByActiveMarkers()
	let selectionDim;

	let spendGroup;
	let spendTotal;//Use total grouping for calculating percentage
	let transactionGroup;
	let transactionTotal;//Use total grouping for calculating percentage

	spendPie.innerRadius(50)
		.externalLabels(-100)
		.minAngleForLabel(0)
		.colors(d3.scale.ordinal().range(["#e74c3c", "#3498db"]))
		//Always show label for Selection only, calculated as its percentage of total, move it to the centre of the pie
		.label((d) => {
			if (d.key == "Selection") {
				let percentage = Math.floor(d.value / spendTotal.value() * 100); //https://stackoverflow.com/questions/53033715/bar-chart-dc-js-show-percentage
				if (percentage < 1) percentage = "<1";
				return `${percentage}%`;
			}else return "";
		})
		.title((d) => { 
   			if (d.key == "Selection") return `Selection: £${d.value}`;
			else return `Total: £${spendTotal.value()}`;
		});

	transactionPie.innerRadius(50)
		.externalLabels(-100)
		.minAngleForLabel(0)
		.colors(d3.scale.ordinal().range(["#e74c3c", "#3498db"]))
		//Always show label for Selection only, calculated as its percentage of total, move it to the centre of the pie
		.label((d) => {
			if (d.key == "Selection") {
				let percentage = Math.floor(d.value / transactionTotal.value() * 100);
				if (percentage < 1) percentage = "<1";
				return `${percentage}%`;
			}else return "";
		})
		.title((d) => { 
   			if (d.key == "Selection") {
   				let plural = "s";
   				if (d.value <= 1) plural = "";
   				return `Selection: ${d.value} transaction${plural}`;
			}else return `Total: ${transactionTotal.value()} transactions`;
		});

	spendPie.onClick = () => false; //Remove onClick from pie charts, so they can't trigger filter
	transactionPie.onClick = () => false;

	let nameDim;

	let topSpendersGroup;

	filterByActiveMarkers(true);

	$("#loading_status").text("Drawing charts.");

    resizeCharts();

    markerCluster.fitMapToMarkers(); //Use markerClusterer built in function to show all markers on map

    let clearControl = $(document.createElement("div")).css("z-index", "1000");
    let clearControlButton = $(document.createElement("button")).addClass("btn").attr("id", "clear-selection").text("Select All").hide();
    clearControl.append(clearControlButton);

    clearControl[0].index = 1;

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(clearControl[0]);

    //Hide selection reset button and attach event listener for it
    clearControlButton.on("click", () => {
		markers.forEach((item) => item.active = true); //Set all markers to active

		filterByActiveMarkers();
		redrawMarkers();
    }); //.hide(0)

    $("#help").on("click", () => {
    	$("#help-modal").fadeIn();
    });

    $("#help-modal .modal-cover").on("click", () => {
    	$("#help-modal").fadeOut();
    });

    //Set up datepicker

    $("#start-date").datepicker({defaultDate: minDate, dateFormat: "dd/mm/yy"});
    $("#end-date").datepicker({defaultDate: maxDate, dateFormat: "dd/mm/yy"});

 //    $("#start-date").datepicker("option", "dateFormat", "dd-mm-yy");
	// $("#start-date").datepicker("option", "dateFormat", "dd-mm-yy");

    resetDateInputs();

    $("#start-date").on("change", changeDateFilter);
    $("#end-date").on("change", changeDateFilter);
    // $("#min-spend").on("blur", changeMinSpendFilter);

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
				chart.children()[1].transitionDuration(500)
				spendPie.transitionDuration(500);
				transactionPie.transitionDuration(500);
			}, 500);
		}
	});

	$("#loading-modal").fadeOut();

}


//Returns an array of unique postcodes from the data set
function getUniquePostcodes(data) {
	$("#loading_status").text("Getting postcodes from data.");

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
	$("#loading_status").text("Retrieving postcode info from postcodes.io.");

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
			if (this.readyState == 4) {
				if(this.status == 200) {
					let response = JSON.parse(this.responseText);
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

	$("#loading_status").text("Assigning location IDs.");

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

	return [data, locationIDs];
}


//Redeclare ClusterIcon onAdd function prototype to trigger cluster redraw event whenever clusters are changed. (For instance when the zoom level changes, or markers are added or removed)
ClusterIcon.prototype.onAdd = function() {
  this.div_ = document.createElement('DIV');
  if (this.visible_) {
    var pos = this.getPosFromLatLng_(this.center_);
    this.div_.style.cssText = this.createCss(pos);
    this.div_.innerHTML = this.sums_.text;
    google.maps.event.trigger(this.map_, 'cluster_redraw', this.cluster_); //Here
  }

  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this.div_);

  var that = this;

  google.maps.event.addDomListener(this.div_, 'click', function() {
    that.triggerClusterClick();
  });

  //Solution for clearing doubleclicks from https://github.com/google-map-react/google-map-react/issues/319

  google.maps.event.addDomListener(this.div_, 'mouseover', function() {
  	that.map_.set("disableDoubleClickZoom", true);
  });

  google.maps.event.addDomListener(this.div_, 'mouseout', function() {
  	that.map_.set("disableDoubleClickZoom", false);
  });

  google.maps.event.addDomListener(this.div_, 'dblclick', function() {
  	let newCenter = that.cluster_.getCenter();
  	let newBounds = that.cluster_.getBounds();
    that.map_.panTo(newCenter);
    that.map_.fitBounds(newBounds);
    console.log("doubleclick", newCenter, newBounds);
    // that.map_.set("disableDoubleClickZoom", false);
  });
};