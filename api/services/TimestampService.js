/**
 * A simple timestamp generator
 */
module.exports = {

	// "now" in human-readable utc
	utc: function() {
		var date = new Date();
		return date.toUTCString();
	},
	// "now" in unix utc
	unix: function() {
		return Math.floor(Date.now() / 1000);
	}
}
