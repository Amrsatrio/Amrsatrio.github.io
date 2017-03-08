var currentLocation;
var accessToken;
var refreshToken;
var theCustomer;
var currentResto;
var currentFoodCart;
var currentContainerId = 0;
var Profile = {
	LOGIN: "/gojek/v2/login"
}
var GoFood = {
	GET_CATEGORIES: "/gojek/shopping-category/find",
	SEARCH_MERCHANTS: "/gojek/merchant/find",
	VIEW_NEW_MERCHANT_DETAILS_UUID: "/gofood/consumer/v2/restaurants/",
	HOME_NEW: "/gofood/consumer/v2/home"
}
var Booking = {
	HISTORY: "/gojek/v2/customer/v2/history/",
	HISTORY_FULL: "/gojek/v2/booking/history/",
	CALCULATE: "/gojek/v2/calculate/gopay/",
	MAKE: "/gojek/v2/booking/v3/makeBooking",
	GET_BY_NO: "/gojek/v2/booking/findByOrderNo/",
	REVERSE_GEOCODE: "/gojek/poi/reverse-geocode"
}
var GoPay = {
	GET_BALANCE: "/gojek/v2/customer/currentBalance/"
}
var GoPoints = {
	GET_BALANCE: "/gopoints/v1/wallet/points-balance",
	NEXT_TOKEN: "/gopoints/v1/next-points-token",
	REDEEM_TOKEN: "/gopoints/v1/redeem-points-token"
}
var selectedDest;
var useGoPay = true;
var markers = [];
var map;
var destSelected = false;
var POLYLINE_WEIGHT = 3;
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var goRideFrom = {};
var goRideTo = {};
var goRideFromMarker;
var goRideToMarker;
var goRideSelectTo = false;
var failedMap;
var failedMarker;
var failedSelectLatLng;
var FAKE_APPVER = "2.17.1";
var FAKE_UNIQUE_ID = "788f6110c67f8070"; //"788f6110c67f8070";

function createLoginRequest(email, password) {
	return {
		"username": email,
		"client_id": "trusted-client",
		"grant_type": "password",
		"password": password
	};
}

function loginSubmit() {
	var submitButton = $("#submit");
	submitButton.attr('disabled', true);
	var kvpairs = createLoginRequest($("#email")[0].value, $("#password")[0].value);
	$.ajax({
		url: "https://api.gojekapi.com" + Profile.LOGIN,
		type: "POST",
		data: JSON.stringify(kvpairs),
		beforeSend: function(xhr) {
			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
			xhr.setRequestHeader("X-AppVersion", FAKE_APPVER);
			xhr.setRequestHeader("X-UniqueId", FAKE_UNIQUE_ID);
		},
		complete: function(xhr, statusText, errorThrown) {
			var response;

			try {
				response = JSON.parse(xhr.responseText);
			} catch (e) {
				response = {
					status: "FAILED",
					message: "Check your Internet connection"
				};
			}

			if (response.status == "OK") {
				accessToken = response.access_token;
				refreshToken = response.refresh_token;
				theCustomer = response.customer;
				submitButton.removeAttr("disabled");
				showContainer("home");
			} else {
				alert(response.message);
				submitButton.removeAttr("disabled");
			}
		}
	});
}

$(document).ready(function() {
	navigator.geolocation.getCurrentPosition(function(a) {
		currentLocation = a;
	}, function(e) {
		$(".siteWrapper").append("<div class='container' data-name='locationFailed'><div class='wrapper'><h1>Geolocation failed</h1>" + e.message + " (Code " + e.code + ")<br>Select your location manually:<div id='failedMap' style='height: 400px;'></div><button style='width: 100%;' id='failedSelectLocation'>OK</button></div></div>");
		failedMap = new google.maps.Map(document.getElementById("failedMap"), {
			zoom: 16,
			clickableIcons: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			disableDefaultUI: true,
			center: {
				lat: 0,
				lng: 0
			}
		});
		failedMap.addListener("click", function(e) {
			// var stringLatLong = e.latLng.lat() + "," + e.latLng.lng();
			failedSelectLatLng = e.latLng;
			if (failedMarker == null) {
				failedMarker = new google.maps.Marker({
					title: "Selected location"
				});
				failedMarker.setMap(failedMap);
			}
			failedMarker.setPosition(failedSelectLatLng);
		});
		$("#failedSelectLocation").click(function() {
			currentLocation = {
				coords: {
					latitude: failedSelectLatLng.lat(),
					longitude: failedSelectLatLng.lng()
				}
			};
			$("[data-name=locationFailed]").remove();
		});
	}, {
		enableHighAccuracy: true
	});
	$("#foodSearchQuery").keypress(function(e) {
		if (e.which == 13) {
			$("#foodSearchQuerySubmit").click();
		}
	});
	showContainer("login");
});

// function loadGoFoodCategories() {
// 	var list = $("#goFoodCategories ul");
// 	list.empty();
// 	requestData(GoFood.GET_CATEGORIES, {}, function(data) {
// 		for (var i in data) {
// 			var categoryData = data[i];
// 			list.append("<li><img src='" + categoryData.imgLocation + "' />" + categoryData.name + "</li>");
// 		}
// 	});
// }

function showSearch(stringCategory, titleOverride) {
	var queries = {
		location: makeLocation()
	};
	var showSearchBox = false;
	var searchContainer = showContainer("goFoodSearch");
	searchContainer.find("h1").text(titleOverride == null ? "Search" : titleOverride);
	var foodSearch = searchContainer.find("#foodSearch");
	var foodSearchBox = foodSearch.find("#foodSearchQuery").val("");

	if (stringCategory != null) {
		foodSearch.hide();
		loadGoFoodSearch(stringCategory);
	} else {
		foodSearch.show();
		foodSearchBox.focus();
	}

	$("#goFoodSearchList").empty();
}

function loadGoFoodSearch(stringCategory) {
	$("#foodSearchQuerySubmit").attr("disabled", true);
	var queries = {
		location: makeLocation() //,
			// page: 0,
			// limit: 20
	};

	if (stringCategory != null) {
		queries["category"] = stringCategory;
	} else {
		queries["name"] = $("#foodSearchQuery").val();
	}

	var list = $("#goFoodSearchList").empty();
	requestData(GoFood.SEARCH_MERCHANTS, queries, function(data) {
		for (var i in data) {
			var foodData = data[i];
			//TODO jam buka
			var bg = foodData.imgLocation == null ? "" : "<div class='cardBG' style='background-image: url(\"" + foodData.imgLocation + "\");'></div>";
			list.append("<div class='card' onclick='showFoodMerchantScreen(\"" + foodData.uuid + "\");'>" + bg + "<div class='cardContent'><div class='primary'>" + foodData.name + "</div><div class='secondary'>" + foodData.address + "</div><div class='secondary'>" + foodData.distance.toFixed(2) + " km" + (foodData.partner ? " | Free delivery w/ GO-PAY" : "") + "</div></div></div>");
		}
		$("#foodSearchQuerySubmit").removeAttr("disabled");
	});
}

