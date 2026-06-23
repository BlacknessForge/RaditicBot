const { EmbedBuilder } = require('discord.js');
const { emoji } = require('../../config.js');
const Cooldown = require('../../Schemas/CooldownDaily');
const User = require('../../Schemas/userAccount.js');

module.exports = {
  usage: 'daily',
  name: 'daily',
  description: 'Claim your daily allowance of RadiGems.',
  async execute({ msg }) {
    try {
      const user = await User.findOne({ userId: msg.author.id });

      if (!user) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      // Cooldown evaluation
      let cooldown = await Cooldown.findOne({ userId: msg.author.id });
      if (cooldown && cooldown.cooldownExpiration > Date.now()) {
        const timeLeft = Math.floor((cooldown.cooldownExpiration - Date.now()) / 1000);

        // Uses Discord dynamic relative timestamp formatting (<t:TIMESTAMP:R>)
        return await msg.reply(`⏳ | **${msg.author.displayName}**, you have already claimed your allotment for today. Your rotation refreshes **<t:${Math.floor(Date.now() / 1000) + timeLeft}:R>**.`);
      }

      // Generate random reward range (1,000 to 5,500 based on your calculation)
      const randomReward = Math.floor(Math.random() * 4501) + 1000;
      user.balance += randomReward;
      await user.save();

      // Establish next 24-hour window
      const newCooldown = {
        userId: msg.author.id,
        cooldownExpiration: Date.now() + 24 * 60 * 60 * 1000,
      };

      await Cooldown.findOneAndUpdate(
        { userId: msg.author.id },
        newCooldown,
        { upsert: true, new: true }
      );

      // Sleek, high-contrast success panel layout
      const dailyEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium dark mode theme
        .setAuthor({ name: `${msg.author.displayName}'s Daily Bonus`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`## 🎉 Allocation Credited!\n\nYou successfully collected your daily check-in stimulus package.\n\n**Deposit Amount:** \`+${randomReward.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Updated Balance:** \`${user.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setFooter({ text: 'Come back tomorrow to secure your next credit.' })
        .setTimestamp();

      await msg.reply({ embeds: [dailyEmbed] });

    } catch (err) {
      console.error('Daily Reward Error', err);
      msg.reply('❌ An internal systems error occurred while finalizing your daily credit.');
    }
  },
};
