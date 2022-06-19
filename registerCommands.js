const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

require('dotenv').config();

const i18n = require('i18n');
i18n.configure({
	directory: './locales/commands',
	defaultLocale: 'en-us',
	updateFiles: false,
	objectNotation: true
})

const allOption = {
	name: 'All',
	value: 'all'
}

const platforms = [
	{
		name: 'PC',
		value: 'ps2:v2'
	},
	{
		name: 'PS4 US',
		value: 'ps2ps4us:v2'
	},
	{
		name: 'PS4 EU',
		value: 'ps2ps4eu:v2'
	}
]

const serversNoJaeger = [
	{
		name: "Connery",
		value: "connery"
	},
	{
		name: "Miller",
		value: "miller"
	},
	{
		name: "Cobalt",
		value: "cobalt"
	},
	{
		name: "Emerald",
		value: "emerald"
	},
	{
		name: "SolTech",
		value: "soltech"
	},
	{
		name: "Genudine",
		value: "genudine"
	},
	{
		name: "Ceres",
		value: "ceres"
	}
]

const servers = serversNoJaeger.concat([{name:"Jaeger", value: "jaeger"}]);

const data = [
	{
		name: 'ping',
		description: "Get the bot's current ping to Discord servers"
	},
	{
		name: 'help',
		description: "Get a list of bot commands and associated links"
	},
	{
		name: 'character',
		description: "Look up a character's stats and basic information",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name, or multiple separated by spaces',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'stats',
		description: "Look up a character's stats, either with the specified weapon or overall",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name',
			required: true,
		},
		{
			name: 'weapon',
			type: '3',
			description: 'Weapon name or id, can search with a partial name',
			autocomplete: true,
			required: false,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'outfit',
		description: "Look up an outfit's basic information, including recent activity and bases owned",
		options: [{
			name: 'tag',
			type: '3',
			description: 'Outfit tag or tags separated by spaces, no brackets',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the outfit on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'online',
		description: "Look up currently online members for a given outfit",
		options: [{
			name: 'tag',
			type: '3',
			description: 'Outfit tag or tags separated by spaces, no brackets',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the outfit on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'subscribe',
		description: "Subscribe to various different real time events",
		default_member_permissions: '0',
		options: [{
			name: "alerts",
			description: "Receive alert notifications when an alert starts on a server",
			type: '1',
			options: [{
				name: 'server',
				description: 'Server name',
				type: '3',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "activity",
			description: "Receive notifications whenever an outfit member logs in or out",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Tag of outfit to subscribe to, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "captures",
			description: "Receive a notification whenever an outfit captures a base",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Tag of outfit to subscribe to, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "unlocks",
			description: "Receive a notification when a continent unlocks on a server",
			type: '1',
			options: [{
				name: 'server',
				description: 'Server name',
				type: '3',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "twitter",
			description: "Receive a notification whenever a user posts or retweets",
			type: '1',
			options: [{
				name: 'user',
				type: '3',
				description: "Twitter user",
				required: true,
				choices: [
					{
						name: 'Wrel',
						value: 'wrel'
					},
					{
						name: 'Planetside 2',
						value: 'planetside'
					}
				]
			}
			]
		}
		]
	},
	{
		name: 'unsubscribe',
		description: "Subscribe to various different real time events",
		default_member_permissions: '0',
		options: [{
			name: "alerts",
			description: "Remove active alert subscriptions",
			type: '1',
			options: [{
				name: 'server',
				description: 'Server name',
				type: '3',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "activity",
			description: "Remove active outfit activity subscriptions",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Tag of outfit to remove, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "captures",
			description: "Remove active outfit base capture subscriptions",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Tag of outfit to remove.  No brackets',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "unlocks",
			description: "Remove active continent unlock subscriptions",
			type: '1',
			options: [{
				name: 'server',
				description: 'Server name',
				type: '3',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "twitter",
			description: "Remove active Twitter subscriptions",
			type: '1',
			options: [{
				name: 'user',
				type: '3',
				description: "User's name",
				required: true,
				choices: [
					{
						name: 'Wrel',
						value: 'wrel'
					},
					{
						name: 'Planetside 2',
						value: 'planetside'
					}
				]
			}
			]
		},
		{
			name: "all",
			description: "Remove all active subscriptions and settings from the channel",
			type: '1'
		}
		]
	},
	{
		name: 'config',
		description: 'Modify subscription settings',
		default_member_permissions: '0',
		options: [
			{
				name: 'view',
				description: 'View current subscription settings',
				type: '1'
			},
			{
				name: 'audit',
				description: 'Check for errors in subscription settings',
				type: '1'
			},
			{
				name: 'continent',
				description: 'Enable or disable alert and unlock notifications for a given continent',
				type: '1',
				options: [{
					name: 'continent',
					description: 'The continent to change the setting for',
					type: '3',
					required: true,
					choices: [
						{
							name: 'Koltyr',
							value: 'koltyr'
						},
						{
							name: 'Indar',
							value: 'indar'
						},
						{
							name: 'Hossin',
							value: 'hossin'
						},
						{
							name: 'Amerish',
							value: 'amerish'
						},
						{
							name: 'Esamir',
							value: 'esamir'
						},
						{
							name: 'Oshur',
							value: 'oshur'
						},
						{
							name: 'Other',
							value: 'other'
						}
					]
				},
				{
					name: 'setting',
					description: "Show alerts and unlocks for specified continent",
					type: '3',
					required: true,
					choices: [
						{
							name: 'Enable',
							value: 'enable'
						},
						{
							name: 'Disable',
							value: 'disable'
						}
					]
				}]
			},
			{
				name: 'autodelete',
				description: 'Automatically delete alerts and outfit activity notifications',
				type: '1',
				options: [{
						name: 'setting',
						description: 'Delete notifications in this channel',
						type: '3',
						required: true,
						choices: [
						{
							name: 'Enable',
							value: 'enable'
						},
						{
							name: 'Disable',
							value: 'disable'
						}
					]
				}]
			}
		]
	},
	{
		name: 'population',
		description: "Look up the current population of a server",
		options: [{
			name: 'server',
			type: '3',
			description: 'Server name',
			required: true,
			choices: servers.concat([allOption])
		}]
	},
	{
		name: 'territory',
		description: "Look up the current territory control of a server",
		options: [{
			name: 'server',
			type: '3',
			description: 'Server name',
			required: true,
			choices: servers
		}]
	},
	{
		name: 'alerts',
		description: "Look up ongoing alerts on a server",
		options: [{
			name: 'server',
			type: '3',
			description: 'Server name',
			required: true,
			choices: serversNoJaeger
		}]
	},
	{
		name: 'status',
		description: "Look up server status as provided by the API"
	},
	{
		name: 'weapon',
		description: "Look up weapon stats",
		options: [{
			name: 'query',
			type: '3',
			description: 'Weapon name, partial name, or id',
			autocomplete: true,
			required: true,
		}]
	},
	{
		name: 'weaponsearch',
		description: "Look up a list of weapons matching your search",
		options: [{
			name: 'query',
			type: '3',
			description: 'Weapon name or partial name',
			required: true,
		}]
	},
	{
		name: 'implant',
		description: "Look up implant information",
		options: [{
			name: 'query',
			type: '3',
			description: 'Implant name or partial name',
			autocomplete: true,
			required: true,
		}]
	},
	{
		name: 'asp',
		description: "Look up ASP specific information for a character",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'dashboard',
		description: "Create an automatically updating dashboard",
		default_member_permissions: '0',
		options: [{
			name: "server",
			description: "Create an automatically updating dashboard displaying server status",
			type: '1',
			options: [{
				name: 'server',
				type: '3',
				description: 'Server name',
				required: true,
				choices: servers
			}]
		},
		{
			name: "outfit",
			description: "Create an automatically updating dashboard displaying outfit status",
			type: '1',
			options: [{
				name: 'tag',
				type: '3',
				description: 'Outfit tag',
				required: true
			},
			{
				name: 'platform',
				type: '3',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		}
		]
	},
	{
		name: 'tracker',
		description: "Create an automatically updating voice channel",
		dm_permission: false,
		default_member_permissions: '0',
		options: [{
			name: "server",
			description: "Create an automatically updating voice channel displaying server info",
			type: '1',
			options: [{
				name: 'server',
				type: '3',
				description: 'Server name',
				required: true,
				choices: servers
			},
			{
				name: 'type',
				type: '3',
				description: 'Type of tracker channel',
				required: true,
				choices:[
					{
						name: 'Population',
						value: 'population'
					},
					{
						name: 'Continents',
						value: 'territory'
					}
				]
			}]
			},
			{
				name: "outfit",
				description: "Create an automatically updating voice channel displaying outfit online count",
				type: '1',
				options: [{
					name: 'tag',
					type: '3',
					description: 'Outfit tag',
					required: true
				},
				{
					name: 'show-faction',
					type: '5',
					description: 'Display a faction indicator in channel name? ex: 🟣/🔵/🔴/⚪',
					required: true
				},
				{
					name: 'platform',
					type: '3',
					description: "Which platform is the outfit on?  Defaults to PC",
					required: false,
					choices: platforms
				}
				]
			}
		]
	},
	{
		name: 'auraxiums',
		description: "Lookup a list of a character's Auraxium medals",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'leaderboard',
		description: "Lookup current leaderboard",
		options: [{
			name: 'type',
			type: '3',
			description: 'Type of leaderboard to look up',
			required: true,
			choices: [{
				name: 'Kills',
				value: 'Kills'
			},
			{
				name: 'Score',
				value: 'Score'
			},
			{
				name: 'Time',
				value: 'Time'
			},
			{
				name: 'Deaths',
				value: 'Deaths'
			}]
		},
		{
			name: 'period',
			type: '3',
			description: 'Time period of the leaderboard',
			required: true,
			choices: [{
				name: 'Forever',
				value: 'Forever'
			},
			{
				name: 'Monthly',
				value: 'Monthly'
			},
			{
				name: 'Weekly',
				value: 'Weekly'
			},
			{
				name: 'Daily',
				value: 'Daily'
			},
			{
				name: 'One Life',
				value: 'OneLife'
			}]
		},
		{
			name: 'server',
			type: '3',
			description: 'Server name',
			required: false,
			choices: servers
		}]
	},
	{
		name: 'directives',
		description: "Lookup a list of a character's Auraxium medals",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'vehicle',
		description: "Lookup a character's stats with a given vehicle",
		options: [{
			name: 'name',
			type: '3',
			description: 'Character name',
			required: true,
		},
		{
			name: 'vehicle',
			type: '3',
			description: 'Vehicle name',
			autocomplete: true,
			required: true,
		},
		{
			name: 'platform',
			type: '3',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	}
]

const rest = new REST({ version: '9'}).setToken(process.env.token);

(async () => {
	try{
		await rest.put(
			Routes.applicationCommands(process.env.clientID),
			{ body: data },
		);
		console.log('done');
	}
	catch(err){
		console.log(err)
	}
}) ();