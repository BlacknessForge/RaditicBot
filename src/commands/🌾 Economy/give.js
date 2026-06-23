const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const { emoji } = require('../../config.js');

module.exports = {
  usage: 'give <@user> <amount>',
  name: 'give',
  description: 'Transfer a portion of your RadiGems directly to another user.',
  async execute({ client, msg, args }) {
    try {
      const user = await User.findOne({ userId: msg.author.id });
      
      if (!user) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }
      
      if (!args[0] || !args[1]) {
        return msg.reply('⚠️ **Invalid Parameters** | Correct Usage: `cp give <@user> <amount>`');
      }

      const member = msg.mentions.members.first();

      if (!member) {
        return msg.reply('❌ **Error** | Target user could not be resolved. Please mention a valid member.');
      }
      if (member.id === msg.author.id) {
        return msg.reply("🛑 **Transaction Denied** | You cannot initiate a transaction to your own account.");
      }
      if (member.user.bot) {
        return msg.reply("🛑 **Transaction Denied** | Funds cannot be transferred to automated bot accounts.");
      }

      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0 || amount > 1000000) {
        return msg.reply('❌ **Error** | Please provide a clean transaction volume between `1` and `1,000,000` RG.');
      }

      if (user.balance < amount) {
        return msg.reply(`❌ **Insufficient Funds** | Your active balance doesn't hold enough ${emoji.radigem || '💎'} RG coins to complete this transfer.`);
      }

      const targetUser = await User.findOne({ userId: member.user.id });
      if (!targetUser) {
        return msg.reply("❌ **Account Missing** | The recipient has not registered a transaction profile yet.");
      }

      // ─── INITIAL CONFIRMATION INTERFACE ───
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_give')
            .setLabel('Authorize Transfer')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('cancel_give')
            .setLabel('Abort')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌'),
        );

      const confirmEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium high-contrast dark theme
        .setAuthor({ name: 'Pending Wire Transfer', iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`## 📋 Authorize Outgoing Transaction\n\nYou are preparing to wire funds to another account. Please confirm the ledger details below. **This action is permanent and cannot be reversed.**\n\n**Recipient:** ${member}\n**Transfer Amount:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setTimestamp();

      const confirmMsg = await msg.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
      });

      const filter = i => i.user.id === msg.author.id;
      const collector = confirmMsg.createMessageComponentCollector({ filter, time: 180000 });

      collector.on('collect', async i => {
        if (i.customId === 'confirm_give') {
          // Re-verify balance at the instant of button press to prevent double-spending exploits
          const freshUser = await User.findOne({ userId: msg.author.id });
          if (freshUser.balance < amount) {
            return i.update({
              embeds: [
                new EmbedBuilder()
                  .setColor('#E74C3C')
                  .setDescription(`❌ **Transaction Failed** | Your balance changed, and you no longer have enough funds.`)
              ],
              components: []
            });
          }

          freshUser.balance -= amount;
          targetUser.balance += amount;
          await freshUser.save();
          await targetUser.save();

          // Success State Embed Update
          const successEmbed = new EmbedBuilder()
            .setColor('#2ECC71') // Clear green success accent
            .setAuthor({ name: 'Transfer Authorized', iconURL: msg.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`## 🎉 Transaction Settled Successfully!\n\nThe funds have been safely deducted from your holdings and deposited into the recipient's wallet ledger.\n\n**Sender:** ${msg.author}\n**Recipient:** ${member}\n**Settled Value:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
            .setTimestamp();

          await i.update({
            embeds: [successEmbed],
            components: [],
          });
        } else if (i.customId === 'cancel_give') {
          // Cancellation State Embed Update
          const cancelledEmbed = new EmbedBuilder()
            .setColor('#E74C3C') // Red termination accent
            .setDescription(`🛑 **Transaction Aborted** | The wire transfer request was manually terminated by the sender. No funds were shifted.`);

          await i.update({
            embeds: [cancelledEmbed],
            components: [],
          });
        }
        collector.stop();
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#7F8C8D') // Muted gray timeout accent
            .setDescription(`⏳ **Transaction Timed Out** | The system automatically aborted the signature window due to inactivity.`);

          confirmMsg.edit({
            embeds: [timeoutEmbed],
            components: [],
          }).catch(() => {});
        }
      });

    } catch (error) {
      console.error('Give Command Error:', error);
      msg.reply('❌ An internal systems error occurred while trying to process the data payload.');
    }
  },
};
