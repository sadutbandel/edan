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
	},
	// duration between now and a unix timestamp
	duration: function(unixtime) {
		var now = TimestampService.unix();
		var diff = now - unixtime;
		return diff;
	},
	// remaining seconds of a duration
	remaining: function(duration) {
		return 60 - duration;
	}
}
