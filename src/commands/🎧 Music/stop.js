const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'stop',
  name: 'stop',
  description: 'Stops the current music and clears the queue.',
  async execute({ msg, client }) {
    const player = client.manager.players.get(msg.guild.id);

    if (!msg.member.voice.channel || msg.member.voice.channel.id !== msg.guild.members.me.voice.channel?.id) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in my voice channel to stop the music!')] });
    }
    if (!player) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | There is no active player in this server!')] });
    }

    try {
      player.destroy();
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('🛑 | **Stopped the music and cleared the queue.** Leaving channel.')] });
    } catch (error) {
      console.error(error);
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('⚠️ | An error occurred while trying to stop the player!')] });
    }
  },
};
