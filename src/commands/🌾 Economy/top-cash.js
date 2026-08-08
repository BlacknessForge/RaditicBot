const User = require('../../Schemas/userAccount.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { emoji } = require('../../config.js');

async function createLeaderboardEmbed(msg, scope = 'global', page = 1, perPage = 10) {
  let users = [];

  if (scope === 'guild') {
    const members = await msg.guild.members.fetch();
    const memberIds = Array.from(members.keys());
    users = await User.find({ userId: { $in: memberIds } }).sort({ balance: -1 });
  } else {
    users = await User.find().sort({ balance: -1 }).limit(100);
  }

  const totalPages = Math.ceil(users.length / perPage) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * perPage;
  const pageUsers = users.slice(start, start + perPage);

  let description = pageUsers.length > 0 
    ? pageUsers.map((u, index) => {
        const rank = start + index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${rank}\``;
        return `${medal} <@${u.userId}> — \`${u.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG`;
      }).join('\n')
    : 'No records found for this leaderboard.';

  const embed = new EmbedBuilder()
    .setColor('#111111')
    .setAuthor({ 
      name: scope === 'guild' ? `${msg.guild.name} Top Cash Leaderboard` : 'Global Top Cash Leaderboard', 
      iconURL: msg.guild.iconURL({ dynamic: true }) || msg.author.displayAvatarURL({ dynamic: true }) 
    })
    .setDescription(description)
    .setFooter({ text: `Page ${currentPage} of ${totalPages} • Economy Leaderboard` })
    .setTimestamp();

  return { embed, totalPages, currentPage };
}

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
  usage: 'top-cash [guild/global] [page]',
  name: 'top-cash',
  aliases: ['lb', 'leaderboard', 'topcash', 'baltop'],
  description: 'View the wealthiest users globally or in this server',
  async execute({ args, msg }) {
    try {
      let scope = 'global';
      let page = 1;

      if (args[0]) {
        const firstArg = args[0].toLowerCase();
        if (['guild', 'server', 'local'].includes(firstArg)) {
          scope = 'guild';
          if (args[1] && !isNaN(parseInt(args[1]))) page = parseInt(args[1]);
        } else if (['global', 'all'].includes(firstArg)) {
          scope = 'global';
          if (args[1] && !isNaN(parseInt(args[1]))) page = parseInt(args[1]);
        } else if (!isNaN(parseInt(firstArg))) {
          page = parseInt(firstArg);
        }
      }

      const { embed, totalPages, currentPage } = await createLeaderboardEmbed(msg, scope, page);
      const components = buildLeaderboardComponents(scope, currentPage, totalPages);

      const initialMessage = await msg.reply({
        embeds: [embed],
        components: components
      });

      const collector = initialMessage.createMessageComponentCollector({
        time: 120000
      });

      collector.on('collect', async i => {
        const [, action, targetScope, targetPage] = i.customId.split('_');
        let newPage = parseInt(targetPage);
        let newScope = targetScope;

        if (action === 'prev') newPage--;
        if (action === 'next') newPage++;

        const updatedData = await createLeaderboardEmbed(msg, newScope, newPage);
        const updatedComponents = buildLeaderboardComponents(newScope, updatedData.currentPage, updatedData.totalPages);

        await i.update({
          embeds: [updatedData.embed],
          components: updatedComponents
        });
      });

      collector.on('end', async () => {
        const disabledRows = initialMessage.components.map(row => {
          const newRow = ActionRowBuilder.from(row);
          newRow.components.forEach(button => button.setDisabled(true));
          return newRow;
        });

        await initialMessage.edit({ components: disabledRows }).catch(() => {});
      });

    } catch (error) {
      console.error('An error occurred while processing top-cash command:', error);
      msg.reply('❌ An internal systems error occurred while fetching the leaderboard.');
    }
  }
};
      
