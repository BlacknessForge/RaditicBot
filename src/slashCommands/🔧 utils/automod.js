const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Complete control panel for native server protection.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Subcommand 1: Clear one-click baseline setup
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
                .setDescription('Instantly deploys the master word filter configuration.')
        )
        // Subcommand 2: Add individual phrases dynamically
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a new custom keyword to the active block list')
                .addStringOption(option => 
                    option.setName('keyword').setDescription('The phrase to block').setRequired(true)
                )
        )
        // Subcommand 3: Remove individual phrases dynamically
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a phrase from the active block list')
                .addStringOption(option => 
                    option.setName('keyword').setDescription('The phrase to unblock').setRequired(true)
                )
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

            // --- CRITERIA 1: ONE-CLICK QUICK SETUP ---
            if (subcommand === 'setup') {
                // A solid master list of things admins definitely want blocked right away
                const defaultMasterList = ['free-nitro', 'grabify.link', 'token-stealer', 'discord-promo'];
                
                // Merge lists without adding duplicates
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
                    .setDescription('The master AutoMod shield has been installed and configured successfully.')
                    .addFields({ name: 'Active Protected Words', value: `${currentKeywords.length} words total` });

                return interaction.editReply({ embeds: [setupEmbed] });
            }

            // --- CRITERIA 2: DYNAMIC ADDITION ---
            const inputKeyword = interaction.options.getString('keyword')?.toLowerCase().trim();

            if (subcommand === 'add') {
                if (currentKeywords.includes(inputKeyword)) {
                    return interaction.editReply(`⚠️ \`${inputKeyword}\` is already monitored.`);
                }
                currentKeywords.push(inputKeyword);
            } 
            
            // --- CRITERIA 3: DYNAMIC REMOVAL ---
            else if (subcommand === 'remove') {
                if (!currentKeywords.includes(inputKeyword)) {
                    return interaction.editReply(`⚠️ \`${inputKeyword}\` isn't active in the filter.`);
                }
                currentKeywords = currentKeywords.filter(word => word !== inputKeyword);
            }

            // Save the updated rule data back up to the Discord servers
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
                .setTitle(subcommand === 'add' ? '🔒 Filter Updated' : '🔓 Filter Updated')
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
