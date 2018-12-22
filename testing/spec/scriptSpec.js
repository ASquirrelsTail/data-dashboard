describe("The getUniquePostcodes function", () => {
	it("should return an array", () => {
		expect(typeof getUniquePostcodes()).toEqual(typeof []);
	});

	it("should return the postcodes from the objects of the input array", () => {
		let input = [{name: "John Doe", postcode: "NG22 0ND"}, {name: "Jane Doe", postcode: "IG8 1SJ"}, {name: "Adam Smith", postcode: "IP12 1QD"}];
		expect(getUniquePostcodes(input)).toEqual(["NG22 0ND", "IG8 1SJ", "IP12 1QD"]);
	});

	it("should remove whitespace from either side of the postcodes and make all letters uppercase", () =>{
		let input = [{postcode: "Ng22 0nd"}, {postcode: "IG8 1SJ "}, {postcode: " IP12 1QD"}, {postcode: " so53 2ap "}];
		expect(getUniquePostcodes(input)).toEqual(["NG22 0ND", "IG8 1SJ", "IP12 1QD", "SO53 2AP"]);
	})

	it("should return the postcodes from the objects of the input array only if they exist", () => {
		let input = [{name: "John Doe", postcode: "NG22 0ND"}, {name: "Jane Doe"}, {name: "Adam Smith", postcode: "IP12 1QD"}];
		expect(getUniquePostcodes(input)).toEqual(["NG22 0ND", "IP12 1QD"]);
	});

	it("should only return one instance of each postcode", () => {
		let input = [{postcode: "NG22 0ND"}, {postcode: "IP12 1QD"}, {postcode: "SO53 2AP"}, {postcode: "IP12 1QD"}];
		expect(getUniquePostcodes(input)).toEqual(["NG22 0ND", "IP12 1QD", "SO53 2AP"]);
	});
});