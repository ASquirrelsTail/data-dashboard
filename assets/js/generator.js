$(() => {
    $("#results").hide();

    $("#start-date").datepicker({dateFormat: "dd/mm/yy"});
    $("#end-date").datepicker({dateFormat: "dd/mm/yy"});

    $("#generate").on("click", generate);

    $("#copy-to-clipboard").on("click", () => {
        let resultData = $("#result-data");
        resultData.select();
        document.execCommand("copy");
        resultData.blur();
    })
});


async function generate() {

    let startDate = $("#start-date").val().split("/");
    let endDate = $("#end-date").val().split("/");

    let minDate = new Date(`${startDate[2]}-${startDate[1]}-${startDate[0]}`);
    if (minDate == "Invalid Date") minDate = new Date();
    let maxDate = new Date(`${endDate[2]}-${endDate[1]}-${endDate[0]}`);
    if (maxDate == "Invalid Date") maxDate = new Date();
    let dateBounds = maxDate.getTime() - minDate.getTime();

    let noTransactions = parseInt($("#no-transactions").val());

    let minSpend = parseInt($("#min-spend").val());
    let avgSpend = parseInt($("#avg-spend").val());
    let maxSpend = parseInt($("#max-spend").val());

    let noCustomers = parseInt($("#no-customers").val());

    
    if (noCustomers > noTransactions) noCustomers = noTransactions;

    let customerQuery = await $.ajax({url: "https://randomuser.me/api/?results=" + noCustomers + "&inc=name&nat=gb", dataType: 'json'});
    let customers = customerQuery.results.map((query) => {
        return {name: capitalise(query.name.first) + " " + capitalise(query.name.last)};
    });
    
    

    let epicenter = $("#epicenter").val();
    let radius = parseInt($("#radius").val());
    
    customers = await generatePostcodes(customers, epicenter, radius);
    let transactions = generateTransactions(customers, noTransactions, minSpend, avgSpend, maxSpend, minDate, dateBounds);

    $("#result-data").text(transactions);
    $("#results").fadeIn();
}


async function generatePostcodes(customers, epicenter, radius) {
    let center = {status: 404};
    if (epicenter != "") center = await $.ajax({url: "https://api.postcodes.io/postcodes/" + epicenter, dataType: 'json'}); // If epicenter isn't empty get lat/long
    if (center.status != 200) { // If postcodes.io doesn't recognise the epicenter return random postcodes
        console.log("Could not find epicenter, generating random postcodes instead.")
        return generateRandomPostcodes(customers);
    }else{
        //Generate a random lat/lang for each customer within the radius of the epicenter
        for (let i=0; i < customers.length; i++) {
            let postcodeQuery = {result: null};
            let attempts = 0;
            while (!postcodeQuery.result && attempts < 5) {
                let distance = Math.random() * radius / 69;
                let direction = Math.random() * 2 * Math.PI;
                customers[i].longitude = center.result.longitude + (distance * Math.cos(direction));
                customers[i].latitude = center.result.latitude + (distance * Math.sin(direction));
                postcodeQuery = await $.ajax({
                    url: "https://api.postcodes.io/postcodes?lon=" + customers[i].longitude + "&lat=" + customers[i].latitude + "&limit=1&radius=2000",
                    dataType: 'json'
                });
                attempts++;
            }
            if (attempts >= 5) {
                postcodeQuery = await $.ajax({url: "https://api.postcodes.io/random/postcodes?outcode=" + epicenter.split(" ")[0], dataType: 'json'});
                customers[i].postcode = postcodeQuery.result.postcode;
            }else customers[i].postcode = postcodeQuery.result[0].postcode;
        }
        return customers;
    }
}


async function generateRandomPostcodes(customers) {
    for (let i=0; i < customers.length; i++) {
        random = await $.ajax({url: "https://api.postcodes.io/random/postcodes", dataType: 'json'});
        customers[i].postcode = random.result.postcode;
    }
    return customers;
}


function generateTransactions(customers, noTransactions, minSpend, avgSpend, maxSpend, minDate, dateBounds) {
    noCustomers = customers.length;
    let transactions = [];
    for (let i=0; i < noTransactions; i++) {
        if (i < noCustomers) transactions.push({name: customers[i].name, postcode: customers[i].postcode});
        else{
            let randomCustomer = Math.floor(Math.random() * (noCustomers - 1));
            let customerPostcode = customers[randomCustomer].postcode;
            transactions.push({name: customers[randomCustomer].name, postcode: customerPostcode});
        }
        let randomNum = Math.random() * 2;
        transactions[i].spend = minSpend + Math.round((Math.min(1, randomNum) * (avgSpend - minSpend)) + (Math.max(0, randomNum - 1) * (maxSpend - avgSpend)));
        let randomDate = new Date()
        randomDate.setTime(minDate.getTime() + Math.round(Math.random() * dateBounds));
        transactions[i].date = randomDate.toLocaleString('en-GB', { timeZone: 'UTC' }).split(",")[0];
    }
    let transactionsString = "date,spend,name,postcode\n";
    transactions.forEach((transaction) => transactionsString += `${transaction.date},${transaction.spend},${transaction.name},${transaction.postcode}\n`);
    return transactionsString;
}


function capitalise(string) {
    //https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
    return string[0].toUpperCase() + string.slice(1);
}