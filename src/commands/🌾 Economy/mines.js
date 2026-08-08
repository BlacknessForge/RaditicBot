const User = require('../../Schemas/userAccount.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { emoji } = require('../../config.js');

function calculateMultiplier(mines, revealed) {
  let multiplier = 1;
  const totalTiles = 25;
  for (let i = 0; i < revealed; i++) {
    multiplier *= (totalTiles - i) / (totalTiles - mines - i);
  }
  return multiplier * 0.97;
}

// Build 5x5 Grid Components with distinct bomb loss visuals
function buildGrid(mineLocations, revealedTiles, gameOver = false, hitTile = null) {
  const rows = [];
  let tileId = 0;

  for (let r = 0; r < 5; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 5; c++) {
      if (r === 4 && c === 4) {
        const cashoutButton = new ButtonBuilder()
          .setCustomId('mines_cashout')
          .setLabel('💰 Cash Out')
          .setStyle(ButtonStyle.Success)
          .setDisabled(gameOver || revealedTiles.length === 0);
        row.addComponents(cashoutButton);
        continue;
      }

      const button = new ButtonBuilder().setCustomId(`mines_tile_${tileId}`);

      if (revealedTiles.includes(tileId)) {
        button.setEmoji(emoji.radigem || '💎').setStyle(ButtonStyle.Primary).setDisabled(true);
      } else if (gameOver) {
        if (tileId === hitTile) {
          // Exploded tile clicked by player
          button.setEmoji('💥').setStyle(ButtonStyle.Danger).setDisabled(true);
        } else if (mineLocations.includes(tileId)) {
          // Other unexploded mine tiles
          button.setEmoji('💣').setStyle(ButtonStyle.Secondary).setDisabled(true);
        } else {
          // Safe empty tiles
          button.setEmoji('⬛').setStyle(ButtonStyle.Secondary).setDisabled(true);
        }
      } else {
        button.setEmoji('❓').setStyle(ButtonStyle.Secondary);
      }

      row.addComponents(button);
      tileId++;
    }
    rows.push(row);
  }
  return rows;
}

module.exports = {
  usage: 'mines <amount> [mines_count]',
  name: 'mines',
  aliases: ['m'],
  description: 'Navigate a field of hidden mines to multiply your coins',
  async execute({ args, msg }) {
    try {
      const existingUser = await User.findOne({ userId: msg.author.id });

      if (!existingUser) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the registration command to initialize your account.");
      }

      if (!args[0]) {
        return msg.reply('⚠️ **Invalid Parameters** | Usage: `mines <amount> [mines_count]`');
      }

      let amount = args[0].toLowerCase() === 'all' ? existingUser.balance : parseInt(args[0]);
      amount = Math.min(amount, 250000);

      if (isNaN(amount) || amount <= 0) {
        return msg.reply('❌ **Error** | The betting amount must be a clean, positive integer.');
      }

      if (existingUser.balance < amount) {
        return msg.reply(`❌ **Insufficient Funds** | You don't have enough ${emoji.radigem || '💎'} RG coins to back this stake.`);
      }

      let mineCount = args[1] ? parseInt(args[1]) : 3;
      if (isNaN(mineCount) || mineCount < 1 || mineCount > 24) {
        return msg.reply('❌ **Error** | Mine count must be a number between **1** and **24**.');
      }

      existingUser.balance -= amount;
      await existingUser.save();

      const mineLocations = [];
      while (mineLocations.length < mineCount) {
        const loc = Math.floor(Math.random() * 24);
        if (!mineLocations.includes(loc)) mineLocations.push(loc);
      }

      const revealedTiles = [];
      let isGameOver = false;

      const embed = new EmbedBuilder()
        .setColor('#111111')
        .setAuthor({ name: `${msg.author.displayName}'s Mines Game`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`\`💣\` Select tiles carefully...\n\n**Stake:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Mines:** \`${mineCount}\`\n**Current Multiplier:** \`1.00x\`\n**Current Payout:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setFooter({ text: 'Click ❓ to reveal a tile or 💰 to Cash Out!' })
        .setTimestamp();

      const initialMessage = await msg.reply({
        embeds: [embed],
        components: buildGrid(mineLocations, revealedTiles)
      });

      const collector = initialMessage.createMessageComponentCollector({
        filter: i => i.user.id === msg.author.id,
        time: 120000
      });

      collector.on('collect', async i => {
        if (i.customId === 'mines_cashout') {
          isGameOver = true;
          const finalMultiplier = calculateMultiplier(mineCount, revealedTiles.length);
          const payout = Math.floor(amount * finalMultiplier);

          existingUser.balance += payout;
          await existingUser.save();

          embed.setColor('#2ECC71')
            .setDescription(`## 🎉 Cashed Out!\n\nYou safely secured your earnings.\n\n**Tiles Cleared:** \`${revealedTiles.length}\`\n**Final Multiplier:** \`${finalMultiplier.toFixed(2)}x\`\n**Net Payout:** \`+${payout.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);

          await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true) });
          return collector.stop('cashed_out');
        }

        const tileIndex = parseInt(i.customId.replace('mines_tile_', ''));

        if (mineLocations.includes(tileIndex)) {
          isGameOver = true;
          embed.setColor('#E74C3C')
            .setDescription(`## 🛑 BOOM! Game Over\n\nYou stepped on a mine on tile \`#${tileIndex + 1}\`!\n\n**Loss Penalty:** \`-${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);

          // Pass tileIndex as hitTile so it displays 💥 on clicked tile and 💣 on others
          await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true, tileIndex) });
          return collector.stop('hit_mine');
        } else {
          revealedTiles.push(tileIndex);
          const currentMultiplier = calculateMultiplier(mineCount, revealedTiles.length);
          const currentPayout = Math.floor(amount * currentMultiplier);

          if (revealedTiles.length === 24 - mineCount) {
            isGameOver = true;
            existingUser.balance += currentPayout;
            await existingUser.save();

            embed.setColor('#2ECC71')
              .setDescription(`## 🏆 PERFECT CLEAR!\n\nYou cleared every safe tile on the board!\n\n**Final Multiplier:** \`${currentMultiplier.toFixed(2)}x\`\n**Total Won:** \`+${currentPayout.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);

            await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true) });
            return collector.stop('cleared');
          }

          embed.setDescription(`\`💣\` Select tiles carefully...\n\n**Stake:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Mines:** \`${mineCount}\`\n**Current Multiplier:** \`${currentMultiplier.toFixed(2)}x\`\n**Current Payout:** \`${currentPayout.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);

          await i.update({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles) });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'time' && !isGameOver) {
          const finalMultiplier = revealedTiles.length > 0 ? calculateMultiplier(mineCount, revealedTiles.length) : 1;
          const payout = Math.floor(amount * finalMultiplier);
          
          if (payout > 0) {
            existingUser.balance += payout;
            await existingUser.save();
          }

          embed.setColor('#E67E22')
            .setDescription(`## ⏰ Session Expired\n\nThe game timed out due to inactivity. Automatically cashed out **${payout.toLocaleString()}** ${emoji.radigem || '💎'} RG.`);

          await initialMessage.edit({ embeds: [embed], components: buildGrid(mineLocations, revealedTiles, true) }).catch(() => {});
        }
      });

    } catch (error) {
      console.error('An error occurred while processing mines command:', error);
      msg.reply('❌ An internal systems error occurred while running the mines command.');
    }
  }
};
