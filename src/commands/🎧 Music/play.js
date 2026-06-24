const Volume = require('../../Schemas/volumeSchema');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  usage: 'play <song name or URL>',
  name: 'play',
  aliases: ['p'],
  description: 'Plays a song or playlist from a name or URL.',
  async execute({ msg, args, client }) {
    const query = args.join(' ');
    const { channel } = msg.member.voice;

    if (!channel) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in a voice channel to use this command!')] });
    }

    if (!channel.permissionsFor(msg.guild.members.me).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | I do not have permission to join or speak in your voice channel!')] });
    }

    if (!query) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | Please provide a song name or a valid URL!')] });
    }

    try {
      // Fetch volume from DB, default to 50
      const savedVolume = await Volume.findOne({ guildId: msg.guild.id });
      const volume = savedVolume ? savedVolume.volume : 50;

      // Create or get player
      let player = await client.manager.createPlayer({
        guildId: msg.guild.id,
        textId: msg.channel.id,
        voiceId: channel.id,
        volume: volume,
      });

      // Optimize search: if it's a URL, don't use a search engine prefix
      const isUrl = query.startsWith('http://') || query.startsWith('https://');
      let result = await client.manager.search(query, { 
        requester: msg.author, 
        engine: isUrl ? null : 'youtube' 
      });

      if (!result || !result.tracks.length) {
        return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | No results found for your query.')] });
      }

      const embed = new EmbedBuilder().setColor('#5865F2');

      if (result.type === 'PLAYLIST') {
        player.queue.add(result.tracks);
        embed.setTitle('🎶 Playlist Added to Queue')
             .setDescription(`Added **${result.tracks.length}** tracks from [**${result.playlistName}**](${query})`)
             .setFooter({ text: `Requested by ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() });
      } else {
        const track = result.tracks[0];
        player.queue.add(track);
        embed.setTitle('🎵 Track Added to Queue')
             .setDescription(`[**${track.title}**](${track.uri})`)
             .setThumbnail(track.thumbnail || null)
             .addFields(
                { name: 'Author', value: track.author || 'Unknown', inline: true },
                { name: 'Duration', value: `\`${formatTime(track.length)}\``, inline: true }
             )
             .setFooter({ text: `Requested by ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() });
      }

      msg.reply({ embeds: [embed] });

      // Start playing if not already playing
      if (!player.playing && !player.paused) player.play();

    } catch (error) {
      console.error(error);
      msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('⚠️ | An error occurred while trying to play the track.')] });
    }
  }
};

// Helper function to format ms into mm:ss
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}
