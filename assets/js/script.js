const iconPath = "assets/images/b/";
const selectionColor = "#e74c3c";
const totalColor = "#3498db";

$(() => {
    $("#upload-line").hide();

    $("#data-file").on("change", () => {
        $("#data-file").blur();
        $("#data-file").css("border-color", "initial");
        let dataFile = $("#data-file").val();
        if (dataFile == "-1") $("#upload-line").show();
        else $("#upload-line").hide();
    });

    $("#data-upload").on("change", () => {
        let filename = $("#data-upload").val().split("\\").pop();
        if (!filename) filename = "No file selected";
        $("#data-upload-button .filename").text(filename);
        $("#data-upload-button span").css("border-color", "initial");
    });

    $("#data-select").on("submit", (e) => {
        e.preventDefault();
        let dataFile = $("#data-file").val();
        if (dataFile) {
            if (dataFile != "-1") loadData(dataFile);
            else{
                let filename = $("#data-upload").val();
                if (filename == "") $("#data-upload-button span").css("border-color", "red"); // console.log("No file selected");
                else loadData(filename.split("\\").pop(), $("#data-upload")[0].files[0]);
            }
        }else $("#data-file").css("border-color", "red");
    });
});


function loadData(dataFile, file) {
    $("#intro-modal").html(`<div class="modal-cover"></div>
                            <div class="modal">
                            <div><span class="loading-spinner"></span></div>
                            <p id="loading_text">Loading</p>
                            <p id="loading_status"></p>
                            </div>`);
     

    loadingStatus("Loading " + dataFile);
    console.log(dataFile);
    if (!file) $.get("assets/data/" + dataFile)
                .then(initDashboard)
                .catch(() => console.log("Failed to load data!"));
    else {
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => initDashboard(reader.result);
    }

    // Attach click events to show/hide the help modal
    $("#help").on("click", () => {
        $("#help-modal").fadeIn();
    });

    $("#help-modal .modal-cover").on("click", () => {
        $("#help-modal").fadeOut();
    });
}


