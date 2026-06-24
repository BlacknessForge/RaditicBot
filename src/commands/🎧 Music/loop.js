const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'loop <song|queue|off>',
  name: 'loop',
  aliases: ['repeat', 'l'],
  description: 'Toggles looping for the current song, the queue, or disables looping.',
  async execute({ msg, args, client }) {
    const player = client.manager.players.get(msg.guild.id);
    const { channel } = msg.member.voice;

    if (!channel || msg.member.voice.channel.id !== msg.guild.members.me.voice.channel?.id) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in my voice channel!')] });
    }
    if (!player) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | There is no music playing in this guild!')] });
    }

    const option = args[0]?.toLowerCase();
    const embed = new EmbedBuilder().setColor('#5865F2');

    switch (option) {
      case 'song':
        player.setLoop('track');
        embed.setDescription('🔂 | Looping has been **enabled** for the current song.');
        break;
      case 'queue':
        player.setLoop('queue');
        embed.setDescription('🔁 | Looping has been **enabled** for the entire queue.');
        break;
      case 'off':
        player.setLoop('none');
        embed.setDescription('➡️ | Looping has been **disabled**.');
        break;
      default:
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | Invalid option! Please use `song`, `queue`, or `off`.')] });
    }

    return msg.reply({ embeds: [embed] });
  }
};
