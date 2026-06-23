const { EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const Bank = require('../../Schemas/bankSchema.js');
const { emoji } = require('../../config.js');

module.exports = {
  usage: "withdraw <amount>",
  name: "withdraw",
  aliases: ['with', 'w'],
  description: "Securely withdraw RadiGems from your vault ledger back into your active wallet holdings.",
  async execute({ msg, args }) {
    try {
      const user = await User.findOne({ userId: msg.author.id });
      if (!user) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      if (!args[0]) {
        return msg.reply("⚠️ **Invalid Parameters** | Correct Usage: `cp withdraw <amount/all>`");
      }

      let bank = await Bank.findOne({ userId: msg.author.id });
      if (!bank || bank.balance <= 0) {
        return msg.reply(`❌ **Vault Empty** | You do not have an active balance deposited inside your bank vault to withdraw.`);
      }

      let amount;
      const withdrawalCap = 250000;

      // Handle 'all' keyword or parse integer cleanly
      if (args[0].toLowerCase() === "all") {
        // Withdraw everything up to the cap, or their entire balance if it's below the cap
        amount = Math.min(bank.balance, withdrawalCap);
      } else {
        amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
          return msg.reply('❌ **Error** | The withdrawal volume must be a clean, positive integer or the keyword `all`.');
        }

        // Cap manual entries cleanly
        if (amount > withdrawalCap) {
          amount = withdrawalCap;
        }
      }

      // Final liquidity check against the bank ledger
      if (amount > bank.balance) {
        return msg.reply(`❌ **Insufficient Vault Funds** | You cannot withdraw \`${amount.toLocaleString()}\` RG. Your bank ledger only holds \`${bank.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG.`);
      }

      // Mutate financial database entries
      user.balance += amount;
      bank.balance -= amount;

      await user.save();
      await bank.save();

      // Premium dark aesthetic success panel presentation
      const withdrawEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium high-contrast dark theme
        .setAuthor({ name: `${msg.author.displayName}'s Vault Transaction`, iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`## 🏦 Vault Withdrawal Complete\n\nYour ledger update was processed successfully. Funds have been safely transferred back into your active liquid wallet.\n\n**Withdrawn:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Remaining Vault Balance:** \`${bank.balance.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setFooter({ text: `Total Active Wallet Balance: ${user.balance.toLocaleString()} RG` })
        .setTimestamp();

      return msg.reply({ embeds: [withdrawEmbed] });

    } catch (error) {
      console.error('Withdraw Command Error Pipeline:', error);
      msg.reply('❌ An internal systems error occurred while finalizing the bank transfer.');
    }
  },
};
