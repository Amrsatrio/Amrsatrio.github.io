Profile = {
	LOGIN: "/gojek/v2/login"
}
GoFood = {
	GET_CATEGORIES: "/gojek/shopping-category/find",
	SEARCH_MERCHANTS: "/gojek/merchant/find",
	VIEW_NEW_MERCHANT_DETAILS_UUID: "/gofood/consumer/v2/restaurants/",
	HOME_NEW: "/gofood/consumer/v2/home"
}
Booking = {
	HISTORY: "/gojek/v2/customer/v2/history/",
	HISTORY_FULL: "/gojek/v2/booking/history/",
	CALCULATE: "/gojek/v2/calculate/gopay/",
	MAKE: "/gojek/v2/booking/v3/makeBooking",
	GET_BY_NO: "/gojek/v2/booking/findByOrderNo/",
	REVERSE_GEOCODE: "/gojek/poi/reverse-geocode"
}
GoPay = {
	GET_BALANCE: "/gojek/v2/customer/currentBalance/"
}
GoPoints = {
	GET_BALANCE: "/gopoints/v1/wallet/points-balance",
	NEXT_TOKEN: "/gopoints/v1/next-points-token",
	REDEEM_TOKEN: "/gopoints/v1/redeem-points-token"
}
Cookies = {
	EMAIL: "EMAIL",
	REFRESH_TOKEN: "REFRESHTOKEN"
}
var POLYLINE_WEIGHT = 3;
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var FAKE_APPVER = "2.17.3";
var FAKE_UNIQUE_ID = "0123456789abcdef"; //"788f6110c67f8070";
var FAKE_IMEI = "305825702132830";
var BASE_URL = "https://api.gojekapi.com";
var currentLocation;
var accessToken = "";
// var refreshToken;
var theCustomer;
var currentContainerId = 0;
var currentResto;
var currentFoodCart;
var goFoodSelectedDest = {};
var goFoodUseGoPay = true;
var markers = [];
var map;
var goFoodPolyline;
var goFoodDestSelected = false;
var goRideFrom = {};
var goRideTo = {};
var goRideFromMarker;
var goRideToMarker;
var goRideSelectTo = false;
var goRideUseGoPay = true;
var failedMap;
var failedMarker;
var failedSelectLatLng;

function createLoginRequest(email, password) {
	return {
		username: email,
		client_id: "trusted-client",
		grant_type: "password",
		password: password
	};
}

function createLoginRequestRefreshToken(email, refreshToken) {
	return {
		username: email,
		client_id: "trusted-client",
		grant_type: "refresh_token",
		refresh_token: refreshToken
	};
}

function loginSubmit() {
	doLogin(createLoginRequest($("#email").val(), $("#password").val()));
}

function doLogin(payload) {
	var submitButton = $("#submit");
	var loader = $(".loginForm .loader");
	var inputs = setEnabled($(".loginForm input"), false);
	var loginError = $("#loginError").hide();
	showHide(setEnabled(submitButton, false), loader, false);
	$.ajax({
		url: BASE_URL + Profile.LOGIN,
		type: "POST",
		data: JSON.stringify(payload),
		beforeSend: function(xhr) {
			xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
			xhr.setRequestHeader("X-AppVersion", FAKE_APPVER);
			xhr.setRequestHeader("X-UniqueId", FAKE_UNIQUE_ID);
		},
		complete: function(xhr, statusText, errorThrown) {
			showHide(setEnabled(submitButton, true), loader, true);
			setEnabled(inputs, true);
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
				theCustomer = response.customer;

				if ($("[name=autoSignIn]")[0].checked) {
					setCookie(Cookies.EMAIL, theCustomer.email);
					setCookie(Cookies.REFRESH_TOKEN, response.refresh_token)
				} else {
					clearEmailRefreshToken();
				}

				$("#homeCustomerName").text(theCustomer.name);
				$("#homeCustomerEmail").text(theCustomer.email);
				$("#homeCustomerPhone").text(formatPhoneNumber(theCustomer.phone));
				showContainer("home");
				$(".tab:first-child", $("[data-tabcontainername=HOME]")).click();
			} else {
				clearEmailRefreshToken();
				loginError.show().html(response.message || ("<b>" + response.errors[0].message_title + ":</b> " + response.errors[0].message));
			}
		}
	});
	// xRequestData(Profile.LOGIN, {}, function(response) {
	// 	response = response || {
	// 		status: "FAILED",
	// 		message: "Check your Internet connection"
	// 	};

	// 	if (response.status == "OK") {
	// 		accessToken = response.access_token;
	// 		refreshToken = response.refresh_token;
	// 		theCustomer = response.customer;
	// 		$("#homeCustomerName").text(theCustomer.name);
	// 		$("#homeCustomerEmail").text(theCustomer.email);
	// 		$("#homeCustomerPhone").text(formatPhoneNumber(theCustomer.phone));
	// 		showHide(submitButton, loader, true);
	// 		showContainer("home");
	// 		$(".tab:first-child", $("[data-tabcontainername=HOME]")).click();
	// 	} else {
	// 		alert(response.message);
	// 		showHide(submitButton, loader, true);
	// 	}
	// }, "POST", payload);
}

function clearEmailRefreshToken() {
	localStorage.removeItem(Cookies.EMAIL);
	localStorage.removeItem(Cookies.REFRESH_TOKEN);
}

