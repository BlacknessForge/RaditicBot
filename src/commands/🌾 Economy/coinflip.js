const Cooldown = require('../../Schemas/CooldownCoinflip.js');
const User = require('../../Schemas/userAccount.js');
const { EmbedBuilder } = require('discord.js');
const { emoji } = require('../../config.js');

module.exports = {
  usage: 'cp coinflip <amount> <heads/tails>',
  name: 'coinflip',
  aliases: ['cf'],
  description: 'Risk your coins on a high-stakes coin toss',
  async execute({ args, msg }) {
    try {
      const existingUser = await User.findOne({ userId: msg.author.id });

      if (!existingUser) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      // Cooldown check
      const cooldown = await Cooldown.findOne({ userId: msg.author.id });
      if (cooldown && cooldown.cooldownExpiration > Date.now()) {
        const timeLeft = Math.floor((cooldown.cooldownExpiration - Date.now()) / 1000);

        return msg.reply(`⏳ | **${msg.author.displayName}**, your coin is still cooling down. Try again **<t:${Math.floor(Date.now() / 1000) + timeLeft}:R>**.`)
          .then((message) => {
            setTimeout(() => message.delete().catch(() => {}), 3000);
          });
      }

      const timeout = 20000; // 20 seconds
      const prefix = "cp"; // Adjusted local fallback if prefix variable isn't global

      if (!args[0]) {
        return msg.reply(`⚠️ **Invalid Parameters** | Correct Usage: \`${prefix} coinflip <amount> [heads/tails]\``);
      }

      const user = msg.author;
      let amount = args[0].toLowerCase() === 'all' ? existingUser.balance : parseInt(args[0]);
      const bet = args[1] && args[1].toLowerCase();

      // Enforce maximum bet cap
      amount = Math.min(amount, 250000);

      if (isNaN(amount) || amount <= 0) {
        return msg.reply('❌ **Error** | The betting amount must be a clean, positive integer.');
      }

      const currentBalance = existingUser.balance;
      if (currentBalance < amount) {
        return msg.reply(`❌ **Insufficient Funds** | You don't have enough ${emoji.radigem || '💎'} RG coins to back this stake.`);
      }

      // Determine choices cleanly
      let userBet = 'heads';
      if (bet === 't' || bet === 'tails') userBet = 'tails';

      // ─── INITIAL COIN FLIP STATE ───
      const flipEmbed = new EmbedBuilder()
        .setColor('#111111') // High-contrast sleek dark mode tone
        .setAuthor({ name: `${user.displayName}'s Wager`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`\`🪙\` The coin is spinning in the air...\n\n**Stake:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Prediction:** \`${userBet.toUpperCase()}\``)
        .setTimestamp();

      let initialMessage = await msg.reply({ embeds: [flipEmbed] });

      // Mid-flip suspense animation frame (after 1.5 seconds)
      setTimeout(async () => {
        const midEmbed = EmbedBuilder.from(flipEmbed)
          .setDescription(`\`✨\` The momentum slows down... It's about to land!\n\n**Stake:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Prediction:** \`${userBet.toUpperCase()}\``);
        await initialMessage.edit({ embeds: [midEmbed] }).catch(() => {});
      }, 1500);

      // Determine outcome logic
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const userWon = result === userBet;
      let winnings = userWon ? amount * 2 : 0;

      // Apply balance modifications
      if (userWon) {
        existingUser.balance += amount; 
      } else {
        existingUser.balance -= amount;
      }
      await existingUser.save();

      // Set command cooldown structure
      await Cooldown.findOneAndUpdate(
        { userId: user.id }, 
        { cooldownExpiration: Date.now() + timeout }, 
        { upsert: true, new: true }
      );

      // ─── FINAL RESOLUTION STATE ───
      setTimeout(async () => {
        const finalEmbed = new EmbedBuilder()
          .setAuthor({ name: `${user.displayName}'s Coinflip Result`, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();

        if (userWon) {
          finalEmbed.setColor('#2ECC71') // Clear clean green success accent
            .setDescription(`## 🎉 Victory!\n\nThe coin settled on **${result.toUpperCase()}**.\nYour prediction was flawless!\n\n**Net Returns:** \`+${winnings.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);
        } else {
          finalEmbed.setColor('#E74C3C') // Bold distinct red failure accent
            .setDescription(`## 🛑 Defeat\n\nThe coin settled on **${result.toUpperCase()}**.\nBetter luck on your next rotation.\n\n**Loss Penalty:** \`-${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);
        }

        await initialMessage.edit({ embeds: [finalEmbed] }).catch(() => {});
      }, 4000);

    } catch (error) {
      console.error('An error occurred while processing coinflip command:', error);
      msg.reply('❌ An internal systems error occurred while finalizing the transaction.');
    }
  },
};