async function initDashboard(data) {
    loadingStatus("Parsing data.");
    data = d3.csv.parse(data);
    
    // Get postcodes from data, verify them and retrieve latitude and longditude from postcodes.io
    let postcodes = getUniquePostcodes(data);
    postcodes = await getLatLngFromPostcodes(postcodes);
    let locationIDs = assignLatLngIDs(postcodes, data);
    
    // Initialise google maps and add markers and cluster them
    map = initMap("map");
    markers = createLocationMarkers(locationIDs, map);
    markerCluster = createMarkerClusterer(markers, map);

    // When the selection changes on the map, filter the data by location, and redraw the map markers to show selection
    map.addListener("selectionchanged", () =>{
        filterByActiveMarkers();
        redrawMarkers();
    });

    // When a cluster changes (either due to selection, or zoom level change) redraw it
    map.addListener("cluster_redraw", redrawCluster);

    // Create a crossfilter object from the data
    ndx = createNdx(data);
    
    //Declare variables for various goups, to be assigned in filterByActiveMarkers()
    let minDate, maxDate; // Will contain min and max dates for the whole dataset
    let selectionDim; // Dimension for currently selected locations

    let spendGroup; // Will group spend by selection
    let spendTotal; // Will contain total spend so percentages can be calculated
    let transactionGroup; // Will group number of transactions by selection
    let transactionTotal; // Will contain total transactions

    let nameDim; // Dimension to hold the names of customers in the selection
    let topSpendersGroup; // Group the customers by spend to get to spenders 

    let spendAtID; // Group customer spend by location ID
    
    //Set up charts and pies
    let chart = createCompositeChart("line-graph");
    let spendPie = createSpendPie("spend-pie");
    let transactionPie = createTransactionPie("transaction-pie");

    //Create new dimensions for filtering, as filtering dimensions in use doesn't filter that chart
    let dateFilterDim = ndx.dimension(dc.pluck("date"));
    //Create a new dimesion for tracking which markers are in the current filter
    let locationDim = ndx.dimension(dc.pluck("locationID")).filterFunction((d) => d != -1); //Filter out anything that doesn't have a location ID

    filterByActiveMarkers(true); // Filter by active markers for the first time, do not dispose of groups and dimensions (as they don't yet exist)

    loadingStatus("Drawing charts.");

    resizeCharts(); // Resize charts to fit available space



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

    //Set up datepicker

    $("#start-date").datepicker({defaultDate: minDate, dateFormat: "dd/mm/yy"});
    $("#end-date").datepicker({defaultDate: maxDate, dateFormat: "dd/mm/yy"});

    resetDateInputs();

    $(".date-input").on("change", changeDateFilter);

    let resizeDebounce = false; // Variable to debounce resize event, do it doesn't fire repeatedly when the window is resized.
    $(window).on("resize", resizeDashboard);

    $("#intro-modal").fadeOut();

    // Set up the composite chart for total spend, and spend for the selected locations
    function createCompositeChart(chartID) {
        loadingStatus("Preparing charts.");

        let chart = dc.compositeChart("#" + chartID);

        //Plot composite line chart of spend against time
        let dateDim = ndx.dimension(dc.pluck("date"));
        let totalSpend = dateDim.group().reduceSum(dc.pluck("spend"));

        minDate = dateDim.bottom(1)[0].date;
        maxDate = dateDim.top(1)[0].date;
        
        chart.margins({top: 15, right: 50, left: 70, bottom: 30})
             .brushOn(false)
             .transitionDuration(500)
             .shareTitle(false)
             .x(d3.time.scale().domain([minDate, maxDate]))
             .yAxis().ticks(4).tickFormat((v) => {
                if (v >= 1000) v = (v/1000).toFixed(1) + "k";
                return "£" + v;
             });

        chart.compose([
            dc.lineChart(chart)
              .dimension(dateDim)
              .group(totalSpend)
              .title((d) => `${d.key.toDateString()}: £${d.value}`)
              .evadeDomainFilter(true)
              .colors(totalColor)
              .transitionDuration(500),
            dc.lineChart(chart)
              .dimension(dateDim)
              .title((d) => `${d.key.toDateString()}: £${d.value.total}`)
              .evadeDomainFilter(true)
              .colors(selectionColor)
              .transitionDuration(500)
        ]);

        return chart;
    }
    
    // Creates a pie chart with the label at the centre, disables click to filter
    function createPieChart(ndx, pieID) {
        let pie = dc.pieChart("#" + pieID);

        pie.innerRadius(50)
                .externalLabels(-100)
                .minAngleForLabel(0)
                .colors(d3.scale.ordinal().range([selectionColor, totalColor]));

        pie.onClick = () => false; //Remove onClick from pie charts, so they can't trigger filtering

        return pie;
    }

    // Create pie chart showing percentage of spend
    function createSpendPie(spendPieID) {
        let spendPie = createPieChart(ndx, spendPieID);

        //Always show label for Selection only, calculated as its percentage of total.
        spendPie.label((d) => {
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

        return spendPie;
    }

    // Create pie chart showing percentage of total transactions
    function createTransactionPie(transactionPieID) {
        let transactionPie = createPieChart(ndx, transactionPieID);

        //Always show label for Selection only, calculated as its percentage of total.
        transactionPie.label((d) => {
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

        return transactionPie;
    }

    //Resize charts based on current device width and surrounding elements
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

        spendPie.height(pieSize)
                .width(pieSize)
                .innerRadius(pieSize * 0.25)
                .externalLabels(-pieSize / 2);

        transactionPie.height(pieSize)
                      .width(pieSize)
                      .innerRadius(pieSize * 0.25)
                      .externalLabels(-pieSize / 2);

        dc.renderAll();
    }

    //Redraw charts onResize, debounce to 0.5s to avoid calling thousands of redraws 
    function resizeDashboard() {
        if (!resizeDebounce) {
            resizeDebounce = true;
            setTimeout(() => {
                resizeDebounce = false;

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
    }

    //Filter and update the data in the charts to reflect current map selection
    function filterByActiveMarkers(init) {
        // Get the line graph containing the selected data from the composite chart
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
    
        // Custom accumulator to only add a transactions spend where their location ID matches the current selection
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
        
        // Custom accessor to display data based on the custom accumulator
        selectionChart.group(spendAtID)
            .valueAccessor((d) => d.value.total);
    
        // Dimension to group data by whether it is in the selection or not
        selectionDim = ndx.dimension((d) => {
            if(markers[d.locationID] && markers[d.locationID].active && markers[d.locationID].getVisible()) return "Selection";
            else return "";
        });
    
        // Group the total spend for the selection, create a fake group (for when either the selection or excluded results are empty)
        spendGroup = selectionDim.group().reduceSum(dc.pluck("spend"));
        let spendGroupCleaned = {
            all() {
                let cleanGroup = spendGroup.all();
                if (!cleanGroup.find((item) => item.key == "")) cleanGroup.push({key: "", value: 0});
                return cleanGroup; //Fake group to fix graphical clitch from empty group after filtering dates
            }
        }
        spendTotal = selectionDim.groupAll().reduceSum(dc.pluck("spend"));

        // Assign spend totals grouped by selection to the spend pie chart
        spendPie.dimension(selectionDim)
            .group(spendGroupCleaned);

        // Group the total number of transactions for the selection, create a fake group as for total spend pie chart
        transactionGroup = selectionDim.group().reduceCount(dc.pluck("spend"));
        let transactionGroupCleaned = {
            all() {
                let cleanGroup = transactionGroup.all();
                if (!cleanGroup.find((item) => item.key == "")) cleanGroup.push({key: "", value: 0});
                return cleanGroup; //Fake group to fix graphical clitch from empty group after filtering dates
            }
        }
        transactionTotal = selectionDim.groupAll().reduceCount(dc.pluck("spend"));
    
        // Assign spend totals grouped by selection to the transaction pie chart
        transactionPie.dimension(selectionDim)
            .group(transactionGroupCleaned);
        
        // Create a dimension for client names in the current selection.
        nameDim = ndx.dimension((d) => {
            if(markers[d.locationID] && markers[d.locationID].active && markers[d.locationID].getVisible() && d.spend > 0) return d.name;
            else return "!EXCLUDE!";
        });
    
        // Group selected clients by spend so the top 3 can be extracted
        topSpendersGroup = nameDim.group().reduceSum(dc.pluck("spend"));

        // If not initial setup redraw all charts
        if(!init) {
            chart.redraw();
            spendPie.redraw();
            transactionPie.redraw();
        }

        // Show or hide the clear selection button as needed
        if (markers.find((item) => !item.active)) $("#clear-selection").fadeIn(300);
        else $("#clear-selection").fadeOut(300);

        showTopSpenders();
    }

    // Shows the top 3 spenders in the selection, plus the number of others
    function showTopSpenders() {
        let topSpenders = topSpendersGroup.top(4);
        topSpenders = topSpenders.filter((item) => item.key != "!EXCLUDE!");
        if (topSpenders.length > 3) topSpenders.pop();

        let theRest = topSpendersGroup.size() - topSpenders.length;
        if (topSpendersGroup.all().find((item) => item.key == "!EXCLUDE!")) theRest -= 1;

        let topSpendersDiv = $("#top-spenders").text("Selection: "); // Find the dom element for the selection in the graphs key

        // Assemble span elements containing names of top spenders, and their total spend in the title
        if (topSpenders[0] && topSpenders[0].value > 0) topSpendersDiv.append($("<span>").attr("title", `£${topSpenders[0].value}`).text(topSpenders[0].key));
        if (topSpenders[1] && topSpenders[1].value > 0) {
            if (topSpenders.length > 2) topSpendersDiv.append(document.createTextNode(", ")); // Use text nodes to escape characters from spreadsheet
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

        // Display total value for the Total label in the chart key
        $("#total-spend").html(`<span title="£${spendTotal.value()}">Total</span>`);
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

    // Resets the date inputs to their initial values from the data set
    function resetDateInputs() {
        $("#start-date").datepicker("option", "minDate", minDate).datepicker("option", "maxDate", maxDate).datepicker('setDate', minDate);
        $("#end-date").datepicker("option", "minDate", minDate).datepicker("option", "maxDate", maxDate).datepicker('setDate', maxDate);
    }

    // Hide markers that aren't in use by the current date filters
    function hideUnusedMarkers() {
        markerSpend = locationDim.group().reduceSum(dc.pluck("spend")).all(); // Get the spend at each location
        
        // Determine if all visible markers are active or not
        allMarkersSelected = true;
        if (markers.find((item) => !item.active && item.getVisible())) allMarkersSelected = false; 

        markerCluster.removeMarkers(markers); // Remove all markers from the clusterer
        // Iterate over all markers, if they don't have any spend based on current filters hide them, otherwise add them to the marker clusterer
        markers.forEach((item, i) => {
            if (markerSpend[i].value < 0) {
                item.setVisible(false);
                item.active = true;
            }else if (item.getMap() == null) {
                if (!item.getVisible()) {
                    item.setVisible(true);
                    item.active = allMarkersSelected; //If all selected markers are active, any markers added back in will also be active, if not new markers will be inactive
                }
                markerCluster.addMarker(item);
            }
        });
        
        if (!markers.find((item) => item.active && item.getVisible())) markers.forEach((item) => item.active = true); //If no visible markers are active after filtering, make all markers active
        
        // Filter chart by selected markers, and redraw
        filterByActiveMarkers();
        redrawMarkers();
    }

    // Adds or changes the date filters
    function changeDateFilter() {
        //Parse dates from input
        let startDate = $("#start-date").val().split("/");
        let endDate = $("#end-date").val().split("/");

        let newMinDate = new Date(`${startDate[2]}-${startDate[1]}-${startDate[0]}`);
        let newMaxDate = new Date(`${endDate[2]}-${endDate[1]}-${endDate[0]}`);
        
        // If they are invalid, reset to default
        if (newMinDate == "Invalid Date") {
            newMinDate = minDate;
            $("#start-date").datepicker('setDate', minDate);
        }
        if (newMaxDate == "Invalid Date") {
            newMaxDate = maxDate;
            $("#end-date").datepicker('setDate', maxDate);
        }
        
        // Change max and min dates for the date picker to be bounded by the input of each other
        $("#start-date").datepicker("option", "maxDate", newMaxDate);
        $("#end-date").datepicker("option", "minDate", newMinDate);
        
        // Clear the filters from the crossfilter, then filter by date
        dateFilterDim.filter(null);
        dateFilterDim.filter(dc.filters.RangedFilter(newMinDate, newMaxDate));
        chart.focus([newMinDate, newMaxDate]);
        
        // Hide any markers excluded by the new filters, and add any hidden ones back in
        hideUnusedMarkers();
    }
}


// Change the loading status text on the loading modal
function loadingStatus(text) {
    $("#loading_status").text(text);
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

    // if (postcodes.length < 1) throw // Data set contains no postcodes

    return postcodes;
}



// Creates a list of verified postcodes with latitudes and longitudes from the Postcodes.io API.
function getLatLngFromPostcodes(postcodeList) {
    loadingStatus("Retrieving postcode info from postcodes.io.");

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
                        resolve(results); //Otherwise resolve the promise to return the results
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


// Creates a list of unique locations containing postcode, latitude and longitude, and assigns a corresponding ID to the dataset.
function assignLatLngIDs(postcodeData, data) {
    loadingStatus("Assigning location IDs.");

    let locationIDs = [];

    postcodeData.forEach((resultData) => {
        data.forEach((item) => {
            if (item.postcode == resultData.query) { //Match original postcodes with queries
                if (resultData.result == null) { //If postcodes.io returned a null result that postcode is invalid, and won't be linked to a location.
                    item.postcode = "Invalid Postcode";
                    item.locationID = -1;
                    item.spend = 0; // Filter out invalid postcodes... Postcodes have gone out of existence since I built the dataset...
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

    // if (locationIDs.length < 1) throw // No valid postcodes!

    return locationIDs;
}


// Initialises google map in targeted DOM element. Returns map object
function initMap(mapID) {
    loadingStatus("Loading Google Maps.");

    let map = new google.maps.Map(document.getElementById(mapID), {
        zoom: 6,
        center: {
            lat: 54,
            lng: -2.2
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

    return map;
}



// Adds markers to the map for each location, returns an array of markers
function createLocationMarkers(locations, map) {
    loadingStatus("Adding map markers.");

    markers = [];
    
    locations.forEach((location, i) => {
        let newMarker = new google.maps.Marker({position: {lat: location.lat, lng: location.lng}, title: location.postcode, map: map});
        newMarker.active = true; //Extend the marker object with active property
        markers.push(newMarker);
    });

    //Add listener for marker click, resolve it, filter and redraw
    markers.forEach((marker) =>{
        marker.addListener("click", function() {
            
            if (!this.active) this.active = true; //If the clicked marker was inactive, make it active
            else if (markers.every((item) => item.active || !item.getVisible())) { //If all markers were active, make them all inactive, except this one
                markers.forEach((item) => {if (item.getVisible()) item.active = false});
                this.active = true;
            }else if (markers.find((item) => (item.active && item.getVisible()) && item != this)) this.active = false; //If at least some of the other markers are active, make this one inactive
            else markers.forEach((item) => item.active = true); //Otherwise this is the only active marker, so set them all to active

            google.maps.event.trigger(map, "selectionchanged", true); // Filter data by active markers, and redraw
        });
    });

    return markers;
}


// Adds markers to a marker clusterer so they are rendered in clusters when appropriate. Returns MarkerClusterer
function createMarkerClusterer(markers, map) {
    loadingStatus("Clustering map markers.");
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
        let clusterMarkers = cluster.getMarkers()

        // if (clusterMarkers.every((item) => !item.active)) clusterMarkers.forEach((item) => item.active = true); //If all, or some of the markers in the cluster are inactive, make them all active
        // else 
        if (clusterMarkers.find((item) => !item.active)) clusterMarkers.forEach((item) => item.active = true);
        else if (markers.every((item) => item.active || !item.getVisible())) { //If all the markers are active, make them all inactive except these ones
            markers.forEach((item) => {if (item.getVisible()) item.active = false});
            clusterMarkers.forEach((item) => item.active = true);
        }else if (markers.find((item) => (item.active && item.getVisible()) && !clusterMarkers.includes(item))) clusterMarkers.forEach((item) => item.active = false);//If at least one marker outside the cluster is active, make the cluster inactive
        else markers.forEach((item) => item.active = true); //Finally if all the markers are inactive, except these ones make them all active 

        google.maps.event.trigger(map, "selectionchanged", true);
    });    

    //Listen for bound change, and reset double click to zoom
    map.addListener("bounds_changed", () => {
        map.set("disableDoubleClickZoom", false);
    });

    markerCluster.fitMapToMarkers(); //Use markerClusterer built in function to show all markers on map

    return markerCluster;
}


// Parses dates and numbers within dataset and returns a crossfilter object.
function createNdx(data) {
    data.forEach((d) => {
        d.date = d3.time.format("%d/%m/%Y").parse(d.date);
        d.spend = parseInt(d.spend);
    });

    return crossfilter(data);
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

  // google.maps.event.addDomListener(this.div_, 'dblclick', function() {
  // 	let newCenter = that.cluster_.getCenter();
  // 	let newBounds = that.cluster_.getBounds();
  //   that.map_.panTo(newCenter);
  //   that.map_.fitBounds(newBounds);
  //   console.log("doubleclick", newCenter, newBounds);
  //   // that.map_.set("disableDoubleClickZoom", false);
  // });
};