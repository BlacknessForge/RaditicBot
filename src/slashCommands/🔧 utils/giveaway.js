const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { color } = require('../../config'); // Adjust path to config depending on this file's depth

function parseDuration(durationStr) {
  const regex = /(\d+)\s*(second|seconds|s|minute|minutes|m|hour|hours|h|day|days|d)/gi;
  let duration = 0;
  let match;

  while ((match = regex.exec(durationStr)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
      case 'second':
      case 'seconds':
        duration += value * 1000;
        break;
      case 'm':
      case 'minute':
      case 'minutes':
        duration += value * 60 * 1000;
        break;
      case 'h':
      case 'hour':
      case 'hours':
        duration += value * 60 * 60 * 1000;
        break;
      case 'd':
      case 'day':
      case 'days':
        duration += value * 24 * 60 * 60 * 1000;
        break;
      default:
        return null;
    }
  }

  return duration;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage Giveaway System')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Starts a giveaway')
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('The duration of the giveaway.')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('The winners of the giveaway.')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('What the winners will win.')
            .setRequired(true))
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where you want to start the giveaway.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false))
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('The content will be used for the giveaway.')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edits a giveaway.')
        .addStringOption(option =>
          option
            .setName('message-id')
            .setDescription('The ID of the giveaway message.')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('The added duration of the giveaway.')
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('The updated number of winners.')
            .setRequired(true))
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('The new prize of the giveaway.')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End an existing giveaway.')
        .addStringOption(option =>
          option
            .setName('message-id')
            .setDescription('The ID of the giveaway message.')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(option =>
          option
            .setName('message-id')
            .setDescription('The ID of the giveaway message.')
            .setRequired(true))),

  async execute({ interaction, client }) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return await interaction.reply({ content: 'You must have **Manage Server** permission to use this command.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'start') {
        await interaction.reply({ content: 'Starting the giveaway...', ephemeral: true });

        const durationString = interaction.options.getString('duration');
        const duration = parseDuration(durationString);

        if (!duration || duration <= 0) {
          // FIXED: Used editReply instead of reply to prevent API crash
          return await interaction.editReply({ content: 'Please provide a valid duration format (e.g., "1m12s", "1 minute 12 seconds").' });
        }

        const winnerCount = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const contentMain = interaction.options.getString('content');
        const channel = interaction.options.getChannel('channel');
        const showChannel = channel || interaction.channel;

        await client.giveawayManager.start(showChannel, {
          prize,
          winnerCount,
          duration,
          hostedBy: interaction.user,
          lastChance: {
            enabled: false,
            content: contentMain,
            threshold: 60000000000_000,
            embedColor: `${color.default}`
          },
          messages: {
            giveaway: `🎉 **Giveaway Started** 🎉`,
            drawing: 'Ends: {timestamp}',
            giveawayEnded: `🎉 **Giveaway Ended** 🎉`,
            inviteToParticipate: `Winner(s): {this.winnerCount}`,
            hostedBy: `Hosted by: {this.hostedBy}`,
            endedAt: 'Ended At',
            embed: {
              author: {
                name: prize
              }
            }
          }
        });

        await interaction.editReply({ content: `Your giveaway has been started in ${showChannel}.` });
        
      } else if (subcommand === 'edit') {
        await interaction.reply({ content: 'Editing your giveaway...', ephemeral: true });

        const newPrize = interaction.options.getString('prize');
        const newDurationString = interaction.options.getString('duration');
        const duration = parseDuration(newDurationString);

        if (!duration || duration <= 0) {
          // FIXED: Used editReply instead of reply to prevent API crash
          return await interaction.editReply({ content: 'Please provide a valid duration format (e.g., "1m12s", "1 minute 12 seconds").' });
        }

        const newWinners = interaction.options.getInteger('winners');
        const messageId = interaction.options.getString('message-id');

        await client.giveawayManager.edit(messageId, {
          addTime: duration,
          newWinnerCount: newWinners,
          newPrize: newPrize,
        });

        await interaction.editReply({ content: 'Your giveaway has been edited.' });
        
      } else if (subcommand === 'end') {
        await interaction.reply({ content: 'Ending your giveaway...', ephemeral: true });

        const endMessageId = interaction.options.getString('message-id');
        await client.giveawayManager.end(endMessageId);

        await interaction.editReply({ content: 'Your giveaway has been ended.' });
        
      } else if (subcommand === 'reroll') {
        await interaction.reply({ content: 'Rerolling your giveaway...', ephemeral: true });

        const rerollMessageId = interaction.options.getString('message-id');
        const giveaway = client.giveawayManager.giveaways.find(g => g.guildId === interaction.guildId && (g.messageId === rerollMessageId));

        if (!giveaway) {
          return await interaction.editReply({ content: 'I could not find any giveaway with the message ID.' });
        }

        await client.giveawayManager.reroll(rerollMessageId, {
          messages: {
            congrat: 'Congratulations, {winners}! You won {prize}!\n{messageURL}',
            error: 'No valid participant.'
          }
        });

        await interaction.editReply({ content: 'Your giveaway has been rerolled.' });
      }
    } catch (error) {
      console.error(error);
      
      // Safety check in case the interaction was deferred or replied to before failing
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while executing the command.' });
      } else {
        await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
      }
    }
  },
};
