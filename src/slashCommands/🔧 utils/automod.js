const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Complete control panel for native server protection.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Subcommand 1: Setup
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Instantly deploys the master word filter configuration.')
        )
        // Subcommand 2: Add
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a new custom keyword to the active block list')
                .addStringOption(option => 
                    option.setName('keyword').setDescription('The phrase to block').setRequired(true)
                )
        )
        // Subcommand 3: Remove
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a phrase from the active block list')
                .addStringOption(option => 
                    option.setName('keyword').setDescription('The phrase to unblock').setRequired(true)
                )
        )
        // Subcommand 4: New View Configuration
        .addSubcommand(subcommand =>
            subcommand.setName('view')
                .setDescription('Displays all currently blocked keywords in the active shield.')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const ruleName = 'Bot Shield System';

        try {
            const existingRules = await guild.autoModerationRules.fetch();
            let targetRule = existingRules.find(rule => rule.name === ruleName);
            let currentKeywords = targetRule ? targetRule.triggerMetadata.keywordFilter : [];

            // --- CRITERIA 1: VIEW LOGGED SETTINGS ---
            if (subcommand === 'view') {
                if (!targetRule || currentKeywords.length === 0) {
                    return interaction.editReply('🛡️ The Bot Shield is currently empty or has not been initialized yet. Run `/automod setup` to begin!');
                }

                // Format keywords cleanly for presentation
                const wordListText = currentKeywords.map(word => `• \`${word}\``).join('\n');

                const viewEmbed = new EmbedBuilder()
                    .setColor('#2dd4bf')
                    .setTitle('📊 Active Shield Status')
                    .setDescription('Here are the words natively blocked by this bot on your server:')
                    .addFields(
                        { name: 'Total System Rules', value: `${currentKeywords.length} active phrases`, inline: true },
                        { name: 'Status', value: '🟢 Active & Guarding', inline: true },
                        { name: 'Monitored Keywords', value: wordListText.length > 1024 ? wordListText.substring(0, 1018) + '...' : wordListText }
                    )
                    .setFooter({ text: 'Native Discord Protection Dashboard' });

                return interaction.editReply({ embeds: [viewEmbed] });
            }

            // --- CRITERIA 2: ONE-CLICK QUICK SETUP ---
            if (subcommand === 'setup') {
                const defaultMasterList = ['free-nitro', 'grabify.link', 'token-stealer', 'discord-promo'];
                currentKeywords = [...new Set([...currentKeywords, ...defaultMasterList])];
                
                if (targetRule) {
                    await guild.autoModerationRules.edit(targetRule.id, { triggerMetadata: { keywordFilter: currentKeywords } });
                } else {
                    await guild.autoModerationRules.create({
                        name: ruleName,
                        eventType: 1,
                        triggerType: 1,
                        triggerMetadata: { keywordFilter: currentKeywords },
                        actions: [{ type: 1 }]
                    });
                }

                const setupEmbed = new EmbedBuilder()
                    .setColor('#2dd4bf')
                    .setTitle('🛡️ Core Protection Deployed')
                    .setDescription('The master AutoMod shield has been installed successfully.')
                    .addFields({ name: 'Active Protected Words', value: `${currentKeywords.length} words total` });

                return interaction.editReply({ embeds: [setupEmbed] });
            }

            // Parsing dynamic adjustments (add/remove)
            const inputKeyword = interaction.options.getString('keyword')?.toLowerCase().trim();

            // --- CRITERIA 3: DYNAMIC ADDITION ---
            if (subcommand === 'add') {
                if (currentKeywords.includes(inputKeyword)) {
                    return interaction.editReply(`⚠️ \`${inputKeyword}\` is already monitored.`);
                }
                currentKeywords.push(inputKeyword);
            } 
            
            // --- CRITERIA 4: DYNAMIC REMOVAL ---
            else if (subcommand === 'remove') {
                if (!currentKeywords.includes(inputKeyword)) {
                    return interaction.editReply(`⚠️ \`${inputKeyword}\` isn't active in the filter.`);
                }
                currentKeywords = currentKeywords.filter(word => word !== inputKeyword);
            }

            // Sync structural parameters up to Discord Developer API
            if (targetRule) {
                await guild.autoModerationRules.edit(targetRule.id, { triggerMetadata: { keywordFilter: currentKeywords } });
            } else {
                await guild.autoModerationRules.create({
                    name: ruleName,
                    eventType: 1,
                    triggerType: 1,
                    triggerMetadata: { keywordFilter: currentKeywords },
                    actions: [{ type: 1 }]
                });
            }

            const updateEmbed = new EmbedBuilder()
                .setColor('#2dd4bf')
                .setTitle('🔒 Filter Synchronized')
                .setDescription(`Successfully synchronized data with the native Discord configuration.`)
                .addFields(
                    { name: 'Word Status', value: subcommand === 'add' ? `Added: \`${inputKeyword}\`` : `Removed: \`${inputKeyword}\``, inline: true },
                    { name: 'Total Tracked Phrases', value: `${currentKeywords.length} words`, inline: true }
                );

            await interaction.editReply({ embeds: [updateEmbed] });

        } catch (error) {
            console.error('Unified AutoMod Command Error:', error);
            await interaction.editReply('❌ **Configuration Failed.** Check your bot permissions.');
        }
    }
};