var calculatePrices = _.debounce(function() {
	// TODO: Work with vouchers

	if (polyline != null) {
		polyline.setMap(null);
	}

	if (!destSelected) {
		return;
	}

	foodPriceResponse = null;
	requestData(Booking.CALCULATE, {}, function(data) {
		foodPriceResponse = data;
		updatePrices();
		polyline = new google.maps.Polyline({
			path: google.maps.geometry.encoding.decodePath(data.routes[0].routePolyline),
			geodesic: true,
			strokeColor: "#0000FF",
			strokeWeight: POLYLINE_WEIGHT
		});
		polyline.setMap(map);
	}, true, {
		customerId: theCustomer.id,
		paymentType: 4, //NON GOPAY = 0
		routeRequests: [{
			destinationLatLong: selectedDest.latLong,
			estimatedPrice: foodEst,
			merchantId: currentResto.restaurant.merchant_id,
			originLatLong: currentResto.restaurant.location,
			serviceType: 5
		}],
		serviceType: 5
	});
}, 1000);

function showFoodMerchantScreen(uuid) {
	currentFoodCart = [];
	currentResto = null;
	var cRoot = $("<div class='container' data-id='" + currentContainerId + "' data-name='foodMerchantDetails'></div>");
	$(".siteWrapper").append(cRoot);
	var container = $("<div class='wrapper'></div>");
	cRoot.append($("<div class='scrollingContent'></div>").append(container));
	container.append("<button onclick='closeContainer(" + currentContainerId++ + ")'>< Back</button>");
	requestData(GoFood.VIEW_NEW_MERCHANT_DETAILS_UUID + uuid, {}, function(data) {
		currentResto = data;
		var restaurant = data.restaurant;

		if (restaurant.image != null) {
			container.append("<img src='" + restaurant.image + "' />");
		}

		container.append("<h1>" + restaurant.name + "</h1>");
		var list = $("<div></div>");
		container.append(list);

		for (var i in data.sections) {
			var section = data.sections[i];
			if (section.items.length < 1) {
				continue;
			}
			list.append("<div class='textSeparator'>" + section.name + "</div>");
			var sectionJq = $("<div></div>")

			for (var j in section.items) {
				var itemId = section.items[j];

				for (var itemIndex in data.items) {
					var item = data.items[itemIndex];

					if (item.id == itemId) {
						var listItem = $("<div class='settingsBox clickable twoColumn' onclick='addFoodItemToCart(" + item.shopping_item_id + ");'><div class='cLeft'><div>" + item.name + "</div><div>" + (item.description == null ? "" : item.description) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div>").attr("data-id", item.shopping_item_id);
						sectionJq.append(listItem);
						break;
					}
				}
			}

			list.append(sectionJq);
		}

		cRoot.append("<div class='estimatedCost clickable' id='foodCost' onclick='showOrder();'><div><div>Estimated cost: <b>Rp<span></span></b></div><div>PROCEED TO CART ></div></div></div>");
		updateCart();
		calculatePrices();
		// var tempText = $("<div>" + JSON.stringify(data) + "</div>");
		// container.append(tempText);
	});
}

function addFoodItemToCart(foodItemId) {
	// check if it already exist
	for (var j in currentFoodCart) {
		if (currentFoodCart[j].itemId == foodItemId) {
			currentFoodCart[j].quantity++;
			// it exists, add its quantity
			updateCartPrices();
			return;
		}
	}

	// when it doesnt exist
	var newItemBase = getFoodItemById(foodItemId);

	if (newItemBase == null) {
		alert("Something went wrong: Food item #" + foodItemId);
		return;
	}

	currentFoodCart.push({
		id: 0,
		itemDescription: newItemBase.description,
		itemId: newItemBase.shopping_item_id,
		itemName: newItemBase.name,
		notes: "",
		price: newItemBase.price,
		quantity: 1
	});
	updateCartPrices();
}


function getFoodItemById(id) {
	for (var i in currentResto.items) {
		if (currentResto.items[i].shopping_item_id == id) {
			return currentResto.items[i];
		}
	}

	return null;
}

function updateCartPrices() {
	foodEst = 0;

	for (var i in currentFoodCart) {
		foodEst += currentFoodCart[i].quantity * currentFoodCart[i].price;
	}

	$("#foodCost span").html(foodEst.formatMoney(0));
}

function updateCart() {
	updateCartPrices();

	calculatePrices();
	var cartContainer = $(".container[data-name='foodCart'] .cartList");

	if (cartContainer.length > 0) {
		cartContainer.empty();

		if (currentFoodCart.length == 0) {
			cartContainer.append("<div class='settingsBox'>Your cart is empty</div>");
		} else {
			for (var i in currentFoodCart) {
				var item = currentFoodCart[i];
				var theRow = $("<div class='settingsBox'><div class='twoColumn'><div class='cLeft'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div><div class='twoColumn'><input type='text' placeholder='Notes' class='cLeft' /><div class='quantity cRight'><button id='min'>-</button>&nbsp;" + item.quantity + "&nbsp;<button id='plus'>+</button></div></div></div>");
				cartContainer.append(theRow);
				theRow.find("input[type=text]").on("input", (function(idx) {
					return function() {
						currentFoodCart[idx].notes = this.value;
					}
				})(i)).val(currentFoodCart[i].notes);
				theRow.find("#min").click((function(_item, idx) {
					return function() {
						_item.quantity--;

						if (_item.quantity < 1) {
							currentFoodCart.splice(idx, 1);
						}

						updateCart();
					}
				})(item, i));
				theRow.find("#plus").click((function(_item) {
					return function() {
						_item.quantity++;
						updateCart();
					}
				})(item));
			}
		}
	}
}

function resetGoFoodOrder() {
	destSelected = false;
	selectedDest = null;
}

function showOrder() {
	resetGoFoodOrder();
	var cRoot = $("<div class='container' data-id='" + currentContainerId + "' data-name='foodCart'></div>");
	$(".siteWrapper").append(cRoot);
	var wrapper = $("<div class='wrapper'></div>");
	cRoot.append(wrapper);
	wrapper.append("<button onclick='closeContainer(" + currentContainerId++ + "); resetGoFoodOrder();'>< Back</button>");
	wrapper.append("<h1>Order</h1>");
	wrapper.append("<div class='textSeparator'>Cart</div>");
	var container1 = $("<div class='cartList'></div>");
	wrapper.append(container1);
	wrapper.append("<div class='textSeparator'>Payment</div>");
	var priceSummary = $("<div class='settingsBox'></div>");
	wrapper.append(priceSummary);
	priceSummary.append("<div id='foodCost' class='twoColumn'><div class='cLeft'>Cost (est.)</div><div>Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deliveryPrice' class='twoColumn'><div class='cLeft'>Delivery<span id='km'></span></div><div>Rp<span id='price'>0</span></div></div>");
	priceSummary.append("<div id='totalPrice' class='twoColumn'><div class='cLeft'>Total price</div><div>Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deductionGoPay' class='twoColumn'><div class='cLeft'>GO-PAY</div><div>- Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deductionCash' class='twoColumn'><div class='cLeft'>Cash</div><div>- Rp<span>0</span></div></div>");
	var payWith = $("<div class='settingsBox'>Pay with: <label><input type='radio' name='useGoPay' value='true' checked />GO-PAY (Rp<span class='goPayBalance'>0</span>)</label><label><input type='radio' name='useGoPay' value='false' />Cash</label></div>");
	wrapper.append(payWith);
	payWith.find("input[name=useGoPay]").on("change", function() {
		useGoPay = $("input[name=useGoPay]:checked", payWith).val() == "true";
		updatePrices();
	});
	wrapper.append("<div class='textSeparator'>Delivery address</div>");
	wrapper.append("<div id='map' style='height: 400px;'></div>");
	initGoFoodOrderMap();
	wrapper.append("<div class='settingsBox'><div><input type='text' id='destName' placeholder='Address (click on map first)' disabled style='width: 100%;' /></div><div><input type='text' id='destNote' placeholder='Notes' disabled style='width: 100%;' /></div></div>");
	$("#destName").on("input", function() {
		selectedDest.name = this.value;
	});
	$("#destNote").on("input", function() {
		selectedDest.note = this.value;
	});
	wrapper.append("<div class='textSeparator'>History (select one to set as destination)</div>");
	var historyList = $("<div class='historyList'></div>");
	wrapper.append(historyList);
	wrapper.append("<div class='textSeparator'></div>");
	wrapper.append($("<div class='settingsBox clickable orderButton'><div>ORDER</div></div>").click(function() {
		if (currentFoodCart.length < 1) {
			alert("No items in cart");
			return;
		}

		makeBooking_goFood();
	}));
	requestData(Booking.HISTORY + theCustomer.id, {
		location: makeLocation(),
		location_type: "to",
		limit: 10
	}, function(data) {
		for (var i in data) {
			var item = data[i];
			historyList.append(createHistoryEntry(item, (function(_historyItem) {
				return function() {
					selectedDest = {
						name: _historyItem.name,
						latLong: _historyItem.latLong,
						note: _historyItem.note,
						address: _historyItem.address
					};

					updateMap();
				}
			})(item)));
		}
	});
	updateGoPayBalance();
	updateCart();
	calculatePrices();
	updateMap();
}

function updateGoPayBalance() {
	requestData(GoPay.GET_BALANCE + theCustomer.id, {}, function(data) {
		$(".goPayBalance").text(data.currentBalance.formatMoney(0));
	});
}

function updateGoPointsBalance(callback) {
	requestData(GoPoints.GET_BALANCE, {}, callback);
}

var foodPriceResponse;

function updatePrices() {
	if ($.isEmptyObject(foodPriceResponse)) {
		return;
	}

	$("#foodCost span").html(foodPriceResponse.estimatedPrice.formatMoney(0));
	$("#deliveryPrice #km").text(" (" + foodPriceResponse.totalDistance + " km)");
	var deliveryPrice = 0;

	if (useGoPay && foodPriceResponse.totalCredit > 0) {
		deliveryPrice = foodPriceResponse.goPayPrice.goPayTotalPrice;
	} else {
		deliveryPrice = foodPriceResponse.subTotal;
	}

	$("#deliveryPrice #price").text(deliveryPrice.formatMoney(0));
	$("#totalPrice span").text((useGoPay ? foodPriceResponse.goPayPrice.gopay_grand_total : foodPriceResponse.totalPrice).formatMoney(0));
	var deductionGoPay = $("#deductionGoPay");

	if (useGoPay) {
		deductionGoPay.show();
		$("#deductionGoPay span").text(foodPriceResponse.totalCredit.formatMoney(0));
	} else {
		deductionGoPay.hide();
	}

	$("#deductionCash span").text((useGoPay ? foodPriceResponse.totalCash : foodPriceResponse.cashPrice).formatMoney(0));
}

function updateMap() {
	for (var i in markers) {
		markers[i].setMap(null);
	}

	markers = [];
	markers.push(createMarker(0, commaSeparatedLatLng(currentResto.restaurant.location), "Origin: " + currentResto.restaurant.name + ", " + currentResto.restaurant.address));
	destSelected = !$.isEmptyObject(selectedDest);

	if (destSelected) {
		markers.push(createMarker(1, commaSeparatedLatLng(selectedDest.latLong), "Destination: " + selectedDest.address));
	}

	for (var i in markers) {
		markers[i].setMap(map);
	}

	if (!destSelected)
		return;

	$("#destName").removeAttr("disabled").val(selectedDest.name);
	var destNote = $("#destNote")[0];
	destNote.disabled = false;
	destNote.value = selectedDest.note;
	calculatePrices();
}

function createMarker(markerType, latLng, title) {
	var color = "red";
	var name = "";
	switch (markerType) {
		case 0:
			color = "blue";
			name = "Pick up location";
			break;
		case 1:
			color = "orange";
			name = "Destination";
			break;
		case 2:
			color = "green";
			name = "Driver";
			break;
	}
	var s = title == null ? "" : ": " + title;
	return new google.maps.Marker({
		position: latLng,
		title: name + s,
		icon: "http://maps.google.com/mapfiles/ms/icons/" + color + "-dot.png"
	});
}

function makeBooking_goFood() {
	var payload = {
		"activitySource": 2,
		"buyer": {
			"name": "",
			"phone": ""
		},
		"corporateFee": {
			"total": 0
		},
		"customerId": theCustomer.id,
		"deviceToken": "",
		"gcmKey": "",
		"optionReturn": 0, // always 0
		"paymentType": useGoPay ? 4 : 0,
		"routes": [{
			"checkpartner": true,
			"destinationAddress": selectedDest.address,
			"destinationLatLong": selectedDest.latLong,
			"destinationName": selectedDest.name,
			"destinationNote": selectedDest.note,
			"detailsAddress": currentResto.restaurant.detail_address,
			"estimatedPrice": foodEst,
			"item": "",
			"merchantId": currentResto.restaurant.merchant_id,
			"originAddress": currentResto.restaurant.address,
			"originContactName": "",
			"originContactPhone": "",
			"originLatLong": currentResto.restaurant.location,
			"originName": currentResto.restaurant.name,
			"originNote": currentResto.restaurant.address,
			"routeItems": currentFoodCart,
			"serviceType": 5
		}]
	};
	requestData(Booking.MAKE, {}, function(data) {
		$("[data-name=foodMerchantDetails], [data-name=foodCart]").remove();
		showContainer("home");

		if (data.errorMessage == null)
			alert("Your booking has been placed with no. " + data.orderNo + ". Check the booking via the history page.");
	}, true, payload);
}

function isNullOrEmpty(paramString) {
	return paramString == null && paramString.length == 0;
}

function makeBooking_goRide() {
	var payload = {
		"activitySource": 2,
		"buyer": {
			"name": "",
			"phone": ""
		},
		"corporateFee": {
			"total": 0
		},
		"customerId": theCustomer.id,
		"deviceToken": "",
		"gcmKey": "",
		"optionReturn": 0,
		"paymentType": useGoPay ? 4 : 0,
		"routes": [{
			"checkpartner": false,
			"destinationAddress": goRideTo.address,
			"destinationContactName": "",
			"destinationContactPhone": "",
			"destinationLatLong": goRideTo.latLong,
			"destinationName": goRideTo.name,
			"destinationNote": goRideTo.note,
			"estimatedPrice": "",
			"item": "",
			"merchantId": 0,
			"originAddress": goRideFrom.address,
			"originContactName": "",
			"originContactPhone": "",
			"originLatLong": goRideFrom.latLong,
			"originName": goRideFrom.name,
			"originNote": goRideFrom.note,
			"routeItems": [],
			"serviceType": 1
		}],
		"vehicle_type": "bike"
	};
	requestData(Booking.MAKE, {}, function(data) {
		showContainer("home");

		if (data.errorMessage == null)
			alert("Your booking has been placed with no. " + data.orderNo + ". Check the booking via the history page.");
	}, true, payload);
}

var bookingId;
var bookingInterval;
var currentBookingData;
var bookingPolyline;
var bookingDriverMarker;
var bookingOriginMarker;
var bookingDestinationMarker;
var bookingFirstRequest;

function showBooking(id) {
	bookingId = id;
	var container = $("<div class='container' data-id='" + currentContainerId + "' data-name='viewBooking'></div>");
	$(".siteWrapper").append(container);
	var wrapper = $("<div class='wrapper'></div>");
	container.append(wrapper);
	wrapper.append("<button onclick='closeBooking();'>< Back</button>")
		.append("<h1>Order No. " + bookingId + "</h1>")
		.append("<div class='settingsBox twoColumn' id='bookingFrom'><div>From</div><div class='cLeft'><div class='name'></div><div class='note'></div></div></div>")
		.append("<div class='settingsBox twoColumn' id='bookingTo'><div>To</div><div class='cLeft'><div class='name'></div><div class='note'></div></div></div>")
		.append("<div id='bookingMap' style='height: 400px;'></div>")
		.append("<div class='settingsBox'><div id='driverInfo'></div></div>")
		.append("<div class='settingsBox' id='bookingStatusText'></div>")
		.append($("<div class='textSeparator' id='bookingFoodItemsTitle'>Food items</div>").hide())
		.append($("<div id='bookingFoodItems'></div>").hide())
		.append($("<button id='instantRate'>Rate 5 stars</button>").hide().click(function() {
			rateBookingGoFood(currentBookingData.orderNo, 5, "", function(data) {
				if (data.statusMessage == "OK") {
					alert("You rated this order 5 stars");
				}
			});
		}))
		.append("<button id='bookingCancel'>Cancel...</button>");
	bookingFirstRequest = true;
	bookingInterval = setInterval(reqDataUpdateBooking, 7500);
	reqDataUpdateBooking();
	initBookingMap();
}

function reqDataUpdateBooking() {
	requestData(Booking.GET_BY_NO + bookingId, {}, function(data) {
		currentBookingData = data;
		updateBookingContents();
		bookingFirstRequest = false;
	});
}

function closeBooking() {
	clearInterval(bookingInterval);
	$(".container[data-name=viewBooking]").remove();
	showContainer("bookingHistory");
}

function updateBookingContents() {
	// TODO: MAKE IT LIKE IN THE REAL GOJEK APP
	var address = currentBookingData.addresses[0];
	var driverFound = currentBookingData.driverId != null;
	var driverInfo = driverFound ? [currentBookingData.driverName, currentBookingData.driverPhone, currentBookingData.noPolisi.replaceAll(" ", "")].join(", ") : "";
	$("#driverInfo").html(isGoJekCompleteBooking(currentBookingData) ? getStatusMessage(currentBookingData) + (driverFound ? "<br>" + driverInfo : "") : (!driverFound ? "Finding driver" : driverInfo));
	var instantRate = $("#instantRate");

	if (isGoJekCompleteBooking(currentBookingData) && currentBookingData.serviceType == 5 && currentBookingData.rate == null && !isCanceled(currentBookingData)) {
		instantRate.show();
	} else {
		instantRate.hide();
	}

	setEnabled($("#bookingCancel").unbind("click").click(function() {
		showContainer("bookingCancel");
	}), !isGoJekCompleteBooking(currentBookingData));

	if (bookingPolyline != null) bookingPolyline.setMap(null);
	if (bookingOriginMarker != null) bookingOriginMarker.setMap(null);
	if (bookingDestinationMarker != null) bookingDestinationMarker.setMap(null);
	if (bookingDriverMarker != null) bookingDriverMarker.setMap(null);

	bookingPolyline = new google.maps.Polyline({
		path: google.maps.geometry.encoding.decodePath(currentBookingData.addresses[0].routePolyline),
		geodesic: true,
		strokeColor: "#0000FF",
		strokeWeight: POLYLINE_WEIGHT
	});
	bookingPolyline.setMap(bookingMap);
	bookingOriginMarker = new google.maps.Marker({
		position: commaSeparatedLatLng(currentBookingData.addresses[0].latLongOrigin),
		title: "Your pick up location",
		icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
	});
	bookingOriginMarker.setMap(bookingMap);
	bookingDestinationMarker = new google.maps.Marker({
		position: commaSeparatedLatLng(currentBookingData.addresses[0].latLongDestination),
		title: "Your destination",
		icon: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
	});
	bookingDestinationMarker.setMap(bookingMap);

	if (bookingFirstRequest) {
		var bookingFrom = $("#bookingFrom");
		var bookingTo = $("#bookingTo");
		$(".name", bookingFrom).text(address.originName);
		$(".note", bookingFrom).text(address.originNote);
		$(".name", bookingTo).text(address.destinationName);
		$(".note", bookingTo).text(address.destinationNote);
		
		if (currentBookingData.serviceType == 5) {
			$("#bookingFoodItemsTitle").show();
			var bookingFoodItems = $("#bookingFoodItems").empty().show();
			var routeItems = currentBookingData.addresses[0].routeItems;

			for (var i in routeItems) {
				var item = routeItems[i];
				var theRow = $("<div class='settingsBox'><div class='twoColumn'><div class='cLeft'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div><div class='twoColumn'><div class='cLeft'>" + item.notes + "</div><div class='quantity cRight'>" + item.quantity + "</div></div></div>");
				bookingFoodItems.append(theRow);
			}
		}
	}

	if (!driverFound) return;

	bookingDriverMarker = new google.maps.Marker({
		position: {
			lat: currentBookingData.driverLatitude,
			lng: currentBookingData.driverLongitude
		},
		title: "Driver",
		icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
	});
	bookingDriverMarker.setMap(bookingMap);
	return;
	//BOTTOM ARE DEAD CODE-- I NEED TO LOOK AT THE CLIENT ONCE MORE

	var statusText = "";
	if (currentBookingData.statusBooking == 7) {
		// disable cancel button, show driver actions
		if (currentBookingData.serviceType == 5) {
			statusText = "Delivering food";
		} else if (currentBookingData.serviceType == 6) {
			statusText = "Delivering item";
		}

		// DriverOnTheWayPresenter.access$200(this.this$0);
		// if (currentBookingData.serviceType != 13 && currentBookingData.serviceType != 24) {
		// 	if (DriverOnTheWayPresenter.access$300(this.this$0, false)) {
		// 		loadDriverIcon(DriverOnTheWayPresenter.access$400(this.this$0).ˊॱ, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude, false);
		// 	} else {
		// 		loadDefaultBikeIcon(DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude);
		// 	}
		// } else if (DriverOnTheWayPresenter.access$300(this.this$0, true)) {
		// 	loadDriverIcon(DriverOnTheWayPresenter.access$400(this.this$0).ʼ, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude, true);
		// } else {
		// 	loadDefaultCarIcon(DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude);
		// }
	} else {
		if (currentBookingData.serviceType == 6) {
			statusText = "On the way";
		} else {
			// setBookingNoEta(this.this$0.computeEta(DriverOnTheWayPresenter.access$000(this.this$0).ˋ.intValue()));
			statusText = "Picking up food";
		}

		// if (currentBookingData.serviceType != 13 && currentBookingData.serviceType != 24) {
		// 	if (DriverOnTheWayPresenter.access$300(this.this$0, false)) {
		// 		loadDriverIcon(DriverOnTheWayPresenter.access$400(this.this$0).ˊॱ, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude, false);
		// 	} else {
		// 		loadDefaultBikeIcon(DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude);
		// 	}
		// } else if (DriverOnTheWayPresenter.access$300(this.this$0, true)) {
		// 	loadDriverIcon(DriverOnTheWayPresenter.access$400(this.this$0).ʼ, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude, true);
		// } else {
		// 	loadDefaultCarIcon(DriverOnTheWayPresenter.access$000(this.this$0).ˊ.latitude, DriverOnTheWayPresenter.access$000(this.this$0).ˊ.longitude);
		// }
	}
	$("#bookingStatusText").text(statusText);
}

function rateBookingGoFood(orderNo, stars, feedback, callback) {
	requestData("/gojek/v2/booking/rate", {}, callback, true, {
		activitySource: 2,
		feedback: feedback == null ? "" : feedback,
		isHelmetAndJacket: false,
		isMaskerAndHairCover: false,
		orderNo: orderNo,
		predefineFeedbackId: 0,
		rate: stars,
		tipAmount: 0
	});
}

function commaSeparatedLatLng(paramString) {
	var splt = paramString.split(",");
	return {
		lat: parseFloat(splt[0]),
		lng: parseFloat(splt[1])
	};
}

function getStatusMessage(paramBooking) {
	if (paramBooking.statusBooking == 5) {
		return "Cannot find driver";
	}

	if (!isZeroOrNull(paramBooking.cancelReasonId)) {
		return "Canceled by " + paramBooking.cancelBy + ": " + paramBooking.cancelDescription;
	}

	return "Completed";
}

function initBookingMap() {
	var curloc = {
		lat: currentLocation.coords.latitude,
		lng: currentLocation.coords.longitude
	};
	bookingMap = new google.maps.Map(document.getElementById('bookingMap'), {
		zoom: 16,
		center: curloc,
		clickableIcons: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true
	});
}

function formatDate(paramDate) {
	var day = paramDate.getDate();
	day = (day < 10) ? "0" + day : day;
	var month = paramDate.getMonth() + 1;
	month = (month < 10) ? "0" + month : month;
	var date = paramDate.getFullYear() + "-" + month + "-" + day + " " + paramDate.toLocaleTimeString();
	return (date);
}

function constructBookingEntry(paramBooking) {
	var addressData = paramBooking.addresses[0];
	var status = "",
		name = addressData.destinationName,
		address = addressData.destinationAddress;
	adapt: {
		if (paramBooking.serviceType == 12) {
			if (paramBooking.statusBooking == 2) {
				status = "Booking in progress";
				name = addressData.originName;
				address = addressData.originAddress;
				break adapt;
			}
			if (paramBooking.statusBooking == 7) {
				status = "Booking in progress";
				name = addressData.destinationName;
				address = addressData.destinationAddress;
				break adapt;
			}
			//TODO
			status = GoMedConstant.translateOrderStatus(paramBooking.statusBooking);
			name = addressData.destinationName;
			address = addressData.destinationAddress;
			break adapt;
		}
		if (paramBooking.statusBooking == 8) {
			status = "Pre-Booking";
			break adapt;
		}
		if ((paramBooking.statusBooking == 2) || (paramBooking.statusBooking == 7)) {
			status = "Booking in progress";
			break adapt;
		}
		if (paramBooking.statusBooking == 6) {
			status = "Finding driver";
			break adapt;
		}
		status = "";
	}

	var box = $("<div class='settingsBox clickable'></div>");
	box.click(function() {
		if (paramBooking.serviceType != 5 && paramBooking.serviceType != 1) {
			alert("For this time this web app only supports GO-RIDE and GO-FOOD bookings. More services will be added in the (not too distant) future.");
			return;
		}

		showBooking(paramBooking.orderNo);
	});
	box.append("<div>#" + paramBooking.orderNo + ", " + getNameOfServiceByInt(paramBooking.serviceType).toUpperCase() + ", " + formatDate(new Date(paramBooking.timeField)) + "</div>");

	if (!isGoJekCompleteBooking(paramBooking)) {
		box.append("<div>" + status + "</div>");
	}

	box.append("<div>" + name + "</div>");

	if (isCanceled(paramBooking)) {
		box.append("<div style='color: maroon; font-weight: bold;'>CANCELED</div>");
	}

	return box;
}

function isCanceled(paramBooking) {
	var bool;

	if (((paramBooking.statusBooking == 2) && isZeroOrNull(paramBooking.flagBooking)) || (paramBooking.cancelReasonId == 4) || ((paramBooking.serviceType == 7) && ((paramBooking.statusBooking == 7) || (paramBooking.statusBooking == 4)))) {
		bool = true;
	} else if ((paramBooking.statusBooking == 0) && (paramBooking.serviceType == 14)) {
		bool = true;
	} else if (!isZeroOrNull(paramBooking.cancelReasonId)) {
		bool = true;
	} else {
		bool = false;
	}

	return bool;
}

function showContainer(name) {
	$(".container").hide();
	var ret = $("[data-name=" + name + "]").show();
	initContainer(name, ret);
	return ret;
}
var selectedCancel;

function initContainer(name, elm) {
	switch (name) {
		case "home":
			updateGoPayBalance();
			updateGoPointsBalance(function(data) {
				$(".goPointsBalance", elm).text(data.points_balance + " point" + plural(data.points_balance) + ", " + data.tokens_balance + " token" + plural(data.tokens_balance));
			});
			break;
		case "goPoints":
			updateGoPointsBalance(function(data) {
				$(".goPointsBalance", elm).text(data.points_balance);
				$(".goPointsTokenBalance", elm).text(data.tokens_balance);
				var redeemToken = $("#redeemToken").unbind("click").click(function() {
					var origText = this.innerHTML;
					requestData(GoPoints.NEXT_TOKEN, {}, function(data) {
						setEnabled($(this), false);
						this.innerHTML = "Redeeming token...";
						requestData(GoPoints.REDEEM_TOKEN, {}, function(data1) {
							this.innerHTML = origText;
							if (data1.success) {
								alert("Redeemed token from " + data.service_type + ", added " + data.points + " token(s)");
							}
							initContainer(name);
						}, true, {
							points_token_id: data.points_token_id
						});
					}, true, {});
				});
				setEnabled(redeemToken, data.tokens_balance > 0);
			});
			break;
		case "bookingHistory":
			requestData(Booking.HISTORY_FULL + theCustomer.id, {}, function(data) {
				var inProgressBookings = [];
				var completedBookings = [];

				for (var i in data) {
					var booking = data[i];

					if (isGoJekCompleteBooking(booking)) {
						completedBookings.push(booking);
					} else {
						inProgressBookings.push(booking);
					}
				}

				var inProgressList = $("#inProgressList", elm).empty();
				var completedList = $("#completedList", elm).empty();

				if (inProgressBookings.length < 1) {
					inProgressList.append("<div class='settingsBox'>You have no in progress bookings</div>");
				} else {
					for (var i in inProgressBookings) {
						inProgressList.append(constructBookingEntry(inProgressBookings[i]));
					}
				}

				if (completedBookings.length < 1) {
					completedList.append("<div class='settingsBox'>You have no completed bookings</div>");
				} else {
					for (var i in completedBookings) {
						completedList.append(constructBookingEntry(completedBookings[i]));
					}
				}
			});
			break;
		case "goRide":
			initGoRide(elm);
			break;
		case "goFood":
			var shortcuts = $("#shortcuts", elm).empty();
			var cuisines = $("#cuisines", elm).empty();

			requestData(GoFood.HOME_NEW, {
				location: makeLocation()
			}, function(data) {
				for (var i in data.shortcuts) {
					var shortcut = data.shortcuts[i];
					shortcuts.append($("<div class='card cardContent'><img src=" + shortcut.icon.url + " /><div>" + shortcut.name + "</div></div>").click((function(shortcut) {
						return function() {
							showSearch(shortcut.code, shortcut.name);
						};
					})(shortcut)));
				}
				for (var i in data.cuisines) {
					var cuisine = data.cuisines[i];
					cuisines.append($("<div class='card cardBG' style='background-image: url(\"" + cuisine.image_cover.url + "\");'><div class='cardContent'>" + cuisine.name + "</div></div>").click((function(cuisine) {
						return function() {
							showSearch(cuisine.code, cuisine.name);
						};
					})(cuisine)));
				}
			});
			break;
		case "bookingCancel":
			selectedCancel = null;
			var cancelConfirm = $("#cancelConfirm", elm).unbind("click").click(function() {
				var theThis = this;
				this.disabled = true;
				xRequestData("/gojek/v2/booking/cancelBookingCustomer", {}, function(data) {
					theThis.disabled = false;
					if (data != null) {
						alert(data.message);
						showContainer("viewBooking");
					}
				}, "PUT", {
					activitySource: 2,
					bookingId: currentBookingData.id,
					cancelDescription: selectedCancel.desc,
					cancelReasonId: selectedCancel.id,
					orderNo: currentBookingData.orderNo
				});
			});
			setEnabled(cancelConfirm, false);
			var cancelList = $("#cancelList", elm).empty().append("Loading...");
			requestData("/gojek/cancelreason/customer/list", {}, function(data) {
				cancelList.empty();
				for (var i in data) {
					var cancelReason = data[i];
					labelasdf: {
						for (var j in cancelReason.cancelReasonServiceTypeVOs) {
							var cancelReasonServiceTypeVO = cancelReason.cancelReasonServiceTypeVOs[j];
							if (currentBookingData.serviceType == cancelReasonServiceTypeVO.serviceType && currentBookingData.status == cancelReasonServiceTypeVO.driverState) {
								cancelList.append($("<div class='settingsBox'></div>").append($("<label></label>").append("<input type='radio' name='cancelReason' value='" + cancelReason.id + "," + cancelReason.reason + "' />").append(cancelReason.reason)));
								break labelasdf;
							}
						}
					}
				}
				cancelList.find("input[name=cancelReason]").on("change", function() {
					var splt = $("input[name=cancelReason]:checked", elm).val().split(",");
					selectedCancel = {
						id: splt[0],
						desc: splt[1]
					};
					setEnabled(cancelConfirm, true);
				});
			});
			break;
	}
}

function setEnabled(jq, bool) {
	if (bool) {
		jq.removeAttr("disabled");
	} else {
		jq.attr("disabled", true);
	}
}

function isZeroOrNull(paramInt) {
	return paramInt == 0 || paramInt == null;
}

function getNameOfServiceByInt(paramInt) {
	switch (paramInt) {
		default: break;
		case 1:
				return "Go-Ride";
		case 2:
				case 14:
				return "Go-Send";
		case 3:
				return "Go-Shop";
		case 6:
				return "Go-Mart";
		case 5:
				return "Go-Food";
		case 13:
				case 24:
				return "Go-Car";
		case 7:
				return "Go-Box";
		case 11:
				return "Go-Tix";
		case 4:
				return "Go-Massage";
		case 8:
				return "Go-Glam";
		case 9:
				return "Go-Clean";
		case 15:
				return "Go-Auto";
		case 10:
				return "Go-Busway";
		case 12:
				return "Go-Med";
		case 19:
				return "Go-Bluebird";
		case 20:
				return "Go-Silver";
		case 21:
				return "Go-Pulsa";
		case 25:
				return "Go-Points";
	}
	return "No-Service";
}

function isGoJekCompleteBooking(paramBooking) {
	return ((paramBooking.statusBooking == 4) || (paramBooking.statusBooking == 0) || (paramBooking.statusBooking == 5) || !isZeroOrNull(paramBooking.cancelReasonId)) && (paramBooking.serviceType != 12) && (paramBooking.serviceType != 7) && (paramBooking.serviceType != 14);
}

var polyline;

function initGoFoodOrderMap() {
	var curloc = {
		lat: currentLocation.coords.latitude,
		lng: currentLocation.coords.longitude
	};
	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 16,
		center: curloc,
		clickableIcons: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true
	});
	map.addListener("click", function(e) {
		var stringLatLong = e.latLng.lat() + "," + e.latLng.lng();
		requestData(Booking.REVERSE_GEOCODE, {
			latLong: stringLatLong
		}, function(data) {
			selectedDest = {
				name: data.name,
				latLong: stringLatLong,
				note: "",
				address: data.address
			};

			updateMap();
		});
	});
}

