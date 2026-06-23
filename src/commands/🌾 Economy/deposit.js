const { EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const Bank = require('../../Schemas/bankSchema.js');
const { emoji } = require('../../config.js');

module.exports = {
  usage: 'deposit <amount>',
  name: 'deposit',
  aliases: ['dep'],
  description: 'Securely deposit your RadiGems into your high-yield bank vault.',
  async execute({ msg, args }) {
    try {
      const user = await User.findOne({ userId: msg.author.id });
      if (!user) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      if (!args[0]) {
        return msg.reply("⚠️ **Invalid Parameters** | Correct Usage: `cp deposit <amount/all>`");
      }

      // Handle 'all' keyword or parse integer
      let amount = args[0].toLowerCase() === 'all' ? user.balance : parseInt(args[0]);

      if (isNaN(amount) || amount <= 0) {
        return msg.reply('❌ **Error** | The deposit amount must be a clean, positive integer or the keyword `all`.');
      }

      const userBalance = user.balance;
      if (userBalance <= 0) {
        return msg.reply(`❌ **Empty Wallet** | You don't have any ${emoji.radigem || '💎'} RG in your active balance to deposit.`);
      }

      // Cap the deposit to available wallet holdings if user tries to deposit more
      if (amount > userBalance) {
        amount = userBalance;
      }

      let bank = await Bank.findOne({ userId: msg.author.id });
      if (!bank) {
        bank = new Bank({
          userId: msg.author.id,
          userName: msg.author.username,
          balance: 0,
        });
      }

      // Perform transaction
      user.balance -= amount;
      bank.balance += amount;

      await user.save();
      await bank.save();

      // Premium dark aesthetic success presentation
      const depositEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium high-contrast dark theme
        .setAuthor({ name: `${msg.author.displayName}'s Vault Transaction`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`## 🏦 Vault Deposit Complete\n\nYour transaction was processed securely. Funds have been moved from your active wallet to your bank ledger.\n\n**Deposited:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**New Vault Balance:** \`${bank.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setFooter({ text: `Remaining Wallet Balance: ${user.balance.toLocaleString()} RG` })
        .setTimestamp();

      return msg.reply({ embeds: [depositEmbed] });

    } catch (error) {
      console.error('Deposit Command Error:', error);
      msg.reply('❌ An internal systems error occurred while finalizing the bank transfer.');
    }
  },
};
