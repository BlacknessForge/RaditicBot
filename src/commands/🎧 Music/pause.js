const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'pause',
  name: 'pause',
  description: 'Pauses the current song.',
  async execute({ msg, client }) {
    const player = client.manager.players.get(msg.guild.id);
    
    if (!msg.member.voice.channel || msg.member.voice.channel.id !== player?.voiceId) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in my voice channel!')] });
    }
    if (!player || !player.queue.current) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | No music is currently playing!')] });
    }
    if (player.paused) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | The music is already paused!')] });
    }

    player.pause(true);
    return msg.reply({ embeds: [new EmbedBuilder().setColor('#2f3136').setDescription('⏸️ | **Music Paused**')] });
  },
};