var goRideNearbyDriverMarkers = [];

function initGoRide(elm) {
	goRideFromMarker = null;
	goRideToMarker = null;
	goRideFrom = {};
	goRideTo = {};
	$("#goRideMap", elm).empty();
	goRideMap = new google.maps.Map(document.getElementById("goRideMap"), {
		zoom: 16,
		center: {
			lat: currentLocation.coords.latitude,
			lng: currentLocation.coords.longitude
		},
		clickableIcons: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true
	});

	for (var i in goRideNearbyDriverMarkers) {
		goRideNearbyDriverMarkers[i].setMap(null);
	}

	goRideNearbyDriverMarkers = [];
	requestData("/gojek/service_type/1/drivers/nearby", {
		location: makeLocation()
	}, function(data) {
		for (var i in data) {
			var marker = createMarker(2, commaSeparatedLatLng(data[i].driverLatLong), "Nearby driver");
			marker.setMap(goRideMap);
			goRideNearbyDriverMarkers.push(marker);
		}
	});
	var historyFrom = $("#goRideHistoryFrom", elm).empty().hide();
	var historyTo = $("#goRideHistoryTo", elm).empty().hide();
	var suggestionFrom = $("#goRideSuggestionFrom", elm).empty().hide();
	var suggestionTo = $("#goRideSuggestionTo", elm).empty().hide();
	var queries = {
		location: makeLocation,
		limit: 100,
		service_type: 1
	};
	queries["location_type"] = "from";
	requestData("/gojek/customer/v2/history/" + theCustomer.id, queries, function(data) {
		for (var i in data) {
			historyFrom.append(createHistoryEntry(data[i], (function(historyData) {
				return function() {
					goRideSet(historyData, false, elm);
				}
			})(data[i])));
		}
	});
	queries["location_type"] = "to";
	requestData("/gojek/customer/v2/history/" + theCustomer.id, queries, function(data) {
		for (var i in data) {
			historyTo.append(createHistoryEntry(data[i], (function(historyData) {
				return function() {
					goRideSet(historyData, true, elm);
				}
			})(data[i])));
		}
	});
	$("#goRideFrom", elm).unbind("mousedown").mousedown(function() {
		goRideSelectTo = false;
		updateGoRideOrder(elm);
	});
	$("#goRideTo", elm).unbind("mousedown").mousedown(function() {
		goRideSelectTo = true;
		updateGoRideOrder(elm);
	});
	$("#goRideFromName", elm).val("").unbind("input").on("input", function() {
		updateGoRideOrder(elm);
		updateGoRideSuggestion(this.value, false, elm);
	});
	$("#goRideToName", elm).val("").unbind("input").on("input", function() {
		updateGoRideOrder(elm);
		updateGoRideSuggestion(this.value, true, elm);
	});
	$("#goRideFromNote", elm).val("").unbind("input").on("input", function() {
		if ($.isEmptyObject(goRideFrom)) {
			this.value = "";
		} else {
			goRideFrom.note = this.value;
		}
	});
	$("#goRideToNote", elm).val("").unbind("input").on("input", function() {
		if ($.isEmptyObject(goRideTo)) {
			this.value = "";
		} else {
			goRideTo.note = this.value;
		}
	});
	$(".orderButton", elm).unbind("click").click(function() {
		if ($.isEmptyObject(goRideFrom) || $.isEmptyObject(goRideTo)) {
			alert("One of the locations are not yet set.");
			return;
		}

		makeBooking_goRide();
	});
	goRideMap.addListener("click", function(e) {
		var stringLatLong = e.latLng.lat() + "," + e.latLng.lng();
		requestData(Booking.REVERSE_GEOCODE, {
			latLong: stringLatLong
		}, function(data) {
			goRideSet({
				name: data.address,
				latLong: stringLatLong,
				note: "",
				address: data.address
			}, goRideSelectTo, elm);

			updateGoRideOrder(elm);
		});
	});
}

