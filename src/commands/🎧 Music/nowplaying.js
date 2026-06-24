const { EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'nowplaying',
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Shows the currently playing song with a progress bar.',
  async execute({ msg, client }) {
    const player = client.manager.players.get(msg.guild.id);
    if (!player || !player.queue.current) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | Nothing is playing right now.')] });
    }

    const track = player.queue.current;
    const position = player.position;
    const duration = track.length;
    
    // Build the dynamic progress bar
    const barSize = 20;
    const progress = Math.round((position / duration) * barSize);
    const emptyProgress = barSize - progress;
    const progressString = `🔘${'▬'.repeat(Math.max(0, progress - 1))}${'▬'.repeat(emptyProgress)}`;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({ name: 'Now Playing', iconURL: msg.client.user.displayAvatarURL() })
      .setTitle(track.title)
      .setURL(track.uri)
      .setThumbnail(track.thumbnail || null)
      .setDescription(`**Author:** ${track.author}\n\n\`${formatTime(position)}\` ${progressString} \`${formatTime(duration)}\``)
      .setFooter({ text: `Requested by ${track.requester.username}`, iconURL: track.requester.displayAvatarURL() });

    return msg.reply({ embeds: [embed] });
  }
};

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}
