/**
 * this file implements the unsubscribe command
 * @module unsubscribe
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInteraction
 */
import { unsubscribeActivity, unsubscribeAlert, unsubscribeCaptures, unsubscribeTwitter, unsubscribeUnlocks } from "../subscriptions.js";
import { allServers, platforms } from "../utils.js";

export const data = {
    name: 'unsubscribe',
    description: "Subscribe to various different real time events",
    options: [{
        name: "alerts",
        description: "Remove active alert subscriptions",
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
            choices: allServers
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
};

/**
 * runs the `/unsubscribe` command
 * @param { ChatInteraction } interaction - command chat interaction
 * @param { string } locale - locale of the user
 */
export async function execute(interaction, locale) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.channelId;
    if (subcommand === 'alerts') {
        const server = interaction.options.getString('server');
        const res = await unsubscribeAlert(channel, server);
        await interaction .editReply(res);
    } else if (subcommand === 'activity') {
        const tag = interaction.options.getString('tag');
        const platform = interaction.options.getString('platform') || 'ps2:v2';
        const res = await unsubscribeActivity(channel, tag, platform);
        await interaction .editReply(res);
    } else if (subcommand === 'captures') {
        const tag = interaction.options.getString('tag');
        const platform = interaction.options.getString('platform') || 'ps2:v2';
        const res = await unsubscribeCaptures(channel, tag, platform);
        await interaction .editReply(res);
    } else if (subcommand === 'unlocks') {
        const server = interaction.options.getString('server');
        const res = await unsubscribeUnlocks(channel, server);
        await interaction .editReply(res);
    } else if (subcommand === 'twitter') {
        const user = interaction.options.getString('user');
        const res = await unsubscribeTwitter(channel, user);
        await interaction .editReply(res);
    } else {
        await interaction.editReply("Unknown command error");
    }
}