function updateGoRideOrder(elm) {
	var fromBox = $("#goRideFrom", elm);
	var toBox = $("#goRideTo", elm);
	var color = "#E0E0E0";
	var historyFrom = $("#goRideHistoryFrom", elm);
	var historyTo = $("#goRideHistoryTo", elm);
	var suggestionFrom = $("#goRideSuggestionFrom", elm);
	var suggestionTo = $("#goRideSuggestionTo", elm);

	if (goRideSelectTo) {
		fromBox[0].style.background = null;
		toBox[0].style.background = color;
		$("#goRideHistoryFrom", elm).hide();
		$("#goRideSuggestionFrom", elm).hide();
		$("#goRideHistoryTo", elm).show();

		if ($("#goRideToName", elm).val() == "") {
			historyTo.show();
			suggestionTo.hide();
		} else {
			historyTo.hide();
			suggestionTo.show();
		}
	} else {
		fromBox[0].style.background = color;
		toBox[0].style.background = null;
		$("#goRideHistoryFrom", elm).show();
		$("#goRideHistoryTo", elm).hide();
		$("#goRideSuggestionTo", elm).hide();

		if ($("#goRideFromName", elm).val() == "") {
			historyFrom.show();
			suggestionFrom.hide();
		} else {
			historyFrom.hide();
			suggestionFrom.show();
		}
	}
}

