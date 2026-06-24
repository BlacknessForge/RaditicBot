const Volume = require('../../Schemas/volumeSchema');
const { EmbedBuilder } = require('discord.js');
const { color } = require('../../config'); // Keep your config if you have one

module.exports = {
  name: 'volume',
  aliases: ['vol'],
  description: 'Set or check the volume for the music player.',
  usage: 'volume [1-200]',
  async execute({ msg, args, client }) {
    const { channel } = msg.member.voice;
    const player = client.manager.players.get(msg.guild.id);

    if (!channel || msg.member.voice.channel.id !== msg.guild.members.me.voice.channel?.id) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('❌ | You need to be in the same voice channel as me!')] });
    }

    if (!player) return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | No active player in this server.')] });

    const volume = parseInt(args[0]);

    if (isNaN(volume)) {
      const savedVolume = await Volume.findOne({ guildId: msg.guild.id });
      const currentVolume = savedVolume ? savedVolume.volume : 50;
      return msg.reply({ embeds: [
          new EmbedBuilder().setColor('#5865F2').setDescription(`🔊 **Current Volume:** \`${currentVolume}%\`\n${generateVolumeBar(currentVolume)}`)
      ]});
    }

    if (volume < 1 || volume > 200) {
      return msg.reply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('⚠️ | Please provide a valid volume level between **1 and 200**.')] });
    }

    player.setVolume(volume);

    // Update DB
    await Volume.findOneAndUpdate(
      { guildId: msg.guild.id },
      { volume: volume },
      { upsert: true, new: true }
    );

    let embedColor = volume > 100 ? '#ffaa00' : (color?.default || '#00ff00');
    let warning = volume > 100 ? '\n\n*⚠️ Warning: High volume may cause distortion!*' : '';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription(`🔊 **Volume changed to:** \`${volume}%\`${warning}\n\n${generateVolumeBar(volume)}`)
      .setTimestamp();

    return msg.reply({ embeds: [embed] });
  }
};

// Helper function to create a visual volume bar
function generateVolumeBar(volume) {
  const totalBars = 15;
  const scaledVolume = Math.min(volume, 100); // Scale up to 100 for the visual block
  const filledBars = Math.round((scaledVolume / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}]`;
}
