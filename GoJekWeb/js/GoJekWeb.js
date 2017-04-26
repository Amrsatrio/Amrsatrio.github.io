"use strict";
var Profile = {
	LOGIN: "/gojek/v2/login",
	LOGOUT: "/gojek/v2/customer/logout",
	EDIT: "/gojek/v2/customer/edit/v2",
	VERIFICATION_UPDATE: "/gojek/v2/customer/verificationUpdateProfile",
	CUSTOMER_INFO: "/gojek/v2/customer",
	CHANGE_PASSWORD: "/gojek/v2/customer/changePassword"
};
var Home = {
	PROMO_IMAGES: "/gojek/customer/promo_images_top"
}
var GoRide = {
	NEARBY_DRIVERS: "/gojek/service_type/1/drivers/nearby",
	HISTORY: "/gojek/customer/v2/history/",
	CALCULATE: "/gojek/v2/calculate/gopay"
};
var GoFood = {
	GET_CATEGORIES: "/gojek/shopping-category/find",
	SEARCH_MERCHANTS: "/gojek/merchant/find",
	// VIEW_NEW_MERCHANT_DETAILS_UUID_DEPRECATED: "/gofood/consumer/v2/restaurants/",
	HOME_NEW: "/gofood/consumer/v2/home",
	COMPLETED_ORDERS: "/myresto/consumer/v1/orders/completed",
	SEARCH_MERCHANTS_AND_MENU: "/gofood/consumer/v2/search"
};
var Booking = {
	HISTORY: "/gojek/v2/customer/v2/history/",
	HISTORY_FULL: "/gojek/v2/booking/history/",
	MAKE: "/gojek/v2/booking/v3/makeBooking",
	GET_BY_NO: "/gojek/v2/booking/findByOrderNo/",
	RATE: "/gojek/v2/booking/rate",
	RATE_REASONS: "/gojek/customer/feedback/list", // + ?service_type=1
	TIP_AMOUNTS: "/gojek/v2/booking/tip-amount/", // + customer id
	CANCEL: "/gojek/v2/booking/cancelBooking",
	CANCEL_CUSTOMER: "/gojek/v2/booking/cancelBookingCustomer",
	CANCEL_REASONS: "/gojek/cancelreason/customer/list",
	CALCULATE: "/gojek/v2/calculate/gopay/",
	REVERSE_GEOCODE: "/gojek/poi/reverse-geocode",
	FIND_POI: "/gojek/poi/v2/findPoi",
	FIND_LATLNG_BY_POI: "/gojek/poi/v2/findLatLng"
};
var GoPay = {
	GET_BALANCE: "/gojek/v2/customer/currentBalance/",
	DETAILED: "/wallet/profile/detailed",
	HISTORY: "/wallet/history",
	KYC_URL: "/wallet/kyc/url"
};
var GoPoints = {
	GET_BALANCE: "/gopoints/v1/wallet/points-balance",
	NEXT_TOKEN: "/gopoints/v1/next-points-token",
	REDEEM_TOKEN: "/gopoints/v1/redeem-points-token",
	AVAILABLE_VOUCHERS: "/gopoints/v1/available-voucher-batches",
	MY_VOUCHERS: "/gopoints/v1/wallet/vouchers"
};
var SpecialUrls = {
	GO_PAY_TERMS: "http://www.go-pay.co.id/appterms",
	GO_PAY_TOPUP: "https://www.go-jek.com/credits/top-up"
};
var Cookies = {
	EMAIL: "EMAIL",
	REFRESH_TOKEN: "REFRESHTOKEN"
};
var POLYLINE_WEIGHT = 3,
	DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	RATE_DESCS = ["Very bad", "Bad", "OK", "Good", "Awesome"], // 3 stars or less requires feedback
	FAKE_APPVER = "2.19.2",
	FAKE_UNIQUE_ID = "0123456789abcdef",