function showHide(a, b, bool) {
	if (bool) {
		a.show();
		b.hide();
	} else {
		a.hide();
		b.show();
	}
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
	$(".tabContainer").each(applyIndicator);
	document.arrive(".tabContainer", applyIndicator);
	$(".tabContentsContainer").each(initTab);
	document.arrive(".tabContentsContainer", initTab);
	$(document).on("click", ".tab", function(e) {
		var thisJq = $(this);
		if (thisJq.hasClass("active")) {
			return;
		}
		var thisParentJq = thisJq.parent();
		var tabContentContainerJq = $(".tabContentsContainer[data-tabcontainername=" + thisParentJq.attr("data-tabcontainername") + "]");
		$(".tabContents", tabContentContainerJq).hide();
		$(".tabContents[data-tabname=" + thisJq.attr("data-tabname") + "]", tabContentContainerJq).show();
		$(".tab.active", thisParentJq).removeClass("active");
		thisJq.addClass("active");
		updateTabIndicator(thisParentJq.attr("data-tabcontainername"), true);
	});
	$("#foodSearchQuery").keypress(function(e) {
		if (e.which == 13) {
			$("#foodSearchQuerySubmit").click();
		}
	});
	$("#logout").click(logout);
	$(".loginForm .loader").hide();
	showContainer("login");

	if (getCookie(Cookies.REFRESH_TOKEN) != null && getCookie(Cookies.EMAIL) != null) {
		$("[name=autoSignIn]")[0].checked = true;
		doLogin(createLoginRequestRefreshToken(getCookie(Cookies.EMAIL), getCookie(Cookies.REFRESH_TOKEN)));
	}
});

function applyIndicator() {
	var thisJq = $(this);
	thisJq.append("<div class='tabIndicator'></div>");

	if ($(".active", thisJq).length == 0) {
		$(".tab:first-child", thisJq).addClass("active");
	}

	updateTabIndicator(thisJq.attr("data-tabcontainername"));
}

function initTab() {
	$(".tabContents:not(:first-child)", this).hide();
}

function updateTabIndicator(tabName, animate) {
	var tabContainer = $(".tabContainer[data-tabcontainername=" + tabName + "]");
	var tabIndicator = $(".tabIndicator", tabContainer);
	var left = $(".active", tabContainer)[0].getBoundingClientRect().left - tabContainer[0].getBoundingClientRect().left + tabContainer[0].scrollLeft;
	var width = $(".active", tabContainer).outerWidth();
	if (animate) {
		tabIndicator.finish().animate({
			width: width,
			left: left
		}, 250);
	} else {
		tabIndicator.width(width).css("left", left);
	}
}

function logout() {
	requestData("/gojek/v2/customer/logout", {}, function(data) {
		if (data.status == "OK") {
			showContainer("login");
			clearEmailRefreshToken();
		}
	}, true, {});
}

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
	searchContainer.find("h1").text(titleOverride || "Search restaurants");
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

function loadGoFoodSearch(stringCategory, page) {
	var list = $("#goFoodSearchList");
	if (page == null) {
		list.empty();
		page = 0;
	}
	var submit = $("#foodSearchQuerySubmit").attr("disabled", true);
	var loader = $(".goFoodSearchLoader").show();
	var queries = {
		location: makeLocation(),
		page: page,
		limit: 20
	};

	if (stringCategory != null) {
		queries["category"] = stringCategory;
	} else {
		queries["name"] = $("#foodSearchQuery").val();
	}

	requestData(GoFood.SEARCH_MERCHANTS, queries, function(data) {
		for (var i in data) {
			var foodData = data[i];
			//TODO jam buka
			var bg = foodData.imgLocation == null ? "" : "<div class='cardBG' style='background-image: url(\"" + foodData.imgLocation + "\");'></div>";
			list.append("<div class='card' onclick='showFoodMerchantScreen(\"" + foodData.uuid + "\");'>" + bg + "<div class='cardContent'><div class='primary'>" + foodData.name + "</div><div class='secondary'>" + foodData.address + "</div><div class='secondary'>" + foodData.distance.toFixed(2) + " km" + (foodData.partner ? " | Free delivery w/ GO-PAY" : "") + "</div></div></div>");
		}

		list.append($("<button class='loadMore'>Load 20 more</button>").click(function() {
			$(this).remove();
			loadGoFoodSearch(stringCategory, page + 1);
		}));
		submit.removeAttr("disabled");
		loader.hide();
	});
}