var debounceLoadSuggestion = _.debounce(function(val, target, isTo, elm) {
	target.html("<div class='settingsBox'>Searching...</div>");
	requestData("/gojek/poi/v2/findPoi", {
		name: val
	}, function(data) {
		target.empty();
		for (var i in data) {
			target.append($("<div class='settingsBox clickable'><b>" + data[i].name + "</b></div>").click((function(gojekPlaceId, isTo) {
				return function() {
					requestData("/gojek/poi/v2/findLatLng", {
						gojekPlaceId: gojekPlaceId
					}, function(data) {
						var toSet = {
							address: data.address,
							latLong: data.latitude + "," + data.longitude,
							name: data.address,
							note: ""
						};

						goRideSet(toSet, isTo, elm);
					});
					target.empty();
				};
			})(data[i].gojekPlaceId, isTo)));
		}
	});
}, 1000);

function updateGoRideSuggestion(val, isTo, elm) {
	var target = $(isTo ? "#goRideSuggestionTo" : "#goRideSuggestionFrom", elm).empty();
	if (val == "") return;
	debounceLoadSuggestion(val, target, isTo, elm);
}

function goRideSet(paramAddress, isDestination, elm) {
	if (isDestination) {
		goRideTo = paramAddress;
		$("#goRideToName", elm).val(goRideTo.name);
		$("#goRideToNote", elm).val(goRideTo.note);

		if (goRideToMarker == null) {
			goRideToMarker = createMarker(1, commaSeparatedLatLng(goRideTo.latLong));
			goRideToMarker.setMap(goRideMap);
		} else {
			goRideToMarker.setPosition(commaSeparatedLatLng(goRideTo.latLong));
		}
	} else {
		goRideFrom = paramAddress;
		$("#goRideFromName", elm).val(goRideFrom.name);
		$("#goRideFromNote", elm).val(goRideFrom.note);

		if (goRideFromMarker == null) {
			goRideFromMarker = createMarker(0, commaSeparatedLatLng(goRideFrom.latLong));
			goRideFromMarker.setMap(goRideMap);
		} else {
			goRideFromMarker.setPosition(commaSeparatedLatLng(goRideFrom.latLong));
		}
	}

	updateGoRideOrder();
}

