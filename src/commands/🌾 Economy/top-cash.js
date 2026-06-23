const { EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const { emoji } = require('../../config');

module.exports = {
  usage: 'top-cash [limit]',
  name: 'top-cash',
  aliases: ['topcash', 'top-c', 'topc', 'lb', 'leaderboard'],
  description: 'Display the elite global users ranked by active wallet balances.',
  async execute({ msg, args }) {
    try {
      let limit = 5;
      if (args[0]) {
        limit = parseInt(args[0]);
        if (isNaN(limit) || limit <= 0 || limit > 20) {
          return msg.reply('❌ **Error** | Please provide a valid query limit between `1` and `20`.');
        }
      }

      // Fetch the top records efficiently
      const topUsers = await User.find().sort({ balance: -1 }).limit(limit);

      if (topUsers.length === 0) {
        return msg.reply('📭 **Database Empty** | No registered accounts were discovered in the central ledger.');
      }

      // Find the author's dynamic rank matching your MongoDB structure
      const authorData = await User.findOne({ userId: msg.author.id });
      const authorRank = authorData ? await User.countDocuments({ balance: { $gt: authorData.balance } }) + 1 : 'N/A';

      // Rebuilt premium leaderboard card design
      const leaderboardEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium high-contrast dark theme
        .setAuthor({ name: 'Raditic Global Registry', iconURL: msg.client.user.displayAvatarURL() })
        .setTitle(`🏆 Top ${topUsers.length} Wealthiest Network Profiles`)
        .setDescription(`Your Personal Network Standing: **#${authorRank}**\n${'─'.repeat(32)}`)
        .setTimestamp();

      // Optimize user resolution by executing fetches concurrently instead of blocking in a loop
      const leaderboardLines = await Promise.all(
        topUsers.map(async (entry, index) => {
          try {
            // Check cache first, fall back to API call safely
            const user = msg.client.users.cache.get(entry.userId) || await msg.client.users.fetch(entry.userId);
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `\`#${index + 1}\``;
            
            return `${rankEmoji} **${user.username}**\n┗━ Balance: \`${entry.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n`;
          } catch {
            return `\`#${index + 1}\` *Unknown Entity (${entry.userId})*\n┗━ Balance: \`${entry.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n`;
          }
        })
      );

      leaderboardEmbed.addFields({
        name: '👑 Financial Standings',
        value: leaderboardLines.join('\n') || 'No records available.',
        inline: false
      });

      return msg.reply({ embeds: [leaderboardEmbed] });

    } catch (error) {
      console.error('An error occurred while fetching top users:', error);
      msg.reply('❌ An internal ledger error occurred while collecting the ranking payload.');
    }
  },
};
