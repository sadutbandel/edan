/**
 * A simple timestamp generator
 */
module.exports = {

	// create "now" in UTC
	utc: function() {
		var date = new Date();
		return date.toUTCString();
	}
}