function createHistoryEntry(paramAddress, clickCallback) {
	return $("<div class='settingsBox clickable'></div>").append("<div><b>" + paramAddress.name + "</b></div>").append("<div>" + paramAddress.note + "</div>").click(clickCallback);
}

function closeContainer(id) {
	$(".container[data-id=" + id + "]").remove();
}

function requestData(req, data, callback, post, payload) {
	data = (data) ? data : {};
	callback = (callback) ? callback : $.noop;
	var _post = (post != undefined) ? post : false;
	var options = {
		type: (_post) ? "POST" : "GET",
		url: "https://api.gojekapi.com" + req + ($.isEmptyObject(data) ? "" : "?" + $.param(data)),
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		headers: generateAjaxHeaders(),
		success: callback,
		statusCode: {
			// 401: function() {
			// 	alert("You have been logged out because of an expired session");
			// 	logout();
			// }
		}
	};
	if (_post)
		options["data"] = JSON.stringify(payload);
	$.ajax(options);
}

function xRequestData(req, queries, callback, method, payload) {
	queries = queries || {};
	callback = callback || $.noop;
	method = method || "GET";
	var options = {
		type: method,
		url: "https://api.gojekapi.com" + req + ($.isEmptyObject(queries) ? "" : "?" + $.param(queries)),
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		headers: generateAjaxHeaders(),
		complete: function(xhr, statusText, errorThrown) {
			var response;

			try {
				response = JSON.parse(xhr.responseText);
			} catch (e) {
				response = null;
				console.log("Ajax failed and the response is not in JSON");
			}

			callback(response);
		}
	};
	if (method == "PUT" || method == "POST")
		options["data"] = JSON.stringify(payload);
	$.ajax(options);
}

function generateAjaxHeaders() {
	return {
		"Authorization": "Bearer " + accessToken,
		"X-AppVersion": FAKE_APPVER,
		"X-UniqueId": FAKE_UNIQUE_ID,
		"X-Location": makeLocation(),
		"X-User-Locale": "en_ID",
		"X-Platform": "Android",
		"X-AppId": "com.gojek.app",
		"user-uuid": theCustomer.id,
		"Accept-Language": "en-ID"
	};
}

function plural(paramInt) {
	return paramInt == 1 ? "" : "s";
}

function makeLocation() {
	return currentLocation.coords.latitude + "," + currentLocation.coords.longitude;
}

Number.prototype.formatMoney = function(c, d, t) {
	var n = this,
		c = isNaN(c = Math.abs(c)) ? 2 : c,
		d = d == undefined ? "." : d,
		t = t == undefined ? "," : t,
		s = n < 0 ? "-" : "",
		i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};