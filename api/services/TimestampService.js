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
	unix: function(date) {

		// if we are not passing in a date, use now as the point-of-time reference
		if(!date) {
			date = Date.now()
		}

		var now = Math.floor(date / 1000);

		/*
		GO BACK IN TIME
		var
		hour = 60 * 60,
		hours = hour * 14,
		hoursAgo = now - hours;

		return hoursAgo;
		*/
	
		return now;
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
	},
	// grab the most recent hour that passed
	lastHour: function() {
		var d = new Date();
		d.setMinutes(0);
		d.setSeconds(0);
		return TimestampService.unix(d.getTime());
	}
}
