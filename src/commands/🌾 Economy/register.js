const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../Schemas/userAccount.js');
const { emoji } = require('../../config');

module.exports = {
  usage: "register",
  name: "register",
  description: "Initialize your profile and accept terms to enter the economy.",
  async execute({ msg }) {
    try {
      const existingUser = await User.findOne({ userId: msg.author.id });

      if (existingUser) {
        return msg.reply("❌ **Registration Duplicate** | You already have an active profile registered in our systems ledger.");
      }

      const reward = 1000;
      
      // Premium, structural layout for the Terms of Service
      const termsEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium high-contrast dark theme
        .setAuthor({ name: 'Raditic Systems Initialization', iconURL: msg.client.user.displayAvatarURL() })
        .setTitle('⚖️ Terms of Service & Data Usage Agreement')
        .setDescription(
          `By initializing an account with **Raditic Bot**, you explicitly confirm your agreement to the following operational policies:\n\n` +
          `### 🪙 Economy & Currency Systems\n` +
          `* RadiGems (${emoji.radigem || '💎'} RG) represent a strictly virtual platform utility currency.\n` +
          `* They hold **no real-world monetary value** and cannot be exchanged for fiat or off-platform assets.\n` +
          `* Any unauthorized exploits, macroing, profile manipulation, or illegitimate balance duplication is strictly prohibited and will result in an immediate data wipe and account ban.\n\n` +
          `### 🔒 Operational Governance\n` +
          `* The development administration reserves full rights to rebalance baseline values, reset economies, or modify parameters at any time to preserve core stability.\n` +
          `* Services are offered "as-is"—system maintainers bear no liability for transaction execution disruptions.\n\n` +
          `*If you have concerns, join our [Support Server](https://discord.gg/reyZznSqqx) prior to accepting authorization.*`
        )
        .setFooter({ text: 'Review the protocol requirements before finalizing authorization.' })
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId("accept_terms")
        .setLabel("Accept & Initialize Profile")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(acceptButton);

      const termsMessage = await msg.reply({
        embeds: [termsEmbed],
        components: [row],
      });

      const filter = (i) => i.customId === "accept_terms" && i.user.id === msg.author.id;

      // Maintain signature window
      const collector = termsMessage.createMessageComponentCollector({
        filter,
        time: 20000, // Boosted to 20s to allow adequate reading time
      });

      collector.on('collect', async (i) => {
        // Remove interactive components immediately upon selection
        await i.update({
          components: [],
        });

        // Initialize user schema structure
        const newUser = new User({
          userId: i.user.id,
          userName: i.user.username,
          balance: reward,
        });

        await newUser.save();

        const successEmbed = new EmbedBuilder()
          .setColor('#2ECC71') // Green success accent
          .setAuthor({ name: 'Profile Initialized Successfully', iconURL: i.user.displayAvatarURL({ dynamic: true }) })
          .setDescription(`## 🎉 Welcome to the Raditic Network!\n\nYour profile has been created. A starting initialization stipend has been deposited straight into your wallet ledger.\n\n**Stipend Granted:** \`+${reward.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n**Current Balance:** \`${reward.toLocaleString()}\` ${emoji.radigem || '💎'} RG\n\nRun prefix commands like \`cp daily\` or \`cp coinflip\` to manage your assets!`)
          .setTimestamp();

        await i.followUp({ embeds: [successEmbed] });
        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#E74C3C') // Red warning accent
            .setDescription(`🛑 **Registration Expired** | You did not accept the Terms of Service within the required signature window. Please re-run the \`register\` command if you wish to initialize your account.`);

          await termsMessage.edit({
            embeds: [timeoutEmbed],
            components: [],
          }).catch(() => {});
        }
      });

    } catch (err) {
      console.error("Error occurred within the register pipeline:", err);
      msg.reply("❌ An internal infrastructure error occurred while trying to instantiate your data entry.");
    }
  },
};
