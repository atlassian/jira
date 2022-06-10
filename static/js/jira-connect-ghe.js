const ALLOWED_PROTOCOLS = ["http:", "https:"];
const GITHUB_CLOUD = ["github.com", "www.github.com"];

/**
 * Method that checks the validity of the passed URL
 *
 * @param {string} inputURL
 * @returns {boolean}
 */
const checkValidGHEUrl = inputURL => {
	try {
		const { protocol, hostname } = new URL(inputURL);

		if (!ALLOWED_PROTOCOLS.includes(protocol)) {
			return false;
		}
		// This checks whether the hostname whether there is an extension like `.com`, `.net` etc.
		if (hostname.split('.').length < 2) {
			return false;
		}
		if (GITHUB_CLOUD.includes(hostname)) {
			// TODO: Need to alert the users that this URL is GitHub cloud and not Enterprise
			// Waiting for design: https://softwareteams.atlassian.net/browse/ARC-1418
			return false;
		}

		return true;
	} catch (e) {
		return false;
	}
};

$("#gheServerURL").on("keyup", event => {
	const hasUrl = event.target.value.length > 0;
	$("#gheServerBtn").attr({
		"aria-disabled": !hasUrl,
		"disabled": !hasUrl
	});
	$("#gheServerURLError").hide();
	$("#gheServerURL").removeClass("has-error");
});

$("#gheServerBtn").on("click", event => {
	const btn = event.target;
	const typedURL = $("#gheServerURL").val().replace(/\/+$/, '');
	const isValid = checkValidGHEUrl(typedURL);

	$(btn).attr({
		"aria-disabled": !isValid,
		"disabled": !isValid
	});

	if (isValid) {
		$("#gheServerURLError").hide();
		$("#gheServerBtnText").hide();
		$("#gheServerBtnSpinner").show();
		$("#gheServerURL").removeClass("has-error");

		//	TODO: Need to add the action
		console.log("Data for API: ", typedURL);
	} else {
		$("#gheServerURLError").show();
		$("#gheServerURL").addClass("has-error");
	}
});
