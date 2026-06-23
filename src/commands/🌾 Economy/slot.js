const { EmbedBuilder } = require('discord.js');
const User = require('../../Schemas/userAccount');
const Cooldown = require('../../Schemas/CooldownSlot');
const { emoji } = require('../../config.js');

module.exports = {
  usage: 'slot <amount>',
  name: 'slot',
  aliases: ['slots'],
  description: 'Pull the lever and risk your gems on the Raditic Reel slot machine.',
  async execute({ msg, args }) {
    try {
      const existingUser = await User.findOne({ userId: msg.author.id });

      if (!existingUser) {
        return msg.reply("❌ **Account Required** | It looks like you haven't registered a profile yet. Use the `register` command to initialize your account.");
      }

      // Cooldown evaluation
      const cooldown = await Cooldown.findOne({ userId: msg.author.id });
      if (cooldown && cooldown.cooldownExpiration > Date.now()) {
        const timeLeft = Math.floor((cooldown.cooldownExpiration - Date.now()) / 1000);

        return msg.reply(`⏳ | **${msg.author.displayName}**, the reels are resetting. Try again **<t:${Math.floor(Date.now() / 1000) + timeLeft}:R>**.`)
          .then((message) => {
            setTimeout(() => message.delete().catch(() => {}), 3000);
          });
      }

      const timeout = 20000; // 20 seconds
      const prefix = "cp"; 

      if (!args[0]) {
        return msg.reply(`⚠️ **Invalid Parameters** | Correct Usage: \`${prefix} slot <amount/all>\``);
      }

      const user = msg.author;
      let amount = args[0].toLowerCase() === 'all' ? existingUser.balance : parseInt(args[0]);

      // Enforce slot-specific bet ceiling
      amount = Math.min(amount, 250000);

      if (isNaN(amount) || amount <= 0) {
        return msg.reply('❌ **Error** | The betting amount must be a clean, positive integer.');
      }

      const currentBalance = existingUser.balance;
      if (currentBalance < amount) {
        return msg.reply(`❌ **Insufficient Funds** | You don't have enough ${emoji.radigem || '💎'} RG coins to back this wager.`);
      }

      const fruits = ['🍎', '🍇', '🍒', '🍓'];

      // Resolve calculation instantly
      const outcome = [];
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * fruits.length);
        outcome.push(fruits[randomIndex]);
      }

      const winnings = calculateWinnings(outcome, amount);

      // Mutate financial state immediately
      if (winnings > 0) {
        existingUser.balance += winnings - amount; // Net win balance delta
      } else {
        existingUser.balance -= amount;
      }
      await existingUser.save();

      // Establish cooldown window
      await Cooldown.findOneAndUpdate({ userId: user.id }, { cooldownExpiration: Date.now() + timeout }, { upsert: true, new: true });

      // ─── INITIAL ROLLING STATE ───
      const slotEmbed = new EmbedBuilder()
        .setColor('#111111') // Premium sleek dark mode theme
        .setAuthor({ name: `${user.displayName}'s Slot Pull`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`### 🎰 The reels are spinning...\n\n🌀 **[ 🍎 ] [ 🍇 ] [ 🍒 ]** 🌀\n\n**Wager Amount:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`)
        .setTimestamp();

      const sentMessage = await msg.reply({ embeds: [slotEmbed] });

      // Dynamic animation ticker loop
      let index = 0;
      const interval = setInterval(async () => {
        index = (index + 1) % fruits.length;
        const frame1 = fruits[index];
        const frame2 = fruits[(index + 1) % fruits.length];
        const frame3 = fruits[(index + 2) % fruits.length];

        slotEmbed.setDescription(`### 🎰 The reels are spinning...\n\n⚡ **[ ${frame1} ] [ ${frame2} ] [ ${frame3} ]** ⚡\n\n**Wager Amount:** \`${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);
        await sentMessage.edit({ embeds: [slotEmbed] }).catch(() => clearInterval(interval));
      }, 1200);

      // ─── FINAL RESOLUTION STATE ───
      setTimeout(async () => {
        clearInterval(interval); // Terminate active graphic ticks

        const finalResultString = `**[ ${outcome[0]} ] [ ${outcome[1]} ] [ ${outcome[2]} ]**`;
        const finalEmbed = new EmbedBuilder()
          .setAuthor({ name: `${user.displayName}'s Slot Result`, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();

        if (winnings > 0) {
          finalEmbed.setColor('#2ECC71') // Vibrant victory green accent
            .setDescription(`## 🎉 JACKPOT!\n\n${finalResultString}\n\nThe system aligned perfectly! Magnificent payout secured.\n\n**Net Returns:** \`+${winnings.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);
        } else {
          finalEmbed.setColor('#E74C3C') // High-contrast warning red accent
            .setDescription(`## 🛑 Empty Spin\n\n${finalResultString}\n\nThe combination broke sequence. Better luck on the next pull.\n\n**Loss Penalty:** \`-${amount.toLocaleString()}\` ${emoji.radigem || '💎'} RG`);
        }

        await sentMessage.edit({ embeds: [finalEmbed] }).catch(() => {});
      }, 5000);

    } catch (error) {
      console.error('Slots Command Error Pipeline:', error);
      msg.reply('❌ An internal systems error occurred while finalizing the slot transaction.');
    }
  },
};

function calculateWinnings(outcome, betAmount) {
  const strawberryProbability = 0.05;
  const strawberryMultiplier = 4;
  const otherFruitsMultiplier = 2;

  // Verify alignment continuity across three arrays
  if (outcome[0] === outcome[1] && outcome[1] === outcome[2]) {
    if (outcome[0] === '🍓' && Math.random() < strawberryProbability) {
      return betAmount * strawberryMultiplier;
    } else {
      return betAmount * otherFruitsMultiplier;
    }
  } else {
    return 0;
  }
}
