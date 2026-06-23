const { EmbedBuilder } = require('discord.js');
const CooldownWork = require('../../Schemas/CooldownWork');
const User = require('../../Schemas/userAccount');
const { emoji } = require('../../config.js');

module.exports = {
  usage: 'work',
  name: 'work',
  aliases: ['w', 'job'],
  description: 'Complete systemic labor rotations to earn a dividend of RadiGems.',
  async execute({ args, msg, client }) {
    try {
      const user = await User.findOne({ userId: msg.author.id });

      if (!user) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      // Cooldown validation
      const cooldown = await CooldownWork.findOne({ userId: msg.author.id });
      if (cooldown && cooldown.cooldownExpiration > Date.now()) {
        const timeLeft = Math.floor((cooldown.cooldownExpiration - Date.now()) / 1000);

        return msg.reply(`⏳ | **${msg.author.displayName}**, shift recovery is active. Next availability **<t:${Math.floor(Date.now() / 1000) + timeLeft}:R>**.`)
          .then((message) => {
            setTimeout(() => message.delete().catch(() => {}), 3000);
          });
      }

      const timeout = 60000; // 1 minute cooldown window
      const successfulShift = Math.random() < 0.65; // Boosted baseline outcome rate slightly for better gameplay UX
      
      const workEmbed = new EmbedBuilder()
        .setAuthor({ name: `${msg.author.displayName}'s Work Shift`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      if (successfulShift) {
        // Generates an explicit, rewarding value between 400 and 1000
        const randomCoins = Math.floor(Math.random() * 601) + 400;
        
        user.balance += randomCoins;
        await user.save();

        workEmbed.setColor('#2ECC71') // Green success accent
          .setDescription(`## 🛠️ Shift Completed Successfully\n\nYou clocked into your daily operational shift and successfully completed your tasks.\n\n**Stipend Earned:** \`+${randomCoins.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Total Assets:** \`${user.balance.toLocaleString()}\` RG`);
      } else {
        workEmbed.setColor('#E74C3C') // Red shift failure accent
          .setDescription(`## 🛑 Shift Disrupted\n\nYour operational assignment ran into internal network bottlenecks. No financial adjustments were recorded for this cycle.\n\n*Better optimization expected on your next shift.*`);
      }

      // Commit the cooldown window timestamp update
      await CooldownWork.findOneAndUpdate(
        { userId: msg.author.id }, 
        { cooldownExpiration: Date.now() + timeout }, 
        { upsert: true, new: true }
      );

      return msg.reply({ embeds: [workEmbed] });

    } catch (error) {
      console.error('An error occurred while processing work command:', error);
      msg.reply('❌ An internal systemic exception was thrown during your labor logs verification.');
    }
  },
};
