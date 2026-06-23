const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js'); 
const Vanity = require('../../Schemas/vanitySchema'); 

// Premium consistent brand color for your bot's layout
const BRAND_COLOR = '#0b0c10'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vanity')
        .setDescription('Advanced management panel for Vanity URL settings.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Configure a new live vanity tracking setting.')
                .addStringOption(option => option.setName('vanity').setDescription('The target custom phrase/status link to monitor (e.g., .gg/server)').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('The announcement log channel.').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('The reward role given to matching users.').setRequired(true))
                .addBooleanOption(option => option.setName('hide').setDescription('Hide this bot response from other users? (Defaults to False)'))) // 🔄 UI Tip text updated
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Deletes a specific active vanity tracking setting.')
                .addStringOption(option => option.setName('vanity').setDescription('The exact tracking string to look up and remove.').setRequired(true))
                .addBooleanOption(option => option.setName('hide').setDescription('Hide this bot response from other users? (Defaults to False)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-all')
                .setDescription('Purges all tracking configurations for this guild.')
                .addBooleanOption(option => option.setName('hide').setDescription('Hide this bot response from other users? (Defaults to False)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Lists current system structures and active tracking hooks.')
                .addBooleanOption(option => option.setName('hide').setDescription('Hide this bot response from other users? (Defaults to False)'))),

    async execute({ interaction }) {
        const subcommand = interaction.options.getSubcommand();
        
        // 🔄 FIXED LOGIC: Changed the fallback from "true" to "false" so it defaults to visible
        const isEphemeral = interaction.options.getBoolean('hide') ?? false;

        // Security Authorization Check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#ff4d4d')
                .setDescription('❌ **Access Denied:** This structural panel requires `Administrator` authorization permissions.')
                .setTimestamp();
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true }); // Keep security errors hidden
        }
        
        const guildId = interaction.guild.id;

        // ---------------- [SUBCOMMAND: ADD] ----------------
        if (subcommand === 'add') {
            const vanity = interaction.options.getString('vanity');
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');

            if (!channel.isTextBased()) {
                const failTypeEmbed = new EmbedBuilder()
                    .setColor('#ff4d4d')
                    .setDescription('⚠️ **Configuration Error:** The announcement channel target must be a valid text-based layout channel.');
                return interaction.reply({ embeds: [failTypeEmbed], ephemeral: isEphemeral });
            }

            try {
                let settings = await Vanity.findOne({ guildId });
                if (settings) {
                    const exists = settings.vanities.some(v => v.vanity.toLowerCase() === vanity.toLowerCase());
                    if (exists) {
                        const duplicateEmbed = new EmbedBuilder()
                            .setColor('#ffcc00')
                            .setDescription(`⚠️ **Duplicate Rule:** The tracking phrase \`${vanity}\` is already registered inside this cluster configuration.`);
                        return interaction.reply({ embeds: [duplicateEmbed], ephemeral: isEphemeral });
                    }
                    settings.vanities.push({ vanity, channelId: channel.id, roleId: role.id });
                } else {
                    settings = new Vanity({
                        guildId,
                        vanities: [{ vanity, channelId: channel.id, roleId: role.id }],
                    });
                }

                await settings.save();

                const successEmbed = new EmbedBuilder()
                    .setColor(BRAND_COLOR)
                    .setTitle('⚡ Tracking Hook Deployed')
                    .setDescription(`The live system listener has successfully attached hooks for your status keyword tracking.`)
                    .addFields(
                        { name: '🔍 Keyword/URL', value: `\`\`\`${vanity}\`\`\``, inline: false },
                        { name: '💬 Log Channel', value: `<#${channel.id}>`, inline: true },
                        { name: '🛡️ Reward Role', value: `<@&${role.id}>`, inline: true }
                    )
                    .setFooter({ text: 'Raditic Bot Automation Control Panel' })
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed], ephemeral: isEphemeral });
            } catch (error) {
                console.error('Error adding vanity:', error);
                await interaction.reply({ content: 'A critical database error occurred while trying to map this record.', ephemeral: true });
            }

        // ---------------- [SUBCOMMAND: REMOVE] ----------------
        } else if (subcommand === 'remove') {
            const vanity = interaction.options.getString('vanity');

            try {
                let settings = await Vanity.findOne({ guildId });
                if (settings) {
                    const initialLength = settings.vanities.length;
                    settings.vanities = settings.vanities.filter(v => v.vanity.toLowerCase() !== vanity.toLowerCase());
                    
                    if (settings.vanities.length === initialLength) {
                        const notFoundEmbed = new EmbedBuilder()
                            .setColor('#ffcc00')
                            .setDescription(`❌ **Search Failure:** No active configurations match the sequence \`${vanity}\`.`);
                        await interaction.reply({ embeds: [notFoundEmbed], ephemeral: isEphemeral });
                    } else {
                        await settings.save();
                        const removeEmbed = new EmbedBuilder()
                            .setColor(BRAND_COLOR)
                            .setDescription(`🗑️ **Configuration Removed:** Live tracking configuration for key string \`${vanity}\` has been discarded.`);
                        await interaction.reply({ embeds: [removeEmbed], ephemeral: isEphemeral });
                    }
                } else {
                    await interaction.reply({ content: 'No vanity settings database mapping established for this guild.', ephemeral: isEphemeral });
                }
            } catch (error) {
                console.error('Error removing vanity:', error);
                await interaction.reply({ content: 'A database error was triggered during record destruction.', ephemeral: true });
            }

        // ---------------- [SUBCOMMAND: REMOVE-ALL] ----------------
        } else if (subcommand === 'remove-all') {
            try {
                let settings = await Vanity.findOne({ guildId });
                if (settings && settings.vanities.length > 0) {
                    settings.vanities = [];
                    await settings.save();

                    const purgeEmbed = new EmbedBuilder()
                        .setColor('#ff4d4d')
                        .setTitle('🧹 System Architecture Purged')
                        .setDescription('All active status keyword parameters and monitoring roles have been removed from database registries.');
                    await interaction.reply({ embeds: [purgeEmbed], ephemeral: isEphemeral });
                } else {
                    const cleanEmbed = new EmbedBuilder()
                        .setColor(BRAND_COLOR)
                        .setDescription('ℹ️ Your tracking database registry contains no configurations to clear.');
                    await interaction.reply({ embeds: [cleanEmbed], ephemeral: isEphemeral });
                }
            } catch (error) {
                console.error('Error purging vanities:', error);
                await interaction.reply({ content: 'A structural error prevented the database purge query.', ephemeral: true });
            }

        // ---------------- [SUBCOMMAND: CHECK] ----------------
        } else if (subcommand === 'check') {
            try {
                const settings = await Vanity.findOne({ guildId });

                if (settings && settings.vanities.length > 0) {
                    const checkEmbed = new EmbedBuilder()
                        .setColor(BRAND_COLOR)
                        .setTitle('📊 Active Presence Monitoring Nodes')
                        .setDescription(`The following active listeners are processing live presence updates inside your server:\n\n---`)
                        .setFooter({ text: `Total Active Hooks: ${settings.vanities.length}` })
                        .setTimestamp();

                    settings.vanities.forEach((v, index) => {
                        checkEmbed.addFields({
                            name: `📌 Configuration Module #${index + 1}`,
                            value: `• **Keyword Match:** \`${v.vanity}\`\n• **Target Output:** <#${v.channelId}>\n• **Assigned Identity:** <@&${v.roleId}>`,
                            inline: false
                        });
                    });
                    
                    await interaction.reply({ embeds: [checkEmbed], ephemeral: isEphemeral });
                } else {
                    const emptyEmbed = new EmbedBuilder()
                        .setColor(BRAND_COLOR)
                        .setDescription('🔍 **Status Overview:** No presence/vanity monitoring maps have been initiated yet. Use `/vanity add` to spin up a listener node.');
                    await interaction.reply({ embeds: [emptyEmbed], ephemeral: isEphemeral });
                }
            } catch (error) {
                console.error('Error fetching dashboard summary:', error);
                await interaction.reply({ content: 'System was unable to request the configured collection summaries.', ephemeral: true });
            }
        }
    }
};
