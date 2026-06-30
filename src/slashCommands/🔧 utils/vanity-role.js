const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js'); 
const Vanity = require('../../Schemas/vanitySchema'); 
const mongoose = require('mongoose');

// Minimalist Monochromatic Brand System
const MONO_WHITE = '#ffffff';  // Primary high-contrast success state
const MONO_BLACK = '#000000';  // Deep brand identity accents
const MONO_DARK = '#1a1a1a';   // Standard interface structural panels
const MONO_GRAY = '#7f7f7f';   // Neutral indicators and footers

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vanity')
        .setDescription('Advanced presence monitoring and vanity URL management panel.')
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('Configure a new automated status tracking node.')
               .addStringOption(o => o.setName('vanity').setDescription('Target custom phrase or status link (e.g., .gg/server)').setRequired(true))
               .addChannelOption(o => o.setName('channel').setDescription('The designated log channel.').setRequired(true))
               .addRoleOption(o => o.setName('role').setDescription('The reward role granted to matching users.').setRequired(true))
               .addBooleanOption(o => o.setName('hide').setDescription('Toggle response visibility (Default: False)')))
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('Delete a specific active status tracking configuration.')
               .addStringOption(o => o.setName('vanity').setDescription('The exact tracking string to remove.').setRequired(true))
               .addBooleanOption(o => o.setName('hide').setDescription('Toggle response invisibility (Default: False)')))
        .addSubcommand(sub =>
            sub.setName('remove-all')
               .setDescription('Purge all active tracking parameters for this server.')
               .addBooleanOption(o => o.setName('hide').setDescription('Toggle response invisibility (Default: False)')))
        .addSubcommand(sub =>
            sub.setName('check')
               .setDescription('List current tracking nodes and active system structures.')
               .addBooleanOption(o => o.setName('hide').setDescription('Toggle response invisibility (Default: False)'))),

    async execute({ interaction }) {
        const subcommand = interaction.options.getSubcommand();
        const isEphemeral = interaction.options.getBoolean('hide') ?? false;

        // 🛡️ Security Check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const noPerms = new EmbedBuilder()
                .setColor(MONO_WHITE)
                .setDescription('🔳 **Access Denied:** Administrator privileges are required to configure this system.')
                .setTimestamp();
            return interaction.reply({ embeds: [noPerms], ephemeral: true });
        }

        // ⚡ Mongoose Timeout Prevention Shield
        if (mongoose.connection.readyState !== 1) {
            const dbOffline = new EmbedBuilder()
                .setColor(MONO_WHITE)
                .setTitle('⚪ System Offline')
                .setDescription('Unable to connect to the central cloud databank. Please verify your host database connection settings.');
            return interaction.reply({ embeds: [dbOffline], ephemeral: true });
        }
        
        const guildId = interaction.guild.id;
        const startTime = Date.now(); 

        try {
            // ---------------- [SUBCOMMAND: ADD] ----------------
            if (subcommand === 'add') {
                const vanity = interaction.options.getString('vanity');
                const channel = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');

                if (!channel.isTextBased()) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription('⬜ **Configuration Error:** The log target must be a text channel.')],
                        ephemeral: isEphemeral
                    });
                }

                let settings = await Vanity.findOne({ guildId });
                if (settings) {
                    const exists = settings.vanities.some(v => v.vanity.toLowerCase() === vanity.toLowerCase());
                    if (exists) {
                        return interaction.reply({
                            embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription(`⬜ **Duplicate Parameter:** The tracking string \`${vanity}\` is already mapped.`)],
                            ephemeral: isEphemeral
                        });
                    }
                    settings.vanities.push({ vanity, channelId: channel.id, roleId: role.id });
                } else {
                    settings = new Vanity({ guildId, vanities: [{ vanity, channelId: channel.id, roleId: role.id }] });
                }

                await settings.save();

                const successEmbed = new EmbedBuilder()
                    .setColor(MONO_WHITE)
                    .setTitle('🔲 Tracking Node Established')
                    .setDescription('The automated status monitor listener has been successfully linked.')
                    .addFields(
                        { name: '▪️ Monitored String', value: `\`\`\`${vanity}\`\`\``, inline: false },
                        { name: '▪️ Output Channel', value: `<#${channel.id}>`, inline: true },
                        { name: '▪️ Reward Identity', value: `<@&${role.id}>`, inline: true }
                    )
                    .setFooter({ text: `Raditic Core • Execution time: ${Date.now() - startTime}ms` })
                    .setTimestamp();

                return await interaction.reply({ embeds: [successEmbed], ephemeral: isEphemeral });
            }

            // ---------------- [SUBCOMMAND: REMOVE] ----------------
            if (subcommand === 'remove') {
                const vanity = interaction.options.getString('vanity');
                let settings = await Vanity.findOne({ guildId });

                if (!settings || settings.vanities.length === 0) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription('⬜ **Search Failure:** No parameters found for this guild.')],
                        ephemeral: isEphemeral
                    });
                }

                const initialLength = settings.vanities.length;
                settings.vanities = settings.vanities.filter(v => v.vanity.toLowerCase() !== vanity.toLowerCase());

                if (settings.vanities.length === initialLength) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription(`⬜ **Search Failure:** No active nodes found for \`${vanity}\`.`)],
                        ephemeral: isEphemeral
                    });
                }

                await settings.save();
                return await interaction.reply({
                    embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription(`🔳 **Node Deconfigured:** The entry matching \`${vanity}\` has been deleted.`)],
                    ephemeral: isEphemeral
                });
            }

            // ---------------- [SUBCOMMAND: REMOVE-ALL] ----------------
            if (subcommand === 'remove-all') {
                let settings = await Vanity.findOne({ guildId });
                if (!settings || settings.vanities.length === 0) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription('⬜ System tracking database holds zero active records. Action cancelled.')],
                        ephemeral: isEphemeral
                    });
                }

                settings.vanities = [];
                await settings.save();

                const purgeEmbed = new EmbedBuilder()
                    .setColor(MONO_WHITE)
                    .setTitle('🔳 Registry Purged')
                    .setDescription('All tracking data parameters have been zeroed out across local systems.');
                return await interaction.reply({ embeds: [purgeEmbed], ephemeral: isEphemeral });
            }

            // ---------------- [SUBCOMMAND: CHECK] ----------------
            if (subcommand === 'check') {
                const settings = await Vanity.findOne({ guildId });

                if (!settings || settings.vanities.length === 0) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(MONO_WHITE).setDescription('⬜ **System Idle:** No active listeners. Run `/vanity add` to open a data pipeline.')],
                        ephemeral: isEphemeral
                    });
                }

                const checkEmbed = new EmbedBuilder()
                    .setColor(MONO_WHITE)
                    .setTitle('🔲 System Overview & Active Diagnostics')
                    .setDescription(`Currently analyzing active status changes across guild profiles:\n\n---`)
                    .setFooter({ text: `Total Active Nodes: ${settings.vanities.length} • Loop Delay: ${Date.now() - startTime}ms` })
                    .setTimestamp();

                settings.vanities.forEach((v, idx) => {
                    checkEmbed.addFields({
                        name: `▫️ Operational Node [0x0${idx + 1}]`,
                        value: `• **Pattern:** \`${v.vanity}\`\n• **Pipe:** <#${v.channelId}>\n• **Assign:** <@&${v.roleId}>`,
                        inline: false
                    });
                });
                
                return await interaction.reply({ embeds: [checkEmbed], ephemeral: isEphemeral });
            }

        } catch (error) {
            console.error('System Exception Code:', error);
            const crashEmbed = new EmbedBuilder()
                .setColor(MONO_WHITE)
                .setDescription('⬜ **System Error:** An internal core processor fault occurred while sorting this request.');
            return interaction.reply({ embeds: [crashEmbed], ephemeral: true });
        }
    }
};
