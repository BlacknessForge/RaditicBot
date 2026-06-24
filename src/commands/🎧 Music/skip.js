const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'skip',
  name: 'skip',
  aliases: ['s'],
  description: 'Skips the currently playing song.',
  async execute({ msg, client }) {
    const { channel } = msg.member.voice;
    const player = client.manager.players.get(msg.guild.id);

    if (!channel || msg.member.voice.channel.id !== msg.guild.members.me.voice.channel?.id) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in the same voice channel as me to skip!')] });
    }

    if (!player || !player.queue.current) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | There is no music playing right now.')] });
    }

    const currentTrack = player.queue.current.title;
    player.skip();

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setDescription(`⏭️ | Skipped **${currentTrack}**`);

    if (player.queue.length > 0) {
      embed.setFooter({ text: `Next up: ${player.queue[0].title}` });
    } else {
      embed.setFooter({ text: 'The queue is now empty.' });
    }

    return msg.reply({ embeds: [embed] });
  },
};
