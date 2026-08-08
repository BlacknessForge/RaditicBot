const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Helper to build the leaderboard embed
async function createLeaderboardEmbed(client, db, guild, scope = 'global', page = 1, perPage = 10) {
    let users = [];

    if (scope === 'guild') {
        // Fetch all guild member IDs to filter
        const members = await guild.members.fetch();
        const memberIds = Array.from(members.keys());
        users = await db.getTopUsersByIDs(memberIds); // DB query filtering by array of user IDs
    } else {
        users = await db.getTopUsers(100); // Fetch top 100 global users
    }

    const totalPages = Math.ceil(users.length / perPage) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * perPage;
    const pageUsers = users.slice(start, start + perPage);

    let description = pageUsers.length > 0 
        ? pageUsers.map((u, index) => {
            const rank = start + index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${rank}\``;
            return `${medal} <@${u.userId}> — 💎 **${u.balance.toLocaleString()}** RadiGems`;
          }).join('\n')
        : 'No records found for this leaderboard.';

    const embed = new EmbedBuilder()
        .setTitle(scope === 'guild' ? `🏆 Top Cash Leaderboard — ${guild.name}` : '🌐 Global Top Cash Leaderboard')
        .setColor('#9D4EDD')
        .setDescription(description)
        .setFooter({ text: `Page ${currentPage} of ${totalPages} • Raditic Economy` })
        .setTimestamp();

    return { embed, totalPages, currentPage };
}

// Helper to build action rows with navigation and scope toggles
function buildLeaderboardComponents(scope, page, totalPages) {
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`lb_prev_${scope}_${page}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`lb_next_${scope}_${page}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages),
        new ButtonBuilder()
            .setCustomId(`lb_toggle_${scope === 'global' ? 'guild' : 'global'}_1`)
            .setLabel(scope === 'global' ? '📍 Server Leaderboard' : '🌐 Global Leaderboard')
            .setStyle(ButtonStyle.Secondary)
    );

    return [navRow];
}

module.exports = {
    name: 'top-cash',
    aliases: ['lb', 'leaderboard', 'topcash', 'baltop'],
    description: 'View the wealthiest users globally or in this server!',
    async execute(message, args, db) {
        let scope = 'global';
        let page = 1;

        // Parse arguments (e.g., r.lb guild 2 or r.top-cash global)
        if (args[0]) {
            const firstArg = args[0].toLowerCase();
            if (firstArg === 'guild' || firstArg === 'server' || firstArg === 'local') {
                scope = 'guild';
                if (args[1] && !isNaN(parseInt(args[1]))) page = parseInt(args[1]);
            } else if (firstArg === 'global' || firstArg === 'all') {
                scope = 'global';
                if (args[1] && !isNaN(parseInt(args[1]))) page = parseInt(args[1]);
            } else if (!isNaN(parseInt(firstArg))) {
                page = parseInt(firstArg);
            }
        }

        const { embed, totalPages, currentPage } = await createLeaderboardEmbed(message.client, db, message.guild, scope, page);
        const components = buildLeaderboardComponents(scope, currentPage, totalPages);

        const response = await message.reply({
            embeds: [embed],
            components: components
        });

        // Component collector for interactive buttons
        const collector = response.createMessageComponentCollector({
            time: 120000 // 2 minutes active timeout
        });

        collector.on('collect', async i => {
            // Allow anyone to click navigation buttons
            const [type, action, targetScope, targetPage] = i.customId.split('_');
            let newPage = parseInt(targetPage);
            let newScope = targetScope;

            if (action === 'prev') newPage--;
            if (action === 'next') newPage++;

            const updatedData = await createLeaderboardEmbed(message.client, db, i.guild, newScope, newPage);
            const updatedComponents = buildLeaderboardComponents(newScope, updatedData.currentPage, updatedData.totalPages);

            await i.update({
                embeds: [updatedData.embed],
                components: updatedComponents
            });
        });

        collector.on('end', async () => {
            // Disable all buttons when collector expires
            const disabledRows = response.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach(button => button.setDisabled(true));
                return newRow;
            });

            await response.edit({ components: disabledRows }).catch(() => {});
        });
    }
};
                  
