const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

const { Profile } = require('discord-arts');

const imageCache = new Map();
const CACHE_TIMEOUT = 120000;

module.exports = {
    usage: 'profile [@user]',
    name: 'profile',
    description: "Generates a highly polished, visual graphic of a user's profile card.",
    async execute({ msg }) {
        try {
            const user = msg.mentions.users.first() || msg.author;
            const cacheKey = `${user.id}-${msg.guild.id}`;

            if (imageCache.has(cacheKey)) {
                const cachedBuffer = imageCache.get(cacheKey);
                const attachment = new AttachmentBuilder(cachedBuffer, { name: `profile-${user.id}.png` });
                return msg.reply({ files: [attachment] });
            }

            const member = await msg.guild.members.fetch(user.id).catch(() => null);

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
            await msg.reply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating profile image:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff4d4d')
                .setDescription('⚠️ **Engine Error:** Failed to render the profile card. Please try again.');

            await msg.reply({ embeds: [errorEmbed] });
        }
    },
};