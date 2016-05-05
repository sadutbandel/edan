/**
 * WalletController
 *
 * @description :: 
 */

module.exports = {
	
	find: function (req, res) {

		if(!req.session.started) {
			req.session.started = TimestampService.unix();
		}

		var link = 'https://github.com/clemahieu/raiblocks/releases/download/V' + Globals.walletVersion + '/rai-' + Globals.walletVersion + '-';

		var data = {
			version: Globals.walletVersion,
			platforms: [
				{
					icon: 'apple',
					file: link + 'Darwin.dmg'
				},
				{
					name: '64',
					icon: 'windows',
					file: link + 'win64.exe'
				},			{
					name: '32',
					icon: 'windows',
					file: link + 'win32.exe'
				},
				{
					icon: 'linux',
					file: link + 'Linux.tar.bz2'
				}
			]
		};

		res.view('wallet', data);
	}
};