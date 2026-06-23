const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { Profile } = require('discord-arts');

const imageCache = new Map();
const CACHE_TIMEOUT = 120000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Generates a highly polished, visual graphic of a user's profile card.")
        .addUserOption(option => option
            .setName('user')
            .setDescription('Select the target user. Leave blank to view your own profile.')
            .setRequired(false)
        ),

    async execute({ interaction }) {
        if (!interaction.guild) {
            return interaction.reply({ content: '⚠️ This command can only be used in a server.', ephemeral: true });
        }

        await interaction.deferReply();

        const user = interaction.options.getUser('user') || interaction.user;
        const cacheKey = `${user.id}-${interaction.guild.id}`;

        if (imageCache.has(cacheKey)) {
            const cachedBuffer = imageCache.get(cacheKey);
            const attachment = new AttachmentBuilder(cachedBuffer, { name: `profile-${user.id}.png` });
            return interaction.editReply({ files: [attachment] });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            let status = 'offline';
            if (member?.presence) {
                const isStreaming = member.presence.activities.some(act => act.type === 1);
                status = isStreaming ? 'streaming' : (member.presence.status || 'offline');
            }

            const buffer = await Profile(user.id, {
                squareAvatar: false,
                overwriteBadges: true,
                badgesFrame: true,
                moreBackgroundBlur: true,
                presenceStatus: status,
            });

            imageCache.set(cacheKey, buffer);
            setTimeout(() => imageCache.delete(cacheKey), CACHE_TIMEOUT);

            const attachment = new AttachmentBuilder(buffer, { name: `profile-${user.id}.png` });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating profile image:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff4d4d')
                .setDescription('⚠️ **Engine Error:** Failed to render the profile card. Please try again.');

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};