var calculatePrices = _.debounce(function() {
	// TODO: Work with vouchers

	if (goFoodPolyline != null) {
		goFoodPolyline.setMap(null);
	}

	if (!goFoodDestSelected) {
		return;
	}

	foodPriceResponse = null;
	requestData(Booking.CALCULATE, {}, function(data) {
		foodPriceResponse = data;
		updatePrices();
		goFoodPolyline = new google.maps.Polyline({
			path: google.maps.geometry.encoding.decodePath(data.routes[0].routePolyline),
			geodesic: true,
			strokeColor: "#0000FF",
			strokeWeight: POLYLINE_WEIGHT
		});
		goFoodPolyline.setMap(map);
	}, true, {
		customerId: theCustomer.id,
		paymentType: goFoodUseGoPay ? 4 : 0,
		routeRequests: [{
			destinationLatLong: goFoodSelectedDest.latLong,
			estimatedPrice: goFoodEstimatedCartPrice,
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
		var tabId = "MERCHANT-" + data.restaurant.merchant_id;
		var tabs = $("<div></div>").addClass("tabContainer scrolling").attr("data-tabcontainername", tabId);
		var tabContents = $("<div></div>").addClass("tabContentsContainer").attr("data-tabcontainername", tabId);

		for (var i in data.sections) {
			var section = data.sections[i];
			if (section.items.length < 1) {
				continue;
			}
			var tabName = "SECTION-" + i;
			tabs.append("<div class='tab' data-tabname='" + tabName + "'>" + section.name + "</div>");
			var sectionJq = $("<div></div>").addClass("tabContents").attr("data-tabname", tabName);

			for (var j in section.items) {
				var itemId = section.items[j];

				for (var itemIndex in data.items) {
					var item = data.items[itemIndex];

					if (item.id == itemId) {
						var listItem = $("<div class='settingsBox clickable twoColumn' onclick='addFoodItemToCart(" + item.shopping_item_id + ");'><div class='cGrow'><div>" + item.name + "</div><div>" + (item.description == null ? "" : item.description) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div>").attr("data-id", item.shopping_item_id);
						sectionJq.append(listItem);
						break;
					}
				}
			}

			tabContents.append(sectionJq);
		}

		container.append(tabs);
		container.append(tabContents);
		cRoot.append("<div class='estimatedCost clickable' id='foodCost' onclick='showGoFoodOrderConfirmation();'><div><div>Estimated cost: <b>Rp<span></span></b></div><div>PROCEED TO CART ></div></div></div>");
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
		alert("Something went wrong: Non-existent food item #" + foodItemId);
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
	goFoodEstimatedCartPrice = 0;

	for (var i in currentFoodCart) {
		goFoodEstimatedCartPrice += currentFoodCart[i].quantity * currentFoodCart[i].price;
	}

	$("#foodCost span").html(goFoodEstimatedCartPrice.formatMoney(0));
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
				var theRow = $("<div class='settingsBox'><div class='twoColumn'><div class='cGrow'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div><div class='twoColumn'><input type='text' placeholder='Notes' class='cGrow' /><div class='quantity cRight'><button id='min'>-</button>&nbsp;" + item.quantity + "&nbsp;<button id='plus'>+</button></div></div></div>");
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
	goFoodDestSelected = false;
	goFoodSelectedDest = {};
	goFoodUseGoPay = true;
}

function showGoFoodOrderConfirmation() {
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
	priceSummary.append("<div id='foodCost' class='twoColumn'><div class='cGrow'>Cost (est.)</div><div>Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deliveryPrice' class='twoColumn'><div class='cGrow'>Delivery<span id='km'></span></div><div>Rp<span id='price'>0</span></div></div>");
	priceSummary.append("<div id='totalPrice' class='twoColumn'><div class='cGrow'>Total price</div><div>Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deductionGoPay' class='twoColumn'><div class='cGrow'>GO-PAY</div><div>- Rp<span>0</span></div></div>");
	priceSummary.append("<div id='deductionCash' class='twoColumn'><div class='cGrow'>Cash</div><div>- Rp<span>0</span></div></div>");
	var payWith = $("<div class='settingsBox'>Pay with: <label><input type='radio' name='goFoodUseGoPay' value='true' checked />GO-PAY (Rp<span id='goFoodGoPayBalance'>0</span>)</label><label><input type='radio' name='goFoodUseGoPay' value='false' />Cash</label></div>");
	wrapper.append(payWith);
	payWith.find("input[name=goFoodUseGoPay]").on("change", function() {
		goFoodUseGoPay = $("input[name=goFoodUseGoPay]:checked", payWith).val() == "true";
		updatePrices();
	});
	wrapper.append("<div class='textSeparator'>Delivery address</div>");
	wrapper.append("<div id='map' style='height: 400px;'></div>");
	initGoFoodOrderMap();
	wrapper.append("<div class='settingsBox'><div><input type='text' id='destName' placeholder='Address (click on map first)' disabled style='width: 100%;' /></div><div><input type='text' id='destNote' placeholder='Notes' disabled style='width: 100%;' /></div></div>");
	$("#destName").on("input", function() {
		goFoodSelectedDest.name = this.value;
	});
	$("#destNote").on("input", function() {
		goFoodSelectedDest.note = this.value;
	});
	wrapper.append("<div class='textSeparator'>History (select one to set as destination)</div>");
	var historyList = $("<div class='historyList'></div>");
	wrapper.append(historyList);
	wrapper.append("<div class='textSeparator'></div>");
	wrapper.append($("<button class='orderButton'>ORDER</button>").click(function() {
		if (currentFoodCart.length < 1) {
			alert("No items in cart");
			return;
		} else if ($.isEmptyObject(goFoodSelectedDest)) {
			alert("Destination not yet selected");
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
					goFoodSelectedDest = {
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
	updateGoPayBalanceWithCallback(function(data) {
		$("#goFoodGoPayBalance").text(data.currentBalance.formatMoney(0));

		if (data.currentBalance <= 0) {
			setEnabled($("input[name=goFoodUseGoPay][value=true]"), false);
			$("input[name=goFoodUseGoPay][value=false]")[0].checked = true;
			goFoodUseGoPay = false;
		}
	});
	updateCart();
	calculatePrices();
	updateMap();
}

function updateGoPayBalance() {
	updateGoPayBalanceWithCallback(function(data) {
		$(".goPayBalance").text(data.currentBalance.formatMoney(0));
	});
}

function updateGoPayBalanceWithCallback(callback) {
	requestData(GoPay.GET_BALANCE + theCustomer.id, {}, callback);
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

	if (goFoodUseGoPay && foodPriceResponse.totalCredit > 0) {
		deliveryPrice = foodPriceResponse.goPayPrice.goPayTotalPrice;
	} else {
		deliveryPrice = foodPriceResponse.subTotal;
	}

	$("#deliveryPrice #price").text(deliveryPrice.formatMoney(0));
	$("#totalPrice span").text((goFoodUseGoPay ? foodPriceResponse.goPayPrice.gopay_grand_total : foodPriceResponse.totalPrice).formatMoney(0));
	var deductionGoPay = $("#deductionGoPay");

	if (goFoodUseGoPay) {
		deductionGoPay.show();
		$("#deductionGoPay span").text(foodPriceResponse.totalCredit.formatMoney(0));
	} else {
		deductionGoPay.hide();
	}

	$("#deductionCash span").text((goFoodUseGoPay ? foodPriceResponse.totalCash : foodPriceResponse.cashPrice).formatMoney(0));
}

function updateMap() {
	for (var i in markers) {
		markers[i].setMap(null);
	}

	markers = [];
	markers.push(createMarker(0, commaSeparatedLatLng(currentResto.restaurant.location), "Origin: " + currentResto.restaurant.name + ", " + currentResto.restaurant.address));
	goFoodDestSelected = !$.isEmptyObject(goFoodSelectedDest);

	if (goFoodDestSelected) {
		markers.push(createMarker(1, commaSeparatedLatLng(goFoodSelectedDest.latLong), "Destination: " + goFoodSelectedDest.address));
	}

	for (var i in markers) {
		markers[i].setMap(map);
	}

	if (!goFoodDestSelected)
		return;

	$("#destName").removeAttr("disabled").val(goFoodSelectedDest.name);
	var destNote = $("#destNote")[0];
	destNote.disabled = false;
	destNote.value = goFoodSelectedDest.note;
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
		"paymentType": goFoodUseGoPay ? 4 : 0,
		"routes": [{
			"checkpartner": true,
			"destinationAddress": goFoodSelectedDest.address,
			"destinationLatLong": goFoodSelectedDest.latLong,
			"destinationName": goFoodSelectedDest.name,
			"destinationNote": goFoodSelectedDest.note,
			"detailsAddress": currentResto.restaurant.detail_address,
			"estimatedPrice": goFoodEstimatedCartPrice,
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
	makeBooking(payload, function() {
		$("[data-name=foodMerchantDetails], [data-name=foodCart]").remove();
		showContainer("home");
	});
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
		"paymentType": goRideUseGoPay ? 4 : 0,
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
	makeBooking(payload, function() {
		showContainer("home");
	});
}

function makeBooking(payload, callback) {
	xRequestData(Booking.MAKE, {}, function(data) {
		if (data.errorMessage == null) {
			alert("Your booking has been placed with no. " + data.orderNo + ". Check the booking via the history page.");
			callback();
		} else {
			alert("Booking failed:\n" + data.errorMessage);
		}
	}, "POST", payload);
}

var bookingId;
var bookingInterval;
var currentBookingData;
var bookingPolyline;
var bookingDriverMarker;
var bookingOriginMarker;
var bookingDestinationMarker;
var bookingFirstRequest;
var moreDetailsState = false;

function showBooking(id, previewData) {
	bookingMap = null;
	bookingOriginMarker = null;
	bookingDestinationMarker = null;
	bookingDriverMarker = null;
	bookingId = id;
	var container = $("<div class='container bookingContainer' data-id='" + currentContainerId + "' data-name='viewBooking'></div>");
	$(".siteWrapper").append(container);
	var addresses = $("<div class='card'></div>");
	var contentInner = $("<div class='contentInner'></div>");
	container.append("<div id='bookingMap'></div>")
		.append($("<div class='actionBar twoColumn'></div>")
			.append("<div><span><button onclick='closeBooking();'>< Back</button></span></div>")
			.append("<div><span class='title'>" + getNameOfServiceByInt(previewData.serviceType) + "</span></div>")
			.append("<div><span></span></div>"))
		.append(contentInner);
	contentInner.append(
		addresses.append("<div class='settingsBox twoColumn' id='bookingFrom'><div class='cRight'></div><div class='cGrow'><div class='name'></div><div class='note'></div></div></div>")
			.append("<div class='settingsBox twoColumn' id='bookingTo'><div class='cRight'></div><div class='cGrow'><div class='name'></div><div class='note'></div></div></div>"));
	var moreDetails;
	moreDetailsState = false;
	contentInner.append($("<div class='contentInnerAgain'></div>").append($("<div class='card bookingStatusCard'></div>")
		.append($("<button class='showMoreDetails'>Show details</button>").hide().click(function() {
			var options = {
				duration: 375,
				easing: "easeOutQuint"
			}
			if (moreDetailsState = !moreDetailsState) {
				moreDetails.finish().slideToggle(options);
				moreDetails.addClass("shown");
				this.innerHTML = "Hide details";
			} else {
				moreDetails.finish().slideToggle(options);
				moreDetails.removeClass("shown");
				this.innerHTML = "Show details";
			}
		}))
		.append(moreDetails = $("<div class='moreDetails'></div>").hide()
			.append($("<div id='bookingItemsWrapper'></div>").hide()
				.append("<div class='textSeparator'>Order details</div>")
				.append("<div id='bookingItems'></div>"))
			.append($("<div id='paymentWrapper'></div>")
				.append("<div class='textSeparator'>Payment details</div>")
				.append($("<div></div>")
					.append($("<div class='settingsBox'></div>")
						.append("<div class='twoColumn'><div class='cGrow'>Cost</div><div>Rp<span id='bookingCost'></span></div></div>")
						.append("<div class='twoColumn'><div class='cGrow'>Delivery Fee (<span id='bookingDistance'></span> km)</div><div>Rp<span id='bookingDeliveryFee'></span></div></div>")
						.append("<div class='twoColumn'><div class='cGrow'>Total Price</div><div>Rp<span id='bookingTotalPrice'></span></div></div>")
						.append("<div class='twoColumn' id='bookingGoPayPriceContainer'><div class='cGrow'>GO-PAY</div><div>- Rp<span id='bookingGoPayPrice'></span></div></div>")
						.append("<div class='twoColumn'><div class='cGrow'>Cash</div><div>- Rp<span id='bookingCashPrice'></span></div></div>")))))
		.append("<div class='settingsBox twoColumn'><div id='driverPhoto'></div><div class='cGrow'><div id='driverInfo'></div><div>Order No. " + bookingId + "</div><div id='bookingStatusText'></div></div></div>")
		.append($("<div class='actions'></div>").append($("<button id='instantRate'>Rate 5 stars</button>").hide().click(function() {
				rateBookingGoFood(currentBookingData.orderNo, 5, "", function(data) {
					if (data.statusMessage == "OK") {
						alert("You rated this order 5 stars");
					}
				});
			})).append($("<button id='bookingCancel'>Cancel...</button>").click(function() {
				showContainer("bookingCancel");
			})).append($("<button id='needHelp' disabled>Need help?</button>")))));
	initBookingMap();
	bookingFirstRequest = true;
	bookingInterval = setInterval(reqDataUpdateBooking, 7500);
	reqDataUpdateBooking();
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
	showContainer("home");
}

function updateBookingContents() {
	// TODO: MAKE IT LIKE IN THE REAL GOJEK APP
	if (currentBookingData.serviceType == 5) {
		$("#bookingCost").text((currentBookingData.shoppingActualPriceBeforeDiscount || currentBookingData.estimatedPriceBeforeDiscount).formatMoney(0));
		$("#bookingDistance").text(currentBookingData.totalDistance.toFixed(2));
		$("#bookingDeliveryFee").text(currentBookingData.totalPrice.formatMoney(0));
		$("#bookingTotalPrice").text(currentBookingData.totalPriceWithoutDiscounts.formatMoney(0));
		// TODO
		if (currentBookingData.paymentType == 5) {
			$("#bookingGoPayPriceContainer").show();
			$("#bookingGoPayPrice").text(currentBookingData.voucherAmountCut.formatMoney(0));
		} else {
			$("#bookingGoPayPriceContainer").hide();
		}

		$("#bookingCashPrice").text((currentBookingData.cashPayable || currentBookingData.totalCustomerPrice).formatMoney(0));
	}

	var address = currentBookingData.addresses[0];
	var driverFound = currentBookingData.driverId != null;
	var bookingComplete = isGoJekCompleteBooking(currentBookingData);
	var driverInfo = driverFound ? [currentBookingData.driverName, formatPhoneNumber(currentBookingData.driverPhone, true), formatLicensePlate(currentBookingData.noPolisi)].join(", ") : "";
	$("#driverInfo").html(driverInfo);
	$("#driverPhoto").css("background-image", "url(" + (driverFound && currentBookingData.driverPhoto != "" ? (currentBookingData.driverPhoto.startsWith("http") ? currentBookingData.driverPhoto : BASE_URL + "/v2/file/img/" + currentBookingData.driverPhoto) : "") + ")");
	var bookingCancel = $("#bookingCancel");
	showHide($("#needHelp"), bookingCancel, bookingComplete);

	$("#bookingStatusText").text(getStatusMessageAndControlCancelButton(currentBookingData, bookingCancel));
	var instantRate = $("#instantRate");

	if (bookingComplete && currentBookingData.serviceType == 5 && currentBookingData.rate == null && !isCanceled(currentBookingData)) {
		instantRate.show();
	} else {
		instantRate.hide();
	}

	if (bookingFirstRequest) {
		var bookingFrom = $("#bookingFrom");
		var bookingTo = $("#bookingTo");
		$(".name", bookingFrom).text(address.originName);
		$(".note", bookingFrom).text(address.originNote);
		$(".name", bookingTo).text(address.destinationName);
		$(".note", bookingTo).text(address.destinationNote);

		if (currentBookingData.serviceType == 5) {
			$(".showMoreDetails").show();
			$("#bookingItemsWrapper").show();
			var bookingItems = $("#bookingItems").empty();
			var routeItems = currentBookingData.addresses[0].routeItems;

			for (var i in routeItems) {
				var item = routeItems[i];
				var theRow = $("<div class='settingsBox'><div class='twoColumn'><div class='cGrow'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Rp" + item.price.formatMoney(0) + "</div></div><div class='twoColumn'><div class='cGrow'>" + item.notes + "</div><div class='cRight'>x" + item.quantity + "</div></div></div>");
				bookingItems.append(theRow);
			}
		}

		if (bookingPolyline != null) bookingPolyline.setMap(null);
		if (bookingOriginMarker != null) bookingOriginMarker.setMap(null);
		if (bookingDestinationMarker != null) bookingDestinationMarker.setMap(null);

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
		bookingMap.panTo(commaSeparatedLatLng(currentBookingData.addresses[0].latLongOrigin));
	}

	if (!driverFound) return;

	if (bookingDriverMarker == null) {
		bookingDriverMarker = new google.maps.Marker({
			title: "Driver",
			icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
		});
		bookingDriverMarker.setMap(bookingMap);
	}

	bookingDriverMarker.setPosition({
		lat: currentBookingData.driverLatitude,
		lng: currentBookingData.driverLongitude
	});
}

function rateBookingGoFood(orderNo, stars, feedback, callback) {
	requestData("/gojek/v2/booking/rate", {}, callback, true, {
		activitySource: 2,
		feedback: feedback || "",
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

function getStatusMessageAndControlCancelButton(paramBooking, cancelButton) {
	if (paramBooking.statusBooking == 5) {
		return "Cannot find driver";
	}

	if (!isZeroOrNull(paramBooking.cancelReasonId)) {
		return "Canceled" + (paramBooking.cancelBy != null ? " by " + paramBooking.cancelBy : "") + ": " + paramBooking.cancelDescription;
	}

	if (isGoJekCompleteBooking(paramBooking)) {
		return "Completed";
	}

	if (paramBooking.driverId == null) {
		return "Finding driver";
	}

	switch (paramBooking.serviceType) {
		case 1:
			if (paramBooking.statusBooking == 7) {
				setEnabled(cancelButton, false);
				return "On the way with you";
			} else if (paramBooking.statusBooking == 2) {
				return "Arriving in " + (paramBooking.driverETA / 60) + " mins";
			}
			break;
		case 5:
		case 6:
			if (paramBooking.statusBooking == 7) {
				// disable cancel button, show driver actions
				setEnabled(cancelButton, false);
				if (paramBooking.serviceType == 5) {
					return "Delivering food";
				} else if (paramBooking.serviceType == 6) {
					return "Delivering item";
				}

				// DriverOnTheWayPresenter.access$200(this.this$0);
				// if (paramBooking.serviceType != 13 && paramBooking.serviceType != 24) {
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
				if (paramBooking.serviceType == 6) {
					return "On the way";
				} else {
					// setBookingNoEta(this.this$0.computeEta(DriverOnTheWayPresenter.access$000(this.this$0).ˋ.intValue()));
					return "Picking up food";
				}

				// if (paramBooking.serviceType != 13 && paramBooking.serviceType != 24) {
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
	}

	return "";
}

function initBookingMap() {
	bookingMap = new google.maps.Map(document.getElementById("bookingMap"), {
		zoom: 16,
		center: {
			lat: currentLocation.coords.latitude,
			lng: currentLocation.coords.longitude
		},
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

		showBooking(paramBooking.orderNo, paramBooking);
	});
	box.append("<div>#" + paramBooking.orderNo + ", " + getNameOfServiceByInt(paramBooking.serviceType).toUpperCase() + ", " + formatDate(new Date(paramBooking.timeField)) + "</div>");

	if (!isGoJekCompleteBooking(paramBooking)) {
		box.append("<div>" + status + "</div>");
	}

	box.append("<div>" + name + "</div>");

	if (isCanceled(paramBooking)) {
		box.append("<div style='color: #b71c1c; font-weight: bold;'>CANCELED</div>");
	} else if (paramBooking.rate == null && isGoJekCompleteBooking(paramBooking)) {
		box.append("<div style='color: #F57F17; font-weight: bold;'>NEEDS RATING</div>");
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
var goFoodBannerIndex = 0;

function initContainer(name, elm) {
	switch (name) {
		case "login":
			$("#loginError").hide();
			$("#email, #password").val("");
			$("[name=autoSignIn]")[0].checked = false;
			break;
		case "home":
			updateGoPayBalance();
			updateGoPointsBalance(function(data) {
				$(".goPointsBalance", elm).text(data.points_balance + " pt" + plural(data.points_balance) + ", " + data.tokens_balance + " token" + plural(data.tokens_balance));
			});
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

				var historyAppendable = $("#historyAppendable", elm).empty();

				if (inProgressBookings.length > 0) {
					historyAppendable.html("<span class='redCircle'>" + inProgressBookings.length + "</span>");
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
		case "goPoints":
			$(".pointsPlay .loader", elm).show();
			$(".pointsPlay .pointsText", elm).text("Loading...");
			updateGoPointsBalance(function(data) {
				$(".pointsPlay .loader", elm).hide();
				$(".pointsPlay .pointsText", elm).text(data.tokens_balance > 0 ? "You have " + data.tokens_balance + " token(s) to play" : "Use GO-PAY to get token & earn points");
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
							initContainer(name, elm);
						}, true, {
							points_token_id: data.points_token_id
						});
					}, true, {});
				});
				setEnabled(redeemToken, data.tokens_balance > 0);
			});
			var availVouchersList = $("#goPointsVouchers").empty();
			var load = function(page) {
				xRequestData("/gopoints/v1/available-voucher-batches", {limit: 10, page: page}, function(data) {
					var sortedData = data.data.sort(function(a, b) {
						return a.points - b.points;
					});

					for (var i in sortedData) {
						availVouchersList.append(constructVoucherCard(sortedData[i]));
					}

					if (data.next_page == null) return;

					availVouchersList.append($("<button class='loadMore'>Load 10 more</button>").click(function() {
						$(this).remove();
						load(page + 1);
					}));
				});
			};
			load(1);
			var myVouchersList = $("#goPointsMyVouchers").empty();
			var loadMy = function(page) {
				xRequestData("/gopoints/v1/wallet/vouchers", {limit: 10, page: page}, function(data) {
					// var sortedData = data.data.sort(function(a, b) {
					// 	return a.points - b.points;
					// });

					if (data.data != null && data.data.length > 0) {
						for (var i in data.data) {
							myVouchersList.append(constructVoucherCard(data.data[i]));
						}
					} else {
						myVouchersList.append("<div class='listEmpty'>Use GO-PAY to get token to play, earn points and buy vouchers!</div>")
					}

					if (data.next_page == null) return;

					myVouchersList.append($("<button class='loadMore'>Load 10 more</button>").click(function() {
						$(this).remove();
						loadMy(page + 1);
					}));
				});
			};
			loadMy(1);
			// TODO my vouchers url: /gopoints/v1/wallet/vouchers?limit=10&page=1 IT IS JUST THE SAME AS data.data
			break;
		case "goRide":
			initGoRide(elm);
			break;
		case "goFood":
			var banners = $("#goFoodBanner", elm).empty();
			var shortcuts = $("#shortcuts", elm).empty();
			var cuisines = $("#cuisines", elm).empty();

			requestData(GoFood.HOME_NEW, {
				location: makeLocation()
			}, function(data) {
				for (var i in data.banners) {
					var banner = data.banners[i];
					var bannerImage = $("<div class='bannerImage' style='background-image: url(" + banner.image + ");'></div>");
					if (banner.banner_type == "CATEGORY") {
						bannerImage.addClass("clickable");
						bannerImage.click((function(banner) {
							return function() {
								showSearch(banner.category_code, banner.category_name);
							}
						})(banner));
					} else if (banner.banner_type == "WEB") {
						if (banner.url == "gojek://gofood/reorder") {
							bannerImage.addClass("clickable");
							bannerImage.click((function(banner) {
								return function() {
									showContainer("goFoodOrders");
								}
							})(banner));
						}
					}
					banners.append(bannerImage);
				}
				// $(".bannerImage:not(:first-child)", banners).hide();
				goFoodBannerIndex = 0;
				banners.append($("<div class='bannerControl'></div>").append($("<button><-</button>").click(function() {
					goFoodBannerIndex = mod(goFoodBannerIndex - 1, data.banners.length);
					updateGoFoodBanner();
				})).append("<div class='bannerIndicator'></div>").append($("<button>-></button>").click(function() {
					goFoodBannerIndex = mod(goFoodBannerIndex + 1, data.banners.length);
					updateGoFoodBanner();
				})));
				updateGoFoodBanner();
				for (var i in data.shortcuts) {
					var shortcut = data.shortcuts[i];
					shortcuts.append($("<div class='card cardContent'><img src='" + shortcut.icon.url + "' height='128px' /><div>" + shortcut.name + "</div></div>").click((function(shortcut) {
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
		case "goFoodOrders":
			var orderList = $("#goFoodOrderList").empty();
			// TODO: page
			xRequestData("/myresto/consumer/v1/orders/completed", {limit: 10, page: 1}, function(data) {
				if (data != null) {
					for (var i in data.data) {
						orderList.append(constructCompletedOrderCard(data.data[i]));
					}
				}
			});
			break;
		case "bookingCancel":
			selectedCancel = null;
			var cancelConfirm = $("#cancelConfirm", elm).unbind("click").click(function() {
				var theThis = this;
				this.disabled = true;
				xRequestData("/gojek/v2/booking/cancelBooking", {}, function(data) {
					if (data != null) {
						if (data.statusCode == 200) {
							xRequestData("/gojek/v2/booking/cancelBookingCustomer", {}, function(data) {
								theThis.disabled = false;
								if (data != null) {
									if (data.statusCode == 200) {
										alert(data.message);
										showContainer("viewBooking");
									} else {
										alert("Cannot cancel order: ", data.message);
									}
								}
							}, "PUT", {
								activitySource: 2,
								bookingId: currentBookingData.id,
								cancelDescription: selectedCancel.desc,
								cancelReasonId: selectedCancel.id,
								orderNo: currentBookingData.orderNo
							});
						} else {
							alert("Cannot cancel order: ", data.message);
						}
					}
				}, "PUT", {
					activitySource: 2,
					bookingId: currentBookingData.id,
					cancelDescription: "Cancelled by customer apps",
					cancelReasonId: 56,
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

var currentVoucher;

function constructVoucherCard(voucher) {
	var card = $("<div class='card voucherCard clickable'></div>")
		.append($("<div class='cardBG'></div>").css("background-image", "url(" + voucher.icon + ")"))
		.append($("<div class='cardContent'></div>")
			.append($("<div class='twoColumn'></div>")
				.append("<div class='cGrow voucherMerchant'>" + voucher.sponsor_name + "</div>")
				.append("<div class='voucherUpper'>" + voucher.points.formatMoney(0) + " pts</div>"))
			.append("<div class='voucherTitle'>" + voucher.title + "</div>")
			.append("<div class='voucherSubtitle'>" + voucher.sub_title + "</div>"))
		.click(function() {
			// currentVoucher = voucher;
			// showContainer("voucherDetails");
			window.open(BASE_URL + "/gopoints/frontend/dist/available-voucher-batch.html?" + $.param({Headers: JSON.stringify(generateAjaxHeaders()), voucher_batch_id: voucher.id}), "_blank");
		});
	return card;
}

function constructCompletedOrderCard(completedOrder) {
	var orderButton, cardContentTop;
	var ret = $("<div class='card reorderCard'></div>")
		.append(cardContentTop = $("<div class='cardContent twoColumn'></div>")
			.append($("<div class='imagePreview'></div>").css("background-image", "url('" + completedOrder.merchant.image + "')"))
			.append($("<div class='cGrow'></div>")
				.append("<div class='timeField secondary'>" + formatDate(new Date(completedOrder.ordered_at)) + "</div>")
				.append("<div class='primary'>" + completedOrder.merchant.name + "</div>")
				.append("<div class='secondary'>" + completedOrder.merchant.address + "</div>")))
		.append($("<div class='cardContent cardBottom twoColumn'></div>")
			.append("<div class='cGrow costs'>This costs Rp" + completedOrder.paid.formatMoney(0) + "</div>")
			.append(orderButton = $("<button class='orderButton' style='width: initial;'>Reorder</button>")
				.click(function() {
					var merchant = completedOrder.merchant;
					currentResto = {
						restaurant: {
							name: merchant.name,
							address: merchant.address,
							location: merchant.location,
							detail_address: merchant.address,
							merchant_id: merchant.id
						}
					};
					currentFoodCart = [];

					for (var i in completedOrder.items) {
						var item = completedOrder.items[i];

						// TODO work with manually added items
						if (item.manual) {
							continue;
						}

						currentFoodCart.push({
							itemDescription: item.menu_item_description,
							itemId: item.id,
							itemName: item.menu_item_name,
							notes: item.note,
							price: item.price,
							quantity: item.quantity
						});
					}

					showGoFoodOrderConfirmation();
				})));
	var isClosed = !isOpenByTimings(completedOrder.merchant.timings[0]);
	
	if (isClosed) {
		setEnabled(orderButton, false);
		cardContentTop.prepend("<div class='closedOverlay'><div>Closed</div></div>");
	} else {
		for (var i in completedOrder.items) {
			if (!completedOrder.items[i].active) {
				setEnabled(orderButton, false);
				break;
			}
		}
	}

	return ret;
}

function isOpenByTimings(timings) {
	var date = new Date();
	return parseTime(timings.open_time) <= date && date <= parseTime(timings.close_time);
}

// http://www.timlabonne.com/2013/07/parsing-a-time-string-with-javascript/
function parseTime(timeStr, dt) {
	if (!dt) {
		dt = new Date();
	}
 
	var time = timeStr.match(/(\d+)(?::(\d\d))?\s*(p?)/i);
	if (!time) {
		return NaN;
	}
	var hours = parseInt(time[1], 10);
	if (hours == 12 && !time[3]) {
		hours = 0;
	} else {
		hours += (hours < 12 && time[3]) ? 12 : 0;
	}
 
	dt.setHours(hours);
	dt.setMinutes(parseInt(time[2], 10) || 0);
	dt.setSeconds(0, 0);
	return dt;
}

function updateGoFoodBanner() {
	var banner = $("#goFoodBanner");
	var bannerImage = $(".bannerImage", banner).hide();
	bannerImage.eq(goFoodBannerIndex).show();
	$(".bannerIndicator", banner).text((goFoodBannerIndex + 1) + " / " + bannerImage.length);
}

function setEnabled(jq, bool) {
	if (bool) {
		return jq.removeAttr("disabled");
	} else {
		return jq.attr("disabled", true);
	}
}

function isZeroOrNull(i) {
	return i == 0 || i == null;
}

function getNameOfServiceByInt(i) {
	switch (i) {
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
			goFoodSelectedDest = {
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
	$("#goRideAfterSelected", elm).hide();
	$("input[name=goRideUseGoPay]", elm).unbind("change").on("change", function() {
		goRideUseGoPay = $("input[name=goRideUseGoPay]:checked", elm).val() == "true";
	});
	goRideFromMarker = null;
	goRideToMarker = null;
	goRideFrom = {};
	goRideTo = {};

	if (goRidePolyline != null) {
		goRidePolyline.setMap(null);
		goRidePolyline = null;
	}

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
		updateGoRideAdressSelection(elm);
	});
	$("#goRideTo", elm).unbind("mousedown").mousedown(function() {
		goRideSelectTo = true;
		updateGoRideAdressSelection(elm);
	});
	$("#goRideFromName", elm).val("").unbind("input").on("input", function() {
		updateGoRideAdressSelection(elm);
		updateGoRideSuggestion(this.value, false, elm);
	});
	$("#goRideToName", elm).val("").unbind("input").on("input", function() {
		updateGoRideAdressSelection(elm);
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
	setEnabled($(".orderButton", elm), false).unbind("click").click(function() {
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

			updateGoRideAdressSelection(elm);
		});
	});
	updateGoRideAdressSelection(elm);
}

function updateGoRideAdressSelection(elm) {
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
	if (val == "") return;
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

	if (!$.isEmptyObject(goRideFrom) && !$.isEmptyObject(goRideTo)) {
		calculateGoRide($(".orderButton", elm));
	}

	updateGoRideAdressSelection();
}

var goRidePolyline;
function calculateGoRide(orderButton) {
	if (goRidePolyline != null) {
		goRidePolyline.setMap(null);
	}

	setEnabled(orderButton, false);
	xRequestData("/gojek/v2/calculate/gopay", {}, function(data) {
		if (data != null) {
			if (data.errors != null && data.errors.length > 0) {
				alert(data.errors[0].message_title + ": " + data.errors[0].message);
			} else {
				if (goRidePolyline == null) {
					goRidePolyline = new google.maps.Polyline({
						geodesic: true,
						strokeColor: "#0000FF",
						strokeWeight: POLYLINE_WEIGHT
					});
				}

				goRidePolyline.setPath(google.maps.geometry.encoding.decodePath(data.routes[0].routePolyline));
				goRidePolyline.setMap(goRideMap);
				$("#goRideAfterSelected").show();
				$("#goRideDistance").text(data.totalDistance.toFixed(2));
				$("#goRideGoPayPrice").html("<s>Rp" + data.totalPrice.formatMoney(0) + "</s> <b>Rp" + data.goPayPrice.goPayTotalPrice.formatMoney(0) + "</b>")
				$("#goRideCashPrice").html("<b>Rp" + data.totalCash.formatMoney(0) + "</b>");
				var goRideGoPayBalance = $("#goRideGoPayBalance").text("0");
				updateGoPayBalanceWithCallback(function(data) {
					goRideGoPayBalance.text(data.currentBalance.formatMoney(0));
					if (data.currentBalance <= 0) {
						setEnabled($("input[name=goRideUseGoPay][value=true]"), false);
						$("input[name=goRideUseGoPay][value=false]")[0].checked = true;
						goRideUseGoPay = false;
					}

					setEnabled(orderButton, true);
				});
			}
		}
	}, "POST", {
		"paymentType": goRideUseGoPay ? "4" : "0",
		"routeRequests": [{
			"destinationLatLong": goRideTo.latLong,
			"serviceType": 1,
			"originLatLong": goRideFrom.latLong
		}],
		"marketplaceType": "",
		"corporateId": "",
		"serviceType": 1,
		"customerId": theCustomer.id,
		"region": "",
		"vehicle_type": "bike"
	});
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
		url: BASE_URL + req + ($.isEmptyObject(data) ? "" : "?" + $.param(data)),
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
	return $.ajax(options);
}

function xRequestData(req, queries, callback, method, payload) {
	queries = queries || {};
	callback = callback || $.noop;
	method = method || "GET";
	var options = {
		type: method,
		url: BASE_URL + req + ($.isEmptyObject(queries) ? "" : "?" + $.param(queries)),
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		headers: generateAjaxHeaders(),
		complete: function(xhr, statusText, errorThrown) {
			var response;

			try {
				response = JSON.parse(xhr.responseText);
			} catch (e) {
				response = null;
				console.log("Response is not in JSON format");
			}

			callback(response);
		}
	};
	if (method == "PUT" || method == "POST")
		options["data"] = JSON.stringify(payload);
	return $.ajax(options);
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
		"user-uuid": theCustomer == null ? "" : theCustomer.id,
		"Accept-Language": "en-ID"
	};
}

function plural(paramInt) {
	return paramInt == 1 ? "" : "s";
}

function makeLocation() {
	return currentLocation == null ? "UNKNOWN" : currentLocation.coords.latitude + "," + currentLocation.coords.longitude;
}

function formatPhoneNumber(paramString, convertTo08) {
	paramString.replaceAll(" ", "");
	var zero8 = "08";
	var plus628 = "+628";
	var replaceFrom = convertTo08 ? plus628 : zero8;

	if (paramString.startsWith(replaceFrom)) {
		paramString = paramString.replace(replaceFrom, !convertTo08 ? plus628 : zero8);
	}

	var i = 0;
	return [(convertTo08 ? [paramString.slice(i, i += 4)] : [paramString.slice(i, i += 3), paramString.slice(i, i += 3)]).join("-"), paramString.slice(i, i += 4), paramString.slice(i, i += 4)].join("-");
}

function formatLicensePlate(paramString) {
	paramString = paramString.toUpperCase().replaceAll(" ", "");
	var regexAreaCode = /^[A-Z]{1,3}/;
	var regexNumber = /[0-9]{1,4}/;
	var regexLetter = /[A-Z]{1,3}$/;
	return [paramString.match(regexAreaCode)[0], paramString.match(regexNumber)[0], paramString.match(regexLetter)[0]].join(" ");
}

function mod(a, b) {
	var r = a % b;
	return r < 0 ? r + b : r;
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

function parseBool(value) {
	if (value == null) { return false; }

	if (typeof value == "number") {
		return parseInt(value) > 0;
	}

	switch (value.toString().toLocaleLowerCase()) {
		case "1":
		case "true":
		case "yes":
		case "on":
			return true;
		default:
			return false;
	}
}

function setCookie(key, value) {
	localStorage[key] = value;
}

function getCookie(key) {
	return localStorage[key];
}