//	FAKE_IMEI = "305825702132830",
	BASE_URL = "https://api.gojekapi.com",
	currentLocation,
	accessToken = "",
	theCustomer,
	currentContainerId = 0,
	currentContainer,
	goFoodCurrentMerchant,
	goFoodCart,
	goFoodSelectedDest = {},
	goFoodUseGoPay = true,
	goFoodBanner,
	markers = [],
	map,
	goFoodPolyline,
	goFoodDestSelected = false,
	goFoodEstimatedCartPrice,
	goFoodPriceResponse,
	goFoodSearchAjax,
	goRideFrom = {},
	goRideTo = {},
	goRideFromMarker,
	goRideToMarker,
	goRideSelectTo = false,
	goRideUseGoPay = true,
	goRideNearbyDriverMarkers = [],
	failedMap,
	failedMarker,
	failedSelectLatLng,
	showDriverOutsideBooking = false,
	goRideMap,
	goRidePolyline,
	bookingId,
	bookingPeriodicRefresh,
	currentBookingData,
	bookingMap,
	bookingPolyline,
	bookingDriverMarker,
	bookingOriginMarker,
	bookingDestinationMarker,
	bookingFirstRequest,
	bookingAjax,
	moreDetailsState = false,
	bookingShouldContinueRefresh = false,
	homeBanner,
	lastKnownGoPointsData = {points_balance: 0, tokens_balance: 0},
	tabAnimations = {},
	loginContainerJq,
	goPointsPlayTracking = false,
	goPointsPlayXStart = 0,
	goPointsMainCont,
	goPointsCantSwipe,
	goPointsTokenData,
	animatedPlatter,
	newPhoneNumber,
	rateBookingNo,
	rateGoBackTo,
	selectedCancel,
	bookingHistoryData,
	rateFeedbackSlot,
	rateSelectedFeedback,
	rateTipSlot,
	rateSelectedTip = 0,
	notifSound,
	goPayQrCode;

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
				lat: -6.21462,
				lng: 106.84513
			}
		});
		failedMap.addListener("click", function(e) {
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

	if ("serviceWorker" in navigator) {
		if (!document.location.origin.startsWith("file")) {
			navigator.serviceWorker.register("ServiceWorker.js").then(function() {
				console.log(arguments);
			}).catch(function(e) {
				console.error(e);
			});
		}
	} else {
		console.warn("Service workers aren't supported in this browser.");  
	}

	$(".tabContainer").each(applyIndicator);
	document.arrive(".tabContainer", applyIndicator);
	$(".tabContentsContainer").each(initTab);
	document.arrive(".tabContentsContainer", initTab);
	$(document).on("click", ".tab", function(e) {
		var thisJq = $(this);
		if (thisJq.hasClass("active")) {
			return;
		}
		var thisParentJq = thisJq.parent(),
			tabContainerName = thisParentJq.attr("data-tabcontainername"),
			tabContentContainerJq = $(".tabContentsContainer[data-tabcontainername=" + tabContainerName + "]"),
			tabContentsToHide = $(".tabContents", tabContentContainerJq),
			tabContentToShow = $(".tabContents[data-tabname=" + thisJq.attr("data-tabname") + "]", tabContentContainerJq);
		if (tabContentContainerJq.hasClass("scrollable")) {
			if (tabAnimations[tabContainerName] != null) {
				// console.log("trying to stop", tabAnimations[tabContainerName]);
				tabAnimations[tabContainerName].stop(true, true);
			}
			var tabContentNowShowing = tabContentsToHide.filter(":not(:hidden)"),
				tabContentNowShowingDom = tabContentNowShowing[0],
				tabContentToShowDom = tabContentToShow.show()[0];
			var toRight = tabContentNowShowing.index() < tabContentToShow.index();
			tabAnimations[tabContainerName] = $({fake1: 0, fake2: 0}).animate({fake1: 30, fake2: 1}, {
				duration: 250,
				easing: $.bez([0.4, 0.0, 0.2, 1]),
				step: function(now, fx) {
					if (fx.prop == "fake1") {
						var a = toRight ? -now : now, b = toRight ? 30 - now : -30 + now;
						tabContentNowShowingDom.style.transform = "translate3d(" + a + "px, 0, 0)";
						tabContentToShowDom.style.transform = "translate3d(" + b + "px, 0, 0)";
					} else if (fx.prop == "fake2") {
						tabContentNowShowingDom.style.opacity = 1 - now;
						tabContentToShowDom.style.opacity = now;
					}
				}, complete: function() {
					tabContentNowShowing.hide();
					tabContentNowShowingDom.style.opacity = null;
					tabContentToShowDom.style.opacity = null;
					tabContentNowShowingDom.style.transform = null;
					tabContentToShowDom.style.transform = null;
				}
			});
		} else {
			tabContentsToHide.hide();
			tabContentToShow.show();
		}
		var nowActive = $(".tab.active", thisParentJq).removeClass("active");
		thisJq.addClass("active");
		updateTabIndicator(tabContainerName, true, nowActive.index());
	});
	// $("#foodSearchQuery").keypress(function(e) {
	// 	if (e.which == 13) {
	// 		$("#foodSearchQuerySubmit").click();
	// 	}
	// });
	goPointsMainCont = $(".goPointsMainCont");
	goPointsMainCont.mousedown(function(e) {
		if (goPointsCantSwipe) return;
		goPointsPlayTracking = true;
		goPointsPlayXStart = e.clientX;
	});
	$(document).mousemove(function(e) {
		if (goPointsPlayTracking && $.contains(goPointsMainCont[0], e.target)) {
			if (Math.abs(goPointsPlayXStart - e.clientX) >= 100) {
				goPointsPlayTracking = false;
				startSpin(goPointsTokenData, $(".container[data-name=goPointsPlay]"));
			}
		}
	});
	$(document).mouseup(function(e) {
		goPointsPlayTracking = false;
	});
	var verifyContainer = $(".container[data-name=verifyProfile]"),
		verifyCode = $("[name=code]", verifyContainer),
		verifyLoader = $(".loader", verifyContainer),
		verifySubmit = $("#verifySubmit", verifyContainer);
	verifyCode.on("input", function() {
		setEnabled(verifySubmit, this.value.length >= 4);
	});
	verifySubmit.click(function() {
		showHide(verifyLoader, verifySubmit, true);
		xRequestData(Profile.VERIFICATION_UPDATE, {}, function(data) {
			showHide(verifyLoader, verifySubmit, false);
			if (data != null) {
				if (data.status == "OK") {
					updateCustomerInfo();
					alert("Phone number updated");
					showContainer("editProfile");
				} else {
					alert(data.message);
				}
			} else {
				alert("Failed to verify phone number. Check your Internet connection.");
			}
		}, "POST", {
			"phone": newPhoneNumber,
			"id": theCustomer.id,
			"verificationCode": verifyCode.val()
		});
	});
	$("#logout").click(logout);
	$(".loginForm .loader", loginContainerJq = $(".container[data-name=login]")).hide();
	showContainer("login");

	if (getCookie(Cookies.REFRESH_TOKEN) != null && getCookie(Cookies.EMAIL) != null) {
		$("[name=email]", loginContainerJq).val(getCookie(Cookies.EMAIL));
		$("[name=autoSignIn]", loginContainerJq)[0].checked = true;
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

function updateTabIndicator(tabName, animate, prev) {
	var tabContainer = $(".tabContainer[data-tabcontainername=" + tabName + "]");
	var tabIndicator = $(".tabIndicator", tabContainer);
	var active = $(".active", tabContainer);
	var left = active[0].getBoundingClientRect().left - tabContainer[0].getBoundingClientRect().left + tabContainer[0].scrollLeft;
	var width = $(".active", tabContainer).outerWidth();
	if (animate) {
		tabIndicator.finish();
		if (Math.abs(prev - active.index()) > 1) {
			tabIndicator.width(0).css("left", left + (prev < active.index() ? -24 : width + 24));
		}
		tabIndicator.animate({
			width: width,
			left: left
		}, {
			duration: 250,
			easing: $.bez([0.4, 0.0, 0.2, 1])
		});
	} else {
		tabIndicator.width(width).css("left", left);
	}
}

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
	var submitButton = $("#submit", loginContainerJq),
		loader = $(".loginForm .loader", loginContainerJq),
		inputs = setEnabled($(".loginForm input", loginContainerJq), false),
		loginError = $("#loginError", loginContainerJq).hide();
	showHide(setEnabled(submitButton, false), loader, false);
	xRequestData(Profile.LOGIN, {}, function(response) {
		showHide(setEnabled(submitButton, true), loader, true);
		setEnabled(inputs, true);
		response = response || {
			status: "FAILED",
			message: "Check your Internet connection"
		};

		if (response.status == "OK") {
			accessToken = response.access_token;
			theCustomer = response.customer;

			if ($("[name=autoSignIn]", loginContainerJq)[0].checked) {
				setCookie(Cookies.EMAIL, theCustomer.email);
				setCookie(Cookies.REFRESH_TOKEN, response.refresh_token);
			} else {
				clearEmailRefreshToken();
			}
			updateCustomerInfo();
			showContainer("home");
			$(".tab:first-child", $("[data-tabcontainername=HOME]")).click();
		} else {
			clearEmailRefreshToken();
			loginError.show().html(response.message || ("<b>" + response.errors[0].message_title + ":</b> " + response.errors[0].message));
		}
	}, "POST", payload);
}

function clearEmailRefreshToken() {
	localStorage.removeItem(Cookies.EMAIL);
	localStorage.removeItem(Cookies.REFRESH_TOKEN);
}

function logout() {
	requestData(Profile.LOGOUT, {}, function(data) {
		if (data.status == "OK") {
			showContainer("login");
			clearEmailRefreshToken();
		}
	}, true, {});
}

function updateCustomerInfo() {
	xRequestData(Profile.CUSTOMER_INFO, {}, function(data) {
		if (data != null) {
			if (data.status == "OK") {
				theCustomer = data.customer;
				$("#homeCustomerName").text(theCustomer.name);
				$("#homeCustomerEmail").text(theCustomer.email);
				$("#homeCustomerPhone").text(formatPhoneNumber(theCustomer.phone));
			}
		}
	});
}

function showGoPayTopup() {
	window.open(SpecialUrls.GO_PAY_TOPUP, "_blank");
}

function updateProfileSubmit(elm) {
	var loader = $(".loader", elm),
		submit = $("[type=submit]", elm);
	newPhoneNumber = "+62" + $("[name=phone]", elm).val();
	showHide(loader, submit, true);
	xRequestData(Profile.EDIT, {}, function(data) {
		showHide(loader, submit, false);

		if (data != null) {
			updateCustomerInfo();
			alert(data.message);

			if (data.status == "SMS_VERIFICATION") {
				showContainer("verifyProfile");
			}
		}
	}, "POST", {
		name: $("[name=name]", elm).val(),
		email: $("[name=email]", elm).val(),
		phone: newPhoneNumber
	});
}

function changePasswordSubmit(elm) {
	var loader = $(".loader", elm),
		submit = $("[type=submit]", elm);
	showHide(loader, submit, true);
	xRequestData(Profile.CHANGE_PASSWORD, {}, function(data) {
		showHide(loader, submit, false);

		if (data != null) {
			if (data.status == "OK") {
				alert("Your password has been changed");
				showContainer("home");
			} else {
				alert(data.message);
			}
		}
	}, "POST", {
		"currentPassword": $("[name=oldPw]").val(),
		"newPassword": $("[name=newPw]").val(),
		"confirmationNewPassword": $("[name=newPwConfirm]").val(),
		"customerId": theCustomer.id
	});
}

function showGoFoodSearch(stringCategory, titleOverride) {
	var queries = {
		location: makeLocation()
	};
	var showSearchBox = false;
	var searchContainer = showContainer("goFoodSearch");
	searchContainer.find(".actionBar .title").text(titleOverride || "Search restaurants");
	var foodSearch = searchContainer.find("#foodSearch");
	var foodSearchBox = foodSearch.find("#foodSearchQuery").val("").unbind("input").on("input", _.debounce(function() {
		if (this.value.length >= 3) {
			loadGoFoodSearch();
		}
	}, 1000));
	var searchList = $("#goFoodSearchList").empty();

	if (stringCategory != null) {
		foodSearch.hide();
		loadGoFoodSearch(stringCategory);
	} else {
		searchList.html("<div class='listEmpty'>Minimum 3 characters</div>");
		foodSearch.show();
		foodSearchBox.focus();
	}
}

function loadGoFoodSearch(stringCategory, page) {
	var list = $("#goFoodSearchList");
	if (page == null) {
		list.empty();
		page = 0;
	}
	// var submit = $("#foodSearchQuerySubmit").attr("disabled", true);
	var loader = $(".listLoader", list.parent()).show();
	var queries = {
		location: makeLocation(),
		page: page,
		limit: 20
	};

	if (stringCategory != null) {
		queries.category = stringCategory;
	} else {
		queries.name = $("#foodSearchQuery").val();
	}

	if (goFoodSearchAjax != null) {
		goFoodSearchAjax.abort();
	}

	goFoodSearchAjax = xRequestData(GoFood.SEARCH_MERCHANTS, queries, function(data) {
		if (data == null) {
			list.append("<div class='listEmpty'>Error</div>")
			return;
		}

		if (data.length > 0) {
			var todayIdx = mod(new Date().getDay() - 1, 7);

			for (var i in data) {
				var foodData = data[i];
				//TODO jam buka
				for (var j in foodData.listOperationalHour) {
					var xx = foodData.listOperationalHour[j];
					if (!xx.openTime.endsWith("WIB") || !xx.closeTime.endsWith("WIB")) {
						console.debug("UNKNOWN HOUR", foodData.name, xx);
					}
				}
				var openHours = foodData.listOperationalHour[todayIdx];
				var detailsToJoin = [foodData.distance.toFixed(2) + " km"];
				detailsToJoin.push(isOpenByListOperationalHours(openHours) ? ("OPEN" + " " + removeTimeSuffix(openHours.openTime) + "&ndash;" + removeTimeSuffix(openHours.closeTime)) : "CLOSED");

				if (foodData.partner) {
					detailsToJoin.push("GO-PAY free delivery");
				}

				var bg = "<div class='cardBG'" + (foodData.imgLocation == null ? "" : " style='background-image: url(" + foodData.imgLocation + ");'") + "></div>";
				list.append($("<div class='card'>" + bg + "<div class='cardContent'><div class='primary'>" + foodData.name + "</div><div class='secondary'>" + foodData.address + "</div><div class='secondary'>" + detailsToJoin.join(" · ") + "</div></div></div>")
					.click((function(id) {
						return function() {
							showFoodMerchant(id);
						};
					})(foodData.id)));
			}

			list.append($("<button class='loadMore'>Load 20 more</button>").click(function() {
				$(this).remove();
				loadGoFoodSearch(stringCategory, page + 1);
			}));
		} else {
			list.append("<div class='listEmpty'>" + (page == 0 ? "No results" : "All restaurants have been shown") + "</div>")
		}
		// submit.removeAttr("disabled");
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

	goFoodPriceResponse = null;
	requestData(Booking.CALCULATE, {}, function(data) {
		goFoodPriceResponse = data;
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
			merchantId: goFoodCurrentMerchant.id,
			originLatLong: goFoodCurrentMerchant.latLong,
			serviceType: 5
		}],
		serviceType: 5
	});
}, 1000);

function showFoodMerchant(uuid) {
	goFoodCart = [];
	goFoodCurrentMerchant = null;
	var cRoot = $("<div class='container goFood' data-id='" + currentContainerId + "' data-name='foodMerchantDetails'></div>");
	$(".siteWrapper").append(cRoot);
	var container = $("<div class='wrapper'></div>");
	cRoot.append($("<div class='scrollingContent'></div>").append(container));
	container.append("<button onclick='closeContainer(" + currentContainerId++ + ")'>< Back</button>");
	var foodHero;
	container.append(foodHero = $("<div class='foodHero'></div>")
		.append("<div class='foodHeroOverlay flexCenter'><div class='flexGrow'><div class='foodHeroTitle'>Loading...</div><div class='foodHeroSubtitle'></div></div><button class='flat' id='goFoodMerchantDetailsBtn'>Details</button></div>"));
	$("#goFoodMerchantDetailsBtn").click(function() {
		alert(JSON.stringify(goFoodCurrentMerchant));
	});
	var menuContainer;
	container.append(menuContainer = $("<div class='goFoodMenu'></div>"));
	// requestData(GoFood.VIEW_NEW_MERCHANT_DETAILS_UUID + uuid, {}, function(data) {
	requestData("/gojek/merchant/" + uuid, {}, function(data) {
		goFoodCurrentMerchant = data;
		foodHero.css("background-image", "url(" + (data.imgLocation || "") + ")");
		$(".foodHeroTitle", foodHero).text(data.name);
		container.append("<div class='estimatedCost clickable' id='foodCost' onclick='showGoFoodOrderConfirmation();'><div class='flexCenter'><div class='material-icons'>shopping_cart</div><div class='vDivider'></div><div><div class='line1'>Estimated Price</div><div class='line2'>Rp <span>0</span></div></div></div></div>");
		// var tempText = $("<div>" + JSON.stringify(data) + "</div>");
		// container.append(tempText);
	});
	xRequestData("/gojek/item-category/find-with-menus", {merchantId: uuid}, function(data) {
		if (data != null) {
			var recomTab = { name: "Recommended", shoppingItems: [] };

			for (var i in data) {
				var section = data[i];

				if (section.shoppingItems.length < 1) {
					continue;
				}

				for (var j in section.shoppingItems) {
					var item = section.shoppingItems[j];

					if (item.recommended) {
						recomTab.shoppingItems.push(item);
					}
				}
			}

			data.unshift(recomTab);
			var tabId = "MERCHANT-" + uuid;
			var tabs = $("<div></div>").addClass("tabContainer scrolling").attr("data-tabcontainername", tabId);
			var tabContents = $("<div></div>").addClass("tabContentsContainer").attr("data-tabcontainername", tabId);

			for (var i in data) {
				var section = data[i];

				if (section.shoppingItems.length < 1) {
					continue;
				}

				var tabName = "SECTION-" + i;
				tabs.append("<div class='tab' data-tabname='" + tabName + "'>" + section.name + "</div>");
				var sectionJq = $("<div></div>").addClass("tabContents").attr("data-tabname", tabName);

				for (var j in section.shoppingItems) {
					var item = section.shoppingItems[j];
					if (item.recommended || item.signature) {
						console.debug("Encountered: recom " + item.recommended + ", sig " + item.signature + ": " + item.name);
					}
					sectionJq.append(constructFoodItem(item));
				}

				tabContents.append(sectionJq);
			}

			menuContainer.append(tabs);
			menuContainer.append(tabContents);
			updateCart();
			calculatePrices();
		}
	});
}

function constructFoodItem(item) {
	var addButton, quantityControl, quantityText, lower, notesInput;
	var getFromCart = function() {
		var b, a = $.grep(goFoodCart, function(e, i) {
			if (e.itemId == item.id) {
				b = i;
				return true;
			}
		})[0];
		return {a: a, b: b};
	};
	var listItem = $("<div class='settingsBox foodItem'></div>").attr("data-itemid", item.id)
		.append($("<div class='upperContent flexCenter'></div>")
			.append("<div class='foodImg'" + (item.imgLocation == null ? "" : " style='background-image: url(" + item.imgLocation + ");'") + "></div>")
			.append("<div class='flexGrow'><div>" + item.name + "</div><div>" + (item.description || "") + "</div><div class='price'>Rp " + item.price.formatMoney(0) + "</div></div>")
			.append($("<div class='cRight'><div class='socialLike'><span class='material-icons'>favorite</span></div></div>")
				.append(addButton = $("<button class='addButton colored'>Add</button>").click(function() {
					addFoodItemToCart(item);
					quantityText.text(1);
					notesInput.val("");
					showHide(addButton, quantityControl, false);
					lower.show();
				}))
				.append(quantityControl = $("<div class='quantity cRight'></div>")
					.append($("<button id='min'>-</button>").click(function() {
						var returned = getFromCart();
						var _item = returned.a;
						_item.quantity--;
						quantityText.text(_item.quantity);

						if (_item.quantity < 1) {
							goFoodCart.splice(returned.b, 1);
							showHide(addButton, quantityControl, true);
							lower.hide();
						}

						updateCartPrices();
					}))
					.append(quantityText = $("<div class='qText'>0</div>"))
					.append($("<button id='plus'>+</button>").click(function() {
						var _item = getFromCart().a;
						_item.quantity++;
						quantityText.text(_item.quantity);
						updateCartPrices();
					})))))
		.append(lower = $("<div class='lowerContent'></div>")
			.append(notesInput = $("<input type='text' placeholder='Add notes' />").on("input", function() {
				// TODO find other way to do this, below code is a performance degrader
				for (var j in goFoodCart) {
					if (goFoodCart[j].itemId == item.id) {
						goFoodCart[j].notes = this.value;
						break;
					}
				}
			})));
	lower.hide();
	quantityControl.hide();
	return listItem;
}

function addFoodItemToCart(item) {
	var i = goFoodCart.push({
		id: 0,
		itemDescription: item.description,
		itemId: item.id,
		itemName: item.name,
		notes: "",
		price: item.price,
		quantity: 1
	});
	updateCartPrices();
	return i - 1;
}

function updateCartPrices() {
	goFoodEstimatedCartPrice = 0;

	for (var i in goFoodCart) {
		goFoodEstimatedCartPrice += goFoodCart[i].quantity * goFoodCart[i].price;
	}

	$("#foodCost span").html(goFoodEstimatedCartPrice.formatMoney(0));
}

function updateCart() {
	updateCartPrices();
	calculatePrices();
	var cartContainer = $(".container[data-name='foodCart'] .cartList");

	if (cartContainer.length > 0) {
		cartContainer.empty();

		if (goFoodCart.length == 0) {
			cartContainer.append("<div class='settingsBox'>Your cart is empty</div>");
		} else {
			for (var i in goFoodCart) {
				var item = goFoodCart[i];
				var theRow = $("<div class='settingsBox'><div class='flexCenter'><div class='flexGrow'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Rp " + item.price.formatMoney(0) + "</div></div><div class='flexCenter'><input type='text' placeholder='Notes' class='flexGrow' /><div class='quantity cRight'><button id='min'>-</button><div class='qText'>" + item.quantity + "</div><button id='plus'>+</button></div></div></div>");
				cartContainer.append(theRow);
				theRow.find("input[type=text]").on("input", (function(idx) {
					return function() {
						goFoodCart[idx].notes = this.value;
					};
				})(i)).val(goFoodCart[i].notes);
				theRow.find("#min").click((function(_item, idx) {
					return function() {
						_item.quantity--;

						if (_item.quantity < 1) {
							goFoodCart.splice(idx, 1);
						}

						updateCart();
					};
				})(item, i));
				theRow.find("#plus").click((function(_item) {
					return function() {
						_item.quantity++;
						updateCart();
					};
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
	wrapper.append("<div class='actionBar'><div><button onclick='closeContainer(" + currentContainerId++ + "); resetGoFoodOrder();' class='backButton'><span class='material-icons'>arrow_back</span></button></div><div class='title'>Booking Confirmation</div></div>");
	var cartCard = $("<div class='card goFoodCard'></div>")
		.append("<div class='cardTitle'>Items to order</div>")
		.append("<div class='cardContent'><div class='cartList'></div></div>");
	wrapper.append(cartCard);
	var deliverToCard = $("<div class='card goFoodCard'></div>")
		.append("<div class='cardTitle'>Deliver to</div>");
	wrapper.append(deliverToCard);
	deliverToCard.append("<div id='map' style='height: 400px;'></div>");
	initGoFoodOrderMap();
	var deliverToCardContent = $("<div class='cardContent'></div>");
	deliverToCard.append(deliverToCardContent);
	deliverToCardContent.append("<div class='settingsBox'><div><input type='text' id='destName' placeholder='Address (click on map first)' disabled style='width: 100%;' /></div><div><input type='text' id='destNote' placeholder='Notes' disabled style='width: 100%;' /></div></div>");
	$("#destName").unbind("input").on("input", function() {
		goFoodSelectedDest.name = this.value;
	});
	$("#destNote").unbind("input").on("input", function() {
		goFoodSelectedDest.note = this.value;
	});
	deliverToCardContent.append("<div class='textSeparator'>History (select one to set as destination)</div>");
	var historyList = $("<div class='historyList'></div>");
	deliverToCardContent.append(historyList);
	var paymentCard = $("<div class='card goFoodCard'></div>")
		.append("<div class='cardTitle'>Payment details</div>");
	var priceSummary = $("<div class='cardContent'></div>")
		.append("<div id='foodCost' class='priceEntry flexCenter'><div class='flexGrow'>Cost (Est)</div><div>Rp <span>0</span></div></div>")
		.append("<div id='deliveryPrice' class='priceEntry flexCenter'><div class='flexGrow'>Delivery<span id='km'></span></div><div>Rp <span id='price'>0</span></div></div>")
		.append("<div id='totalPrice' class='priceEntry flexCenter'><div class='flexGrow'>Total price</div><div>Rp <span>0</span></div></div>")
		.append("<div id='deductionGoPay' class='priceEntry flexCenter'><div class='flexGrow'>GO-PAY</div><div>- Rp <span>0</span></div></div>")
		.append("<div id='deductionCash' class='priceEntry cash flexCenter'><div class='flexGrow'>Cash</div><div>- Rp <span>0</span></div></div>");
	paymentCard.append(priceSummary).append("<div class='cardTitle'>Pay with</div>");
	var payWith = $("<div class='settingsBox'><label><input type='radio' name='goFoodUseGoPay' value='true' checked />GO-PAY (Rp <span id='goFoodGoPayBalance'>0</span>)</label><label><input type='radio' name='goFoodUseGoPay' value='false' />Cash</label></div>");
	paymentCard.append(payWith);
	wrapper.append(paymentCard);
	payWith.find("input[name=goFoodUseGoPay]").on("change", function() {
		goFoodUseGoPay = $("input[name=goFoodUseGoPay]:checked", payWith).val() == "true";
		updatePrices();
	});
	wrapper.append($("<button class='orderButton'>ORDER</button>").click(function() {
		if (goFoodCart.length < 1) {
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

					updateGoFoodConfirmMap();
				};
			})(item)));
		}
	});
	updateGoPayBalance(function(data) {
		$("#goFoodGoPayBalance").text(data.currentBalance.formatMoney(0));

		if (data.currentBalance <= 0) {
			setEnabled($("input[name=goFoodUseGoPay][value=true]"), false);
			$("input[name=goFoodUseGoPay][value=false]")[0].checked = true;
			goFoodUseGoPay = false;
		}
	});
	updateCart();
	calculatePrices();
	updateGoFoodConfirmMap();
}

function updatePrices() {
	if ($.isEmptyObject(goFoodPriceResponse)) {
		return;
	}

	$("#foodCost span").html(goFoodPriceResponse.estimatedPrice.formatMoney(0));
	$("#deliveryPrice #km").text(" (" + goFoodPriceResponse.totalDistance + " km)");
	var deliveryPrice = 0;

	if (goFoodUseGoPay && goFoodPriceResponse.totalCredit > 0) {
		deliveryPrice = goFoodPriceResponse.goPayPrice.goPayTotalPrice;
	} else {
		deliveryPrice = goFoodPriceResponse.subTotal;
	}

	$("#deliveryPrice #price").text(deliveryPrice.formatMoney(0));
	$("#totalPrice span").text((goFoodUseGoPay ? goFoodPriceResponse.goPayPrice.gopay_grand_total : goFoodPriceResponse.totalPrice).formatMoney(0));
	var deductionGoPay = $("#deductionGoPay");

	if (goFoodUseGoPay) {
		deductionGoPay.show();
		$("#deductionGoPay span").text(goFoodPriceResponse.totalCredit.formatMoney(0));
	} else {
		deductionGoPay.hide();
	}

	$("#deductionCash span").text((goFoodUseGoPay ? goFoodPriceResponse.totalCash : goFoodPriceResponse.cashPrice).formatMoney(0));
}

function updateGoFoodConfirmMap() {
	for (var i in markers) {
		markers[i].setMap(null);
	}

	markers = [];
	markers.push(createMarker(0, commaSeparatedLatLng(goFoodCurrentMerchant.latLong), "Origin: " + goFoodCurrentMerchant.name + ", " + goFoodCurrentMerchant.address));
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
	var name = "", icon;
	switch (markerType) {
		case 0:
			icon = createMarkerIcon("marker-origin.png");
			name = "Pick up location";
			break;
		case 1:
			icon = createMarkerIcon("marker-destination.png")
			name = "Destination";
			break;
		case 2:
			icon = createMarkerIcon("marker-driver.png");
			name = "Driver";
			break;
	}
	var s = title == null ? "" : ": " + title;
	return new google.maps.Marker({
		position: latLng,
		title: name + s,
		icon: icon
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
			"detailsAddress": goFoodCurrentMerchant.detailAddress,
			"estimatedPrice": goFoodEstimatedCartPrice,
			"item": "",
			"merchantId": goFoodCurrentMerchant.id,
			"originAddress": goFoodCurrentMerchant.address,
			"originContactName": "",
			"originContactPhone": "",
			"originLatLong": goFoodCurrentMerchant.latLong,
			"originName": goFoodCurrentMerchant.name,
			"originNote": goFoodCurrentMerchant.address,
			"routeItems": goFoodCart,
			"serviceType": 5
		}]
	};
	makeBooking(payload, function() {
		$("[data-name=foodMerchantDetails], [data-name=foodCart]").remove();
		showContainer("home");
	});
}

function isNullOrEmpty(paramString) {
	return paramString == null || paramString.length == 0;
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

function showBooking(id, previewData) {
	bookingMap = null;
	bookingOriginMarker = null;
	bookingDestinationMarker = null;
	bookingDriverMarker = null;
	bookingId = id;
	var container = $("<div class='container bookingContainer' data-name='viewBooking'></div>");
	$(".siteWrapper").append(container);
	showContainer("viewBooking");
	var addresses = $("<div class='card' id='bookingFromTo'></div>").hide();
	var contentInner = $("<div class='contentInner'></div>");
	container.append("<div id='bookingMap'></div>")
		.append($("<div class='actionBar'></div>")
			.append("<div><button onclick='closeBooking();'><span class='material-icons'>arrow_back</span></button></div>")
			.append("<div class='title'>" + getNameOfServiceByInt(previewData == null ? NaN : previewData.serviceType).toUpperCase() + "</div>")
			.append("<div><div class='iconCont'><div class='loader size24' style='display: none;' id='bookingLoader'></div></div></div>"))
		.append(contentInner);
	contentInner.append(
		addresses.append("<div class='settingsBox flexCenter' id='bookingFrom'><div class='cRight'></div><div class='flexGrow'><div class='name'></div><div class='note'></div></div></div>")
			.append("<div class='settingsBox flexCenter' id='bookingTo'><div class='cRight'></div><div class='flexGrow'><div class='name'></div><div class='note'></div></div></div>"));
	var moreDetails;
	moreDetailsState = false;
	contentInner.append($("<div class='contentBottomPortion'></div>").append($("<div class='card bookingStatusCard'></div>")
		.append($("<button class='showMoreDetails'>Show details</button>").hide().click(function() {
			var options = {
				duration: 250,
				easing: $.bez([0.4, 0.0, 0.2, 1])
			}
			if (moreDetailsState = !moreDetailsState) {
				moreDetails.finish().slideDown(options);
				moreDetails.addClass("shown");
				this.innerHTML = "Hide details";
			} else {
				moreDetails.finish().slideUp(options);
				moreDetails.removeClass("shown");
				this.innerHTML = "Show details";
			}
		}))
		.append(moreDetails = $("<div class='moreDetails'></div>").hide()
			.append($("<div id='bookingItemsWrapper'></div>").hide()
				.append("<div class='textSeparator'>Order details</div>")
				.append("<div id='bookingItems'></div>"))
			.append($("<div id='paymentWrapper'></div>")
				.append("<div class='textSeparator flexCenter'><div class='flexGrow'>Payment details</div><div>using <span id='bookingPaymentMethod'>Cash</div></div></div>")
				.append($("<div></div>")
					.append($("<div></div>")
						.append("<div class='priceEntry flexCenter'><div class='flexGrow'>Cost</div><div>Rp <span id='bookingCost'></span></div></div>")
						.append("<div class='priceEntry flexCenter'><div class='flexGrow'>Delivery Fee (<span id='bookingDistance'></span> km)</div><div>Rp <span id='bookingDeliveryFee'></span></div></div>")
						.append("<div class='priceEntry flexCenter'><div class='flexGrow'>Tip</div><div>Rp <span id='bookingTipAmount'></span></div></div>")
						.append("<div class='priceEntry flexCenter'><div class='flexGrow'>Total Price</div><div>Rp <span id='bookingTotalPrice'></span></div></div>")
						.append("<div class='priceEntry flexCenter' id='bookingGoPayPriceContainer'><div class='flexGrow'>GO-PAY</div><div>- Rp <span id='bookingGoPayPrice'></span></div></div>")
						.append("<div class='priceEntry cash flexCenter'><div class='flexGrow'>Cash</div><div>Rp <span id='bookingCashPrice'></span></div></div>")))))
		.append($("<div class='goRidePriceDetails settingsBox flexCenter'><div class='flexGrow'>Price (<span class='distance'>0.00</span> km)</div><div class='price'></div></div>").hide())
		.append("<div class='settingsBox flexCenter'><div class='driverPhotoWrapper'><div id='driverPhoto'></div></div><div class='flexGrow'><div id='driverInfo'></div><div>Order No. " + bookingId + "</div><div id='bookingStatusText'></div></div></div>")
		.append($("<div class='actions'></div>").append($("<button id='rate'>Rate</button>").hide().click(function() {
				// rateBooking(5, "", 0, function(data) {
				// 	if (data.statusMessage == "OK") {
				// 		alert("You rated this order 5 stars");
				// 	} else {
				// 		alert(data.statusMessage);
				// 	}
				// });
				showRate(currentBookingData.orderNo);
			})).append($("<button id='bookingCancel'>Cancel...</button>").click(function() {
				showContainer("bookingCancel");
			})).append($("<button id='needHelp' disabled>Need help?</button>")))));
	initBookingMap();
	bookingShouldContinueRefresh = true;
	bookingFirstRequest = true;
	// bookingPeriodicRefresh = setInterval(reqDataUpdateBooking, 7500);
	reqDataUpdateBooking();
}

function reqDataUpdateBooking() {
	var bookingLoader = $("#bookingLoader").fadeIn(250);
	bookingAjax = xRequestData(Booking.GET_BY_NO + bookingId, {}, function(data, st) {
		bookingLoader.fadeOut(250);

		if (st != "error") {
			currentBookingData = data;
			updateBookingContents();
			bookingFirstRequest = false;
		}

		if (bookingShouldContinueRefresh) {
			bookingPeriodicRefresh = setTimeout(reqDataUpdateBooking, 7500);
		}
	});
}

function closeBooking() {
	bookingId = null;
	bookingShouldContinueRefresh = false;
	clearInterval(bookingPeriodicRefresh);
	if (bookingAjax != null) bookingAjax.abort();
	$(".container[data-name=viewBooking]").remove();
	showContainer("home");
}

function updateBookingContents() {
	// TODO: MAKE IT LIKE IN THE REAL GOJEK APP
	if (currentBookingData.statusBooking == 6) {
		if (currentContainer.name == "viewBooking") {
			showContainer("findingDriver");
			$("#bookingFindingDriverDesc").text(currentBookingData.reblast ? "We're finding you a new driver" : "Searching for the nearest driver to you");
		}
	} else {
		if (currentContainer.name == "findingDriver") {
			showContainer("viewBooking");
		}
	}

	if (currentBookingData.serviceType == 5) {
		$("#bookingCost").text((currentBookingData.shoppingActualPriceBeforeDiscount || currentBookingData.estimatedPriceBeforeDiscount).formatMoney(0));
		$("#bookingDistance").text(currentBookingData.totalDistance.toFixed(2));
		$("#bookingDeliveryFee").text(currentBookingData.totalPrice.formatMoney(0));
		var tipAmountValueJq = $("#bookingTipAmount"),
			tipAmountParent = tipAmountValueJq.parent().parent();

		if (isZeroOrNull(currentBookingData.tipAmount)){
			tipAmountParent.hide();
		} else {
			tipAmountParent.show();
			tipAmountValueJq.text(currentBookingData.tipAmount.formatMoney(0));
		}

		$("#bookingTotalPrice").text((currentBookingData.totalPriceWithTips || currentBookingData.totalPriceWithoutDiscounts).formatMoney(0));

		if (currentBookingData.paymentType == 4) {
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
	$("#driverPhoto").css("background-image", "url(" + getDriverPhotoUrl(currentBookingData.driverPhoto) + ")");
	var bookingCancel = $("#bookingCancel");
	showHide($("#needHelp"), bookingCancel, bookingComplete);
	$("#bookingStatusText").text(getStatusMessageAndControlCancelButton(currentBookingData, bookingCancel));
	var rateBtn = $("#rate");

	if (bookingComplete && [1, 5].indexOf(currentBookingData.serviceType) > -1 && currentBookingData.rate == null && !isCanceled(currentBookingData) && currentBookingData.statusBooking != 5) {
		rateBtn.show();
	} else {
		rateBtn.hide();
	}

	if (bookingFirstRequest) {
		var bookingFrom = $("#bookingFrom");
		var bookingTo = $("#bookingTo");
		$(".name", bookingFrom).text(address.originName);
		$(".note", bookingFrom).text(address.originNote);
		$(".name", bookingTo).text(address.destinationName);
		$(".note", bookingTo).text(address.destinationNote);
		$("#bookingFromTo").fadeIn(250);

		if (currentBookingData.serviceType == 1) {
			var priceDetails = $(".goRidePriceDetails").show();
			$(".distance", priceDetails).text(currentBookingData.totalDistance.toFixed(2));
			$(".price", priceDetails).text((currentBookingData.paymentType == 4 ? "GO-PAY" : "Cash") + " Rp " + currentBookingData.totalPrice.formatMoney(0) + (isZeroOrNull(currentBookingData.tipAmount) ? "" : " (Tip Rp " + currentBookingData.tipAmount.formatMoney(0) + ")"));
		} else if (currentBookingData.serviceType == 5) {
			$(".showMoreDetails").show();
			$("#bookingItemsWrapper").show();
			var bookingItems = $("#bookingItems").empty();
			var routeItems = currentBookingData.addresses[0].routeItems;

			for (var i in routeItems) {
				var item = routeItems[i];
				var theRow = $("<div class='settingsBox'><div class='flexCenter'><div class='flexGrow'><div>" + item.itemName + "</div><div>" + (item.itemDescription == null ? "" : item.itemDescription) + "</div></div><div class='cRight'>Est. Rp " + item.price.formatMoney(0) + "</div></div><div class='flexCenter'><div class='flexGrow'>" + item.notes + "</div><div class='cRight'>x" + item.quantity + "</div></div></div>");
				bookingItems.append(theRow);
			}

			$("#bookingPaymentMethod").text(currentBookingData.paymentType == 4 ? "GO-PAY" : "Cash");
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
			icon: createMarkerIcon("marker-origin.png")
		});
		bookingOriginMarker.setMap(bookingMap);
		bookingDestinationMarker = new google.maps.Marker({
			position: commaSeparatedLatLng(currentBookingData.addresses[0].latLongDestination),
			title: "Your destination",
			icon: createMarkerIcon("marker-destination.png")
		});
		bookingDestinationMarker.setMap(bookingMap);
		bookingMap.panTo(currentBookingData.statusBooking == 7 ? {
			lat: currentBookingData.driverLatitude,
			lng: currentBookingData.driverLongitude
		} : commaSeparatedLatLng(currentBookingData.addresses[0].latLongOrigin));
	}

	if (!driverFound || (bookingComplete && !showDriverOutsideBooking)) { // for security reasons hide the driver if the booking has been closed
		if (bookingDriverMarker != null) {
			bookingDriverMarker.setMap(null);
			bookingDriverMarker = null;
		}

		return;
	}

	if (bookingDriverMarker == null) {
		bookingDriverMarker = new google.maps.Marker({
			title: "Driver",
			icon: createMarkerIcon("marker-driver.png")
		});
		bookingDriverMarker.setMap(bookingMap);
	}

	bookingDriverMarker.setPosition({
		lat: currentBookingData.driverLatitude,
		lng: currentBookingData.driverLongitude
	});
}

function getDriverPhotoUrl(raw) {
	return !isNullOrEmpty(currentBookingData.driverPhoto) ? (currentBookingData.driverPhoto.startsWith("http") ? currentBookingData.driverPhoto : (BASE_URL + "/gojek/v2/file/img/" + currentBookingData.driverPhoto)) : "";
}

function createMarkerIcon(name) {
	return {
		url: name,
		scaledSize: new google.maps.Size(36, 40)
	};
}

function rateBooking(stars, feedback, tip, callback) {
	var bool = currentBookingData.serviceType != 5;
	xRequestData(Booking.RATE, {}, callback, "POST", {
		activitySource: 2,
		feedback: feedback || "",
		isHelmetAndJacket: bool,
		isMaskerAndHairCover: bool,
		orderNo: currentBookingData.orderNo,
		predefineFeedbackId: 0,
		rate: stars,
		tipAmount: tip || 0
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
		// TODO special searching driver screen
		return paramBooking.reblast ? "We're finding you a new driver" : "Searching for the nearest driver to you";
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
			// status = GoMedConstant.translateOrderStatus(paramBooking.statusBooking);
			status = "UNKNOWN";
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
			alert("For this time this web app only supports GO-RIDE and GO-FOOD orders. More services will be supported in the (not too distant) future.");
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
	} else if (paramBooking.rate == null && isGoJekCompleteBooking(paramBooking) && paramBooking.statusBooking != 5) {
		box.append("<div style='color: #F57F17; font-weight: bold;'>UNRATED</div>");
	}

	return box;
}

function initContainer(name, elm) {
	currentContainer = { name: name, element: elm };
	switch (name) {
		case "login":
			$("#loginError").hide();
			$("#email, #password").val("");
			$("[name=autoSignIn]")[0].checked = false;
			break;
		case "changePassword":
			var loader = $(".loader", elm).hide(),
				oldPw = $("[name=oldPw]", elm).val(""),
				newPw = $("[name=newPw]", elm).val(""),
				newPwConfirm = $("[name=newPwConfirm]", elm).val("");
			break;
		case "editProfile":
			var loader = $(".loader", elm).hide(),
				name = $("[name=name]", elm).val(theCustomer.name),
				email = $("[name=email]", elm).val(theCustomer.email),
				phone = $("[name=phone]", elm).val(theCustomer.phone.replace("+62", ""));
			break;
		case "verifyProfile":
			$(".loader", elm).hide();
			$("[name=code]", elm).val("");
			setEnabled($("#verifySubmit", elm), false);
			break;
		case "home":
			var goPayText = $(".goPayBalance", elm).text("Loading");
			updateGoPayBalance(function(data) {
				goPayText.text(data == null ? "Unable to load" : ("Rp " + data.currentBalance.formatMoney(0)));
			});
			var goPointsText = $(".goPointsBalance", elm).text("Loading");
			updateGoPointsBalance(function(data) {
				goPointsText.html(data == null ? "Unable to load" : (data.points_balance.formatMoney(0) + " pt" + plural(data.points_balance)));

				if (data.tokens_balance > 0) {
					goPointsText.eq(0).append("<span class='redCircle'>" + data.tokens_balance + "</span>");
				}
			});
			homeBanner = new HeroBanner($("#homeBanner"), elm);
			xRequestData(Home.PROMO_IMAGES, {}, function(data) {
				if (data != null) {
					homeBanner.init($.map(data, function(obj) {
						return {image: obj.imageUrl};
					}), function(img, i) {
						handleClickElm(img, data[i].deeplink);
					});
				}
			});
			xRequestData(Booking.HISTORY_FULL + theCustomer.id, {limit: 50}, function(data) {
				if (data == null) return;
				bookingHistoryData = data;
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

				var inProgressList = $("#bookingInProgressList", elm).empty();
				var completedList = $("#bookingCompletedList", elm).empty();

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
			var loader = $(".loader", elm);
			var pointsBalanceText = $(".goPointsBalance", elm);
			var redeemToken = setEnabled($("#redeemToken", elm), false);
			showHide(loader, pointsBalanceText, true);
			updateGoPointsBalance(function(data) {
				showHide(loader, pointsBalanceText, false);

				if (data == null) {
					pointsBalanceText.html("Unable to load");
					return;
				}

				$(".playIcon", elm).html(data.tokens_balance > 0 ? ("<span class='redCircle'>" + data.tokens_balance + "</span>") : "");
				pointsBalanceText.text(data.points_balance.formatMoney(0));
				setEnabled(redeemToken, data.tokens_balance > 0);
				redeemToken.unbind("click").click(function() {
					var theThis = $(this);
					setEnabled(theThis, false);
					xRequestData(GoPoints.NEXT_TOKEN, {}, function(data1, st) {
						setEnabled(theThis, data.tokens_balance > 0);
						if (data1 != null) {
							if (!data1.success) {
								alert(data1.errors[0].message_title + "\n" + data1.errors[0].message);
								return;
							}
							goPointsTokenData = data1;
							showContainer("goPointsPlay");
						}
					}, "POST", {});
				});
			});
			var availVouchersList = $("#goPointsVouchers").empty();
			var load = function(page) {
				var loader = $(".listLoader", availVouchersList.parent()).show();
				xRequestData(GoPoints.AVAILABLE_VOUCHERS, {limit: 10, page: page}, function(data) {
					loader.hide();
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
				xRequestData(GoPoints.MY_VOUCHERS, {limit: 10, page: page}, function(data) {
					// var sortedData = data.data.sort(function(a, b) {
					// 	return a.points - b.points;
					// });

					if (data.data != null && data.data.length > 0) {
						for (var i in data.data) {
							myVouchersList.append(constructVoucherCard(data.data[i]));
						}
					} else {
						myVouchersList.append("<div class='listEmpty'><img src='gopoints-myvouchers-empty.png' /><div>Use GO-PAY to get token to play, earn points and buy vouchers! <a href='https://www.go-jek.com/app/gopoint' target='_blank'>More info</a></div></div>")
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
			goFoodBanner = new HeroBanner($("#goFoodBanner", elm));
			var shortcuts = $("#shortcuts", elm).empty();
			var cuisines = $("#cuisines", elm).empty();
			var homeContent = $("#goFoodHomeContent", elm).hide();
			var loader = $(".listLoader", elm).show();
			requestData(GoFood.HOME_NEW, {
				location: makeLocation()
			}, function(data) {
				showHide(homeContent, loader, true);
				goFoodBanner.init(data.banners, function(img, i) {
					var banner = data.banners[i];
					if (banner.banner_type == "CATEGORY") {
						img.addClass("clickable");
						img.click((function(banner) {
							return function() {
								showGoFoodSearch(banner.category_code, banner.category_name);
							};
						})(banner));
					} else if (banner.banner_type == "WEB") {
						handleClickElm(img, banner.url);
					}
				});
				for (var i in data.shortcuts) {
					var shortcut = data.shortcuts[i];
					shortcuts.append($("<div class='card cardContent'><img src='" + shortcut.icon.url + "' height='128px' /><div>" + shortcut.name + "</div></div>").click((function(shortcut) {
						return function() {
							showGoFoodSearch(shortcut.code, shortcut.name);
						};
					})(shortcut)));
				}
				for (var i in data.cuisines) {
					var cuisine = data.cuisines[i];
					cuisines.append($("<div class='card cardBG' style='background-image: url(\"" + cuisine.image_cover.url + "\");'><div class='cardContent'>" + cuisine.name + "</div></div>").click((function(cuisine) {
						return function() {
							showGoFoodSearch(cuisine.code, cuisine.name);
						};
					})(cuisine)));
				}
			});
			break;
		case "goFoodOrders":
			var loadMoreList = new LoadMoreList({
				listJq: $("#goFoodOrderList", elm),
				itemsPerLoad: 10,
				url: GoFood.COMPLETED_ORDERS,
				getItem: function(data) {
					return constructCompletedOrderCard(data);
				}
			});
			loadMoreList.start();
			break;
		case "bookingCancel":
			selectedCancel = null;
			var cancelConfirm = $("#cancelConfirm", elm).unbind("click").click(function() {
				var theThis = this;
				this.disabled = true;
				xRequestData(Booking.CANCEL, {}, function(data) {
					if (data != null) {
						if (data.statusCode == 200) {
							xRequestData(Booking.CANCEL_CUSTOMER, {}, function(data) {
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
			requestData(Booking.CANCEL_REASONS, {}, function(data) {
				cancelList.empty();
				for (var i in data) {
					var cancelReason = data[i];
					appendCancel: {
						for (var j in cancelReason.cancelReasonServiceTypeVOs) {
							var cancelReasonServiceTypeVO = cancelReason.cancelReasonServiceTypeVOs[j];
							if (currentBookingData.serviceType == cancelReasonServiceTypeVO.serviceType && currentBookingData.status == cancelReasonServiceTypeVO.driverState) {
								cancelList.append($("<div class='settingsBox'></div>").append($("<label></label>").append("<input type='radio' name='cancelReason' value='" + cancelReason.id + "," + cancelReason.reason + "' />").append(cancelReason.reason)));
								break appendCancel;
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
		case "goPay":
			var loader = $(".loader", elm).show(),
				qrCodeJq = $("#goPayQrCode").empty().hide();
			goPayQrCode = new QRCode(qrCodeJq[0], {
				correctLevel: QRCode.CorrectLevel.Q//,
				// maskPattern: QRCode.MaskPattern.PATTERN111
			});
			xRequestData(GoPay.DETAILED, {}, function(data) {
				loader.hide();
				if (data != null) {
					$("#goPayGoPayBalance", elm).text(data.data.balance.formatMoney(0));
					goPayQrCode.makeCode("{\"qr_id\":\"" + data.data.qr_id + "\"}");
					qrCodeJq.show();
				}
			});
			break;
		case "goPayHistory":
			var goPayList = $("#goPayHistory", elm);
			var inProgressTitle = $("#goPayInProgressTitle").hide();
			var completedTitle = $("#goPayCompletedTitle").hide();
			var inProgressList = $("#goPayInProgressList").hide();
			var completedList = $("#goPayCompletedList").hide();
			var loader = $(".listLoader", elm).show();
			var constructTransactionItem = function(data) {
				return $("<div class='settingsBox flexCenter goPayTransaction'></div>")
					.append($("<div class='flexGrow desc'></div>")
						.append(data.description.replaceAll("\n", "<br>"))
						.append($("<div></div>").addClass("time").text(formatDate(new Date(new Date(data.transacted_at).getTime() - new Date().getTimezoneOffset() * 60000)))))
					.append($("<div>Rp " + data.amount.formatMoney(0) + "</div>").addClass("amou").addClass(data.type));
			};
			var doIt = function(x, y, z) {
				if (x.length > 0) {
					z.empty();
					for (var i in x) {
						z.append(constructTransactionItem(x[i]));
					}
					y.show();
					z.show();
				} else {
					y.hide();
					z.hide();
				}
			};
			$(".listEmpty", goPayList).remove();
			xRequestData(GoPay.HISTORY, {limit: 20, page: 1}, function(data) {
				loader.hide();
				if (data == null) {
					goPayList.append("<div class='listEmpty'>Error</div>");
					return;
				}
				doIt(data.data.in_process, inProgressTitle, inProgressList);
				doIt(data.data.success, completedTitle, completedList);
			});
			break;
		case "goPointsPlay":
			platterReset();
			$("#goPointsPlayPointsBalance", elm).text(lastKnownGoPointsData.points_balance + " Points");
			$("#goPointsPlayPlayingFrom", elm).text("You're playing a token from " + goPointsTokenData.service_type);
			$("#goPointsPlayTokensText", elm).text("You have " + lastKnownGoPointsData.tokens_balance + " tokens to play!");
			break;
		case "bookingRate":
			rateSelectedFeedback = 0;
			rateSelectedTip = 0;
			var ratePaymentJq = $("#bookingRatePaymentType", elm).removeClass(),
				rateDescJq = $("#bookingRateDesc", elm).text("How was the service?"),
				rateFeedbackJq = $(".rateFeedback", elm).hide(),
				rateFeedbackTitleJq = $(".rateSelectTitle", rateFeedbackJq),
				rateTipJq = $(".rateTipAmounts", elm).hide(),
				rateFeedbackSlotJq = $(".rateFeedback .slot", elm).empty(),
				rateTipSlotJq = $(".rateTipAmounts .slot", elm).empty(),
				rateWidget,
				feedbackEnabled,
				tipEnabled,
				rateSubmitJq = setEnabled($("#bookingRateSubmit"), false).unbind("click").click(function() {
					rateBooking(rateWidget.rateAmount, "", rateSelectedTip, function(data) {
						if (data && data.statusMessage == "OK") {
							alert("Thank you for your rating");
							showContainer(rateGoBackTo);
						} else {
							alert(data ? data.message : "Error");
						}
					});
				});
			var plsNameMe = function(x, y) {
				return x ? y : true;
			};
			var updateSubmit = function() {
				setEnabled(rateSubmitJq, rateWidget.rateAmount > 0 && plsNameMe(feedbackEnabled, plsNameMe(rateWidget.rateAmount < 4, rateSelectedFeedback > 0)));
			};
			rateWidget = new RateWidget($("#bookingRateWidget", elm), function(x) {
				rateDescJq.text(RATE_DESCS[x - 1]);

				if (x == 5 && tipEnabled) {
					rateTipJq.show();
				} else {
					rateTipJq.hide();
				}

				if (x < 5 && feedbackEnabled) {
					rateFeedbackTitleJq.text(x > 2 ? "What could be better?" : "What went wrong?");
					// rateFeedbackTextPlaceholder.text(x == 5 ? "You can also say thank you" : x > 2 ? "You can give us your suggestion" : "Explain what happened");
					rateFeedbackJq.show();
				} else {
					rateFeedbackJq.hide();
				}

				updateSubmit();
			});
			xRequestData(Booking.GET_BY_NO + rateBookingNo, {}, function(data) {
				feedbackEnabled = data.serviceType == 1;
				tipEnabled = data.paymentType == 4;
				$("#bookingRateDriverName", elm).text(data.driverName);
				$("#bookingRateBookingTime", elm).text(formatDate(new Date(data.timeField)));
				$("#bookingRateTotalPrice").text("Rp " + data.totalPriceWithoutDiscounts.formatMoney(0));
				$("#bookingRateServiceName", elm).text(getNameOfServiceByInt(data.serviceType).toUpperCase());
				ratePaymentJq.addClass(data.paymentType == 4 ? "goPay" : "cash");
				$("#rateDriverPhoto").css("background-image", "url('" + getDriverPhotoUrl(data.driverPhoto) + "')");

				if (feedbackEnabled) {
					xRequestData(Booking.RATE_REASONS, { service_type: data.serviceType }, function(data) {
						rateFeedbackSlot = new SlotWidget(rateFeedbackSlotJq, $.map(data, function(obj) {
							return {name: obj.description, id: obj.id};
						}), function(item) {
							rateSelectedFeedback = item ? item.id : 0;
							updateSubmit();
						});
					});
				}

				if (tipEnabled) {
					xRequestData(Booking.TIP_AMOUNTS + theCustomer.id, {}, function(data) {
						rateTipSlot = new SlotWidget(rateTipSlotJq, $.map(data.tipAmounts, function(obj) {
							return {name: "Rp " + obj.amount.formatMoney(0), amount: obj.amount};
						}), function(item) {
							rateSelectedTip = item ? item.amount : 0;
							updateSubmit();
						});
					});
				}
			});
			break;
	}
}

function showRate(orderNo) {
	rateBookingNo = orderNo;
	rateGoBackTo = currentContainer.name;
	showContainer("bookingRate");
}

function startSpin(data, elm) {
	var possibilities = data.possible_points, result = data.points;
	possibilities.splice(possibilities.indexOf(result), 1);
	shuffle(possibilities);
	possibilities.push(result);
	platterReset();
	goPointsCantSwipe = true;
	var platterFront = $(".platter.front"), platterBack = $(".platter.back"), currentIndex = 0, duration = 400;
	var flip = function(a) {
		if (!a) {
			platterFront.html("<div class='numPoints'>" + possibilities[currentIndex++] + "</div><div class='textPoints'></div>");
		}
		platterBack.html("<div class='numPoints'>" + possibilities[currentIndex] + "</div><div class='textPoints'></div>");
		animatedPlatter = $({fake: 0}).animate({fake: 180}, {
			duration: duration,
			easing: "linear",
			step: function(now, fx) {
				platterFront[0].style.transform = "rotateY(" + now + "deg)";
				platterBack[0].style.transform = "rotateY(" + (180 - now) + "deg)";
			},
			complete: function() {
				if (currentIndex < possibilities.length - 1) {
					duration += 30;
					flip();
				} else {
					// redeem it
					xRequestData(GoPoints.REDEEM_TOKEN, {}, function(redeemResponse) {
						if (redeemResponse != null){
							if (redeemResponse.success) {
								// TODO do it with HTML dialog box
								alert("Yay! You got " + result + " points!\n" + (data.has_next_token ? "But a real winner doesn't stop there, right?" : "You ran out of tokens. Get tokens by using GO-PAY!"));
								// if (data.has_next_token) {
								// } else {
								// }
							} else {
								alert(redeemResponse.errors[0].message_title + "\n" + redeemResponse.errors[0].message);
							}
						} else {
							alert("Failed to redeem token. Maybe check your Internet connection?");
						}
						$(".backButton", elm).click();
					}, "POST", {
						points_token_id: data.points_token_id
					});
				}
			}
		});
	}
	flip(true);
}

function platterReset() {
	if (animatedPlatter) animatedPlatter.stop(true);
	goPointsCantSwipe = false;
	$(".platter.front, .platter.back").css("transform", "");
	$(".platter.front").html("<div class='textSwipe'>Swipe!</div>");
}

function constructVoucherCard(voucher) {
	var subSplit = voucher.sub_title.split("\n"),
		subToDisplay = voucher.sub_title;

	if (subSplit.length > 1) {
		subToDisplay = subSplit[0] + " ...";
	}

	var card = $("<div class='card voucherCard clickable'></div>")
		.append($("<div class='cardBG'></div>").css("background-image", "url(" + voucher.icon + ")"))
		.append($("<div class='cardContent'></div>")
			// .append($("<div class='flexCenter'></div>")
			// 	.append("<div class='flexGrow voucherMerchant'>" + voucher.sponsor_name + "</div>")
			// 	.append("<div class='voucherUpper'>" + voucher.points.formatMoney(0) + " pts</div>"))
			// .append("<div class='voucherTitle'>" + voucher.title + "</div>")
			.append("<div class='voucherSubtitle'>" + subToDisplay + "</div>")
			.append("<div class='flexCenter'><div class='pointsAmount flexGrow flexCenter'><div class='voucherPointsIcon'></div><div class='flexGrow'>" + voucher.points.formatMoney(0) + "</div></div><button class='colored' disabled>Buy</button></div>"))
		.click(function() {
			window.open(BASE_URL + "/gopoints/frontend/dist/available-voucher-batch.html?" + $.param({Headers: JSON.stringify(generateAjaxHeaders()), voucher_batch_id: voucher.id}), "_blank");
		});
	return card;
}

function constructCompletedOrderCard(completedOrder) {
	var orderButton, imagePreview;
	var ret = $("<div class='card reorderCard'></div>")
		.append($("<div class='cardContent flexCenter'></div>")
			.append(imagePreview = $("<div class='imagePreview'></div>").css("background-image", "url('" + completedOrder.merchant.image + "')"))
			.append($("<div class='flexGrow'></div>")
				.append("<div class='timeField secondary'>" + formatDate(new Date(completedOrder.ordered_at)) + "</div>")
				.append("<div class='primary'>" + completedOrder.merchant.name + "</div>")
				.append("<div class='secondary'>" + completedOrder.merchant.address + "</div>")))
		.append($("<div class='cardContent cardBottom flexCenter'></div>")
			.append("<div class='flexGrow costs'>This costs Rp " + completedOrder.paid.formatMoney(0) + "</div>")
			.append(orderButton = $("<button class='orderButton' style='width: initial;'>Reorder</button>")
				.click(function() {
					var merchant = completedOrder.merchant;
					goFoodCurrentMerchant = {
						name: merchant.name,
						address: merchant.address,
						latLong: merchant.location,
						detailAddress: merchant.address,
						id: merchant.id
					};
					goFoodCart = [];

					for (var i in completedOrder.items) {
						var item = completedOrder.items[i];

						// TODO work with manually added items
						if (item.manual) {
							continue;
						}

						goFoodCart.push({
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
		imagePreview.append("<div class='closedOverlay'><div>Closed</div></div>");
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

function initGoFoodOrderMap() {
	var curloc = {
		lat: currentLocation.coords.latitude,
		lng: currentLocation.coords.longitude
	};
	map = new google.maps.Map(document.getElementById("map"), {
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

			updateGoFoodConfirmMap();
		});
	});
}

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
	requestData(GoRide.NEARBY_DRIVERS, {
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
	requestData(GoRide.HISTORY + theCustomer.id, queries, function(data) {
		for (var i in data) {
			historyFrom.append(createHistoryEntry(data[i], (function(historyData) {
				return function() {
					goRideSet(historyData, false, elm);
				};
			})(data[i]), true));
		}
	});
	queries["location_type"] = "to";
	requestData(GoRide.HISTORY + theCustomer.id, queries, function(data) {
		for (var i in data) {
			historyTo.append(createHistoryEntry(data[i], (function(historyData) {
				return function() {
					goRideSet(historyData, true, elm);
				};
			})(data[i]), true));
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
	xRequestData(Booking.FIND_POI, {
		name: val
	}, function(data, b) {
		target.empty();

		if (data == null) {
			if (b == "parsererror") {
				target.html("<div class='settingsBox'>No results</div>");
			} else {
				target.html("<div class='settingsBox'>Error</div>");
			}
		}

		for (var i in data) {
			target.append($("<div class='settingsBox clickable'><b>" + data[i].name + "</b></div>").click((function(gojekPlaceId, isTo) {
				return function() {
					requestData(Booking.FIND_LATLNG_BY_POI, {
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
	goRideMap.panTo(commaSeparatedLatLng(paramAddress.latLong));

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

function calculateGoRide(orderButton) {
	if (goRidePolyline != null) {
		goRidePolyline.setMap(null);
	}

	setEnabled(orderButton, false);
	$("#goRideAfterSelected").hide();
	xRequestData(GoRide.CALCULATE, {}, function(data) {
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
				$("#goRideGoPayPrice").html("<s>Rp " + data.totalPrice.formatMoney(0) + "</s> <b>Rp " + data.goPayPrice.goPayTotalPrice.formatMoney(0) + "</b>")
				$("#goRideCashPrice").html("<b>Rp " + data.totalCash.formatMoney(0) + "</b>");
				var goRideGoPayBalance = $("#goRideGoPayBalance").text("0");
				updateGoPayBalance(function(data1) {
					goRideGoPayBalance.text(data1.currentBalance.formatMoney(0));
					var notEnoughGoPay = data1.currentBalance < data.goPayPrice.goPayTotalPrice;
					setEnabled($("input[name=goRideUseGoPay][value=true]"), !notEnoughGoPay);
					$("input[name=goRideUseGoPay][value=" + !notEnoughGoPay + "]")[0].checked = true;
					goRideUseGoPay = !notEnoughGoPay;
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

function createHistoryEntry(paramAddress, clickCallback, showLine2) {
	var split = paramAddress.name.split(", ");
	var name = split.length > 1 ? split[0] : paramAddress.name;
	var line2 = "";

	if (split.length > 1 && showLine2) {
		split.shift();
		line2 = split.join(", ");
	}

	return $("<div class='settingsBox clickable'></div>").append("<div><b>" + name + "</b></div>").append("<div>" + line2 + "</div>").append("<div>" + paramAddress.note + "</div>").click(clickCallback);
}

function showContainer(name) {
	$(".container").hide();
	var ret = $("[data-name=" + name + "]").show();
	initContainer(name, ret);
	return ret;
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
		beforeSend: function(xhr) {
			var headers = generateAjaxHeaders();
			for (var i in headers) {
				if (headers.hasOwnProperty(i)) {
					xhr.setRequestHeader(i, headers[i]);
				}
			}
		},
		complete: function(xhr, statusText, errorThrown) {
			// console.log(statusText, errorThrown);
			if (statusText == "abort") return;
			var response;

			try {
				response = JSON.parse(xhr.responseText);
			} catch (e) {
				response = null;
				// console.log("Response is not in JSON format");
			}

			callback(response, statusText, errorThrown);
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

function handleClickElm(elm, deeplink) {
	elm.addClass("clickable");
	elm.click(function() {
		switch (deeplink.replace("gojek://", "")) {
			case "gofood/reorder":
				showContainer("goFoodOrders");
				break;
			case "gopay":
				showContainer("goPay");
				break;
			case "points":
			case "gopoints":
				showContainer("goPoints");
				break;
			default:
				alert("Not yet supported: " + deeplink.replace("gojek://", ""));
				break;
		}
	});
}

function LoadMoreList(obj) {
	var listJq = obj.listJq;
	var loaderJq = $(".listLoader", listJq.parent());
	var appendLoadMore = function(page) {
		listJq.append($("<button class='loadMore'>Load " + obj.itemsPerLoad + " more</button>").click(function() {
			$(this).remove();
			load(page);
		}));
	}
	var load = function(page) {
		if (page == null) {
			page = 1;
			listJq.empty();
		}
		loaderJq.show();
		xRequestData(obj.url, $.extend({limit: obj.itemsPerLoad, page: page}, obj.getQueries == null ? {} : obj.getQueries()), function(data) {
			loaderJq.hide();

			if (data == null) {
				appendLoadMore(page);
				return;
			}

			// if (data.data.length > 0) {
			var adapted = obj.adapt == null ? data.data : obj.adapt(data);

			for (var i in adapted) {
				listJq.append(obj.getItem(adapted[i]));
			}

			// } else {
			if (isNullOrEmpty(data.next_page)) {
				listJq.append("<div class='listEmpty'>" + (page == 0 ? obj.emptyMessage || "No results" : obj.allShownMessage || "All items have been shown") + "</div>")
			} else {
				appendLoadMore(page + 1);
			}
			// }
			// submit.removeAttr("disabled");
		});
	};
	this.start = function() {
		load();
	}
}

function isOpenByTimings(timings) {
	if (timings == null || timings.length <= 0)
		return true;

	return between(parseTime(timings.open_time), parseTime(timings.close_time), new Date());
}

function between(a, b, c) {
	return a <= c && c <= b;
}

function isOpenByListOperationalHours(timeEntry) {
	// DONT CARE WITH TIME ZONES: WIB WITA WIT
	if ([timeEntry.openTime, timeEntry.closeTime].indexOf("closed") >= 0)
		return false;

	return between(parseTime(timeEntry.openTime), parseTime(timeEntry.closeTime), new Date());

}

function removeTimeSuffix(input) {
	return input.replace(" WIB", "").replace(" WITA", "").replace(" WIT", "");
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

function HeroBanner(banner) {
	var index = 0, banners, imgCont;
	banner.empty().append(imgCont = $("<div class='bannerImageContainer'></div>"));
	imgCont.append("<div class='bannerImage'></div>");
	banner.append($("<div class='bannerControl'></div>").append($("<button><-</button>").click(function() {
		index = mod(index - 1, banners.length);
		update();
	})).append("<div class='bannerIndicator'>Loading</div>").append($("<button>-></button>").click(function() {
		index = mod(index + 1, banners.length);
		update();
	})));
	this.init = function(bannersIn, adapt) {
		banners = bannersIn;
		imgCont.empty();

		for (var i in banners) {
			var bannerData = banners[i];
			var bannerImage = $("<div class='bannerImage' style='background-image: url(\"" + bannerData.image + "\");'></div>");
			if (typeof adapt === "function") adapt(bannerImage, i);
			imgCont.append(bannerImage);
		}

		update();
	};
	var update = function() {
		var bannerImage = $(".bannerImage", imgCont).hide();
		bannerImage.eq(index).show();
		$(".bannerIndicator", banner).text((index + 1) + " / " + bannerImage.length);
	}
}

function RateWidget(elm, callback) {
	this.rateAmount = 0;

	if (!elm.hasClass("rateWidget")) {
		elm.addClass("rateWidget");
	}

	elm.attr("data-amount", null);
	elm.empty();
	var thiz = this;
	var changeFunction = function() {
		var i = $(this).index() + 1;
		thiz.rateAmount = i;
		elm.attr("data-amount", thiz.rateAmount);
		callback(i);
	};

	for (var i = 0; i < 5; i++) {
		elm.append($("<button><span class='material-icons'>star</span></button>").click(changeFunction));
	}
}

function SlotWidget(elm, items, callback) {
	this.selectedSlot = null;
	var _this = this;
	elm.empty();

	var addItem = function(item) {
		elm.append($("<div class='slotItem'>" + item.name + "</div>").click(function() {
			var thisJq = $(this);

			if (thisJq.hasClass("selected")) {
				thisJq.removeClass("selected");
				_this.selectedSlot = null;
				callback(_this.selectedSlot);
				return;
			}

			$(".selected", elm).removeClass("selected");
			thisJq.addClass("selected");
			_this.selectedSlot = item;
			callback(_this.selectedSlot);
		}));
	}

	if (items.length > 0) {
		elm.addClass("threeColumn");

		for (var i in items) {
			var item = items[i];
			addItem(item);
		}
	} else {
		elm.removeClass("threeColumn");
		elm.text("There was a problem loading this screen");
	}
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

function updateGoPayBalance(callback) {
	xRequestData(GoPay.GET_BALANCE + theCustomer.id, {}, callback);
}

function updateGoPointsBalance(callback) {
	xRequestData(GoPoints.GET_BALANCE, {}, function(data, b, c) {
		if (data != null)
			lastKnownGoPointsData = data;

		callback(data, b, c);
	});
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
	if (isNullOrEmpty(paramString)) return "No license plate info";
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
	return target.replace(new RegExp(search, "g"), replacement);
};

function shuffle(arr) {
	var currentIndex = arr.length, temporaryValue, randomIndex;

	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = arr[currentIndex];
		arr[currentIndex] = arr[randomIndex];
		arr[randomIndex] = temporaryValue;
	}

	return arr;
}

function formatDate(paramDate) {
	var day = paramDate.getDate();
	day = (day < 10) ? "0" + day : day;
	var month = paramDate.getMonth() + 1;
	month = (month < 10) ? "0" + month : month;
	var date = paramDate.getFullYear() + "-" + month + "-" + day + " " + paramDate.toLocaleTimeString();
	return (date);
}

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

function showHide(a, b, bool) {
	if (bool) {
		a.show();
		b.hide();
	} else {
		a.hide();
		b.show();
	}
}

function playNotifSound() {
	notifSound = notifSound || new Audio();
	notifSound.src = "0a598282e94e87dea63e466d115e4a83.mp3";
	notifSound.volume = 0.3;
	notifSound.load();
	notifSound.play();
}

function setCookie(key, value) {
	localStorage[key] = value;
}

function getCookie(key) {
	return localStorage[key];
}