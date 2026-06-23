const { EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const Bank = require('../../Schemas/bankSchema.js');
const { color, emoji } = require('../../config');

module.exports = {
  usage: "balance",
  name: "balance",
  aliases: ["bal", "wallet"],
  description: "Check your account balance.",
  async execute({ msg }) {
    try {
      // Fetch both documents in parallel to improve performance
      const [user, bank] = await Promise.all([
        User.findOne({ userId: msg.author.id }),
        Bank.findOne({ userId: msg.author.id })
      ]);

      if (!user) {
        return msg.reply("It seems like you have not registered an account yet. Use `register` command to create one.");
      }

      const bankBalance = bank ? (bank.balance || 0) : 0;

      const balanceEmbed = new EmbedBuilder()
        .setAuthor({ name: `${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
        .setTitle(`${msg.author.displayName}'s balance`)
        .setDescription(`Balance: ${emoji.radigem} **${user.balance.toLocaleString()} RadiGem**\nBank: ${emoji.radigem} **${bankBalance.toLocaleString()} RadiGem**`)
        .setColor(color.default)
        .setTimestamp();

      await msg.reply({ embeds: [balanceEmbed] });
      
    } catch (error) {
      console.error('Balance command error:', error);
      msg.reply('An error occurred while checking your balance!');
    }
  },
};
