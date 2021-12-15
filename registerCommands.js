const Discord = require('discord.js');
require('dotenv').config();

const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.DIRECT_MESSAGES, Discord.Intents.FLAGS.GUILDS]});

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
			type: 'STRING',
			description: 'Character name, or multiple separated by spaces',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
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
			type: 'STRING',
			description: 'Character name',
			required: true,
		},
		{
			name: 'weapon',
			type: 'STRING',
			description: 'Weapon name or id, can search with a partial name',
			autocomplete: true,
			required: false,
		},
		{
			name: 'platform',
			type: 'STRING',
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
			type: 'STRING',
			description: 'Outfit tag or tags separated by spaces, no brackets',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
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
			type: 'STRING',
			description: 'Outfit tag or tags separated by spaces, no brackets',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
			description: "Which platform is the outfit on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'subscribe',
		description: "Subscribe to various different real time events",
		options: [{
			name: "alerts",
			description: "Receive alert notifications when an alert starts on a server",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				description: 'Server name',
				type: 'STRING',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "activity",
			description: "Receive notifications whenever an outfit member logs in or out",
			type: 'SUB_COMMAND',
			options: [{
				name: 'tag',
				type: 'STRING',
				description: 'Tag of outfit to subscribe to, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: 'STRING',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "captures",
			description: "Receive a notification whenever an outfit captures a base",
			type: 'SUB_COMMAND',
			options: [{
				name: 'tag',
				type: 'STRING',
				description: 'Tag of outfit to subscribe to, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: 'STRING',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "unlocks",
			description: "Receive a notification when a continent unlocks on a server",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				description: 'Server name',
				type: 'STRING',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "twitter",
			description: "Receive a notification whenever a user posts or retweets",
			type: 'SUB_COMMAND',
			options: [{
				name: 'user',
				type: 'STRING',
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
		options: [{
			name: "alerts",
			description: "Remove active alert subscriptions",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				description: 'Server name',
				type: 'STRING',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "activity",
			description: "Remove active outfit activity subscriptions",
			type: 'SUB_COMMAND',
			options: [{
				name: 'tag',
				type: 'STRING',
				description: 'Tag of outfit to remove, no brackets',
				required: true
			},
			{
				name: 'platform',
				type: 'STRING',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "captures",
			description: "Remove active outfit base capture subscriptions",
			type: 'SUB_COMMAND',
			options: [{
				name: 'tag',
				type: 'STRING',
				description: 'Tag of outfit to remove.  No brackets',
				required: true
			},
			{
				name: 'platform',
				type: 'STRING',
				description: "Which platform is the outfit on?  Defaults to PC",
				required: false,
				choices: platforms
			}
			]
		},
		{
			name: "unlocks",
			description: "Remove active continent unlock subscriptions",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				description: 'Server name',
				type: 'STRING',
				required: true,
				choices: servers
			}
			]
		},
		{
			name: "twitter",
			description: "Remove active Twitter subscriptions",
			type: 'SUB_COMMAND',
			options: [{
				name: 'user',
				type: 'STRING',
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
			type: 'SUB_COMMAND'
		}
		]
	},
	{
		name: 'config',
		description: 'Modify subscription settings',
		options: [
			{
				name: 'view',
				description: 'View current subscription settings',
				type: 'SUB_COMMAND'
			},
			{
				name: 'audit',
				description: 'Check for errors in subscription settings',
				type: 'SUB_COMMAND'
			},
			{
				name: 'continent',
				description: 'Enable or disable alert and unlock notifications for a given continent',
				type: 'SUB_COMMAND',
				options: [{
					name: 'continent',
					description: 'The continent to change the setting for',
					type: 'STRING',
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
							name: 'Other',
							value: 'other'
						}
					]
				},
				{
					name: 'setting',
					description: "Show alerts and unlocks for specified continent",
					type: 'STRING',
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
				type: 'SUB_COMMAND',
				options: [{
						name: 'setting',
						description: 'Delete notifications in this channel',
						type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
			description: 'Weapon name or partial name',
			required: true,
		}]
	},
	{
		name: 'implant',
		description: "Look up implant information",
		options: [{
			name: 'query',
			type: 'STRING',
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
			type: 'STRING',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	},
	{
		name: 'dashboard',
		description: "Create an automatically updating dashboard",
		options: [{
			name: "server",
			description: "Create an automatically updating dashboard displaying server status",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				type: 'STRING',
				description: 'Server name',
				required: true,
				choices: servers
			}]
		},
		{
			name: "outfit",
			description: "Create an automatically updating dashboard displaying outfit status",
			type: 'SUB_COMMAND',
			options: [{
				name: 'tag',
				type: 'STRING',
				description: 'Outfit tag',
				required: true
			},
			{
				name: 'platform',
				type: 'STRING',
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
		options: [{
			name: "server",
			description: "Create an automatically updating voice channel displaying server info",
			type: 'SUB_COMMAND',
			options: [{
				name: 'server',
				type: 'STRING',
				description: 'Server name',
				required: true,
				choices: servers
			},
			{
				name: 'type',
				type: 'STRING',
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
				type: 'SUB_COMMAND',
				options: [{
					name: 'tag',
					type: 'STRING',
					description: 'Outfit tag',
					required: true
				},
				{
					name: 'platform',
					type: 'STRING',
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
			type: 'STRING',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
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
			type: 'STRING',
			description: 'Character name',
			required: true,
		},
		{
			name: 'platform',
			type: 'STRING',
			description: "Which platform is the character on?  Defaults to PC",
			required: false,
			choices: platforms
		}]
	}
]

client.on("ready", async () => {
	if (!client.application?.owner) await client.application?.fetch();
	try{
		const commands = await client.application?.commands.set(data);
	}
	catch(err){
		console.log(err);
	}
	console.log("done")
	process.exit();
})

client.login(process.env.token);