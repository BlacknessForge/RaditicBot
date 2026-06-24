const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'resume',
  name: 'resume',
  description: 'Resumes the paused song.',
  async execute({ msg, client }) {
    const player = client.manager.players.get(msg.guild.id);
    
    if (!msg.member.voice.channel || msg.member.voice.channel.id !== player?.voiceId) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in my voice channel!')] });
    }
    if (!player) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | No active player found!')] });
    }
    if (!player.paused) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | The music is already playing!')] });
    }

    player.pause(false);
    return msg.reply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription('▶️ | **Music Resumed**')] });
  },
};
