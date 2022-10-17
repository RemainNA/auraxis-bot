/**
 * this files implements the subscribe command
 * @module subscribe
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */
import { permissionCheck, subscribeActivity, subscribeAlert, subscribeCaptures, subscribeTwitter, subscribeUnlocks } from "../subscriptions.js";
import { allServers, platforms } from "../utils.js";

export const data = {
    name: 'subscribe',
    description: "Subscribe to various different real time events",
    options: [{
        name: "alerts",
        description: "Receive alert notifications when an alert starts on a server",
        type: '1',
        options: [{
            name: 'server',
            description: 'Server name',
            type: '3',
            required: true,
            choices: allServers
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
            choices: allServers
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
};

/**
 * runs the `/subscribe` command and handles all subcommandss
 * @param { ChatInteraction } interaction - command interaction object
 * @param { string } locale - locale of the user
 */
export async function execute(interaction, locale) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.channelId;
    if (subcommand === 'alerts') {
        const server = interaction.options.getString('server');
        const res = await subscribeAlert(channel, server);
        await interaction .editReply(res);
    } else if (subcommand === 'activity') {
        const tag = interaction.options.getString('tag');
        const platform = interaction.options.getString('platform') || 'ps2:v2';
        const res = await subscribeActivity(channel, tag, platform);
        await interaction .editReply(res);
    } else if (subcommand === 'captures') {
        const tag = interaction.options.getString('tag');
        const platform = interaction.options.getString('platform') || 'ps2:v2';
        const res = await subscribeCaptures(channel, tag, platform);
        await interaction .editReply(res);
    } else if (subcommand === 'unlocks') {
        const server = interaction.options.getString('server');
        const res = await subscribeUnlocks(channel, server);
        await interaction .editReply(res);
    } else if (subcommand === 'twitter') {
        const user = interaction.options.getString('user');
        const res = await subscribeTwitter(channel, user);
        await interaction .editReply(res);
    } else {
        await interaction.editReply("Unknown command error");
    }

    await permissionCheck(interaction, interaction.client.user.id, locale);
}